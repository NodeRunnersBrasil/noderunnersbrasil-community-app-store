from typing import Optional
from pydantic import BaseModel

class ReedemSchema(BaseModel):
    txid: str

class SwapSchema(BaseModel):
    address: Optional[str]
    amount:  Optional[int] = 0
    feerate: Optional[float] = 0