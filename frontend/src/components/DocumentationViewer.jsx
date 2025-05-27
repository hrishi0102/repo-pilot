import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
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

        // Validate data structure
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

  // Enhanced markdown components with better error handling
  const markdownComponents = useMemo(
    () => ({
      // Code blocks with proper language detection
      code({ node, inline, className, children, ...props }) {
        const match = /language-(\w+)/.exec(className || "");
        const codeString = String(children).replace(/\n$/, "");

        // Handle inline code
        if (inline) {
          return (
            <code
              className="bg-slate-800 text-cyan-300 px-2 py-1 rounded-md text-sm font-mono border border-slate-600 mx-0.5"
              {...props}
            >
              {children}
            </code>
          );
        }

        // Handle code blocks
        const language = match?.[1] || "text";

        // Don't show syntax highlighter UI for plain text
        if (language === "text" || language === "TEXT") {
          return (
            <pre className="bg-slate-900 text-gray-300 p-4 rounded-lg overflow-x-auto my-4 border border-gray-700">
              <code>{codeString}</code>
            </pre>
          );
        }

        return (
          <div className="my-6 rounded-lg overflow-hidden border border-gray-700 shadow-xl">
            <div className="bg-gray-800 px-4 py-2 text-xs text-gray-400 font-mono border-b border-gray-700 flex justify-between items-center">
              <span className="font-semibold">{language}</span>
              <button
                onClick={() => navigator.clipboard.writeText(codeString)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                Copy
              </button>
            </div>
            <SyntaxHighlighter
              style={vscDarkPlus}
              language={language}
              PreTag="div"
              customStyle={{
                margin: 0,
                borderRadius: 0,
                fontSize: "14px",
                background: "#0f172a",
                padding: "1.5rem",
                lineHeight: "1.6",
              }}
              showLineNumbers={false}
              wrapLines={true}
              {...props}
            >
              {codeString}
            </SyntaxHighlighter>
          </div>
        );
      },

      // Headings
      h1: ({ children }) => (
        <h1 className="text-4xl font-bold text-white mb-8 pb-4 border-b-2 border-blue-500 mt-0">
          {children}
        </h1>
      ),

      h2: ({ children }) => (
        <h2 className="text-3xl font-semibold text-gray-100 mt-12 mb-6 pb-3 border-b border-gray-700">
          {children}
        </h2>
      ),

      h3: ({ children }) => (
        <h3 className="text-2xl font-medium text-gray-200 mt-10 mb-4">
          {children}
        </h3>
      ),

      h4: ({ children }) => (
        <h4 className="text-xl font-medium text-gray-300 mt-8 mb-3">
          {children}
        </h4>
      ),

      h5: ({ children }) => (
        <h5 className="text-lg font-medium text-gray-300 mt-6 mb-2">
          {children}
        </h5>
      ),

      h6: ({ children }) => (
        <h6 className="text-base font-medium text-gray-400 mt-4 mb-2">
          {children}
        </h6>
      ),

      // Paragraph
      p: ({ children }) => (
        <p className="text-gray-300 mb-6 leading-relaxed text-base">
          {children}
        </p>
      ),

      // Lists
      ul: ({ children }) => (
        <ul className="list-disc pl-6 mb-6 space-y-2 text-gray-300">
          {children}
        </ul>
      ),

      ol: ({ children }) => (
        <ol className="list-decimal pl-6 mb-6 space-y-2 text-gray-300">
          {children}
        </ol>
      ),

      li: ({ children }) => <li className="leading-relaxed">{children}</li>,

      // Blockquote
      blockquote: ({ children }) => (
        <blockquote className="border-l-4 border-blue-500 bg-blue-500/10 pl-6 py-4 my-6 italic text-gray-300 rounded-r">
          {children}
        </blockquote>
      ),

      // Tables
      table: ({ children }) => (
        <div className="overflow-x-auto my-8 rounded-lg border border-gray-700 shadow-xl">
          <table className="min-w-full border-collapse bg-slate-900">
            {children}
          </table>
        </div>
      ),

      thead: ({ children }) => (
        <thead className="bg-slate-800">{children}</thead>
      ),

      tbody: ({ children }) => (
        <tbody className="divide-y divide-gray-700">{children}</tbody>
      ),

      tr: ({ children }) => (
        <tr className="hover:bg-slate-800/50 transition-colors">{children}</tr>
      ),

      th: ({ children }) => (
        <th className="border border-gray-700 px-6 py-4 text-left font-semibold text-white text-sm uppercase tracking-wider">
          {children}
        </th>
      ),

      td: ({ children }) => (
        <td className="border border-gray-700 px-6 py-4 text-gray-300">
          {children}
        </td>
      ),

      // Text formatting
      strong: ({ children }) => (
        <strong className="text-white font-semibold">{children}</strong>
      ),

      em: ({ children }) => (
        <em className="text-cyan-400 font-medium not-italic">{children}</em>
      ),

      // Links
      a: ({ children, href }) => (
        <a
          href={href}
          className="text-blue-400 hover:text-blue-300 underline decoration-blue-500/50 hover:decoration-blue-300 transition-all duration-200 font-medium"
          target="_blank"
          rel="noopener noreferrer"
        >
          {children}
        </a>
      ),

      // Horizontal rule
      hr: () => (
        <hr className="border-none h-px bg-gradient-to-r from-transparent via-gray-700 to-transparent my-10" />
      ),

      // Images
      img: ({ src, alt }) => (
        <img
          src={src}
          alt={alt}
          className="max-w-full h-auto rounded-lg my-6 shadow-xl border border-gray-700"
        />
      ),

      // Pre tag (for code blocks) - don't wrap in additional pre
      pre: ({ children }) => <>{children}</>,
    }),
    []
  );

  const handleNewRepository = () => {
    localStorage.removeItem("documentationData");
    localStorage.removeItem("sessionId");
    localStorage.removeItem("repoUrl");
    navigate("/");
  };

  // Clean and format chapter titles
  const cleanChapterTitle = (title) => {
    if (!title) return "Untitled Chapter";

    // Remove common prefixes
    let cleaned = title
      .replace(/^Chapter\s*\d+\s*[:.-]\s*/gi, "")
      .replace(/^Chapter\s*\d+\s*/gi, "")
      .replace(/^\d+\s*[:.-]\s*/, "")
      .replace(/^\d+\.\s*/, "")
      .trim();

    // Capitalize first letter if needed
    if (cleaned.length > 0) {
      cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
    }

    return cleaned || "Untitled Chapter";
  };

  // Extract clean title from content if title is missing
  const extractTitleFromContent = (content) => {
    if (!content) return null;

    // Look for first heading in content
    const headingMatch = content.match(/^#\s+(.+)$/m);
    if (headingMatch) {
      return cleanChapterTitle(headingMatch[1]);
    }

    return null;
  };

  const getChapterDisplayName = (chapter) => {
    if (!chapter) return "Unknown Chapter";

    // First try to use the provided title
    if (chapter.title) {
      return cleanChapterTitle(chapter.title);
    }

    // If no title, try to extract from content
    const extractedTitle = extractTitleFromContent(chapter.content);
    if (extractedTitle) {
      return extractedTitle;
    }

    return "Untitled Chapter";
  };

  // Pre-process content to fix common issues
  const preprocessContent = (content) => {
    if (!content) return "";

    let processed = content;

    // Fix malformed code blocks
    processed = processed.replace(/```(\w*)\s*\n\s*(\w+)\s*\n/g, "```$1\n");

    // Remove standalone "TEXT" or "1 lines" patterns that might be artifacts
    processed = processed.replace(/^TEXT\s*$/gm, "");
    processed = processed.replace(/^\d+\s+lines?\s*$/gm, "");

    // Fix code blocks that have "TEXT" as language
    processed = processed.replace(/```TEXT/g, "```text");

    // Ensure proper spacing around code blocks
    processed = processed.replace(/([^\n])\n```/g, "$1\n\n```");
    processed = processed.replace(/```\n([^\n])/g, "```\n\n$1");

    return processed;
  };

  // Sanitize content to prevent rendering issues
  const sanitizeContent = (content) => {
    if (!content) return "";

    let sanitized = content;

    // Pre-process to fix common issues
    sanitized = preprocessContent(sanitized);

    // Fix common markdown issues
    // Remove excessive newlines
    sanitized = sanitized.replace(/\n{3,}/g, "\n\n");

    // Ensure code blocks are properly closed
    const codeBlockCount = (sanitized.match(/```/g) || []).length;
    if (codeBlockCount % 2 !== 0) {
      sanitized += "\n```";
    }

    // Fix improperly formatted headings
    sanitized = sanitized.replace(/^(#{1,6})([^#\s])/gm, "$1 $2");

    // Remove any stray HTML tags
    sanitized = sanitized.replace(
      /<(?!\/?(code|pre|em|strong|a|img|br|hr|ul|ol|li|p|h[1-6]|blockquote|table|thead|tbody|tr|th|td)\b)[^>]*>/gi,
      ""
    );

    return sanitized;
  };

  const getCurrentContent = () => {
    if (!documentationData) return "";

    let content = "";

    if (currentPage === "introduction") {
      content =
        documentationData.introduction ||
        "# Introduction\n\nNo introduction available.";
    } else {
      const chapter = documentationData.chapters?.[currentPage];
      if (!chapter) {
        content =
          "# Chapter Not Found\n\nThe requested chapter could not be found.";
      } else {
        content =
          chapter.content ||
          "# Chapter\n\nNo content available for this chapter.";
      }
    }

    // Sanitize the content before returning
    return sanitizeContent(content);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <div className="bg-slate-900 border border-slate-700 rounded-xl p-8">
          <div className="flex items-center space-x-4">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
            <p className="text-gray-300 text-lg">Loading documentation...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !documentationData) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <div className="bg-slate-900 border border-slate-700 rounded-xl p-8 text-center">
          <p className="text-red-400 text-lg mb-4">
            {error || "No documentation data found"}
          </p>
          <button
            onClick={() => navigate("/")}
            className="bg-slate-700 hover:bg-slate-600 text-white px-6 py-3 rounded-lg font-medium transition"
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
    <div className="min-h-screen bg-black text-white">
      <div className="flex">
        {/* Enhanced Sidebar */}
        <div className="w-80 bg-slate-950 border-r border-slate-800 min-h-screen fixed left-0 top-0">
          <div className="p-6 border-b border-slate-800">
            <h2 className="font-bold text-xl text-white mb-2">Documentation</h2>
            <p className="text-sm text-gray-400 truncate">
              {documentationData.repo_url?.split("/").pop() ||
                "Repository Guide"}
            </p>
            <div className="mt-3 inline-flex items-center bg-slate-800 text-gray-300 px-3 py-1.5 rounded-full text-xs font-medium">
              <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
              {chapterKeys.length} Chapters
            </div>
          </div>

          <nav
            className="p-4 overflow-y-auto"
            style={{ height: "calc(100vh - 200px)" }}
          >
            <div className="space-y-2">
              {/* Introduction */}
              <button
                onClick={() => setCurrentPage("introduction")}
                className={`w-full text-left p-4 rounded-lg transition-all duration-200 ${
                  currentPage === "introduction"
                    ? "bg-blue-600 text-white shadow-lg"
                    : "text-gray-300 hover:bg-slate-900 hover:text-white"
                }`}
              >
                <div className="flex items-start space-x-3">
                  <span className="text-lg">📖</span>
                  <div>
                    <div className="font-medium">Introduction</div>
                    <div className="text-xs text-gray-400 mt-1">
                      Overview and getting started
                    </div>
                  </div>
                </div>
              </button>

              <div className="border-t border-slate-800 my-4"></div>

              {/* Chapters */}
              {chapterKeys.map((chapterKey, index) => {
                const chapter = chapters[chapterKey];
                const displayName = getChapterDisplayName(chapter);
                const chapterNumber = chapter.number || index + 1;

                return (
                  <button
                    key={chapterKey}
                    onClick={() => setCurrentPage(chapterKey)}
                    className={`w-full text-left p-4 rounded-lg transition-all duration-200 ${
                      currentPage === chapterKey
                        ? "bg-blue-600 text-white shadow-lg"
                        : "text-gray-300 hover:bg-slate-900 hover:text-white"
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      <span className="text-gray-400 text-sm font-mono mt-0.5 bg-slate-800 px-2 py-1 rounded min-w-[2rem] text-center">
                        {chapterNumber}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium">{displayName}</div>
                        {chapter.description && (
                          <div className="text-xs text-gray-400 mt-1 line-clamp-2">
                            {chapter.description}
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </nav>

          <div className="absolute bottom-6 left-4 right-4">
            <button
              onClick={handleNewRepository}
              className="w-full bg-slate-800 hover:bg-slate-700 text-white px-4 py-3 rounded-lg font-medium transition-all duration-200 border border-slate-700"
            >
              🔄 New Repository
            </button>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 ml-80">
          <div className="max-w-5xl mx-auto px-8 py-12">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 md:p-12 shadow-2xl">
              <article className="prose prose-invert prose-lg max-w-none">
                <ReactMarkdown
                  components={markdownComponents}
                  remarkPlugins={[remarkGfm]}
                  skipHtml={true}
                >
                  {getCurrentContent()}
                </ReactMarkdown>
              </article>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DocumentationViewer;
