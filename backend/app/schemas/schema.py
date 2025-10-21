from pydantic import BaseModel, ConfigDict
from typing import List , Optional, Dict
from datetime import datetime


#  ------------new schema 


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
 
    pass

class ChatSessionRead(ChatSessionBase):
    id: int
    created_at: datetime
    messages: List[ChatMessageRead] = []

    model_config = ConfigDict(from_attributes=True)

class ChatSessionCreate(ChatSessionBase):
    pass