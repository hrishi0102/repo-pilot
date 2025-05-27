import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";

const HomePage = () => {
  const [repoUrl, setRepoUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!repoUrl.trim()) return;

    setLoading(true);
    setError("");

    try {
      const response = await fetch("http://localhost:8000/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repo_url: repoUrl.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Failed to ingest repository");
      }

      // Store session data
      localStorage.setItem("sessionId", data.session_id);
      localStorage.setItem("repoUrl", repoUrl.trim());

      // Navigate to generation page
      navigate("/generate");
    } catch (error) {
      console.error("Error:", error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !loading) {
      handleSubmit(e);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900 flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between p-6 lg:p-8">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">Y</span>
          </div>
          <span className="text-white text-xl font-semibold">YapHub</span>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 lg:px-8 -mt-16">
        <div className="text-center max-w-4xl mx-auto">
          <h1 className="text-4xl lg:text-6xl font-light text-white mb-8 leading-tight">
            Your GitHub repo,{" "}
            <span className="bg-gradient-to-r from-purple-400 to-purple-600 bg-clip-text text-transparent font-medium">
              finally talking sense.
            </span>
          </h1>

          {/* Input Form */}
          <form onSubmit={handleSubmit} className="mt-12 max-w-2xl mx-auto">
            <div className="relative">
              <input
                type="text"
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Enter your GitHub repository URL..."
                disabled={loading}
                className="w-full px-6 py-4 bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-transparent transition-all duration-200 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <button
                type="submit"
                disabled={!repoUrl.trim() || loading}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 disabled:from-gray-600 disabled:to-gray-600 disabled:cursor-not-allowed text-white p-2 rounded-xl transition-all duration-200"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Search className="w-5 h-5" />
                )}
              </button>
            </div>

            {/* Error Display */}
            {error && (
              <div className="mt-4 p-4 bg-red-500/10 backdrop-blur-sm border border-red-500/20 rounded-xl">
                <p className="text-red-300 text-sm">{error}</p>
              </div>
            )}

            {/* Loading State */}
            {loading && (
              <div className="mt-4 p-4 bg-purple-500/10 backdrop-blur-sm border border-purple-500/20 rounded-xl">
                <p className="text-purple-300 text-sm">
                  Analyzing repository...
                </p>
              </div>
            )}
          </form>

          {/* Subtitle */}
          <p className="mt-8 text-gray-400 text-lg max-w-2xl mx-auto">
            Generate comprehensive documentation for any GitHub repository
          </p>
        </div>
      </main>
    </div>
  );
};

export default HomePage;
