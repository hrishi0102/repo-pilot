import os
import uuid
import time
import asyncio
from datetime import datetime, timedelta
from collections import defaultdict
from fastapi import FastAPI, HTTPException, BackgroundTasks, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
from gitingest import ingest_async
import httpx
import logging
from doc_generator import doc_generator

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

# Validate required environment variables
required_env_vars = ['GEMINI_API_KEY']
missing_vars = [var for var in required_env_vars if not os.environ.get(var)]
if missing_vars:
    logger.error(f"Missing required environment variables: {missing_vars}")
    raise RuntimeError(f"Missing required environment variables: {missing_vars}")

# Initialize FastAPI
app = FastAPI(
    title="YapHub API",
    version="1.0.0",
    description="AI-powered repository documentation generator"
)

# CORS - Restrict in production
ALLOWED_ORIGINS = os.environ.get("ALLOWED_ORIGINS", "https://your-frontend-domain.com, http://localhost:5173").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

# Rate limiting storage
rate_limit_storage = defaultdict(list)
RATE_LIMIT_REQUESTS = 30  # requests per window
RATE_LIMIT_WINDOW = 60  # seconds
GLOBAL_RATE_LIMIT = 100  # global requests per minute

# Memory management settings
MAX_SESSIONS = 80  # Reduced for safety
SESSION_TTL_HOURS = 2  # Reduced TTL
CLEANUP_INTERVAL_MINUTES = 10  # More frequent cleanup
MAX_CONTENT_SIZE = 1024 * 1024  # 1MB max
MAX_REPO_SIZE = 100 * 1024 * 1024  # 100MB max repo size

# Timeout settings
CHAT_TIMEOUT = 45.0  # timeout
INGESTION_TIMEOUT = 300.0  # 5 minutes max for ingestion
DOCS_GENERATION_TIMEOUT = 600.0  # 10 minutes max for docs

# Enhanced storage with timestamps and metadata
conversations = {}
ingested_repos = {}
global_request_count = []

class SessionData:
    def __init__(self, session_id: str, repo_url: str, summary: str, tree: str, content: str, user_api_key: str = None):
        self.session_id = session_id
        self.repo_url = repo_url
        self.summary = summary
        self.tree = tree
        # Truncate content if too large
        self.content = content[:MAX_CONTENT_SIZE] if len(content) > MAX_CONTENT_SIZE else content
        self.user_api_key = user_api_key  # New field for user's API key
        self.created_at = datetime.now()
        self.last_accessed = datetime.now()
        self.content_size = len(content)
        self.request_count = 0
    
    def is_expired(self) -> bool:
        return datetime.now() - self.created_at > timedelta(hours=SESSION_TTL_HOURS)
    
    def touch(self):
        """Update last accessed time and increment request count"""
        self.last_accessed = datetime.now()
        self.request_count += 1
    
    def to_dict(self):
        return {
            "repo_url": self.repo_url,
            "summary": self.summary,
            "tree": self.tree,
            "content": self.content,
            "has_user_key": bool(self.user_api_key),
            "ingested_at": self.created_at.isoformat()
        }

class ConversationData:
    def __init__(self, session_id: str, repo_url: str):
        self.session_id = session_id
        self.repo_url = repo_url
        self.messages = [
            {"role": "system", "content": "You are a helpful repository assistant."}
        ]
        self.created_at = datetime.now()
        self.last_accessed = datetime.now()
        self.message_count = 0
    
    def is_expired(self) -> bool:
        return datetime.now() - self.created_at > timedelta(hours=SESSION_TTL_HOURS)
    
    def touch(self):
        self.last_accessed = datetime.now()
        self.message_count += 1

# Rate limiting functions
def get_client_ip(request: Request) -> str:
    """Get client IP address"""
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host

def is_rate_limited(client_ip: str) -> bool:
    """Check if client is rate limited"""
    now = time.time()
    
    # Clean old requests
    rate_limit_storage[client_ip] = [
        req_time for req_time in rate_limit_storage[client_ip]
        if now - req_time < RATE_LIMIT_WINDOW
    ]
    
    # Check rate limit
    if len(rate_limit_storage[client_ip]) >= RATE_LIMIT_REQUESTS:
        return True
    
    # Add current request
    rate_limit_storage[client_ip].append(now)
    return False

def is_globally_rate_limited() -> bool:
    """Check global rate limit"""
    now = time.time()
    
    # Clean old requests
    global_request_count[:] = [
        req_time for req_time in global_request_count
        if now - req_time < 60  # 1 minute window
    ]
    
    if len(global_request_count) >= GLOBAL_RATE_LIMIT:
        return True
    
    global_request_count.append(now)
    return False

# Middleware for rate limiting
@app.middleware("http")
async def rate_limit_middleware(request: Request, call_next):
    """Rate limiting middleware"""
    # Skip rate limiting for health checks
    if request.url.path in ["/", "/health"]:
        response = await call_next(request)
        return response
    
    client_ip = get_client_ip(request)
    
    # Check global rate limit
    if is_globally_rate_limited():
        logger.warning(f"Global rate limit exceeded")
        raise HTTPException(
            status_code=429, 
            detail="Service temporarily unavailable due to high load. Please try again later."
        )
    
    # Check per-IP rate limit
    if is_rate_limited(client_ip):
        logger.warning(f"Rate limit exceeded for IP: {client_ip}")
        raise HTTPException(
            status_code=429, 
            detail=f"Rate limit exceeded. Maximum {RATE_LIMIT_REQUESTS} requests per {RATE_LIMIT_WINDOW} seconds."
        )
    
    response = await call_next(request)
    return response

# Memory management functions (keeping existing functions unchanged)
def get_memory_usage():
    """Get current memory usage statistics"""
    total_sessions = len(ingested_repos)
    total_conversations = len(conversations)
    
    total_content_size = sum(
        len(session.content) + len(session.summary) + len(session.tree) 
        for session in ingested_repos.values()
    )
    
    total_message_size = sum(
        sum(len(str(msg)) for msg in conv.messages)
        for conv in conversations.values()
    )
    
    return {
        "total_sessions": total_sessions,
        "total_conversations": total_conversations,
        "content_size_mb": round(total_content_size / (1024 * 1024), 2),
        "message_size_mb": round(total_message_size / (1024 * 1024), 2),
        "total_size_mb": round((total_content_size + total_message_size) / (1024 * 1024), 2)
    }

def cleanup_expired_sessions():
    """Remove expired sessions and conversations"""
    current_time = datetime.now()
    
    # Cleanup expired ingested repos
    expired_repos = [
        session_id for session_id, session in ingested_repos.items()
        if session.is_expired()
    ]
    
    for session_id in expired_repos:
        del ingested_repos[session_id]
        logger.info(f"Cleaned up expired repo session: {session_id}")
    
    # Cleanup expired conversations
    expired_conversations = [
        session_id for session_id, conv in conversations.items()
        if conv.is_expired()
    ]
    
    for session_id in expired_conversations:
        del conversations[session_id]
        logger.info(f"Cleaned up expired conversation: {session_id}")
    
    # Clean rate limiting storage
    now = time.time()
    for ip in list(rate_limit_storage.keys()):
        rate_limit_storage[ip] = [
            req_time for req_time in rate_limit_storage[ip]
            if now - req_time < RATE_LIMIT_WINDOW
        ]
        if not rate_limit_storage[ip]:
            del rate_limit_storage[ip]
    
    # Log cleanup results
    if expired_repos or expired_conversations:
        memory_stats = get_memory_usage()
        logger.info(f"Cleanup completed - Repos: {len(expired_repos)}, Conversations: {len(expired_conversations)} | Memory: {memory_stats}")

def enforce_session_limits():
    """Enforce maximum session limits using LRU eviction"""
    if len(ingested_repos) <= MAX_SESSIONS:
        return
    
    # Sort by last accessed time (oldest first)
    sorted_sessions = sorted(
        ingested_repos.items(),
        key=lambda x: x[1].last_accessed
    )
    
    # Remove oldest sessions
    sessions_to_remove = len(ingested_repos) - MAX_SESSIONS
    for i in range(sessions_to_remove):
        session_id, session = sorted_sessions[i]
        del ingested_repos[session_id]
        # Also remove associated conversation
        if session_id in conversations:
            del conversations[session_id]
        logger.warning(f"Evicted session due to limit: {session_id}")
    
    logger.info(f"Enforced session limit: removed {sessions_to_remove} oldest sessions")

async def periodic_cleanup():
    """Background task for periodic cleanup"""
    while True:
        try:
            cleanup_expired_sessions()
            enforce_session_limits()
            
            # Log memory usage every cleanup
            memory_stats = get_memory_usage()
            
            # Warning if memory usage is high
            if memory_stats["total_size_mb"] > 200:
                logger.warning(f"High memory usage detected: {memory_stats}")
            else:
                logger.info(f"Memory usage: {memory_stats}")
            
        except Exception as e:
            logger.error(f"Error in periodic cleanup: {str(e)}")
        
        await asyncio.sleep(CLEANUP_INTERVAL_MINUTES * 60)

# Start background cleanup task
@app.on_event("startup")
async def startup_event():
    asyncio.create_task(periodic_cleanup())
    logger.info(f"Started background cleanup task (interval: {CLEANUP_INTERVAL_MINUTES} minutes)")
    logger.info(f"Rate limits: {RATE_LIMIT_REQUESTS} req/{RATE_LIMIT_WINDOW}s per IP, {GLOBAL_RATE_LIMIT} req/min global")

# Models
class RepoRequest(BaseModel):
    repo_url: str
    api_key: str = None  # New optional field for user's API key
    
class ChatRequest(BaseModel):
    session_id: str
    query: str

class DocsRequest(BaseModel):
    session_id: str

class MermaidRequest(BaseModel):
    session_id: str

class ValidateKeyRequest(BaseModel):
    api_key: str

# Routes
@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "Repository Pilot API is running",
        "version": "1.0.0",
        "status": "healthy"
    }

@app.get("/health")
async def health_check():
    """Comprehensive health check endpoint"""
    try:
        memory_stats = get_memory_usage()
        
        # Check if API key is available
        api_key_status = "configured" if os.environ.get('GEMINI_API_KEY') else "missing"
        
        # Check memory health
        memory_health = "healthy"
        if memory_stats["total_size_mb"] > 300:
            memory_health = "critical"
        elif memory_stats["total_size_mb"] > 200:
            memory_health = "warning"
        
        return {
            "status": "healthy",
            "timestamp": datetime.now().isoformat(),
            "memory": {
                **memory_stats,
                "health": memory_health
            },
            "limits": {
                "max_sessions": MAX_SESSIONS,
                "session_ttl_hours": SESSION_TTL_HOURS,
                "max_content_size_mb": MAX_CONTENT_SIZE / (1024 * 1024),
                "rate_limit_per_ip": f"{RATE_LIMIT_REQUESTS}/{RATE_LIMIT_WINDOW}s",
                "global_rate_limit": f"{GLOBAL_RATE_LIMIT}/min"
            },
            "api_key_status": api_key_status,
            "active_rate_limits": len(rate_limit_storage)
        }
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}")
        return {
            "status": "unhealthy",
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        }

@app.post("/validate-key")
async def validate_api_key(request: ValidateKeyRequest):
    """Validate user's Gemini API key"""
    try:
        if not request.api_key.strip():
            raise HTTPException(status_code=400, detail="API key is required")
        
        # Test the API key with a minimal request
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {request.api_key.strip()}",
                },
                json={
                    "model": "gemini-2.0-flash",
                    "messages": [{"role": "user", "content": "test"}],
                    "max_tokens": 5
                },
                timeout=10.0
            )
            
            if response.status_code == 200:
                return {"valid": True, "message": "API key is valid"}
            else:
                return {"valid": False, "message": "Invalid API key"}
                
    except Exception as e:
        logger.error(f"Error validating API key: {str(e)}")
        return {"valid": False, "message": "Error validating API key"}

@app.post("/ingest")
async def ingest_repository(request: RepoRequest):
    """Ingest repository with enhanced error handling and timeouts"""
    try:
        # Validate repo URL
        if not request.repo_url.strip():
            raise HTTPException(status_code=400, detail="Repository URL is required")
        
        if not (request.repo_url.startswith("https://github.com/") or 
                request.repo_url.startswith("http://github.com/")):
            raise HTTPException(status_code=400, detail="Only GitHub repositories are supported")
        
        # Run cleanup before ingesting new repo
        cleanup_expired_sessions()
        
        # Check if we're approaching limits
        if len(ingested_repos) >= MAX_SESSIONS:
            enforce_session_limits()
        
        # Generate a unique session ID
        session_id = str(uuid.uuid4())
        
        logger.info(f"Ingesting repository: {request.repo_url} | Session: {session_id} | User Key: {'Yes' if request.api_key else 'No'}")
        
        try:
            # Ingest repository with timeout
            summary, tree, content = await asyncio.wait_for(
                ingest_async(
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
                ),
                timeout=INGESTION_TIMEOUT
            )
        except asyncio.TimeoutError:
            logger.error(f"Ingestion timeout for {request.repo_url}")
            raise HTTPException(
                status_code=408, 
                detail="Repository ingestion timed out. The repository might be too large or complex."
            )
        
        # Check repo size
        total_size = len(summary) + len(tree) + len(content)
        if total_size > MAX_REPO_SIZE:
            logger.warning(f"Repository too large: {total_size / (1024*1024):.1f}MB")
            raise HTTPException(
                status_code=413, 
                detail=f"Repository too large ({total_size / (1024*1024):.1f}MB). Maximum size is {MAX_REPO_SIZE / (1024*1024)}MB."
            )
        
        # Store ingested repository data with metadata and user API key
        session_data = SessionData(
            session_id=session_id,
            repo_url=request.repo_url,
            summary=summary,
            tree=tree,
            content=content,
            user_api_key=request.api_key.strip() if request.api_key else None
        )
        ingested_repos[session_id] = session_data
        
        # Log ingestion with size info
        logger.info(f"Repository ingested successfully: {session_id} | Size: {session_data.content_size / 1024:.1f}KB | User Key: {'Yes' if request.api_key else 'No'}")
        
        # Check memory after ingestion
        memory_stats = get_memory_usage()
        if memory_stats["total_size_mb"] > 250:
            logger.warning(f"High memory usage after ingestion: {memory_stats}")
        
        return {
            "session_id": session_id,
            "message": "Repository ingested successfully",
            "repo_url": request.repo_url,
            "summary": summary[:500] + "..." if len(summary) > 500 else summary,
            "has_user_key": bool(request.api_key),
            "metadata": {
                "content_size_kb": round(session_data.content_size / 1024, 1),
                "total_size_kb": round(total_size / 1024, 1),
                "expires_at": (session_data.created_at + timedelta(hours=SESSION_TTL_HOURS)).isoformat()
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Ingestion error for {request.repo_url}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error ingesting repository: {str(e)}")

@app.post("/generate-docs")
async def generate_documentation(request: DocsRequest):
    """Generate comprehensive documentation with timeout protection"""
    try:
        if request.session_id not in ingested_repos:
            logger.warning(f"Session not found for docs generation: {request.session_id}")
            raise HTTPException(status_code=404, detail="Session not found or expired. Please ingest repository again.")
        
        session_data = ingested_repos[request.session_id]
        
        # Check if session is expired
        if session_data.is_expired():
            del ingested_repos[request.session_id]
            raise HTTPException(status_code=404, detail="Session expired. Please ingest repository again.")
        
        # Update last accessed time
        session_data.touch()
        
        logger.info(f"Starting documentation generation for session: {request.session_id} | User Key: {'Yes' if session_data.user_api_key else 'No'}")
        
        try:
            # Generate documentation with timeout - pass user API key if available
            result = await asyncio.wait_for(
                doc_generator.generate_full_documentation(
                    repo_url=session_data.repo_url,
                    summary=session_data.summary,
                    tree=session_data.tree,
                    content=session_data.content,
                    user_api_key=session_data.user_api_key  # Pass user's API key
                ),
                timeout=DOCS_GENERATION_TIMEOUT
            )
        except asyncio.TimeoutError:
            logger.error(f"Documentation generation timeout for session: {request.session_id}")
            raise HTTPException(
                status_code=408, 
                detail="Documentation generation timed out. The repository might be too complex."
            )
        
        if "error" in result:
            logger.error(f"Documentation generation failed: {result['error']}")
            raise HTTPException(status_code=500, detail=result["error"])
        
        logger.info(f"Documentation generated successfully for session: {request.session_id}")
          # Optional: Clear heavy content after docs generation to save memory
        original_size = session_data.content_size
        session_data.content = session_data.content[:50000]  # Keep first 50KB for chat
        logger.info(f"Reduced session content size from {original_size/1024:.1f}KB to {len(session_data.content)/1024:.1f}KB")
        
        return {
            "success": True,
            "session_id": request.session_id,
            "repo_url": result["repo_url"],
            "introduction": result["introduction"],
            "chapters": result["chapters"],
            "mermaid_diagrams": result.get("mermaid_diagrams", {}),
            "metadata": {
                "total_chapters": result["metadata"]["total_chapters"],
                "total_diagrams": result["metadata"].get("total_diagrams", 0),
                "comprehensive_summary": result["metadata"]["comprehensive_summary"][:300] + "...",
                "abstractions_preview": result["metadata"]["abstractions"][:200] + "...",
                "raw_chapter_structure": result["metadata"]["raw_chapter_structure"]
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error in documentation generation: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error generating documentation: {str(e)}")

@app.post("/generate-mermaid")
async def generate_mermaid_diagrams(request: MermaidRequest):
    """Generate mermaid diagrams for the repository"""
    try:
        if request.session_id not in ingested_repos:
            logger.warning(f"Session not found for mermaid generation: {request.session_id}")
            raise HTTPException(status_code=404, detail="Session not found or expired. Please ingest repository again.")
        
        session_data = ingested_repos[request.session_id]
        
        # Check if session is expired
        if session_data.is_expired():
            del ingested_repos[request.session_id]
            raise HTTPException(status_code=404, detail="Session expired. Please ingest repository again.")
        
        # Update last accessed time
        session_data.touch()
        
        logger.info(f"Starting mermaid diagram generation for session: {request.session_id}")
        
        try:
            # Import mermaid generator and doc generator
            from mermaid_generator import mermaid_generator
            from doc_generator import doc_generator
            
            # First, generate abstractions and relationships needed for diagrams
            logger.info("Generating abstractions for mermaid diagrams...")
            abstractions = await doc_generator.identify_abstractions(session_data.content, session_data.user_api_key)
            if not abstractions:
                abstractions = "No abstractions identified"
            
            logger.info("Generating comprehensive summary for mermaid diagrams...")
            summary = await doc_generator.generate_comprehensive_summary(session_data.content, session_data.user_api_key)
            if not summary:
                summary = session_data.summary
            
            logger.info("Analyzing relationships for mermaid diagrams...")
            relationships = await doc_generator.analyze_relationships(abstractions, summary, session_data.user_api_key)
            if not relationships:
                relationships = "No relationships identified"
            
            # Generate mermaid diagrams with timeout
            diagrams = await asyncio.wait_for(
                mermaid_generator.generate_all_diagrams(
                    repo_url=session_data.repo_url,
                    summary=summary,
                    tree=session_data.tree,
                    content=session_data.content,
                    abstractions=abstractions,
                    relationships=relationships,
                    user_api_key=session_data.user_api_key
                ),
                timeout=600.0  # 10 minutes for diagram generation
            )
        except asyncio.TimeoutError:
            logger.error(f"Mermaid generation timeout for session: {request.session_id}")
            raise HTTPException(
                status_code=408, 
                detail="Mermaid diagram generation timed out. The repository might be too complex."
            )
        
        logger.info(f"Mermaid diagrams generated successfully for session: {request.session_id}")
        
        return {
            "success": True,
            "session_id": request.session_id,
            "diagrams": diagrams,
            "total_diagrams": len(diagrams)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error in mermaid generation: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error generating mermaid diagrams: {str(e)}")

@app.post("/chat")
async def chat_with_repo(request: ChatRequest):
    """Chat with repository with enhanced security and rate limiting"""
    try:
        # Validate input
        if not request.query.strip():
            raise HTTPException(status_code=400, detail="Query cannot be empty")
        
        if len(request.query) > 2000:
            raise HTTPException(status_code=400, detail="Query too long. Maximum 2000 characters.")
        
        # Check if session exists and is not expired
        if request.session_id not in ingested_repos:
            raise HTTPException(status_code=404, detail="Session not found or expired")
        
        session_data = ingested_repos[request.session_id]
        if session_data.is_expired():
            del ingested_repos[request.session_id]
            if request.session_id in conversations:
                del conversations[request.session_id]
            raise HTTPException(status_code=404, detail="Session expired. Please ingest repository again.")
        
        # Update access time
        session_data.touch()
        
        # Initialize conversation if not exists
        if request.session_id not in conversations:
            initial_message = (
                f"You are an AI assistant specialized in helping with code repositories. "
                f"The following is a summary, structure, and content of a GitHub repository that I want you to become an expert on. "
                f"I will ask you questions about this codebase, and you should use this context to provide accurate answers.\n\n"
                f"REPOSITORY SUMMARY:\n{session_data.summary}\n\n"
                f"REPOSITORY STRUCTURE:\n{session_data.tree}\n\n"
                f"REPOSITORY CONTENT:\n{session_data.content}\n\n"
                f"Please confirm you've processed this repository information."
            )
            
            conversations[request.session_id] = ConversationData(request.session_id, session_data.repo_url)
            conversations[request.session_id].messages.append(
                {"role": "user", "content": initial_message}
            )
        else:
            conversations[request.session_id].touch()
        
        # Limit messages per session
        if conversations[request.session_id].message_count > 50:
            raise HTTPException(
                status_code=429, 
                detail="Maximum messages per session reached. Please start a new session."
            )
        
        # Add user message to conversation
        conversations[request.session_id].messages.append(
            {"role": "user", "content": request.query}
        )
        
        # Limit conversation history to prevent memory bloat
        if len(conversations[request.session_id].messages) > 15:
            conversations[request.session_id].messages = (
                conversations[request.session_id].messages[:1] + 
                conversations[request.session_id].messages[-14:]
            )
        
        # Determine which API key to use
        api_key = session_data.user_api_key if session_data.user_api_key else os.environ.get('GEMINI_API_KEY')
        
        try:
            # Send request to API with timeout
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
                    headers={
                        "Content-Type": "application/json",
                        "Authorization": f"Bearer {api_key}",
                    },
                    json={
                        "model": "gemini-2.0-flash",
                        "messages": conversations[request.session_id].messages
                    },
                    timeout=CHAT_TIMEOUT
                )
                
                if response.status_code != 200:
                    logger.error(f"Chat API error: {response.status_code} - {response.text}")
                    
                    # If user API key failed, try system key as fallback
                    if session_data.user_api_key and response.status_code == 401:
                        logger.info(f"User API key failed, trying system key as fallback for session: {request.session_id}")
                        
                        fallback_response = await client.post(
                            "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
                            headers={
                                "Content-Type": "application/json",
                                "Authorization": f"Bearer {os.environ.get('GEMINI_API_KEY')}",
                            },
                            json={
                                "model": "gemini-2.0-flash",
                                "messages": conversations[request.session_id].messages
                            },
                            timeout=CHAT_TIMEOUT
                        )
                        
                        if fallback_response.status_code == 200:
                            response = fallback_response
                        else:
                            raise HTTPException(status_code=502, detail="AI service temporarily unavailable")
                    else:
                        raise HTTPException(status_code=502, detail="AI service temporarily unavailable")
                
                result = response.json()
                assistant_response = result["choices"][0]["message"]["content"]
                
                # Add assistant response to conversation history
                conversations[request.session_id].messages.append(
                    {"role": "assistant", "content": assistant_response}
                )
                
                return {"answer": assistant_response}
                
        except httpx.ReadTimeout:
            logger.warning("Chat API request timed out")
            fallback_response = "I'm sorry, but I'm having trouble processing your request right now. Please try asking a more specific question."
            
            conversations[request.session_id].messages.append(
                {"role": "assistant", "content": fallback_response}
            )
            
            return {"answer": fallback_response}
            
        except Exception as e:
            logger.error(f"Error in chat API call: {str(e)}")
            return {"answer": "I'm having trouble connecting to the AI service. Please try again in a moment."}
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unhandled error in chat endpoint: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error chatting with repository: {str(e)}")

@app.get("/session/{session_id}")
async def get_session_info(session_id: str):
    """Get information about an ingested session"""
    if session_id in ingested_repos:
        session_data = ingested_repos[session_id]
        
        if session_data.is_expired():
            del ingested_repos[session_id]
            raise HTTPException(status_code=404, detail="Session expired")
        
        session_data.touch()
        
        return {
            "session_id": session_id,
            "repo_url": session_data.repo_url,
            "status": "active",
            "created_at": session_data.created_at.isoformat(),
            "expires_at": (session_data.created_at + timedelta(hours=SESSION_TTL_HOURS)).isoformat(),
            "content_size_kb": round(session_data.content_size / 1024, 1),
            "request_count": session_data.request_count,
            "has_user_key": bool(session_data.user_api_key),
            "summary_preview": session_data.summary[:300] + "..." if len(session_data.summary) > 300 else session_data.summary
        }
    else:
        raise HTTPException(status_code=404, detail="Session not found or expired")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)