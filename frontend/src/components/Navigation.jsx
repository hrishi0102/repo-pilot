import { Link, useLocation } from "react-router-dom";

function Navigation() {
  const location = useLocation();

  // Don't show navigation on home page for cleaner look
  if (location.pathname === "/") {
    return null;
  }

  return (
    <nav className="border-b border-gray-800 bg-gray-900 px-6 py-4 w-full">
      <div className="flex items-center justify-between w-full">
        {/* Left - Logo */}
        <Link to="/" className="flex items-center space-x-3">
          <img
            src="/yaphub-logo.png"
            alt="Yaphub"
            className="w-8 h-8 object-contain"
          />
          <span className="text-white font-semibold text-lg">YapHub</span>
        </Link>

        {/* Right - Chat Button */}
        <Link
          to="/chat"
          className={`px-4 py-2 rounded-lg font-medium transition ${
            location.pathname === "/chat"
              ? "bg-gray-700 text-white"
              : "text-gray-300 hover:bg-gray-800 hover:text-white"
          }`}
        >
          Chat
        </Link>
      </div>
    </nav>
  );
}

export default Navigation;
