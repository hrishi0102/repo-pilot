import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Key, ChevronDown, ChevronUp } from "lucide-react";

const HomePage = () => {
  const [repoUrl, setRepoUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [useOwnKey, setUseOwnKey] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [keyValidating, setKeyValidating] = useState(false);
  const [keyValid, setKeyValid] = useState(null);
  const navigate = useNavigate();

  const validateApiKey = async (key) => {
    if (!key.trim()) {
      setKeyValid(null);
      return;
    }

    setKeyValidating(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/validate-key`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ api_key: key.trim() }),
        }
      );

      const data = await response.json();
      setKeyValid(response.ok ? true : false);
    } catch (error) {
      setKeyValid(false);
    } finally {
      setKeyValidating(false);
    }
  };

  const handleApiKeyChange = (e) => {
    const newKey = e.target.value;
    setApiKey(newKey);
    setKeyValid(null);

    // Debounce validation
    if (newKey.trim()) {
      setTimeout(() => {
        if (apiKey === newKey) {
          // Only validate if key hasn't changed
          validateApiKey(newKey);
        }
      }, 1000);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!repoUrl.trim()) return;

    // Check if using own key but key is invalid
    if (useOwnKey && apiKey.trim() && keyValid === false) {
      setError(
        "Please provide a valid API key or uncheck the option to use system key"
      );
      return;
    }

    setLoading(true);
    setError("");

    try {
      const requestBody = {
        repo_url: repoUrl.trim(),
        ...(useOwnKey && apiKey.trim() && { api_key: apiKey.trim() }),
      };

      const response = await fetch(`${import.meta.env.VITE_API_URL}/ingest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Failed to ingest repository");
      }

      // Store session data
      localStorage.setItem("sessionId", data.session_id);
      localStorage.setItem("repoUrl", repoUrl.trim());
      localStorage.setItem(
        "hasUserKey",
        useOwnKey && apiKey.trim() ? "true" : "false"
      );

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

            {/* Advanced Options */}
            <div className="mt-6">
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex items-center justify-center space-x-2 text-gray-400 hover:text-gray-300 transition-colors text-sm"
              >
                <Key className="w-4 h-4" />
                <span>Advanced Options</span>
                {showAdvanced ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </button>

              {showAdvanced && (
                <div className="mt-4 p-4 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl">
                  <div className="flex items-center space-x-3 mb-3">
                    <input
                      type="checkbox"
                      id="useOwnKey"
                      checked={useOwnKey}
                      onChange={(e) => {
                        setUseOwnKey(e.target.checked);
                        if (!e.target.checked) {
                          setApiKey("");
                          setKeyValid(null);
                        }
                      }}
                      className="w-4 h-4 text-purple-600 bg-transparent border-gray-400 rounded focus:ring-purple-500 focus:ring-2"
                    />
                    <label
                      htmlFor="useOwnKey"
                      className="text-gray-300 text-sm"
                    >
                      Use my own Gemini API key (recommended for reliability)
                    </label>
                  </div>

                  {useOwnKey && (
                    <div className="mt-3">
                      <div className="relative">
                        <input
                          type="password"
                          value={apiKey}
                          onChange={handleApiKeyChange}
                          placeholder="Enter your Gemini API key..."
                          className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-transparent text-sm"
                        />
                        {keyValidating && (
                          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                            <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                          </div>
                        )}
                        {keyValid === true && (
                          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-green-400">
                            ✓
                          </div>
                        )}
                        {keyValid === false && (
                          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-red-400">
                            ✗
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        Get your API key from Google AI Studio. Using your own
                        key ensures faster processing and reduces failures.
                      </p>
                      {keyValid === false && (
                        <p className="text-xs text-red-400 mt-1">
                          Invalid API key. Please check and try again.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
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
