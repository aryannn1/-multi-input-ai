import psycopg2
import os
from dotenv import load_dotenv
from pgvector.psycopg2 import register_vector

load_dotenv()

def get_db_connection():
    conn = psycopg2.connect(os.getenv("DATABASE_URL"))
    # Vector extension ko register karo
    register_vector(conn) 
    return conn