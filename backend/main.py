from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from database import get_db_connection
from rag import process_and_store_pdf, ask_question_stream
import shutil
import os

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "Backend is running securely!"}

@app.post("/upload")
async def upload_document(user_id: str = Form(...), file: UploadFile = File(...)):
    temp_file_path = f"temp_{file.filename}"
    with open(temp_file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    try:
        chunks_count = process_and_store_pdf(temp_file_path, file.filename, user_id)
        return {"message": f"Successfully processed {file.filename}", "chunks": chunks_count}
    except Exception as e:
        return {"error": str(e)}
    finally:
        if os.path.exists(temp_file_path):
            os.remove(temp_file_path)

@app.post("/chat")
async def chat(user_id: str = Form(...), question: str = Form(...)):
    return StreamingResponse(ask_question_stream(question, user_id), media_type="text/plain")