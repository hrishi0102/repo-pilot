import { Link, useLocation } from "react-router-dom";

function Navigation() {
  const location = useLocation();

  // Don't show navigation on home page for cleaner look
  if (location.pathname === "/") {
    return null;
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-10 border-b border-gray-800 bg-gray-950 px-6 py-3 w-full shadow-md">
      <div className="flex items-center justify-between w-full">
        {/* Left - Logo */}
        <Link to="/" className="flex items-center space-x-3">
          <img
            src="./yahublogo.png"
            alt="Yaphub"
            className="w-7 h-7 object-contain"
          />
          <span className="text-gray-100 font-medium text-lg">YappHub</span>
        </Link>

        {/* Right - Chat Button */}
        <Link
          to="/chat"
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
            location.pathname === "/chat"
              ? "bg-gray-800 text-gray-100 border-b-2 border-purple-500"
              : "text-gray-400 hover:bg-gray-800 hover:text-purple-300 hover:border-b-2 hover:border-purple-400"
          }`}
        >
          Chat
        </Link>
      </div>
    </nav>
  );
}

export default Navigation;
