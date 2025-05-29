import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSlug from "rehype-slug";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import DiagramsViewer from "./DiagramsViewer";

export default function DocumentationViewer() {
  const [docData, setDocData] = useState(null);
  const [page, setPage] = useState("introduction");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    try {
      const stored = localStorage.getItem("documentationData");
      if (!stored) throw new Error("No documentation data found");
      const parsed = JSON.parse(stored);
      if (!parsed.introduction || !parsed.chapters)
        throw new Error("Invalid documentation data structure");
      setDocData(parsed);
    } catch (err) {
      console.error(err);
      setError(err.message);
      setTimeout(() => navigate("/"), 2000);
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  const markdownComponents = {
    // HEADINGS
    h1: ({ children }) => (
      <h1 className="text-4xl font-bold text-white my-6">{children}</h1>
    ),
    h2: ({ children }) => (
      <h2 className="text-3xl font-semibold text-white my-5">{children}</h2>
    ),
    h3: ({ children }) => (
      <h3 className="text-2xl font-medium text-white my-4">{children}</h3>
    ),
    p: ({ children }) => (
      <p className="text-gray-300 mb-4 leading-relaxed">{children}</p>
    ),

    // LISTS
    ul: ({ children }) => (
      <ul className="list-disc list-inside mb-4 space-y-2 text-gray-300">
        {children}
      </ul>
    ),
    ol: ({ children }) => (
      <ol className="list-decimal list-inside mb-4 space-y-2 text-gray-300">
        {children}
      </ol>
    ),
    li: ({ children }) => <li className="ml-4">{children}</li>,

    // BLOCKQUOTE
    blockquote: ({ children }) => (
      <blockquote className="border-l-4 border-purple-500 pl-4 italic text-gray-200 my-4">
        {children}
      </blockquote>
    ),

    // CODE
    code({ node, inline, className, children, ...props }) {
      const match = /language-(\w+)/.exec(className || "");
      const lang = match?.[1] || "";
      const codeString = String(children).replace(/\n$/, "");

      if (!inline && lang) {
        return (
          <div className="my-6 bg-gray-900 border border-gray-700 rounded-lg overflow-hidden">
            <div className="flex justify-between bg-gray-800 px-4 py-2 border-b border-gray-700">
              <span className="text-xs text-gray-400 font-mono">{lang}</span>
              <button
                onClick={() => navigator.clipboard.writeText(codeString)}
                className="text-xs text-gray-400 hover:text-white"
              >
                Copy
              </button>
            </div>
            <SyntaxHighlighter
              style={oneDark}
              language={lang}
              PreTag="div"
              customStyle={{
                margin: 0,
                padding: "1rem",
                background: "transparent",
              }}
              {...props}
            >
              {codeString}
            </SyntaxHighlighter>
          </div>
        );
      }

      return (
        <code className="bg-gray-800 text-purple-300 px-1 py-0.5 rounded text-sm font-mono">
          {children}
        </code>
      );
    },

    // TABLES
    table: ({ children }) => (
      <div className="overflow-x-auto mb-6">
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
      <th className="px-4 py-2 text-left text-white font-semibold border border-gray-700">
        {children}
      </th>
    ),
    td: ({ children }) => (
      <td className="px-4 py-2 text-gray-300 border border-gray-700">
        {children}
      </td>
    ),

    // LINKS & IMAGES
    a: ({ href, children }) => (
      <a
        href={href}
        className="text-purple-400 hover:text-purple-300 underline"
        target="_blank"
        rel="noopener noreferrer"
      >
        {children}
      </a>
    ),
    img: ({ src, alt }) => (
      <img src={src} alt={alt} className="max-w-full h-auto rounded my-4" />
    ),
    hr: () => <hr className="border-gray-700 my-8" />,
  };
  const getContent = () => {
    if (!docData) return "";
    if (page === "introduction") return docData.introduction;
    if (page === "diagrams") return null; // Will render DiagramsViewer component instead
    return docData.chapters[page]?.content || "# Not Found\n\nContent missing.";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-950">
        <span className="text-white">Loading…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-950">
        <p className="text-red-400 mb-4">{error}</p>
        <button
          onClick={() => navigate("/")}
          className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded transition-colors duration-200"
        >
          Go Home
        </button>
      </div>
    );
  }

  // build chapter list
  const chapterKeys = Object.keys(docData.chapters).sort((a, b) => {
    return +a.replace("chapter_", "") - +b.replace("chapter_", "");
  });

  const cleanTitle = (t) => t.replace(/^Chapter\s*\d+[:.-]\s*/, "").trim();

  return (
    <div className="min-h-screen flex bg-gray-950 pt-12">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-950 border-r border-gray-800 fixed inset-y-0 top-12 bottom-0 z-0">
        <div className="py-4 px-4 border-b border-gray-800">
          <h2 className="text-base font-medium text-gray-100 flex items-center">
            <span className="mr-2 opacity-70">📂</span>
            {docData.repo_url?.split("/").pop() || "Repository"}
          </h2>
        </div>

        <nav
          className="p-3 space-y-3 overflow-auto"
          style={{ height: "calc(100vh - 180px)" }}
        >          <button
            onClick={() => setPage("introduction")}
            className={`w-full text-left px-4 py-3 rounded transition-colors duration-200 ${
              page === "introduction"
                ? "bg-gray-800 text-gray-100 border-l-4 border-purple-500"
                : "text-gray-400 hover:bg-gray-800 hover:text-gray-100 hover:border-l-4 hover:border-purple-400"
            }`}
          >
            <div className="font-medium flex items-center">
              <span className="mr-2 opacity-70">📄</span>Introduction
            </div>
          </button>

          <button
            onClick={() => setPage("diagrams")}
            className={`w-full text-left px-4 py-3 rounded transition-colors duration-200 ${
              page === "diagrams"
                ? "bg-gray-800 text-gray-100 border-l-4 border-purple-500"
                : "text-gray-400 hover:bg-gray-800 hover:text-gray-100 hover:border-l-4 hover:border-purple-400"
            }`}
          >
            <div className="font-medium flex items-center">
              <span className="mr-2 opacity-70">📊</span>Visual Diagrams
            </div>
            <div className="text-sm text-gray-500 mt-1">
              Architecture & component diagrams
            </div>
          </button>

          {chapterKeys.map((key) => {
            const chap = docData.chapters[key];
            return (
              <button
                key={key}
                onClick={() => setPage(key)}
                className={`w-full text-left px-4 py-3 rounded transition-colors duration-200 ${
                  page === key
                    ? "bg-gray-800 text-gray-100 border-l-4 border-purple-500"
                    : "text-gray-400 hover:bg-gray-800 hover:text-gray-100 hover:border-l-4 hover:border-purple-400"
                }`}
              >
                <div className="font-medium">{cleanTitle(chap.title)}</div>
                {chap.description && (
                  <div className="text-sm text-gray-500 mt-1 line-clamp-2">
                    {chap.description}
                  </div>
                )}
              </button>
            );
          })}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-800 bg-gray-950">
          <button
            onClick={() => {
              localStorage.clear();
              navigate("/");
            }}
            className="w-full bg-gray-800 hover:bg-gray-700 text-gray-300 py-3 rounded transition-colors font-medium hover:text-purple-300"
          >
            New Repository
          </button>
        </div>
      </aside>      {/* Main Content */}
      <main className="flex-1 ml-64 pt-6 px-8 pb-8 overflow-auto flex justify-center bg-gray-950">
        <div className="prose prose-invert max-w-3xl w-full">
          {page === "diagrams" ? (
            <DiagramsViewer diagrams={docData.diagrams} />
          ) : (
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeSlug, rehypeAutolinkHeadings]}
              components={markdownComponents}
            >
              {getContent()}
            </ReactMarkdown>
          )}
        </div>
      </main>
    </div>
  );
}
