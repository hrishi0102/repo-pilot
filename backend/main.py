import os
import uuid
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
from gitingest import ingest_async
import httpx
import logging
from doc_generator import doc_generator

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

# In-memory storage for conversations (keeping existing chat functionality)
conversations = {}

# In-memory storage for ingested repositories
ingested_repos = {}

# Timeout settings
CHAT_TIMEOUT = 60.0

# Models
class RepoRequest(BaseModel):
    repo_url: str
    
class ChatRequest(BaseModel):
    session_id: str
    query: str

class DocsRequest(BaseModel):
    session_id: str

# Routes
@app.get("/")
async def root():
    return {"message": "Repository Pilot API is running"}

@app.post("/ingest")
async def ingest_repository(request: RepoRequest):
    """Simplified ingest endpoint - just ingests repo without calling LLM"""
    try:
        # Generate a unique session ID
        session_id = str(uuid.uuid4())
        
        logger.info(f"Ingesting repository: {request.repo_url}")
        
        # Ingest repository using gitingest
        summary, tree, content = await ingest_async(
            request.repo_url, 
            exclude_patterns={
                "tests/*", "docs/*", "assets/*", "data/*", "public/*"
                "examples/*", "images/*", "public/*", "static/*", 
                "temp/*", "venv/*", ".venv/*", "*test*", 
                "tests/*", "v1/*", "dist/*", "build/*", 
                "experimental/*", "deprecated/*", "misc/*", 
                "legacy/*", ".git/*", ".github/*", ".next/*", 
                ".vscode/*", "obj/*", "bin/*", "node_modules/*", 
                "*.log","package-lock.json"
            }
        )
        
        # Store ingested repository data
        ingested_repos[session_id] = {
            "repo_url": request.repo_url,
            "summary": summary,
            "tree": tree,
            "content": content,
            "ingested_at": "now"
        }
        
        logger.info(f"Repository ingested successfully: {session_id}")
        
        return {
            "session_id": session_id,
            "message": "Repository ingested successfully",
            "repo_url": request.repo_url,
            "summary": summary[:500] + "..." if len(summary) > 500 else summary  # Preview
        }
        
    except Exception as e:
        logger.error(f"Ingestion error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error ingesting repository: {str(e)}")

@app.post("/generate-docs")
async def generate_documentation(request: DocsRequest):
    """Generate comprehensive documentation for an ingested repository"""
    try:
        if request.session_id not in ingested_repos:
            logger.warning(f"Session not found for docs generation: {request.session_id}")
            raise HTTPException(status_code=404, detail="Session not found. Please ingest repository first.")
        
        repo_data = ingested_repos[request.session_id]
        logger.info(f"Starting documentation generation for session: {request.session_id}")
        
        # Generate documentation using our enhanced process
        result = await doc_generator.generate_full_documentation(
            repo_url=repo_data["repo_url"],
            summary=repo_data["summary"],
            tree=repo_data["tree"],
            content=repo_data["content"]
        )
        
        if "error" in result:
            logger.error(f"Documentation generation failed: {result['error']}")
            raise HTTPException(status_code=500, detail=result["error"])
        
        logger.info(f"Documentation generated successfully for session: {request.session_id}")
        
        return {
            "success": True,
            "session_id": request.session_id,
            "repo_url": result["repo_url"],
            "introduction": result["introduction"],
            "chapters": result["chapters"],
            "metadata": {
                "total_chapters": result["metadata"]["total_chapters"],
                "comprehensive_summary": result["metadata"]["comprehensive_summary"][:300] + "...",
                "abstractions_preview": result["metadata"]["abstractions"][:200] + "...",
                "chapter_structure": result["metadata"]["chapter_structure"]
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error in documentation generation: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error generating documentation: {str(e)}")

@app.post("/chat")
async def chat_with_repo(request: ChatRequest):
    """Existing chat functionality - unchanged"""
    try:
        if request.session_id not in conversations:
            # Initialize conversation from ingested repo if available
            if request.session_id in ingested_repos:
                repo_data = ingested_repos[request.session_id]
                
                initial_message = (
                    f"You are an AI assistant specialized in helping with code repositories. "
                    f"The following is a summary, structure, and content of a GitHub repository that I want you to become an expert on. "
                    f"I will ask you questions about this codebase, and you should use this context to provide accurate answers.\n\n"
                    f"REPOSITORY SUMMARY:\n{repo_data['summary']}\n\n"
                    f"REPOSITORY STRUCTURE:\n{repo_data['tree']}\n\n"
                    f"REPOSITORY CONTENT:\n{repo_data['content']}\n\n"
                    f"Please confirm you've processed this repository information."
                )
                
                conversations[request.session_id] = {
                    "repo_url": repo_data["repo_url"],
                    "messages": [
                        {"role": "system", "content": "You are a helpful repository assistant."},
                        {"role": "user", "content": initial_message}
                    ]
                }
            else:
                logger.warning(f"Session not found: {request.session_id}")
                raise HTTPException(status_code=404, detail="Session not found")
        
        # Add user message to conversation
        conversations[request.session_id]["messages"].append(
            {"role": "user", "content": request.query}
        )
        
        try:
            # Send request to API
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
                    timeout=CHAT_TIMEOUT
                )
                
                result = response.json()
                assistant_response = result["choices"][0]["message"]["content"]
                
                # Add assistant response to conversation history
                conversations[request.session_id]["messages"].append(
                    {"role": "assistant", "content": assistant_response}
                )
                
                return {"answer": assistant_response}
                
        except httpx.ReadTimeout:
            logger.warning("Chat API request timed out")
            fallback_response = "I'm sorry, but I'm having trouble processing your request right now. Please try asking a more specific question."
            
            conversations[request.session_id]["messages"].append(
                {"role": "assistant", "content": fallback_response}
            )
            
            return {"answer": fallback_response}
            
        except Exception as e:
            logger.error(f"Error in chat API call: {str(e)}")
            return {"answer": "I'm having trouble connecting to the AI service. Please try again in a moment."}
            
    except Exception as e:
        logger.error(f"Unhandled error in chat endpoint: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error chatting with repository: {str(e)}")

@app.get("/session/{session_id}")
async def get_session_info(session_id: str):
    """Get information about an ingested session"""
    if session_id in ingested_repos:
        repo_data = ingested_repos[session_id]
        return {
            "session_id": session_id,
            "repo_url": repo_data["repo_url"],
            "status": "ingested",
            "summary_preview": repo_data["summary"][:300] + "..." if len(repo_data["summary"]) > 300 else repo_data["summary"]
        }
    else:
        raise HTTPException(status_code=404, detail="Session not found")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)