from time import time

def btc_to_sats(btc: float) -> int:
    return int(float(btc) * pow(10, 8))

def sats_to_btc(sats: int) -> float:
    return int(sats) / pow(10, 8)

def percentage(x: float, y: float) -> float:
    return x * y / 100

def timestamp():
    return int(time())