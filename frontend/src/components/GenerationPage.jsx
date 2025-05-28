import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

function GenerationPage() {
  const [sessionId, setSessionId] = useState("");
  const [repoUrl, setRepoUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState(1); // 1: Ready to generate, 2: Generating, 3: Complete
  const navigate = useNavigate();

  useEffect(() => {
    const savedSessionId = localStorage.getItem("sessionId");
    const savedRepoUrl = localStorage.getItem("repoUrl");

    if (!savedSessionId || !savedRepoUrl) {
      navigate("/");
      return;
    }

    setSessionId(savedSessionId);
    setRepoUrl(savedRepoUrl);
  }, [navigate]);

  const handleGenerateDocumentation = async () => {
    if (!sessionId) return;

    setLoading(true);
    setError("");
    setStep(2);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/generate-docs`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ session_id: sessionId }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Failed to generate documentation");
      }

      // Store documentation data
      localStorage.setItem("documentationData", JSON.stringify(data));
      setStep(3);

      // Auto-redirect after 2 seconds
      setTimeout(() => {
        navigate("/docs");
      }, 2000);
    } catch (error) {
      console.error("Error:", error);
      setError(error.message);
      setStep(1);
    } finally {
      setLoading(false);
    }
  };

  const handleNewRepository = () => {
    localStorage.removeItem("sessionId");
    localStorage.removeItem("repoUrl");
    localStorage.removeItem("documentationData");
    navigate("/");
  };

  if (!sessionId) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      <div className="max-w-4xl mx-auto px-6 py-16">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-white mb-4">
            Documentation Generation
          </h1>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 inline-block">
            <span className="text-gray-400 text-sm">Repository: </span>
            <span className="text-white font-mono text-sm">{repoUrl}</span>
          </div>
        </div>

        {/* Step 1: Ready to Generate */}
        {step === 1 && (
          <div className="text-center space-y-8">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-8">
              <h2 className="text-xl font-semibold text-white mb-4">
                Ready to Generate Documentation
              </h2>
              <p className="text-gray-400 mb-8">
                Your repository has been successfully ingested. Click below to
                generate comprehensive documentation using AI analysis.
              </p>

              <div className="space-y-4 text-left text-sm text-gray-400 max-w-md mx-auto mb-8">
                <div className="flex items-center space-x-3">
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  <span>Repository content analyzed</span>
                </div>
                <div className="flex items-center space-x-3">
                  <span className="w-2 h-2 bg-gray-600 rounded-full"></span>
                  <span>Documentation structure planning</span>
                </div>
                <div className="flex items-center space-x-3">
                  <span className="w-2 h-2 bg-gray-600 rounded-full"></span>
                  <span>Chapter content generation</span>
                </div>
                <div className="flex items-center space-x-3">
                  <span className="w-2 h-2 bg-gray-600 rounded-full"></span>
                  <span>Final formatting and organization</span>
                </div>
              </div>

              <button
                onClick={handleGenerateDocumentation}
                disabled={loading}
                className="bg-green-900 hover:bg-green-700 text-white font-semibold rounded-xl px-8 py-4 text-lg transition disabled:bg-gray-900 disabled:cursor-not-allowed"
              >
                Generate Documentation
              </button>

              <p className="text-gray-500 text-sm mt-4">
                This process takes approximately 5-6 minutes
              </p>
            </div>

            <button
              onClick={handleNewRepository}
              className="text-gray-500 hover:text-gray-400 text-sm underline"
            >
              ← Use a different repository
            </button>
          </div>
        )}

        {/* Step 2: Generating */}
        {step === 2 && (
          <div className="text-center space-y-8">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-8">
              <div className="mb-6">
                <div className="h-16 w-16 mx-auto mb-4">
                  <div className="h-16 w-16 rounded-full border-4 border-gray-700 border-t-white animate-spin"></div>
                </div>
                <h2 className="text-xl font-semibold text-white mb-2">
                  Generating Documentation
                </h2>
                <p className="text-gray-400">
                  AI is analyzing your repository and creating comprehensive
                  documentation...
                </p>
              </div>

              <div className="space-y-3 text-left max-w-md mx-auto">
                <div className="flex items-center space-x-3">
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  <span className="text-gray-300">
                    Repository content analyzed
                  </span>
                </div>
                <div className="flex items-center space-x-3">
                  <span className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></span>
                  <span className="text-gray-300">
                    Documentation structure planning
                  </span>
                </div>
                <div className="flex items-center space-x-3">
                  <span className="w-2 h-2 bg-gray-600 rounded-full"></span>
                  <span className="text-gray-400">
                    Chapter content generation
                  </span>
                </div>
                <div className="flex items-center space-x-3">
                  <span className="w-2 h-2 bg-gray-600 rounded-full"></span>
                  <span className="text-gray-400">
                    Final formatting and organization
                  </span>
                </div>
              </div>

              <p className="text-gray-500 text-sm mt-6">
                Please wait... This may take several minutes
              </p>
            </div>
          </div>
        )}

        {/* Step 3: Complete */}
        {step === 3 && (
          <div className="text-center space-y-8">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-8">
              <div className="mb-6">
                <div className="h-16 w-16 mx-auto mb-4 bg-green-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-2xl">✓</span>
                </div>
                <h2 className="text-xl font-semibold text-white mb-2">
                  Documentation Generated Successfully!
                </h2>
                <p className="text-gray-400">
                  Your comprehensive documentation is ready to view.
                </p>
              </div>

              <div className="space-y-3 text-left max-w-md mx-auto mb-8">
                <div className="flex items-center space-x-3">
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  <span className="text-gray-300">
                    Repository content analyzed
                  </span>
                </div>
                <div className="flex items-center space-x-3">
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  <span className="text-gray-300">
                    Documentation structure planned
                  </span>
                </div>
                <div className="flex items-center space-x-3">
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  <span className="text-gray-300">
                    Chapter content generated
                  </span>
                </div>
                <div className="flex items-center space-x-3">
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  <span className="text-gray-300">
                    Final formatting completed
                  </span>
                </div>
              </div>

              <button
                onClick={() => navigate("/docs")}
                className="bg-gray-800 hover:bg-gray-700 text-white font-semibold rounded-xl px-8 py-4 text-lg transition"
              >
                View Documentation
              </button>

              <p className="text-gray-500 text-sm mt-4">
                Redirecting automatically...
              </p>
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="bg-red-900/20 border border-red-800 rounded-xl p-6 text-center">
            <p className="text-red-300 mb-4">{error}</p>
            <button
              onClick={() => setError("")}
              className="text-gray-400 hover:text-gray-300 text-sm underline"
            >
              Try again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default GenerationPage;
