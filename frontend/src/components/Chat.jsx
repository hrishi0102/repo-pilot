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
      const response = await fetch("http://localhost:8000/chat", {
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
          className="bg-gray-800 text-amber-200 px-1 py-0.5 rounded text-sm"
          {...props}
        >
          {children}
        </code>
      );
    },
  };

  if (!sessionId) {
    return (
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
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-8">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-gray-400 font-medium">Repository:</span>
            <span className="text-gray-200 ml-3 truncate">{repoUrl}</span>
          </div>
          <a
            href="/docs"
            className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2"
          >
            📖 Back to Docs
          </a>
        </div>
      </div>

      <div className="border border-gray-800 rounded-xl bg-gray-900 h-[600px] flex flex-col">
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex flex-col rounded-xl overflow-hidden max-w-4xl ${
                message.role === "user"
                  ? "self-end bg-gray-800 text-white ml-16"
                  : "self-start bg-gray-950 border border-gray-800 mr-16"
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
            <div className="self-start flex flex-col rounded-xl overflow-hidden max-w-4xl bg-gray-950 border border-gray-800 mr-16">
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

        <div className="border-t border-gray-800 p-6 flex gap-4">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ask about the repository..."
            disabled={loading}
            onKeyPress={(e) => e.key === "Enter" && sendMessage()}
            className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-600 focus:border-transparent disabled:bg-gray-700"
          />
          <button
            onClick={sendMessage}
            disabled={!query || loading}
            className="bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-lg px-6 py-3 transition disabled:bg-gray-800 disabled:cursor-not-allowed disabled:text-gray-500"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

export default Chat;
