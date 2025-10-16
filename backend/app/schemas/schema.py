from pydantic import BaseModel
from typing import List , Optional, Dict
from datetime import datetime

# chats

class chatRequest(BaseModel):
    prompt: str

class chatRead(BaseModel):
    id: int
    prompt: str

class chatResponse(BaseModel):
    id: int
    prompt: str
    response: str
    created_at: datetime
             
    class config:
        orm_mode = True

class chatHistoryItsem(BaseModel):
    user_id: int
    prompt: List[chatRequest] = []


chat_history_store: Dict[str, List[chatRequest]] = {}