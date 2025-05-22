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
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4 text-blue-400">
          Repository Documentation Generator
        </h1>
        <p className="text-gray-400 text-lg">
          Generate comprehensive documentation for any GitHub repository
        </p>
      </div>

      <div className="space-y-6">
        {/* Step 1: Repository Input */}
        <div className="bg-[#1a202c] border border-[#2d3748] rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4 text-blue-300">
            Step 1: Enter Repository URL
          </h2>
          <div className="flex gap-3">
            <input
              type="text"
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              placeholder="https://github.com/username/repository"
              disabled={loading}
              className="flex-1 bg-[#2d3748] border border-[#4a5568] rounded-md px-4 py-3 text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-700"
            />
            <button
              onClick={handleIngestRepository}
              disabled={!repoUrl || loading || sessionId}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md px-6 py-3 transition disabled:bg-gray-600 disabled:cursor-not-allowed"
            >
              {loading && !sessionId ? "Ingesting..." : "Ingest Repository"}
            </button>
          </div>
          {sessionId && (
            <div className="mt-3 text-green-400 text-sm">
              ✓ Repository ingested successfully
            </div>
          )}
        </div>

        {/* Step 2: Generate Documentation */}
        {sessionId && (
          <div className="bg-[#1a202c] border border-[#2d3748] rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4 text-blue-300">
              Step 2: Generate Documentation
            </h2>
            <p className="text-gray-400 mb-4">
              This will take approximately 5-6 minutes to generate comprehensive
              documentation.
            </p>
            <button
              onClick={handleGenerateDocumentation}
              disabled={loading}
              className="bg-green-600 hover:bg-green-700 text-white font-medium rounded-md px-6 py-3 transition disabled:bg-gray-600 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading ? (
                <>
                  <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin"></span>
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
          <div className="bg-red-900/50 border border-red-500 rounded-lg p-4">
            <p className="text-red-300">{error}</p>
          </div>
        )}

        {/* Progress Info */}
        {loading && sessionId && (
          <div className="bg-[#1a202c] border border-[#2d3748] rounded-lg p-6">
            <h3 className="font-semibold mb-3 text-blue-300">
              Generation Progress
            </h3>
            <div className="space-y-2 text-sm text-gray-400">
              <p>
                • Analyzing repository content and identifying key abstractions
              </p>
              <p>• Mapping component relationships and dependencies</p>
              <p>• Creating optimal chapter structure</p>
              <p>• Writing detailed documentation for each chapter</p>
              <p>• Formatting final documentation</p>
            </div>
            <p className="mt-4 text-yellow-400 text-sm">
              Please wait while we generate your documentation...
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default DocumentationHome;
