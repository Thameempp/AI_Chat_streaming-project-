from app.config.database import SessionLocal
from app.model.chat_models import chat
import uuid

db = SessionLocal()
chat_id = str(uuid.uuid4())
chat = chat(id=chat_id, prompt="What is AI?", response="Artificial Intelligence is ...")
db.add(chat)
db.commit()
print(f"Inserted chat with ID: {chat_id}")
