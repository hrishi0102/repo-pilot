import os
import uuid
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
from gitingest import ingest_async
import httpx
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

# Initialize FastAPI
app = FastAPI(title="Repository Pilot API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory storage for conversations
conversations = {}

# Timeout settings
INGEST_TIMEOUT = 120.0  # 2 minutes for initial ingestion
CHAT_TIMEOUT = 60.0    # 1 minute for chat responses

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
            "summary": summary,  # Store these for fallback responses
            "tree": tree,
            "messages": [
                {"role": "system", "content": "You are a helpful repository assistant."},
                {"role": "user", "content": initial_message}
            ]
        }
        
        try:
            # Increase timeout for large repositories
            async with httpx.AsyncClient() as client:
                logger.info(f"Sending repository data to API for {request.repo_url}")
                response = await client.post(
                    "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
                    headers={
                        "Content-Type": "application/json",
                        "Authorization": f"Bearer {os.environ.get('GEMINI_API_KEY')}",
                    },
                    json={
                        "model": "gemini-2.0-flash",
                        "messages": conversations[session_id]["messages"]
                    },
                    timeout=INGEST_TIMEOUT  # Longer timeout for initial processing
                )
                
                # Log response status
                logger.info(f"API response status: {response.status_code}")
                
                # Process response
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
                
        except Exception as e:
            logger.error(f"API error during ingestion: {str(e)}")
            # Default response if API call fails
            default_response = "I've processed the repository information and am ready to answer your questions about it."
            conversations[session_id]["messages"].append(
                {"role": "assistant", "content": default_response}
            )
            
            return {
                "session_id": session_id,
                "message": "Repository ingested successfully",
                "repo_url": request.repo_url,
                "response": default_response
            }
            
    except Exception as e:
        logger.error(f"Ingestion error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error ingesting repository: {str(e)}")

@app.post("/chat")
async def chat_with_repo(request: ChatRequest):
    try:
        if request.session_id not in conversations:
            logger.warning(f"Session not found: {request.session_id}")
            raise HTTPException(status_code=404, detail="Session not found")
        
        # Log the received query
        logger.info(f"Received query for session {request.session_id}: {request.query}")
        
        # Add user message to conversation
        conversations[request.session_id]["messages"].append(
            {"role": "user", "content": request.query}
        )
        
        try:
            # Send request to API with increased timeout
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
                    headers={
                        "Content-Type": "application/json",
                        "Authorization": f"Bearer {os.environ.get('GEMINI_API_KEY')}",
                    },
                    json={
                        "model": "gemini-2.0-flash",
                        "messages": conversations[request.session_id]["messages"]
                    },
                    timeout=CHAT_TIMEOUT  # Increased timeout
                )
                
                # Log response status
                logger.info(f"API response status: {response.status_code}")
                
                # Process response
                result = response.json()
                assistant_response = result["choices"][0]["message"]["content"]
                
                # Add assistant response to conversation history
                conversations[request.session_id]["messages"].append(
                    {"role": "assistant", "content": assistant_response}
                )
                
                return {
                    "answer": assistant_response
                }
                
        except httpx.ReadTimeout:
            # Specific handling for timeout errors
            logger.warning("API request timed out, providing fallback response")
            
            # Generate a fallback response
            session = conversations[request.session_id]
            repo_url = session.get("repo_url", "the repository")
            
            fallback_response = (
                f"I'm sorry, but I'm having trouble processing your request about {repo_url} right now. "
                f"This might be because the repository is quite large or complex. "
                f"You can try asking a more specific question about a particular part of the code."
            )
            
            # Add fallback response to conversation history
            conversations[request.session_id]["messages"].append(
                {"role": "assistant", "content": fallback_response}
            )
            
            return {
                "answer": fallback_response,
                "note": "Fallback response due to timeout"
            }
            
        except Exception as e:
            # Log the error in detail
            logger.error(f"Error in chat API call: {str(e)}", exc_info=True)
            
            # Provide a better error message to the user
            return {
                "answer": "I'm having trouble connecting to the AI service. Please try again in a moment.",
                "error": str(e)
            }
            
    except Exception as e:
        # Log the error in detail
        logger.error(f"Unhandled error in chat endpoint: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error chatting with repository: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)