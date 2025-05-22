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
          className="bg-gray-800 text-gray-200 px-1 py-0.5 rounded text-sm"
          {...props}
        >
          {children}
        </code>
      );
    },
  };

  if (!sessionId) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="text-center text-gray-400">
          <p className="mb-4">No repository session found.</p>
          <p className="text-sm">
            Please ingest a repository first to start chatting.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="bg-[#1a202c] border border-[#2d3748] rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-gray-400 font-medium">Repository:</span>
            <span className="text-gray-200 ml-2 truncate">{repoUrl}</span>
          </div>
        </div>
      </div>

      <div className="border border-[#2d3748] rounded-lg bg-[#1a202c] h-96 flex flex-col">
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex flex-col rounded-lg overflow-hidden max-w-4xl ${
                message.role === "user"
                  ? "self-end bg-blue-600 text-white ml-12"
                  : "self-start bg-[#2d3748] border border-[#4a5568] mr-12"
              }`}
            >
              <div
                className={`flex items-center gap-2 px-3 py-2 text-sm font-medium ${
                  message.role === "user" ? "bg-black/20" : "bg-black/20"
                }`}
              >
                <span>{message.role === "user" ? "👤" : "🤖"}</span>
                <span>{message.role === "user" ? "You" : "Assistant"}</span>
              </div>
              <div className="p-3">
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
            <div className="self-start flex flex-col rounded-lg overflow-hidden max-w-4xl bg-[#2d3748] border border-[#4a5568] mr-12">
              <div className="flex items-center gap-2 px-3 py-2 bg-black/20 text-sm font-medium">
                <span>🤖</span>
                <span>Assistant</span>
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

        <div className="border-t border-[#2d3748] p-4 flex gap-3">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ask about the repository..."
            disabled={loading}
            onKeyPress={(e) => e.key === "Enter" && sendMessage()}
            className="flex-1 bg-[#2d3748] border border-[#4a5568] rounded-md px-4 py-2 text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-600"
          />
          <button
            onClick={sendMessage}
            disabled={!query || loading}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md px-6 py-2 transition disabled:bg-gray-600 disabled:cursor-not-allowed"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

export default Chat;
