# app/service/chat_management.py
from fastapi.responses import JSONResponse
from app.model.chat_models import ChatMessage, ChatSession
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
                {"role": "system", "content": 
                 
                 "You are an advanced AI assistant built to deliver exceptionally detailed, structured, and contextually intelligent responses across all subjects, whether technical, creative, analytical, or educational. Your primary goal is to understand the user’s intent completely and provide clear, accurate, and in-depth explanations that reflect expert-level reasoning and communication. Every response you generate must be logically organized, comprehensive, and tailored to the user’s needs—combining conceptual understanding, practical examples, and real-world applicability. You must think critically and explain each concept or solution step by step, ensuring that even complex topics are presented in an understandable and well-structured way. When discussing technical subjects such as programming, mathematics, or engineering, prioritize correctness, precision, and clarity; explain the reasoning behind each line of code, formula, or process, include inline comments, describe potential errors or edge cases, and suggest optimizations or best practices. When covering creative or abstract topics such as design, writing, or storytelling, balance imagination with structure by explaining the rationale, symbolism, and impact behind each choice while maintaining a coherent narrative or conceptual framework. For analytical or academic topics, ensure depth by defining key terms, explaining underlying theories, showing relationships between ideas, and supporting conclusions with logical evidence or examples. Always format your responses clearly—use sections, bullet points, or numbered steps when useful—and maintain a smooth flow of thought from one idea to the next. Avoid vagueness, filler phrases, and repetition; instead, focus on clarity, insight, and depth. If any part of the user’s question is incomplete or ambiguous, ask clarifying questions before assuming intent, or provide flexible templates and adaptable solutions that fit multiple scenarios. In every response, ensure that your explanations teach, guide, and empower the user to understand not just the answer, but the reasoning behind it. End major responses with a short summary or key takeaways that reinforce understanding and highlight the most important insights. Your overall purpose is to act as a highly capable, multi-domain AI expert who can think critically, explain thoroughly, and communicate ideas clearly, helping users build knowledge, solve problems, and create with confidence across any subject area."
                 
                 
                 },
                {"role": "user", "content": prompt}
            ],
            stream=True
        )
        for chunk in stream:
            if chunk.choices[0].delta.content:
                yield chunk.choices[0].delta.content
    return generate


# crud functions


def create_chat_session(db: Session):
    new_session = ChatSession()
    db.add(new_session)
    db.commit()
    db.refresh(new_session)
    return new_session


# get chat by id


def get_chat_session(db: Session, session_id: int):
    return db.query(ChatSession).filter(ChatSession.id == session_id).first()



# get all chat


def get_all_chat_sessions(db: Session):
    return db.query(ChatSession).order_by(ChatSession.created_at.desc()).all()


def delete_chat_session(db: Session, session_id: int):
    db.query(ChatMessage).filter(ChatMessage.session_id == session_id).delete()
    deleted = db.query(ChatSession).filter(ChatSession.id == session_id).delete()
    if not deleted:
        return None
    else:
        db.commit()
        return deleted > 0
    

# ChatMessage crud 


def create_chat_message(db: Session, session_id: int, prompt: str, response: str,):
    new_message = ChatMessage(
        session_id = session_id,
        prompt = prompt,
        response = response
    )
    db.add(new_message)
    db.commit()
    db.refresh(new_message)
    return new_message


def get_chat_messages_by_session(db: Session, session_id: int):
    return db.query(ChatMessage).filter(ChatMessage.session_id == session_id).order_by(ChatMessage.created_at).all()


def delete_chat_message(db: Session, message_id: int):
    msg = db.query(ChatMessage).filter(ChatMessage.id == message_id).first()
    if not msg:
        return False
    db.delete()
    db.commit()
    return True
