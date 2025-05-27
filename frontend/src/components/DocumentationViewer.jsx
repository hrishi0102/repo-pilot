import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import remarkGfm from "remark-gfm";

function DocumentationViewer() {
  const [documentationData, setDocumentationData] = useState(null);
  const [currentPage, setCurrentPage] = useState("introduction");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    try {
      const storedData = localStorage.getItem("documentationData");
      if (storedData) {
        const parsedData = JSON.parse(storedData);
        if (!parsedData.introduction && !parsedData.chapters) {
          throw new Error("Invalid documentation data structure");
        }
        setDocumentationData(parsedData);
      } else {
        setError("No documentation data found");
        setTimeout(() => navigate("/"), 2000);
      }
    } catch (err) {
      console.error("Error loading documentation:", err);
      setError("Failed to load documentation data");
      setTimeout(() => navigate("/"), 2000);
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  // Custom markdown components for proper rendering
  const markdownComponents = {
    h1: ({ children }) => (
      <h1 className="text-4xl font-bold text-white mb-8 mt-0">{children}</h1>
    ),
    h2: ({ children }) => (
      <h2 className="text-3xl font-semibold text-white mt-10 mb-6">
        {children}
      </h2>
    ),
    h3: ({ children }) => (
      <h3 className="text-2xl font-medium text-white mt-8 mb-4">{children}</h3>
    ),
    h4: ({ children }) => (
      <h4 className="text-xl font-medium text-gray-100 mt-6 mb-3">
        {children}
      </h4>
    ),
    h5: ({ children }) => (
      <h5 className="text-lg font-medium text-gray-200 mt-4 mb-2">
        {children}
      </h5>
    ),
    h6: ({ children }) => (
      <h6 className="text-base font-medium text-gray-300 mt-3 mb-2">
        {children}
      </h6>
    ),
    p: ({ children }) => (
      <p className="text-gray-300 mb-4 leading-relaxed">{children}</p>
    ),
    ul: ({ children }) => (
      <ul className="list-disc list-inside mb-4 text-gray-300 space-y-2">
        {children}
      </ul>
    ),
    ol: ({ children }) => (
      <ol className="list-decimal list-inside mb-4 text-gray-300 space-y-2">
        {children}
      </ol>
    ),
    li: ({ children }) => <li className="ml-4">{children}</li>,
    blockquote: ({ children }) => (
      <blockquote className="border-l-4 border-blue-500 pl-4 py-2 my-4 bg-gray-800 rounded-r">
        {children}
      </blockquote>
    ),
    code({ node, inline, className, children, ...props }) {
      const match = /language-(\w+)/.exec(className || "");
      const language = match ? match[1] : "";

      if (!inline && match) {
        return (
          <div className="my-6 rounded-lg overflow-hidden bg-gray-900 border border-gray-700">
            <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700">
              <span className="text-sm text-gray-400 font-mono">
                {language}
              </span>
              <button
                onClick={() =>
                  navigator.clipboard.writeText(
                    String(children).replace(/\n$/, "")
                  )
                }
                className="text-sm text-gray-400 hover:text-white transition-colors"
              >
                Copy
              </button>
            </div>
            <SyntaxHighlighter
              style={oneDark}
              language={language}
              PreTag="div"
              customStyle={{
                margin: 0,
                padding: "1rem",
                background: "transparent",
                fontSize: "14px",
              }}
              {...props}
            >
              {String(children).replace(/\n$/, "")}
            </SyntaxHighlighter>
          </div>
        );
      }

      return (
        <code
          className="bg-gray-800 text-blue-300 px-2 py-1 rounded text-sm font-mono"
          {...props}
        >
          {children}
        </code>
      );
    },
    pre: ({ children }) => <>{children}</>,
    table: ({ children }) => (
      <div className="overflow-x-auto my-6">
        <table className="min-w-full border-collapse border border-gray-700">
          {children}
        </table>
      </div>
    ),
    thead: ({ children }) => <thead className="bg-gray-800">{children}</thead>,
    tbody: ({ children }) => <tbody>{children}</tbody>,
    tr: ({ children }) => (
      <tr className="border-b border-gray-700">{children}</tr>
    ),
    th: ({ children }) => (
      <th className="px-4 py-2 text-left font-semibold text-white border border-gray-700">
        {children}
      </th>
    ),
    td: ({ children }) => (
      <td className="px-4 py-2 text-gray-300 border border-gray-700">
        {children}
      </td>
    ),
    a: ({ href, children }) => (
      <a
        href={href}
        className="text-blue-400 hover:text-blue-300 underline"
        target="_blank"
        rel="noopener noreferrer"
      >
        {children}
      </a>
    ),
    strong: ({ children }) => (
      <strong className="font-semibold text-white">{children}</strong>
    ),
    em: ({ children }) => <em className="italic text-gray-200">{children}</em>,
    hr: () => <hr className="my-8 border-gray-700" />,
    img: ({ src, alt }) => (
      <img src={src} alt={alt} className="max-w-full h-auto rounded-lg my-4" />
    ),
  };

  const handleNewRepository = () => {
    localStorage.removeItem("documentationData");
    localStorage.removeItem("sessionId");
    localStorage.removeItem("repoUrl");
    navigate("/");
  };

  const cleanChapterTitle = (title) => {
    if (!title) return "Untitled Chapter";
    return (
      title
        .replace(/^Chapter\s*\d+\s*[:.-]\s*/gi, "")
        .replace(/^\d+\.\s*/, "")
        .trim() || "Untitled Chapter"
    );
  };

  const getCurrentContent = () => {
    if (!documentationData) return "";

    if (currentPage === "introduction") {
      return (
        documentationData.introduction ||
        "# Introduction\n\nNo introduction available."
      );
    }

    const chapter = documentationData.chapters?.[currentPage];
    return (
      chapter?.content ||
      "# Chapter Not Found\n\nThe requested chapter could not be found."
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="text-white">Loading documentation...</div>
      </div>
    );
  }

  if (error || !documentationData) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="text-center">
          <p className="text-red-400 mb-4">
            {error || "No documentation data found"}
          </p>
          <button
            onClick={() => navigate("/")}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  const chapters = documentationData.chapters || {};
  const chapterKeys = Object.keys(chapters).sort((a, b) => {
    const numA = parseInt(a.replace("chapter_", ""));
    const numB = parseInt(b.replace("chapter_", ""));
    return numA - numB;
  });

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="flex">
        {/* Sidebar */}
        <div className="w-72 bg-gray-800 border-r border-gray-700 min-h-screen fixed">
          <div className="p-6 border-b border-gray-700">
            <h2 className="font-bold text-xl mb-2">
              {documentationData.repo_url?.split("/").pop() || "Repository"}
            </h2>
          </div>

          <nav className="p-4">
            <button
              onClick={() => setCurrentPage("introduction")}
              className={`w-full text-left p-3 rounded mb-2 transition-colors ${
                currentPage === "introduction"
                  ? "bg-blue-600 text-white"
                  : "hover:bg-gray-700 text-gray-300"
              }`}
            >
              Introduction
            </button>

            {chapterKeys.map((chapterKey) => {
              const chapter = chapters[chapterKey];
              return (
                <button
                  key={chapterKey}
                  onClick={() => setCurrentPage(chapterKey)}
                  className={`w-full text-left p-3 rounded mb-2 transition-colors ${
                    currentPage === chapterKey
                      ? "bg-blue-600 text-white"
                      : "hover:bg-gray-700 text-gray-300"
                  }`}
                >
                  <div className="font-medium">
                    {cleanChapterTitle(chapter.title)}
                  </div>
                  {chapter.description && (
                    <div className="text-sm opacity-75 mt-1">
                      {chapter.description.substring(0, 50)}...
                    </div>
                  )}
                </button>
              );
            })}
          </nav>

          <div className="absolute bottom-4 left-4 right-4">
            <button
              onClick={handleNewRepository}
              className="w-full bg-gray-700 hover:bg-gray-600 text-white px-4 py-3 rounded transition-colors"
            >
              New Repository
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 ml-72">
          <div className="max-w-4xl mx-auto p-8">
            <div className="bg-gray-800 rounded-lg shadow-xl p-8 documentation-container">
              <ReactMarkdown
                components={markdownComponents}
                remarkPlugins={[remarkGfm]}
              >
                {getCurrentContent()}
              </ReactMarkdown>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DocumentationViewer;
