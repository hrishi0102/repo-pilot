import { useState } from 'react';
import MermaidDiagram from './MermaidDiagram';

const DiagramsViewer = ({ diagrams }) => {
  const [selectedDiagram, setSelectedDiagram] = useState(null);

  if (!diagrams || Object.keys(diagrams).length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-gray-400">
        <div className="text-6xl mb-4">📊</div>
        <h3 className="text-xl font-medium mb-2">No Diagrams Available</h3>
        <p className="text-center max-w-md">
          Diagrams will be generated along with documentation. Try generating documentation first.
        </p>
      </div>
    );
  }

  const diagramTypes = [
    { key: 'architecture', title: 'System Architecture', icon: '🏗️', description: 'High-level system structure and components' },
    { key: 'data_flow', title: 'Data Flow', icon: '💫', description: 'How data moves through the system' },
    { key: 'components', title: 'Component Relationships', icon: '🔗', description: 'Dependencies and interactions between modules' },
    { key: 'sequence', title: 'Sequence Diagram', icon: '⏯️', description: 'User interaction flow and timing' },
    { key: 'file_structure', title: 'File Structure', icon: '📁', description: 'Project folder and file organization' }
  ];

  const availableDiagrams = diagramTypes.filter(type => diagrams[type.key]);

  if (availableDiagrams.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-gray-400">
        <div className="text-6xl mb-4">⚠️</div>
        <h3 className="text-xl font-medium mb-2">Diagram Generation Failed</h3>
        <p className="text-center max-w-md">
          The diagrams could not be generated. This might be due to the repository structure or API limitations.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Repository Diagrams</h2>
          <p className="text-gray-400 mt-1">Visual representations of the codebase structure and flow</p>
        </div>
        <div className="text-sm text-gray-400 bg-gray-800/50 px-3 py-1 rounded-full">
          {availableDiagrams.length} diagram{availableDiagrams.length !== 1 ? 's' : ''} available
        </div>
      </div>

      {/* Diagram Selector */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {availableDiagrams.map((diagram) => (
          <button
            key={diagram.key}
            onClick={() => setSelectedDiagram(selectedDiagram === diagram.key ? null : diagram.key)}
            className={`p-4 rounded-lg border text-left transition-all duration-200 ${
              selectedDiagram === diagram.key
                ? 'bg-purple-900/30 border-purple-500 text-white'
                : 'bg-gray-800/50 border-gray-700 text-gray-300 hover:bg-gray-800 hover:border-gray-600'
            }`}
          >
            <div className="flex items-center mb-2">
              <span className="text-xl mr-3">{diagram.icon}</span>
              <h3 className="font-medium">{diagram.title}</h3>
            </div>
            <p className="text-sm text-gray-400">{diagram.description}</p>
          </button>
        ))}
      </div>

      {/* Selected Diagram Display */}
      {selectedDiagram && (
        <div className="mt-8">
          <div className="mb-4 p-4 bg-gray-800/30 border border-gray-700 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <span className="text-xl mr-3">
                  {availableDiagrams.find(d => d.key === selectedDiagram)?.icon}
                </span>
                <div>
                  <h3 className="text-lg font-medium text-white">
                    {availableDiagrams.find(d => d.key === selectedDiagram)?.title}
                  </h3>
                  <p className="text-sm text-gray-400">
                    {availableDiagrams.find(d => d.key === selectedDiagram)?.description}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedDiagram(null)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>
          </div>
          
          <MermaidDiagram
            chart={diagrams[selectedDiagram]}
            title={null} // Title is shown above
            className="w-full"
          />
        </div>
      )}

      {/* All Diagrams View (Alternative Layout) */}
      {!selectedDiagram && (
        <div className="mt-8">
          <h3 className="text-lg font-medium text-white mb-4">Quick Overview</h3>
          <div className="grid gap-6">
            {availableDiagrams.slice(0, 2).map((diagram) => (
              <div key={diagram.key} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <span className="text-lg mr-2">{diagram.icon}</span>
                    <h4 className="font-medium text-white">{diagram.title}</h4>
                  </div>
                  <button
                    onClick={() => setSelectedDiagram(diagram.key)}
                    className="text-sm text-purple-400 hover:text-purple-300 transition-colors"
                  >
                    View Full Size →
                  </button>
                </div>
                <div className="opacity-75 transform scale-75 origin-top-left">
                  <MermaidDiagram
                    chart={diagrams[diagram.key]}
                    title={null}
                    className="w-full max-h-[300px] overflow-hidden"
                  />
                </div>
              </div>
            ))}
          </div>
          
          {availableDiagrams.length > 2 && (
            <div className="mt-6 text-center">
              <p className="text-gray-400 mb-3">
                +{availableDiagrams.length - 2} more diagram{availableDiagrams.length - 2 !== 1 ? 's' : ''} available
              </p>
              <div className="text-sm text-gray-500">
                Click on any diagram type above to view it in full size
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DiagramsViewer;
