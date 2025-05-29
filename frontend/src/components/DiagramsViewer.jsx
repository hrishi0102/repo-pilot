import { useState } from "react";
import MermaidDiagram from "./MermaidDiagram";

const DiagramsViewer = ({ diagrams }) => {
  const [selectedDiagram, setSelectedDiagram] = useState("architecture");

  if (!diagrams || Object.keys(diagrams).length === 0) {
    return (
      <div className="bg-gray-900 border border-gray-700 rounded-lg p-6 text-center">
        <div className="text-gray-400 mb-2">📊</div>
        <p className="text-gray-400">No diagrams available for this repository</p>
      </div>
    );
  }

  const diagramTypes = {
    architecture: {
      title: "Architecture Overview",
      icon: "🏗️",
      description: "High-level system architecture and component relationships"
    },
    class: {
      title: "Class/Component Diagram", 
      icon: "📦",
      description: "Classes, interfaces, and their relationships"
    },
    sequence: {
      title: "Sequence Diagram",
      icon: "🔄", 
      description: "User interactions and data flow"
    },
    structure: {
      title: "Repository Structure",
      icon: "📁",
      description: "Folder and file organization"
    }
  };

  const availableDiagrams = Object.keys(diagrams).filter(key => diagrams[key]);

  return (
    <div className="space-y-4">
      {/* Diagram Selector */}
      <div className="bg-gray-900 border border-gray-700 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-white mb-3 flex items-center">
          <span className="mr-2">📊</span>
          Visual Architecture Diagrams
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {availableDiagrams.map((type) => {
            const config = diagramTypes[type];
            if (!config) return null;
            
            return (
              <button
                key={type}
                onClick={() => setSelectedDiagram(type)}
                className={`p-3 rounded-lg border transition-all duration-200 text-left ${
                  selectedDiagram === type
                    ? "bg-purple-600 border-purple-500 text-white"
                    : "bg-gray-800 border-gray-600 text-gray-300 hover:bg-gray-700 hover:border-gray-500"
                }`}
              >
                <div className="flex items-center mb-2">
                  <span className="text-lg mr-2">{config.icon}</span>
                  <span className="font-medium text-sm">{config.title}</span>
                </div>
                <p className="text-xs opacity-80">{config.description}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Diagram */}
      {selectedDiagram && diagrams[selectedDiagram] && (
        <MermaidDiagram
          chart={diagrams[selectedDiagram]}
          title={diagramTypes[selectedDiagram]?.title}
          type={selectedDiagram}
        />
      )}

      {/* Diagram Info */}
      <div className="bg-gray-900 border border-gray-700 rounded-lg p-4">
        <h4 className="text-sm font-medium text-gray-200 mb-2">💡 How to Read These Diagrams</h4>
        <div className="text-xs text-gray-400 space-y-1">
          <p><strong>Architecture:</strong> Shows how major components connect and interact</p>
          <p><strong>Class/Component:</strong> Details the structure of classes and their relationships</p>
          <p><strong>Sequence:</strong> Illustrates the flow of operations over time</p>
          <p><strong>Structure:</strong> Maps out the repository's folder and file organization</p>
        </div>
      </div>
    </div>
  );
};

export default DiagramsViewer;
