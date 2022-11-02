from services.lnd import lnd

def get_balance() -> int:
    try:
        balance = lnd.wallet_balance()
        total_balance = int(balance["total_balance"])
        total_balance-= int(balance["reserved_balance_anchor_chan"])
        return total_balance
    except:
        return 0
    
def get_address() -> dict:
    return lnd.get_address()["address"]