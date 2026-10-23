import pymupdf as fitz
import os
import gc
from database import get_db_connection
from dotenv import load_dotenv
from google import genai
from google.genai import types
from tavily import TavilyClient
from datetime import datetime

load_dotenv()

client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
tavily = TavilyClient(api_key=os.getenv("TAVILY_API_KEY"))

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()
    # User ID ke saath doc_chunks table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS doc_chunks (
            id SERIAL PRIMARY KEY,
            user_id TEXT NOT NULL,
            filename TEXT,
            content TEXT,
            embedding vector(768)
        );
    """)
    # Chat History table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS chat_history (
            id SERIAL PRIMARY KEY,
            user_id TEXT NOT NULL,
            role TEXT NOT NULL,
            message TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    """)
    conn.commit()
    cursor.close()
    conn.close()

init_db()

def extract_text_from_pdf(pdf_path: str):
    doc = fitz.open(pdf_path)
    return "".join([page.get_text() for page in doc])

def chunk_text(text: str, chunk_size: int = 500):
    words = text.split()
    chunks, current_chunk, current_length = [], [], 0
    for word in words:
        current_length += len(word) + 1
        if current_length > chunk_size:
            chunks.append(" ".join(current_chunk))
            current_chunk = [word]
            current_length = len(word)
        else:
            current_chunk.append(word)
    if current_chunk:
        chunks.append(" ".join(current_chunk))
    return chunks

def get_embedding(text: str):
    try:
        response = client.models.embed_content(
            model="gemini-embedding-001",
            contents=text,
            config=types.EmbedContentConfig(output_dimensionality=768)
        )
        return response.embeddings[0].values
    except Exception as e:
        print(f"Embedding Error: {e}")
        return None

def process_and_store_pdf(pdf_path: str, filename: str, user_id: str):
    try:
        text = extract_text_from_pdf(pdf_path)
        chunks = chunk_text(text)
        del text
        gc.collect()
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # SIRF IS USER ka purana data delete karo
        cursor.execute("DELETE FROM doc_chunks WHERE user_id = %s;", (user_id,))
        
        for i, chunk in enumerate(chunks):
            embedding = get_embedding(chunk)
            if embedding:
                cursor.execute(
                    "INSERT INTO doc_chunks (user_id, filename, content, embedding) VALUES (%s, %s, %s, %s)",
                    (user_id, filename, chunk, embedding)
                )
            del embedding
            gc.collect()
            
        conn.commit()
        cursor.close()
        conn.close()
        return len(chunks)
    except Exception as e:
        print(f"Error in process: {e}")
        return 0

def ask_question_stream(question: str, user_id: str):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # User ke sawaal ka vector
        question_embedding = get_embedding(question)
        
        # SIRF IS USER ki PDF se context nikaalo
        context = ""
        if question_embedding:
            cursor.execute("""
                SELECT content FROM doc_chunks 
                WHERE user_id = %s 
                ORDER BY embedding <=> %s::vector LIMIT 3;
            """, (user_id, question_embedding,))
            results = cursor.fetchall()
            context = "\n\n".join([row[0] for row in results]) if results else ""

        # Purani chat history nikaalo
        cursor.execute("""
            SELECT role, message FROM chat_history 
            WHERE user_id = %s ORDER BY created_at DESC LIMIT 6;
        """, (user_id,))
        history = cursor.fetchall()[::-1]
        history_text = "\n".join([f"{r}: {m}" for r, m in history])

        # User ka sawaal save karo
        cursor.execute("INSERT INTO chat_history (user_id, role, message) VALUES (%s, 'user', %s)", (user_id, question))
        conn.commit()

        # Final Prompt
        final_prompt = f"""You are a helpful personal AI assistant for this specific user. 
Here is your past conversation with them:
{history_text if history_text else "No previous history."}

Here is the context from their uploaded document:
{context if context else "No document uploaded."}

Question: {question}
Answer accurately in English. Format your answer beautifully."""

        response = client.models.generate_content_stream(
            model="gemini-3.5-flash-lite",
            contents=final_prompt
        )
        
        full_response = ""
        for chunk in response:
            if chunk.text:
                full_response += chunk.text
                yield chunk.text
                
        # AI ka jawab save karo
        cursor.execute("INSERT INTO chat_history (user_id, role, message) VALUES (%s, 'ai', %s)", (user_id, full_response))
        conn.commit()
        cursor.close()
        conn.close()
    except Exception as e:
        yield f"Error: {str(e)}"