import { useState } from "react";

function DocumentationHome() {
  const [repoUrl, setRepoUrl] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleIngestRepository = async () => {
    if (!repoUrl) return;

    setLoading(true);
    setError("");

    try {
      const response = await fetch("http://localhost:8000/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repo_url: repoUrl }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Failed to ingest repository");
      }

      setSessionId(data.session_id);
      localStorage.setItem("sessionId", data.session_id);
      localStorage.setItem("repoUrl", repoUrl);
    } catch (error) {
      console.error("Error:", error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateDocumentation = async () => {
    if (!sessionId) return;

    setLoading(true);
    setError("");

    try {
      const response = await fetch("http://localhost:8000/generate-docs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Failed to generate documentation");
      }

      // Store documentation data
      localStorage.setItem("documentationData", JSON.stringify(data));

      // Redirect to documentation viewer
      window.location.href = "/docs";
    } catch (error) {
      console.error("Error:", error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <div className="text-center mb-16">
        <h1 className="text-4xl font-bold mb-6 text-white">
          Repository Documentation Generator
        </h1>
        <p className="text-gray-400 text-lg max-w-2xl mx-auto">
          Generate comprehensive documentation for any GitHub repository using
          AI
        </p>
      </div>

      <div className="space-y-8">
        {/* Step 1: Repository Input */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-8">
          <h2 className="text-xl font-semibold mb-6 text-white">
            Step 1: Enter Repository URL
          </h2>
          <div className="flex gap-4">
            <input
              type="text"
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              placeholder="https://github.com/username/repository"
              disabled={loading}
              className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-600 focus:border-transparent disabled:bg-gray-700 disabled:text-gray-500"
            />
            <button
              onClick={handleIngestRepository}
              disabled={!repoUrl || loading || sessionId}
              className="bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-lg px-6 py-3 transition disabled:bg-gray-800 disabled:cursor-not-allowed disabled:text-gray-500"
            >
              {loading && !sessionId ? "Ingesting..." : "Ingest Repository"}
            </button>
          </div>
          {sessionId && (
            <div className="mt-4 text-green-400 text-sm flex items-center">
              <span className="mr-2">✓</span>
              Repository ingested successfully
            </div>
          )}
        </div>

        {/* Step 2: Generate Documentation */}
        {sessionId && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-8">
            <h2 className="text-xl font-semibold mb-4 text-white">
              Step 2: Generate Documentation
            </h2>
            <p className="text-gray-400 mb-6">
              This will take approximately 5-6 minutes to generate comprehensive
              documentation with AI analysis.
            </p>
            <button
              onClick={handleGenerateDocumentation}
              disabled={loading}
              className="bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-lg px-6 py-3 transition disabled:bg-gray-800 disabled:cursor-not-allowed flex items-center gap-3"
            >
              {loading ? (
                <>
                  <span className="h-4 w-4 rounded-full border-2 border-gray-400 border-t-white animate-spin"></span>
                  Generating Documentation...
                </>
              ) : (
                "Generate Documentation"
              )}
            </button>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="bg-red-900/20 border border-red-800 rounded-xl p-6">
            <p className="text-red-300">{error}</p>
          </div>
        )}

        {/* Progress Info */}
        {loading && sessionId && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-8">
            <h3 className="font-semibold mb-4 text-white">
              Generation Progress
            </h3>
            <div className="space-y-3 text-gray-400">
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-gray-600 rounded-full"></div>
                <span>
                  Analyzing repository content and identifying key abstractions
                </span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-gray-600 rounded-full"></div>
                <span>Mapping component relationships and dependencies</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-gray-600 rounded-full"></div>
                <span>Creating optimal chapter structure</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-gray-600 rounded-full"></div>
                <span>Writing detailed documentation for each chapter</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-gray-600 rounded-full"></div>
                <span>Formatting final documentation</span>
              </div>
            </div>
            <p className="mt-6 text-gray-300 text-sm font-medium">
              Please wait while we generate your documentation...
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default DocumentationHome;
