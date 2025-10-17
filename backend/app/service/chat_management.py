# app/service/chat_management.py
from fastapi.responses import JSONResponse
from app.model.chat_models import chat
from sqlalchemy.orm import Session
from app.config.database import client
from app.schemas import schema
from app.model import chat_models


# Streaming AI response generator
def stream_ai_response(prompt: str):
    def generate():
        stream = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": "You are a helpful AI assistant."},
                {"role": "user", "content": prompt}
            ],
            stream=True
        )
        for chunk in stream:
            if chunk.choices[0].delta.content:
                yield chunk.choices[0].delta.content
    return generate


# crud functions


from app.model.chat_models import chat
from sqlalchemy.orm import Session


def create_chat(db: Session, prompt: str, response: str):
    new_chat = chat(prompt=prompt, response=response)
    db.add(new_chat)
    db.commit()
    db.refresh(new_chat)
    return new_chat

# get chat by id
def get_chat_by_id(db: Session, chat_id: schema.chatRead):
    return db.query(chat).filter(chat.id == chat_id).first()

# get all chat
def get_all_chats(db: Session):
    return db.query(chat_models.chat).all()


def delete_chat_by_id(db: Session, chat_id: str):
    db_chat = db.query(chat).filter(chat.id == chat_id).first()
    if not db_chat:
        return None
    else:
        db.delete(db_chat)
        db.commit()
        return True
