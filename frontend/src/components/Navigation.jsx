import { Link, useLocation } from "react-router-dom";

function Navigation() {
  const location = useLocation();

  return (
    <nav className="border-b border-[#2d3748] bg-[#1a202c] px-4 py-3">
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        <Link to="/" className="text-xl font-bold text-blue-400">
          Repository Pilot
        </Link>

        <div className="flex space-x-1">
          <Link
            to="/"
            className={`px-4 py-2 rounded-md font-medium transition ${
              location.pathname === "/"
                ? "bg-blue-600 text-white"
                : "text-gray-300 hover:bg-[#2d3748]"
            }`}
          >
            Generate Docs
          </Link>
          <Link
            to="/chat"
            className={`px-4 py-2 rounded-md font-medium transition ${
              location.pathname === "/chat"
                ? "bg-blue-600 text-white"
                : "text-gray-300 hover:bg-[#2d3748]"
            }`}
          >
            Chat
          </Link>
        </div>
      </div>
    </nav>
  );
}

export default Navigation;
