import { useState, useEffect } from "react";
import "./App.css";

// Markdown rendering libraries
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import remarkGfm from "remark-gfm";

function App() {
  const [repoUrl, setRepoUrl] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [ingestLoading, setIngestLoading] = useState(false);

  // Check for existing session
  useEffect(() => {
    const savedSessionId = localStorage.getItem("sessionId");
    const savedRepoUrl = localStorage.getItem("repoUrl");
    if (savedSessionId && savedRepoUrl) {
      setSessionId(savedSessionId);
      setRepoUrl(savedRepoUrl);
    }

    // Apply dark mode to body
    document.body.classList.add("dark-mode");
  }, []);

  const ingestRepository = async () => {
    if (!repoUrl) return;

    setIngestLoading(true);

    try {
      const response = await fetch("http://localhost:8000/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repo_url: repoUrl }),
      });

      const data = await response.json();
      setSessionId(data.session_id);

      // Save session info
      localStorage.setItem("sessionId", data.session_id);
      localStorage.setItem("repoUrl", repoUrl);

      // Add welcome message
      setMessages([{ role: "assistant", content: data.response }]);
    } catch (error) {
      console.error("Error:", error);
      setMessages([
        {
          role: "assistant",
          content: `Error ingesting repository: ${error.message}`,
        },
      ]);
    } finally {
      setIngestLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!query || !sessionId) return;

    // Add user message
    const userMessage = { role: "user", content: query };
    setMessages((prev) => [...prev, userMessage]);

    setLoading(true);
    setQuery("");

    try {
      const response = await fetch("http://localhost:8000/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId, query: query }),
      });

      const data = await response.json();

      // Add assistant message
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.answer },
      ]);
    } catch (error) {
      console.error("Error:", error);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `Error: ${error.message}` },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const resetSession = () => {
    localStorage.removeItem("sessionId");
    localStorage.removeItem("repoUrl");
    setSessionId("");
    setRepoUrl("");
    setMessages([]);
  };

  // Custom renderer for code blocks with syntax highlighting
  const renderers = {
    code({ node, inline, className, children, ...props }) {
      const match = /language-(\w+)/.exec(className || "");
      return !inline && match ? (
        <SyntaxHighlighter
          style={vscDarkPlus}
          language={match[1]}
          PreTag="div"
          {...props}
        >
          {String(children).replace(/\n$/, "")}
        </SyntaxHighlighter>
      ) : (
        <code className={className} {...props}>
          {children}
        </code>
      );
    },
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>Repository Pilot</h1>
        <p>Chat with any GitHub repository using natural language</p>
      </header>

      <main>
        {!sessionId ? (
          <div className="repo-form">
            <input
              type="text"
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              placeholder="Enter GitHub repository URL"
              disabled={ingestLoading}
            />
            <button
              onClick={ingestRepository}
              disabled={!repoUrl || ingestLoading}
              className="primary-button"
            >
              {ingestLoading ? (
                <>
                  <span className="spinner"></span>
                  Processing...
                </>
              ) : (
                "Ingest Repository"
              )}
            </button>
          </div>
        ) : (
          <>
            <div className="repo-info">
              <div className="repo-details">
                <span className="repo-label">Repository:</span>
                <span className="repo-url">{repoUrl}</span>
              </div>
              <button onClick={resetSession} className="secondary-button">
                Change Repository
              </button>
            </div>

            <div className="chat-container">
              <div className="messages">
                {messages.map((message, index) => (
                  <div key={index} className={`message ${message.role}`}>
                    <div className="message-header">
                      <div className="message-avatar">
                        {message.role === "user" ? "👤" : "🤖"}
                      </div>
                      <div className="message-role">
                        {message.role === "user" ? "You" : "Assistant"}
                      </div>
                    </div>
                    <div className="message-content">
                      <ReactMarkdown
                        children={message.content}
                        remarkPlugins={[remarkGfm]}
                        components={renderers}
                      />
                    </div>
                  </div>
                ))}
                {loading && (
                  <div className="message assistant">
                    <div className="message-header">
                      <div className="message-avatar">🤖</div>
                      <div className="message-role">Assistant</div>
                    </div>
                    <div className="message-content loading">
                      <div className="typing-indicator">
                        <span></span>
                        <span></span>
                        <span></span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="input-area">
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Ask about the repository..."
                  disabled={loading}
                  onKeyPress={(e) => e.key === "Enter" && sendMessage()}
                />
                <button
                  onClick={sendMessage}
                  disabled={!query || loading}
                  className="primary-button"
                >
                  Send
                </button>
              </div>
            </div>
          </>
        )}
      </main>

      <footer>
        <p>Powered by Supermemory & Gemini</p>
      </footer>
    </div>
  );
}

export default App;
