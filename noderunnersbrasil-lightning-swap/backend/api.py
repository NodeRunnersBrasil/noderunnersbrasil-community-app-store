from fastapi.middleware.cors import CORSMiddleware
from services.lightning import lnbits, create_invoice
from services.bitcoin import lnd, get_balance, get_address
from services.redis import redis
from database import database

from fastapi import FastAPI, HTTPException, Body
from configs import INVOICE_EXPIRE, MIRRORS_CLEAR_URL, MIRRORS_TOR_URL
from configs import PATH, SWAP_MAX_AMOUNT, SWAP_MIN_AMOUNT, SWAP_SERVICE_FEERATE
from configs import API_HOST, API_PORT
from helpers import percentage, timestamp

from schemas import ReedemSchema, SwapSchema
from tinydb import Query

from json import dumps, loads
from os import environ

import uvicorn
import logging

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")

api = FastAPI(docs_url=None, redoc_url=None)
api.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

@api.get("/api/v1/info")
async def get_info():
    balance = get_balance()
    if (SWAP_MIN_AMOUNT > balance):
        available = False
    else:
        available = True
    
    address = environ.get("TEST_BTC_ADDRESS")
    if not (address):
        address = get_address()
        environ["TEST_BTC_ADDRESS"] = address
    
    fee_network = lnd.get_estimate_fee(address, SWAP_MIN_AMOUNT, target_conf=3).get("feerate_sat_per_byte", 0)
    if not (fee_network):
        available = False
    else:
        fee_network = float(fee_network)
    
    return {
        "swap": {
            "min_amount": SWAP_MIN_AMOUNT,
            "max_amount": SWAP_MAX_AMOUNT
        },
        "fees": {
            "network": fee_network,
            "service": SWAP_SERVICE_FEERATE
        },
        "mirrors": {
            "clear": MIRRORS_CLEAR_URL,
            "tor": MIRRORS_TOR_URL
        },
        "available": available
    }

@api.post("/api/v1/lnbits/webhook")
def lnbits_webhook(data: dict = Body(...)):
    payment_request = data.get("bolt11")
    if not (payment_request):
        raise HTTPException(400, "Payment request not found.")

    payment_hash = data.get("payment_hash")
    if (lnbits.check_invoice_status(payment_hash) == False):
        raise HTTPException(500, "Invoice has not been paid.")

    decode_invoice = lnbits.decode_invoice(payment_request)
    if (payment_hash != decode_invoice["payment_hash"]):
        raise HTTPException(500, "Payment hash invalid.")
    
    if (data["amount"] != decode_invoice["amount_msat"]):
        raise HTTPException(500, "Amount invalid.")
    
    tx = redis.get(f"vinci.tx.{payment_hash}")
    if not (tx):
        raise HTTPException(500, "Transaction already processed.")
    else:
        tx = loads(tx)
    
    address = tx["to"]["address"]
    feerate = tx["to"]["feerate"]
    amount = tx["to"]["amount"]

    redis.delete(f"vinci.tx.{payment_hash}")

    # Create an onchain transaction and send to network.
    logging.info(f"Sending {amount} sats to the address {address}.")
    send_coins = lnd.send_coins(address, amount, sat_per_vbyte=feerate, spend_unconfirmed=True)
    if (send_coins.get("txid")):    
        logging.info("Transaction sent to mempool %s." % (send_coins["txid"]))

        tx["status"] = "settled"
        tx["expiry"] = None
        tx["to"]["txid"] = send_coins["txid"]
        tx["updated_at"] = timestamp()
        
        database.insert(tx)
        logging.info(f"Saving the data to a persistent {PATH}/data/database.db.")
    else:
        logging.critical("Could not send transaction possible lack of liquidity.")
        
        tx["status"] = "reedem"
        tx["expiry"] = None
        tx["updated_at"] = timestamp()

        database.insert(tx)

@api.get("/api/v1/lookup/{txid}")
async def lookup(txid: str):
    tx = redis.get(f"vinci.tx.{txid}")
    if not (tx):
        tx = database.get(Query().id == txid)
        if (tx == None):
            raise HTTPException(500, "Transaction not found.")
        else:
            return tx
    else:
        return loads(tx)

@api.post("/api/v1/reedem")
def reedem(data: ReedemSchema):
    txid = data.txid
    tx = database.get((Query().id == txid) & (Query().status == "reedem"))
    if not (tx):
        raise HTTPException(400, "Transaction for redemption does not exist.")
    
    address = tx["to"]["address"]
    feerate = tx["to"]["feerate"]
    amount = tx["to"]["amount"]
    
    database.update({"status": "transition"}, (Query().id == txid))
    send_coins = lnd.send_coins(address, amount, sat_per_vbyte=feerate, spend_unconfirmed=True)
    if (send_coins.get("txid")):
        database.update({"status": "settled"}, (Query().id == txid))

        logging.info("Transaction sent to mempool %s." % (send_coins["txid"]))
        
        tx["status"] = "settled"
        tx["to"]["txid"] = send_coins["txid"]
        tx["updated_at"] = timestamp()
        
        database.update(tx, (Query().id == txid))
        return {"txid": send_coins["txid"]}
    else:
        database.update({"status": "reedem"}, (Query().id == txid))
        raise HTTPException(500, "Unable to redeem the funds.")

@api.get("/api/v1/estimate/fee")
def estimate_fee(address: str = None, amount: int = 0, target_conf=144, feerate: int = 1):
    if (address == None):
        raise HTTPException(400, "Address must not be null.")
    
    elif (amount <= 565):
        raise HTTPException(400, "Amount must not be less than the dust limit.")
    
    elif (feerate <= 0):
        raise HTTPException(400, "Feerate must not be less than 0.")

    estimate = lnd.get_estimate_fee(address, amount, target_conf=target_conf)
    if not (estimate.get("feerate_sat_per_byte")):
        raise HTTPException(500, "Unable to estimate fee.")
    
    fee = int(estimate["fee_sat"]) / int(estimate["feerate_sat_per_byte"])
    fee = int(fee * feerate)
    return {"fees": fee}

@api.post("/api/v1/swap/create")
def create_swap(data: SwapSchema):
    address = data.address
    feerate = data.feerate
    amount = data.amount
    
    if (address) and (amount) and (feerate):
        if (amount <= 0):
            raise HTTPException(400, "Amount must not be less than or equal to zero.")
        
        if (amount < SWAP_MIN_AMOUNT):
            raise HTTPException(400, "Amount is less than the minimum.")
        
        if (amount > SWAP_MAX_AMOUNT):
            raise HTTPException(400, "Amount is greater than the maximum.")
        
        if (feerate < 1):
            raise HTTPException(400, "Feerate is invalid.")
        
        # Calculate the total onchain fee.
        fee_total = lnd.get_estimate_fee(address, amount)
        if not (fee_total.get("feerate_sat_per_byte")):
            raise HTTPException(500, "Unable to estimate fee.")

        fee_network = int(fee_total["fee_sat"]) / int(fee_total["feerate_sat_per_byte"])
        fee_network = int(fee_network * feerate)
            
        # Calculate the total service fee.
        fee_service = int(percentage(amount, SWAP_SERVICE_FEERATE))

        # Check if you have enough funds.
        balance = get_balance()
        if ((amount + fee_network) > balance):
            raise HTTPException(500, "We don't have enough liquidity at the moment.")
        
        description = f"Fees: {fee_network} sats | Earn: {fee_service} sats."
        amount_release = (amount + fee_network + fee_service)
        payment_invoice = create_invoice(amount_release, memo=description, expiry=INVOICE_EXPIRE)

        txid = payment_invoice["payment_hash"]
        payload = {
            "id": txid, 
            "status": "pending", 
            "from": {
                "invoice": payment_invoice["payment_request"],
                "amount": amount_release
            }, 
            "to": {
                "txid": None, 
                "address": address, 
                "amount": amount,
                "feerate": feerate,
            },
            "fees": {
                "network": fee_network,
                "service": fee_service
            },
            "expiry": INVOICE_EXPIRE,
            "created_at": timestamp(),
            "updated_at": timestamp()
        }
        
        redis.set(f"vinci.tx.{txid}", dumps(payload))
        redis.expire(f"vinci.tx.{txid}", INVOICE_EXPIRE + (60 * 10))
        return payload
    else:
        raise HTTPException(400)

def start():
    uvicorn.run(api, host=API_HOST, port=API_PORT, log_config={
        "version": 1,
        "disable_existing_loggers": False,
        "formatters": {
            "default": {
                "()": "uvicorn.logging.DefaultFormatter",
                "fmt": "%(levelprefix)s %(asctime)s %(message)s",
                "datefmt": "%Y-%m-%d %H:%M:%S",

            },
        },
        "handlers": {
            "default": {
                "formatter": "default",
                "class": "logging.StreamHandler",
                "stream": "ext://sys.stderr",
            },
        },
        "loggers": {
            "foo-logger": {"handlers": ["default"], "level": "DEBUG"},
        },
    })