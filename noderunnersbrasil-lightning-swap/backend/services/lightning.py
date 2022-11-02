from configs import LNBITS_HOST, LNBITS_MAIN_WALLET_INVOICE_KEY, LNBITS_MAIN_WALLET_ADMIN_KEY, LNBITS_WEBHOOK_URL
from lnbits import Lnbits

lnbits = Lnbits(admin_key=LNBITS_MAIN_WALLET_ADMIN_KEY, invoice_key=LNBITS_MAIN_WALLET_INVOICE_KEY, url=LNBITS_HOST)

def create_invoice(amount: int, memo="", expiry=86400) -> dict:
    """Create a new lightning invoice containing metadata that will be used in 
    later contracts for debt settlement.
    """

    invoice = lnbits.create_invoice(amount, memo=memo, webhook=LNBITS_WEBHOOK_URL)
    if not invoice.get("payment_hash"):
        return {"message": "There was a problem trying to create a new invoice."}
        
    # Get the hash payment.
    payment_hash = invoice["payment_hash"]

    # Get payment request.
    payment_request = invoice["payment_request"]
    return {"payment_hash": payment_hash, "payment_request": payment_request, "expiry": expiry}
