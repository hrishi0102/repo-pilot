import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import remarkGfm from "remark-gfm";

function DocumentationViewer() {
  const [documentationData, setDocumentationData] = useState(null);
  const [currentPage, setCurrentPage] = useState("introduction");
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const storedData = localStorage.getItem("documentationData");
    if (storedData) {
      setDocumentationData(JSON.parse(storedData));
    } else {
      navigate("/");
    }
    setLoading(false);
  }, [navigate]);

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

  const handleNewRepository = () => {
    localStorage.removeItem("documentationData");
    localStorage.removeItem("sessionId");
    localStorage.removeItem("repoUrl");
    navigate("/");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-400">Loading documentation...</div>
      </div>
    );
  }

  if (!documentationData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center text-gray-400">
          <p>No documentation data found.</p>
          <button
            onClick={() => navigate("/")}
            className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  const chapters = documentationData.chapters || {};
  const chapterKeys = Object.keys(chapters);

  return (
    <div className="min-h-screen bg-[#0f1525] text-gray-100">
      <div className="flex">
        {/* Sidebar */}
        <div className="w-64 bg-[#1a202c] border-r border-[#2d3748] min-h-screen fixed left-0 top-0">
          <div className="p-4 border-b border-[#2d3748]">
            <h2 className="font-bold text-lg text-blue-400 truncate">
              Repository Guide
            </h2>
            <p className="text-xs text-gray-400 mt-1 truncate">
              {documentationData.repo_url?.split("/").pop()}
            </p>
          </div>

          <nav className="p-4 space-y-2">
            <button
              onClick={() => setCurrentPage("introduction")}
              className={`w-full text-left px-3 py-2 rounded transition ${
                currentPage === "introduction"
                  ? "bg-blue-600 text-white"
                  : "text-gray-300 hover:bg-[#2d3748]"
              }`}
            >
              Introduction
            </button>

            {chapterKeys.map((chapterKey, index) => (
              <button
                key={chapterKey}
                onClick={() => setCurrentPage(chapterKey)}
                className={`w-full text-left px-3 py-2 rounded transition ${
                  currentPage === chapterKey
                    ? "bg-blue-600 text-white"
                    : "text-gray-300 hover:bg-[#2d3748]"
                }`}
              >
                Chapter {index + 1}
              </button>
            ))}
          </nav>

          <div className="absolute bottom-4 left-4 right-4">
            <button
              onClick={handleNewRepository}
              className="w-full bg-gray-700 hover:bg-gray-600 text-white px-3 py-2 rounded text-sm transition"
            >
              New Repository
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 ml-64">
          <div className="max-w-4xl mx-auto px-6 py-8">
            <div className="prose prose-invert max-w-none">
              {currentPage === "introduction" ? (
                <ReactMarkdown
                  components={markdownComponents}
                  remarkPlugins={[remarkGfm]}
                >
                  {documentationData.introduction ||
                    "# Introduction\n\nNo introduction available."}
                </ReactMarkdown>
              ) : (
                <ReactMarkdown
                  components={markdownComponents}
                  remarkPlugins={[remarkGfm]}
                >
                  {chapters[currentPage]?.content ||
                    "# Chapter\n\nNo content available."}
                </ReactMarkdown>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DocumentationViewer;
