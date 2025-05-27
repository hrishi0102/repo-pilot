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
      const parsedData = JSON.parse(storedData);
      setDocumentationData(parsedData);

      // Debug: Log the structure to console
      console.log("Documentation data:", parsedData);
      console.log("Introduction:", parsedData.introduction?.substring(0, 200));
      if (parsedData.chapters) {
        Object.keys(parsedData.chapters).forEach((key) => {
          console.log(`${key}:`, parsedData.chapters[key].title);
          console.log(
            `${key} content:`,
            parsedData.chapters[key].content?.substring(0, 200)
          );
        });
      }
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
          customStyle={{
            margin: "1rem 0",
            borderRadius: "0.5rem",
            fontSize: "0.875rem",
            background: "#1a1a1a",
            border: "1px solid #333",
          }}
          {...props}
        >
          {String(children).replace(/\n$/, "")}
        </SyntaxHighlighter>
      ) : (
        <code
          className="bg-gray-800 text-amber-200 px-1.5 py-0.5 rounded text-sm font-mono border border-gray-700"
          {...props}
        >
          {children}
        </code>
      );
    },
    h1({ children }) {
      return (
        <h1 className="text-2xl font-bold text-white mb-4 pb-2 border-b border-gray-700">
          {children}
        </h1>
      );
    },
    h2({ children }) {
      return (
        <h2 className="text-xl font-semibold text-gray-100 mt-6 mb-3 pb-1 border-b border-gray-800">
          {children}
        </h2>
      );
    },
    h3({ children }) {
      return (
        <h3 className="text-lg font-medium text-gray-200 mt-4 mb-2">
          {children}
        </h3>
      );
    },
    h4({ children }) {
      return (
        <h4 className="text-base font-medium text-gray-300 mt-3 mb-2">
          {children}
        </h4>
      );
    },
    p({ children }) {
      return (
        <p className="text-gray-300 mb-3 leading-relaxed text-sm">{children}</p>
      );
    },
    ul({ children }) {
      return (
        <ul className="list-disc pl-6 mb-3 space-y-1 text-gray-300 text-sm">
          {children}
        </ul>
      );
    },
    ol({ children }) {
      return (
        <ol className="list-decimal pl-6 mb-3 space-y-1 text-gray-300 text-sm">
          {children}
        </ol>
      );
    },
    li({ children }) {
      return <li className="leading-relaxed">{children}</li>;
    },
    blockquote({ children }) {
      return (
        <blockquote className="border-l-4 border-gray-600 bg-gray-800/30 pl-4 py-2 my-3 italic text-gray-300 rounded-r text-sm">
          {children}
        </blockquote>
      );
    },
    table({ children }) {
      return (
        <div className="overflow-x-auto my-3 rounded border border-gray-700">
          <table className="min-w-full border-collapse text-sm">
            {children}
          </table>
        </div>
      );
    },
    th({ children }) {
      return (
        <th className="border border-gray-700 bg-gray-800 px-3 py-2 text-left font-semibold text-white text-sm">
          {children}
        </th>
      );
    },
    td({ children }) {
      return (
        <td className="border border-gray-700 px-3 py-2 text-gray-300 bg-gray-900/50 text-sm">
          {children}
        </td>
      );
    },
    strong({ children }) {
      return <strong className="text-white font-semibold">{children}</strong>;
    },
    a({ children, href }) {
      return (
        <a
          href={href}
          className="text-gray-300 hover:text-white underline decoration-gray-500 hover:decoration-gray-300"
          target="_blank"
          rel="noopener noreferrer"
        >
          {children}
        </a>
      );
    },
  };

  const handleNewRepository = () => {
    localStorage.removeItem("documentationData");
    localStorage.removeItem("sessionId");
    localStorage.removeItem("repoUrl");
    navigate("/");
  };

  // Helper function to clean chapter titles
  const getChapterDisplayName = (title) => {
    // Remove "Chapter X:" prefix and clean up the title
    return title
      .replace(/^Chapter\s*\d+:\s*/i, "")
      .replace(/^\d+\.\s*/, "")
      .replace(/\*\*/g, "") // Remove markdown bold formatting
      .trim();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <div className="text-gray-400 text-lg">Loading documentation...</div>
      </div>
    );
  }

  if (!documentationData) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <div className="text-center text-gray-400">
          <p className="text-lg mb-4">No documentation data found.</p>
          <button
            onClick={() => navigate("/")}
            className="bg-gray-700 hover:bg-gray-600 text-white px-6 py-3 rounded-lg font-medium transition"
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
    <div className="min-h-screen bg-black text-white">
      <div className="flex">
        {/* Sidebar */}
        <div className="w-80 bg-gray-950 border-r border-gray-800 min-h-screen fixed left-0 top-0">
          <div className="p-6 border-b border-gray-800">
            <h2 className="font-semibold text-xl text-white mb-2">
              Repository Guide
            </h2>
            <p className="text-sm text-gray-400 truncate">
              {documentationData.repo_url?.split("/").pop() ||
                "Repository Documentation"}
            </p>
          </div>

          <nav className="p-4">
            <div className="space-y-2">
              <button
                onClick={() => setCurrentPage("introduction")}
                className={`w-full text-left px-4 py-3 rounded-lg transition font-medium text-sm ${
                  currentPage === "introduction"
                    ? "bg-gray-800 text-white"
                    : "text-gray-300 hover:bg-gray-900 hover:text-white"
                }`}
              >
                📖 Introduction
              </button>

              {chapterKeys.map((chapterKey, index) => {
                const chapter = chapters[chapterKey];
                const displayName = getChapterDisplayName(
                  chapter.title || `Chapter ${index + 1}`
                );

                return (
                  <button
                    key={chapterKey}
                    onClick={() => setCurrentPage(chapterKey)}
                    className={`w-full text-left px-4 py-3 rounded-lg transition font-medium text-sm ${
                      currentPage === chapterKey
                        ? "bg-gray-800 text-white"
                        : "text-gray-300 hover:bg-gray-900 hover:text-white"
                    }`}
                  >
                    <div className="flex items-start">
                      <span className="text-gray-400 mr-3 mt-0.5 text-sm">
                        {index + 1}.
                      </span>
                      <span className="leading-tight line-clamp-3">
                        {displayName}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </nav>

          <div className="absolute bottom-6 left-4 right-4">
            <button
              onClick={handleNewRepository}
              className="w-full bg-gray-800 hover:bg-gray-700 text-white px-4 py-3 rounded-lg font-medium transition border border-gray-700"
            >
              🔄 New Repository
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 ml-80">
          <div className="max-w-4xl mx-auto px-8 py-8">
            <article className="prose prose-invert max-w-none">
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
            </article>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DocumentationViewer;
