import { useEffect, useRef, useState } from "react";
import mermaid from "mermaid";

const MermaidDiagram = ({ chart, title, type }) => {
  const mermaidRef = useRef(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Initialize mermaid
    mermaid.initialize({
      startOnLoad: false,
      theme: "dark",
      themeVariables: {
        primaryColor: "#a855f7",
        primaryTextColor: "#ffffff",
        primaryBorderColor: "#7c3aed",
        lineColor: "#6b7280",
        secondaryColor: "#1f2937",
        tertiaryColor: "#374151",
        background: "#111827",
        mainBkg: "#1f2937",
        secondBkg: "#374151",
        tertiaryBkg: "#4b5563",
      },
      flowchart: {
        useMaxWidth: true,
        htmlLabels: true,
      },
      sequence: {
        useMaxWidth: true,
      },
      class: {
        useMaxWidth: true,
      },
    });

    const renderDiagram = async () => {
      if (!chart || !mermaidRef.current) return;

      try {
        setError(null);
        
        // Clear previous content
        mermaidRef.current.innerHTML = "";
        
        // Generate unique ID for this diagram
        const id = `mermaid-${type}-${Date.now()}`;
        
        // Validate and render the diagram
        const isValid = await mermaid.parse(chart);
        if (isValid) {
          const { svg } = await mermaid.render(id, chart);
          mermaidRef.current.innerHTML = svg;
        } else {
          throw new Error("Invalid Mermaid syntax");
        }
      } catch (err) {
        console.error("Mermaid rendering error:", err);
        setError(err.message || "Failed to render diagram");
        mermaidRef.current.innerHTML = `
          <div class="text-red-400 p-4 text-center">
            <p>Error rendering diagram: ${err.message}</p>
            <details class="mt-2">
              <summary class="cursor-pointer">Show diagram code</summary>
              <pre class="text-xs mt-2 bg-gray-800 p-2 rounded overflow-auto">${chart}</pre>
            </details>
          </div>
        `;
      }
    };

    renderDiagram();
  }, [chart, type]);

  if (!chart) {
    return (
      <div className="text-gray-400 p-4 text-center italic">
        No {type} diagram available
      </div>
    );
  }

  return (
    <div className="mermaid-container bg-gray-900 border border-gray-700 rounded-lg overflow-hidden">
      {title && (
        <div className="bg-gray-800 px-4 py-2 border-b border-gray-700">
          <h4 className="text-sm font-medium text-gray-200">{title}</h4>
        </div>
      )}
      <div className="p-4">
        <div
          ref={mermaidRef}
          className="mermaid-diagram"
          style={{ 
            minHeight: "200px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}
        />
      </div>
    </div>
  );
};

export default MermaidDiagram;
