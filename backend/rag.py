import pymupdf as fitz
import os
from database import get_db_connection
from dotenv import load_dotenv
from google import genai
import psycopg2

load_dotenv()

# Google Gemini Client
client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

def init_db():
    """Ye function database table pehle hi bana dega"""
    conn = get_db_connection()
    cursor = conn.cursor()
    # Naya table jisme 768 dimensions hain (Gemini embedding ke liye)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS doc_chunks (
            id SERIAL PRIMARY KEY,
            filename TEXT,
            content TEXT,
            embedding vector(768)
        );
    """)
    conn.commit()
    cursor.close()
    conn.close()

# Server start hote hi table bana do
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
            contents=text
        )
        return response.embeddings[0].values
    except Exception as e:
        print(f"Embedding Error: {e}")
        return [0.0] * 768 # Fallback empty vector

def process_and_store_pdf(pdf_path: str, filename: str):
    text = extract_text_from_pdf(pdf_path)
    chunks = chunk_text(text)
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Purana data delete karo (agar same file dobara upload ho)
    cursor.execute("DELETE FROM doc_chunks WHERE filename = %s", (filename,))
    
    for chunk in chunks:
        embedding = get_embedding(chunk)
        cursor.execute(
            "INSERT INTO doc_chunks (filename, content, embedding) VALUES (%s, %s, %s)",
            (filename, chunk, embedding)
        )
        
    conn.commit()
    cursor.close()
    conn.close()
    return len(chunks)

import pymupdf as fitz
import os
from database import get_db_connection
from dotenv import load_dotenv
from google import genai
from tavily import TavilyClient
from datetime import datetime

load_dotenv()

# Clients Setup
client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
tavily = TavilyClient(api_key=os.getenv("TAVILY_API_KEY"))

# ... (init_db, extract_text_from_pdf, chunk_text, get_embedding, process_and_store_pdf functions waise hi rahenge)

def ask_question_stream(question: str):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    question_embedding = get_embedding(question)
    
    cursor.execute("""
        SELECT content FROM doc_chunks 
        ORDER BY embedding <=> %s::vector 
        LIMIT 1;
    """, (question_embedding,))
    
    results = cursor.fetchall()
    cursor.close()
    conn.close()

    context = ""
    if results:
        context = results[0][0]

    # AI se pehle poocho ki kya usko search karni chahiye?
    # Hum ek chhota sa prompt banayenge jo decide karega
    decision_prompt = f"""You are a router. Based on the user's question, decide if you need to search the internet for current information.
If the question asks about current events, recent news, or specific facts that might have changed (like current presidents, weather), reply with 'SEARCH'.
If the question is general knowledge, coding, or related to the provided context, reply with 'NO_SEARCH'.

Context available: {context if context else "None"}

Question: {question}
Decision:"""

    try:
        # Decide karo search karni hai ya nahi
        decision_response = client.models.generate_content(
            model="gemini-3.5-flash-lite",
            contents=decision_prompt
        )
        decision = decision_response.text.strip().upper()

        search_context = ""
        if "SEARCH" in decision:
            # Agar search karni hai, toh Tavily se internet search karo
            print(f"🌐 Web Search triggered for: {question}")
            search_result = tavily.search(query=question, search_depth="basic", max_results=3)
            search_context = "\n".join([f"Source: {res['url']}\n{res['content']}" for res in search_result['results']])

        # Final prompt banao (PDF context + Web context)
            final_prompt = f"""You are an expert AI Research Assistant. Today's date is {datetime.now().strftime("%B %d, %Y")}.
        
Context from User's PDF:
{context if context else "No PDF context."}

Live Web Search Results:
{search_context if search_context else "No web search performed."}

Instructions for your response:
1. Structure your answer beautifully.
2. ALWAYS start with a main heading (e.g., ### Title).
3. Break down the explanation into small paragraphs and use bullet points (using '- ') for lists.
4. Use bold text (**like this**) for important keywords.
5. Keep the language professional, accurate, and easy to read.

Question: {question}
Answer:"""
        # Final Answer Stream karo
        response = client.models.generate_content_stream(
            model="gemini-3.5-flash-lite",
            contents=final_prompt
        )
        
        for chunk in response:
            if chunk.text:
                yield chunk.text
                
    except Exception as e:
        yield f"Error: {str(e)}"