
from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from typing import List
from fastapi.responses import StreamingResponse, JSONResponse
from sqlalchemy.orm import Session 
from uuid import uuid4
from app.schemas.schema import (
    # chatRequest, 
    # chatResponse,
    ChatMessageBase,
    ChatMessageCreate,
    ChatMessageRead,
    ChatSessionBase,
    ChatSessionCreate,
    ChatSessionRead
) 
from app.config.database import get_db , SessionLocal
from app.model import chat_models
from app.service.chat_management import (
    stream_ai_response, 
    create_chat_session, 
    get_chat_session, 
    delete_chat_session,
    create_chat_message, 
    delete_chat_message, 
    get_chat_messages_by_session)

from app.model.chat_models import ChatSession, ChatMessage


router = APIRouter()


# Test root endpoint

@router.get("/")
def root():
    return {"message": "Groq streaming chat API is running..."}


# creating a chat session


@router.post("/chat/session/")
async def start_chat_session(db: Session = Depends(get_db)):
    session = create_chat_session(db)
    return {"session_id": session.id, "created_at":session.created_at}


# -------------------------------------------- Chat streaming endpoint 


@router.post("/chat/session/{session_id}/message/", response_model=ChatMessageRead)
async def chat_stream(session_id: int, request: ChatMessageCreate, background_task: BackgroundTasks, db: Session = Depends(get_db)):
    prompt = request.prompt
    response = ""

    def generate():
        nonlocal response
        try:
            stream = stream_ai_response(prompt)
            for chunk in stream():
                response += chunk
                yield chunk
        except Exception:
            raise HTTPException(status_code=401, detail="streaming failed")
#  saving after streaming
    try:
        def save_chat():
            if response.strip():
                # existing_chat = db.query(ChatSession).filter(ChatSession.prompt == prompt).first()
                try:
                    create_chat_message(db, session_id, prompt, response)
                    print("chat message saved")
                except Exception as e:
                    print("Error saving chat message:", e)
                    db.rollback()
        background_task.add_task(save_chat)  
            # save_chat()
        return StreamingResponse(generate(), media_type="text/markdown")

    except:
        raise HTTPException(status_code=401, detail="saving chat to database failed")


# --------------------------------------------




@router.get("/chat/session/")
async def get_all_sessions(db: Session = Depends(get_db)):
    sessions = db.query(ChatSession).order_by(ChatSession.created_at.desc()).all()
    return sessions


# get all messages for a session 


@router.get("/chat/session/{session_id}/messages/", response_model=list[ChatMessageRead])
async def get_all_chat_sessions(session_id: int, db: Session = Depends(get_db)):
    session = get_chat_session(db, session_id)
    print(f"Looking for session with id: {session_id}")
    print(f"Found session: {session}")
    
    if not session:
        
        raise HTTPException(status_code=404, detail="chat session not found")
    
    messages = get_chat_messages_by_session(db, session_id)
    return messages


# Delete chat by Id


@router.delete("/chat/session/{session_id}")
def delete_session(session_id: int, db: Session = Depends(get_db)):
    deleted = delete_chat_session(db, session_id)
    if not deleted:
        raise HTTPException(status_code=404, detail=f"chat session with ID {session_id} not found")
    return {"message": f"chat session with ID {session_id} deleted successfully"}
