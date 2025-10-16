from fastapi import FastAPI, Request
from fastapi.responses import StreamingResponse
from groq import Groq
from dotenv import load_dotenv
from app.router.chat import router
from app.config.database import Base, engine
from app.model.chat_models import chat

import os 
import json

load_dotenv()
app = FastAPI(title="Groq chat Streaming API")


# CORS 
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # or ["http://localhost:5173"]
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)

Base.metadata.create_all(bind=engine)