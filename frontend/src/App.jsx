import { Routes, Route } from "react-router-dom";
import Navigation from "./components/Navigation";
import HomePage from "./components/HomePage";
import GenerationPage from "./components/GenerationPage";
import DocumentationViewer from "./components/DocumentationViewer";
import Chat from "./components/Chat";
import { inject } from "@vercel/analytics";

function App() {
  inject();
  return (
    <div className="bg-black text-gray-100 min-h-screen">
      <Navigation />

      <main className="min-h-screen">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/generate" element={<GenerationPage />} />
          <Route path="/docs" element={<DocumentationViewer />} />
          <Route path="/chat" element={<Chat />} />
        </Routes>
      </main>

      <footer className="text-center text-gray-500 text-xs py-4 border-t border-gray-800">
        Powered by Yaphub & Gemini
      </footer>
    </div>
  );
}

export default App;
