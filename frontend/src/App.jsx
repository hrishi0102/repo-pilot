import { Routes, Route } from "react-router-dom";
import Navigation from "./components/Navigation";
import DocumentationHome from "./components/DocumentationHome";
import DocumentationViewer from "./components/DocumentationViewer";
import Chat from "./components/Chat";

function App() {
  return (
    <div className="bg-[#0f1525] text-gray-100 min-h-screen">
      <Navigation />

      <main className="min-h-screen">
        <Routes>
          <Route path="/" element={<DocumentationHome />} />
          <Route path="/docs" element={<DocumentationViewer />} />
          <Route path="/chat" element={<Chat />} />
        </Routes>
      </main>

      <footer className="text-center text-gray-500 text-xs py-4 border-t border-[#2d3748]">
        Powered by Supermemory & Gemini
      </footer>
    </div>
  );
}

export default App;
