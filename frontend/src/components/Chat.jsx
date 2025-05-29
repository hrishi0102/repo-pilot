import { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import remarkGfm from "remark-gfm";

function Chat() {
  const [sessionId, setSessionId] = useState("");
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [repoUrl, setRepoUrl] = useState("");

  useEffect(() => {
    const savedSessionId = localStorage.getItem("sessionId");
    const savedRepoUrl = localStorage.getItem("repoUrl");
    if (savedSessionId && savedRepoUrl) {
      setSessionId(savedSessionId);
      setRepoUrl(savedRepoUrl);
    }
  }, []);

  const sendMessage = async () => {
    if (!query || !sessionId) return;

    const userMessage = { role: "user", content: query };
    setMessages((prev) => [...prev, userMessage]);
    setLoading(true);
    setQuery("");

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId, query: query }),
      });

      const data = await response.json();
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

  const markdownComponents = {
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
          className="bg-gray-800 text-amber-200 px-1 py-0.5 rounded text-sm font-mono"
          {...props}
        >
          {children}
        </code>
      );
    },
  };

  if (!sessionId) {
    return (
      <div className="min-h-screen bg-black pt-16">
        <div className="max-w-4xl mx-auto px-6 py-16">
          <div className="text-center text-gray-400">
            <p className="text-lg mb-4">No repository session found.</p>
            <p className="text-sm mb-8">
              Please ingest a repository first to start chatting.
            </p>
            <a
              href="/"
              className="bg-gray-700 hover:bg-gray-600 text-white px-6 py-3 rounded-lg font-medium transition"
            >
              Go to Home
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black pt-16">
      <div className="max-w-6xl mx-auto px-6 py-6">
        {/* Repository Info Header */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <span className="text-gray-400 font-medium text-sm">
                Repository:
              </span>
              <span className="text-gray-200 font-mono text-sm truncate max-w-md">
                {repoUrl}
              </span>
            </div>
            <a
              href="/docs"
              className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2"
            >
              📖 Back to Docs
            </a>
          </div>
        </div>

        {/* Chat Interface */}
        <div className="border border-gray-800 rounded-xl bg-gray-900 flex flex-col">
          {/* Chat Messages Area */}
          <div
            className="flex-1 overflow-y-auto p-6 space-y-6"
            style={{ height: "calc(100vh - 280px)", minHeight: "400px" }}
          >
            {messages.length === 0 && (
              <div className="text-center py-12">
                <div className="text-gray-500 mb-4">
                  <svg
                    className="w-16 h-16 mx-auto mb-4 opacity-50"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1}
                      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                    />
                  </svg>
                  <p className="text-lg">
                    Start a conversation about your repository
                  </p>
                  <p className="text-sm mt-2">
                    Ask questions about the code, architecture, or functionality
                  </p>
                </div>
              </div>
            )}

            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex flex-col rounded-xl overflow-hidden max-w-4xl ${
                  message.role === "user"
                    ? "self-end bg-gray-800 text-white ml-12"
                    : "self-start bg-gray-950 border border-gray-800 mr-12"
                }`}
              >
                <div
                  className={`flex items-center gap-3 px-4 py-3 text-sm font-medium ${
                    message.role === "user" ? "bg-gray-700" : "bg-gray-900"
                  }`}
                >
                  <span>{message.role === "user" ? "👤" : "🤖"}</span>
                  <span>{message.role === "user" ? "You" : "Assistant"}</span>
                </div>
                <div className="p-4">
                  <ReactMarkdown
                    components={markdownComponents}
                    remarkPlugins={[remarkGfm]}
                  >
                    {message.content}
                  </ReactMarkdown>
                </div>
              </div>
            ))}

            {loading && (
              <div className="self-start flex flex-col rounded-xl overflow-hidden max-w-4xl bg-gray-950 border border-gray-800 mr-12">
                <div className="flex items-center gap-3 px-4 py-3 bg-gray-900 text-sm font-medium">
                  <span>🤖</span>
                  <span>Assistant</span>
                </div>
                <div className="p-4">
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

          {/* Input Area */}
          <div className="border-t border-gray-800 p-4 bg-gray-900">
            <div className="flex gap-3">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Ask about the repository..."
                disabled={loading}
                onKeyPress={(e) =>
                  e.key === "Enter" && !loading && sendMessage()
                }
                className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-transparent disabled:bg-gray-700 disabled:cursor-not-allowed"
              />
              <button
                onClick={sendMessage}
                disabled={!query.trim() || loading}
                className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-medium rounded-lg px-6 py-3 transition-colors duration-200 flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Sending...</span>
                  </>
                ) : (
                  <>
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                      />
                    </svg>
                    <span>Send</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Chat;
