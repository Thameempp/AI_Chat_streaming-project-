# app/routers/chat.py

from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from typing import List
from fastapi.responses import StreamingResponse, JSONResponse
from sqlalchemy.orm import Session 
from uuid import uuid4
from app.schemas.schema import chatRequest, chatResponse
from app.config.database import get_db , SessionLocal
from app.model import chat_models
from app.service.chat_management import stream_ai_response, create_chat, get_chat_by_id, delete_chat_by_id
from app.service.chat_management import get_all_chats

router = APIRouter()



# Test root endpoint

@router.get("/")
def root():
    return {"message": "Groq streaming chat API is running..."}



# Chat streaming endpoint 

@router.post("/chat/stream")
async def chat_stream(request: chatRequest, background_task: BackgroundTasks, db: Session = Depends(get_db)):
    prompt = request.prompt
    response = ""

    def generate():
        nonlocal response
        try:
            stream = stream_ai_response(prompt)
            for chunk in stream():
                response += chunk
                yield chunk
        except Exception as e:
            raise HTTPException(status_code=401, detail="streaming failed")
#  saving after streaming
    try:
        def save_chat():
            if response.strip():
                create_chat(db, prompt, response)
        
        background_task.add_task(save_chat)  

        return StreamingResponse(generate(), media_type="text/markdown")

    except:
        raise HTTPException(status_code=401, detail="saving chat to database failed")


# Get chat history by ID

@router.get("/chat/history/{chat_id}", response_model=chatResponse)
async def get_chat_history(chat_id: str, db: Session = Depends(get_db)):
    chat = get_chat_by_id(db, chat_id)
    if not chat:
        raise HTTPException(status_code=404, detail="Chat history not available")
    return chat

# get chat all chat history 

@router.get("/chat/history", response_model=list[chatResponse])
async def get_all_chat_history(db: Session = Depends(get_db)):
    chats = get_all_chats(db)
    return chats


# Delete chat by ID

@router.delete("/chat/history/delete/{chat_id}")
def delete_chat(chat_id: str, db: Session = Depends(get_db)):
    deleted = delete_chat_by_id(db, chat_id)
    if not deleted:
        raise HTTPException(status_code=404, detail=f"Chat with ID {chat_id} not found")
    return {"message": f"Chat with ID {chat_id} deleted successfully"}
