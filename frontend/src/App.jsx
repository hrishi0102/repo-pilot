import { useState, useEffect } from "react";
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
        <code
          className="bg-gray-800 text-gray-200 px-1 py-0.5 rounded text-sm"
          {...props}
        >
          {children}
        </code>
      );
    },
  };

  return (
    <div className="bg-[#0f1525] text-gray-100 min-h-screen flex flex-col">
      <div className="max-w-4xl mx-auto px-4 flex flex-col min-h-screen w-full">
        <header className="text-center pt-8 pb-4">
          <h1 className="text-4xl font-bold mb-1 text-blue-400">
            Repository Pilot
          </h1>
          <p className="text-gray-400">
            Chat with any GitHub repository using natural language
          </p>
        </header>

        <main className="flex-1 flex flex-col justify-center pb-8">
          {!sessionId ? (
            <div className="w-full mx-auto flex gap-2">
              <input
                type="text"
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                placeholder="Enter GitHub repository URL"
                disabled={ingestLoading}
                className="flex-1 bg-[#1a202c] border border-[#2d3748] rounded-md px-4 py-2 text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-700 disabled:text-gray-500"
              />
              <button
                onClick={ingestRepository}
                disabled={!repoUrl || ingestLoading}
                className="bg-[#4a5568] hover:bg-[#2d3748] text-gray-100 font-medium rounded-md px-4 py-2 transition disabled:bg-gray-600 disabled:text-gray-400 disabled:cursor-not-allowed"
              >
                {ingestLoading ? (
                  <>
                    <span className="h-4 w-4 rounded-full border-2 border-gray-100 border-t-transparent animate-spin inline-block mr-2"></span>
                    Processing...
                  </>
                ) : (
                  "Ingest Repository"
                )}
              </button>
            </div>
          ) : (
            <>
              <div className="bg-[#1a202c] border border-[#2d3748] rounded-md p-3 mb-4 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className="text-gray-400 font-medium">Repository:</span>
                  <span className="text-gray-200 truncate max-w-md">
                    {repoUrl}
                  </span>
                </div>
                <button
                  onClick={resetSession}
                  className="bg-transparent hover:bg-[#2d3748] text-gray-300 border border-[#2d3748] rounded-md px-3 py-1 text-sm font-medium"
                >
                  Change Repository
                </button>
              </div>

              <div className="flex-1 flex flex-col border border-[#2d3748] rounded-md overflow-hidden bg-[#1a202c]">
                <div className="flex-1 overflow-y-auto py-3 px-4 flex flex-col gap-4 scrollbar">
                  {messages.map((message, index) => (
                    <div
                      key={index}
                      className={`flex flex-col rounded-md overflow-hidden max-w-[85%] ${
                        message.role === "user"
                          ? "self-end bg-blue-600 text-white"
                          : "self-start bg-[#2d3748] border border-[#4a5568]"
                      }`}
                    >
                      <div
                        className={`flex items-center gap-2 px-3 py-1 ${
                          message.role === "user"
                            ? "bg-black/20"
                            : "bg-black/20"
                        }`}
                      >
                        <div className="text-lg">
                          {message.role === "user" ? "👤" : "🤖"}
                        </div>
                        <div className="font-medium text-sm">
                          {message.role === "user" ? "You" : "Assistant"}
                        </div>
                      </div>
                      <div className="p-3">
                        <ReactMarkdown
                          components={renderers}
                          remarkPlugins={[remarkGfm]}
                        >
                          {message.content}
                        </ReactMarkdown>
                      </div>
                    </div>
                  ))}
                  {loading && (
                    <div className="self-start flex flex-col rounded-md overflow-hidden max-w-[85%] bg-[#2d3748] border border-[#4a5568]">
                      <div className="flex items-center gap-2 px-3 py-1 bg-black/20">
                        <div className="text-lg">🤖</div>
                        <div className="font-medium text-sm">Assistant</div>
                      </div>
                      <div className="p-3">
                        <div className="flex gap-1">
                          <span className="h-2 w-2 bg-gray-400 rounded-full animate-bounce"></span>
                          <span
                            className="h-2 w-2 bg-gray-400 rounded-full animate-bounce"
                            style={{ animationDelay: "0.2s" }}
                          ></span>
                          <span
                            className="h-2 w-2 bg-gray-400 rounded-full animate-bounce"
                            style={{ animationDelay: "0.4s" }}
                          ></span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="border-t border-[#2d3748] bg-[#1a202c] p-3 flex gap-2">
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Ask about the repository..."
                    disabled={loading}
                    onKeyPress={(e) => e.key === "Enter" && sendMessage()}
                    className="flex-1 bg-[#2d3748] border border-[#4a5568] rounded-md px-3 py-2 text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-600 disabled:text-gray-400"
                  />
                  <button
                    onClick={sendMessage}
                    disabled={!query || loading}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md px-4 py-2 transition disabled:bg-gray-600 disabled:text-gray-400 disabled:cursor-not-allowed"
                  >
                    Send
                  </button>
                </div>
              </div>
            </>
          )}
        </main>

        <footer className="text-center text-gray-500 text-xs py-2">
          Powered by Supermemory & Gemini
        </footer>
      </div>
    </div>
  );
}

export default App;
