# YapHub 🚀

> Your GitHub repo, finally talking sense.

YapHub is an AI-powered repository documentation generator that transforms any GitHub repository into comprehensive, structured documentation. Using advanced LLM analysis, it creates detailed technical documentation with interactive chat capabilities for exploring codebases.

## 🌟 Features

- **📚 Comprehensive Documentation Generation**: AI-powered analysis creates structured documentation with multiple chapters
- **🤖 Interactive Repository Chat**: Chat with your repository using natural language queries
- **🔍 Smart Code Analysis**: Identifies key abstractions, relationships, and architectural patterns
- **📖 Beautiful Documentation Viewer**: Clean, organized documentation with syntax highlighting
- **⚡ Fast Repository Ingestion**: Efficiently processes GitHub repositories with smart filtering
- **🎯 Production-Ready**: Built with FastAPI backend and React frontend with proper error handling

## 🚨 Problem Statement

**The Challenge**: Understanding large codebases is time-consuming and overwhelming. Developers spend countless hours navigating unfamiliar repositories, trying to understand architecture, dependencies, and implementation patterns. Traditional documentation is often outdated or incomplete.

**The Solution**: YapHub automatically analyzes your repository and generates comprehensive, beginner-friendly documentation that explains:

- Core abstractions and components
- Relationships between different parts
- Data flow and architectural patterns
- Step-by-step explanations for newcomers

## 🏗️ Architecture

```
yaphub/
├── backend/                 # FastAPI backend
│   ├── main.py             # Main application with routes
│   ├── doc_generator.py    # Documentation generation logic
│   ├── llm_client.py       # LLM API client (Gemini)
│   ├── markdown_cleaner.py # Markdown processing utilities
│   └── requirements.txt    # Python dependencies
└── frontend/               # React frontend (Vite)
    ├── src/
    │   ├── components/     # React components
    │   │   ├── HomePage.jsx
    │   │   ├── GenerationPage.jsx
    │   │   ├── DocumentationViewer.jsx
    │   │   ├── Chat.jsx
    │   │   └── Navigation.jsx
    │   ├── App.jsx
    │   └── main.jsx
    ├── package.json
    └── vite.config.js
```

## 🚀 Getting Started

### Prerequisites

- **Node.js**: v18.0.0 or higher
- **Python**: 3.8 or higher
- **Git**: Latest version
- **Gemini API Key**: Get from [Google AI Studio](https://aistudio.google.com/app/apikey)

### 📦 Installation

#### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/yaphub.git
cd yaphub
```

#### 2. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

#### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install
```

#### 4. Environment Configuration

Create `.env` file in the backend directory:

```bash
# backend/.env
GEMINI_API_KEY=your_gemini_api_key_here
ALLOWED_ORIGINS=http://localhost:5173,https://your-domain.com
```

Create `.env` file in the frontend directory:

```bash
# frontend/.env
VITE_API_URL=http://localhost:8000
```

### 🏃‍♂️ Running the Application

#### Start Backend Server

```bash
cd backend
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

#### Start Frontend Development Server

```bash
cd frontend
npm run dev
```

The application will be available at:

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs

## 🔧 Usage

### 1. Repository Analysis

1. **Enter GitHub URL**: Paste any public GitHub repository URL
2. **Repository Ingestion**: The system analyzes the codebase structure
3. **Generate Documentation**: AI creates comprehensive documentation (6-8 minutes)
4. **Browse Documentation**: Navigate through chapters and sections

### 2. Interactive Chat

- Ask questions about the repository
- Get explanations of code functionality
- Explore relationships between components
- Understanding architectural decisions

### 3. Example Workflow

```bash
# Example repository URLs to try:
https://github.com/facebook/react
https://github.com/microsoft/vscode
https://github.com/vercel/next.js
```

## 🛠️ Key Dependencies

### Backend Dependencies

```txt
fastapi==0.115.12           # Web framework
uvicorn==0.34.2            # ASGI server
google-genai==1.16.1       # Gemini API client
gitingest==0.1.4           # Repository analysis
httpx==0.28.1              # HTTP client
python-dotenv==1.1.0       # Environment variables
pydantic==2.11.4           # Data validation
```

### Frontend Dependencies

```json
{
  "react": "^19.1.0",
  "react-dom": "^19.1.0",
  "react-router-dom": "^6.26.1",
  "react-markdown": "^10.1.0",
  "react-syntax-highlighter": "^15.5.0",
  "lucide-react": "^0.511.0",
  "tailwindcss": "^3.4.17",
  "vite": "^6.3.5"
}
```

## 🏗️ Development

### Backend Development

```bash
cd backend

# Run with auto-reload
uvicorn main:app --reload

# Run tests (if available)
pytest

# Format code
black .
```

### Frontend Development

```bash
cd frontend

# Development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Lint code
npm run lint
```

## 📚 API Documentation

### Main Endpoints

- **POST /ingest**: Ingest a GitHub repository
- **POST /generate-docs**: Generate comprehensive documentation
- **POST /chat**: Chat with repository content
- **GET /health**: Health check endpoint

### Rate Limiting

- **Per IP**: 30 requests per 60 seconds
- **Global**: 100 requests per minute
- **Session TTL**: 2 hours

## 🔒 Security Features

- **Rate Limiting**: Protection against abuse
- **Input Validation**: Sanitized user inputs
- **CORS Configuration**: Controlled cross-origin access
- **Session Management**: Automatic cleanup of expired sessions
- **Memory Management**: Efficient resource usage

## 🚀 Deployment

### Production Build

```bash
# Frontend
cd frontend
npm run build

# Backend
cd backend
pip install -r requirements.txt
```

### Environment Variables

```bash
# Production environment variables
GEMINI_API_KEY=your_production_api_key
ALLOWED_ORIGINS=https://your-domain.com
```

### Docker Deployment (Optional)

```dockerfile
# Dockerfile example for backend
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

## 🤝 Contributing

1. **Fork the repository**
2. **Create feature branch**: `git checkout -b feature/amazing-feature`
3. **Commit changes**: `git commit -m 'Add amazing feature'`
4. **Push to branch**: `git push origin feature/amazing-feature`
5. **Open Pull Request**

### Development Guidelines

- Follow PEP 8 for Python code
- Use ESLint/Prettier for JavaScript/React
- Write descriptive commit messages
- Add tests for new features
- Update documentation as needed

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- **Google Gemini API** for AI-powered analysis
- **GitIngest** for repository processing
- **React & FastAPI** for the robust foundation
- **Tailwind CSS** for beautiful styling

## 📞 Support

- **Issues**: Create a GitHub issue
- **Discussions**: Use GitHub Discussions
- **Email**: support@yaphub.com

## 🗺️ Roadmap

- [ ] Support for private repositories
- [ ] Multiple LLM provider support
- [ ] Team collaboration features
- [ ] Advanced code analysis
- [ ] Custom documentation templates
- [ ] API documentation generation
- [ ] Integration with popular IDEs

---

**Made with ❤️ by the YapHub Team**

_Transform your repositories into comprehensive documentation with the power of AI._
