import os
import uuid
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
from gitingest import ingest_async
import httpx
import json

# Load environment variables
load_dotenv()

# Initialize FastAPI
app = FastAPI(title="Repository Pilot API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For production, specify your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory storage for conversations (for MVP)
conversations = {}

# Models
class RepoRequest(BaseModel):
    repo_url: str
    
class ChatRequest(BaseModel):
    session_id: str
    query: str

# Routes
@app.get("/")
async def root():
    return {"message": "Repository Pilot API is running"}

@app.post("/ingest")
async def ingest_repository(request: RepoRequest):
    try:
        # Generate a unique session ID
        session_id = str(uuid.uuid4())
        
        # Ingest repository using gitingest
        summary, tree, content = await ingest_async(
            request.repo_url, 
            exclude_patterns={
                "tests/*", "docs/*", "assets/*", "data/*", 
                "examples/*", "images/*", "public/*", "static/*", 
                "temp/*", "venv/*", ".venv/*", "*test*", 
                "tests/*", "v1/*", "dist/*", "build/*", 
                "experimental/*", "deprecated/*", "misc/*", 
                "legacy/*", ".git/*", ".github/*", ".next/*", 
                ".vscode/*", "obj/*", "bin/*", "node_modules/*", 
                "*.log"
            }
        )
        
        # Initialize conversation with repository context
        initial_message = (
            f"You are an AI assistant specialized in helping with code repositories. "
            f"The following is a summary, structure, and content of a GitHub repository that I want you to become an expert on. "
            f"I will ask you questions about this codebase, and you should use this context to provide accurate answers.\n\n"
            f"REPOSITORY SUMMARY:\n{summary}\n\n"
            f"REPOSITORY STRUCTURE:\n{tree}\n\n"
            f"REPOSITORY CONTENT:\n{content}\n\n"
            f"Please confirm you've processed this repository information."
        )
        
        # Store session
        conversations[session_id] = {
            "repo_url": request.repo_url,
            "messages": [
                {"role": "system", "content": "You are a helpful repository assistant."},
                {"role": "user", "content": initial_message}
            ]
        }
        
        # Send initial message to Supermemory Model Enhancer
        try:
            # Changed to use OpenAI endpoint for simplicity - you can update to your preferred endpoint
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    "https://api.supermemory.ai/v3/https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
                    headers={
                        "Content-Type": "application/json",
                        "Authorization": f"Bearer {os.environ.get('GEMINI_API_KEY')}",
                        "x-api-key": os.environ.get('SUPERMEMORY_API_KEY')
                    },
                    json={
                        "model": "gemini-2.0-flash",  # Or another suitable model
                        "messages": conversations[session_id]["messages"]
                    },
                    timeout=60.0  # Longer timeout for initial processing
                )
                
                # Check if response is successful
                response.raise_for_status()
                
                # Parse JSON response
                result = response.json()
                assistant_response = result["choices"][0]["message"]["content"]
                
                # Add assistant response to conversation history
                conversations[session_id]["messages"].append(
                    {"role": "assistant", "content": assistant_response}
                )
                
                return {
                    "session_id": session_id,
                    "message": "Repository ingested successfully",
                    "repo_url": request.repo_url,
                    "response": assistant_response
                }
                
        except httpx.HTTPStatusError as e:
            # Handle HTTP errors (like 404, 500, etc.)
            error_info = f"HTTP error: {e.response.status_code}"
            if e.response.content:
                try:
                    error_detail = e.response.json()
                    error_info += f" - {json.dumps(error_detail)}"
                except:
                    error_info += f" - {e.response.text}"
            
            # For MVP, we'll provide a default response
            default_response = "I've processed the repository information and am ready to answer your questions about it."
            conversations[session_id]["messages"].append(
                {"role": "assistant", "content": default_response}
            )
            
            return {
                "session_id": session_id,
                "message": "Repository ingested with warnings",
                "repo_url": request.repo_url,
                "response": default_response,
                "warning": error_info
            }
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error ingesting repository: {str(e)}")

@app.post("/chat")
async def chat_with_repo(request: ChatRequest):
    try:
        if request.session_id not in conversations:
            raise HTTPException(status_code=404, detail="Session not found")
        
        # Add user message to conversation
        conversations[request.session_id]["messages"].append(
            {"role": "user", "content": request.query}
        )
        
        # Send conversation to Supermemory Model Enhancer
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    "https://api.supermemory.ai/v3/https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
                    headers={
                        "Content-Type": "application/json",
                        "Authorization": f"Bearer {os.environ.get('GEMINI_API_KEY')}",
                        "x-api-key": os.environ.get('SUPERMEMORY_API_KEY')
                    },
                    json={
                        "model": "gemini-2.0-flash",  # Or another suitable model
                        "messages": conversations[request.session_id]["messages"]
                    }
                )
                
                # Check if response is successful
                response.raise_for_status()
                
                # Parse JSON response
                result = response.json()
                assistant_response = result["choices"][0]["message"]["content"]
                
                # Add assistant response to conversation history
                conversations[request.session_id]["messages"].append(
                    {"role": "assistant", "content": assistant_response}
                )
                
                return {
                    "answer": assistant_response
                }
                
        except httpx.HTTPStatusError as e:
            # Handle HTTP errors
            error_info = f"HTTP error: {e.response.status_code}"
            if e.response.content:
                try:
                    error_detail = e.response.json()
                    error_info += f" - {json.dumps(error_detail)}"
                except:
                    error_info += f" - {e.response.text}"
            
            return {
                "answer": f"I'm having trouble processing your question. Please try again.",
                "error": error_info
            }
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error chatting with repository: {str(e)}")

# Run the application
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)