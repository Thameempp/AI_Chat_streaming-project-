from pydantic import BaseModel, ConfigDict
from typing import List , Optional, Dict
from datetime import datetime

# chats

'''class chatRequest(BaseModel):
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


chat_history_store: Dict[str, List[chatRequest]] = {}'''



#  ------------new shcema 


class ChatMessageBase(BaseModel):
    prompt: str
    response: str

class ChatMessageCreate(BaseModel):
    prompt: str

class ChatMessageRead(ChatMessageBase):
    id: int
    session_id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class ChatSessionBase(BaseModel):
    # Add session metadata here if any
    pass

class ChatSessionRead(ChatSessionBase):
    id: int
    created_at: datetime
    messages: List[ChatMessageRead] = []

    model_config = ConfigDict(from_attributes=True)

class ChatSessionCreate(ChatSessionBase):
    pass