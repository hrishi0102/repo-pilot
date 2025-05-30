import { useEffect, useRef } from 'react';
import mermaid from 'mermaid';

const MermaidDiagram = ({ chart, title, className = "" }) => {
  const mermaidRef = useRef();

  useEffect(() => {
    // Initialize mermaid with dark theme
    mermaid.initialize({
      startOnLoad: false,
      theme: 'dark',
      themeVariables: {
        darkMode: true,
        primaryColor: '#7c3aed',
        primaryTextColor: '#ffffff',
        primaryBorderColor: '#7c3aed',
        lineColor: '#ffffff',
        secondaryColor: '#374151',
        tertiaryColor: '#1f2937',
        background: '#0f172a',
        mainBkg: '#1e293b',
        secondaryBkg: '#374151',
        tertiaryBkg: '#4b5563',
        primaryTextColor: '#ffffff',
        secondaryTextColor: '#e5e7eb',
        tertiaryTextColor: '#d1d5db',
        nodeBkg: '#374151',
        nodeBorder: '#7c3aed',
        clusterBkg: '#1e293b',
        clusterBorder: '#7c3aed',
        defaultLinkColor: '#ffffff',
        titleColor: '#ffffff',
        edgeLabelBackground: '#1e293b',
        actorBorder: '#7c3aed',
        actorBkg: '#374151',
        actorTextColor: '#ffffff',
        actorLineColor: '#ffffff',
        signalColor: '#ffffff',
        signalTextColor: '#ffffff',
        c0: '#7c3aed',
        c1: '#8b5cf6',
        c2: '#a78bfa',
        c3: '#c4b5fd',
        c4: '#ddd6fe'
      },
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: 14,
      flowchart: {
        useMaxWidth: true,
        htmlLabels: true,
        curve: 'basis'
      },
      sequence: {
        diagramMarginX: 50,
        diagramMarginY: 10,
        actorMargin: 50,
        width: 150,
        height: 65,
        boxMargin: 10,
        boxTextMargin: 5,
        noteMargin: 10,
        messageMargin: 35,
        mirrorActors: true,
        bottomMarginAdj: 1,
        useMaxWidth: true,
        rightAngles: false,
        showSequenceNumbers: false
      },
      gantt: {
        titleTopMargin: 25,
        barHeight: 20,
        fontSize: 11,
        fontFamily: 'system-ui, -apple-system, sans-serif',
        sidePadding: 75,
        leftPadding: 75,
        gridLineStartPadding: 35,
        fontSize: 11,
        numberSectionStyles: 4
      }
    });

    if (mermaidRef.current && chart) {
      // Clear any existing content
      mermaidRef.current.innerHTML = '';
      
      // Generate unique ID for this diagram
      const uniqueId = `mermaid-${Math.random().toString(36).substr(2, 9)}`;
      
      try {
        mermaid.render(uniqueId, chart).then(({ svg }) => {
          if (mermaidRef.current) {
            mermaidRef.current.innerHTML = svg;
          }
        }).catch((error) => {
          console.error('Mermaid rendering error:', error);
          if (mermaidRef.current) {
            mermaidRef.current.innerHTML = `
              <div class="text-red-400 p-4 border border-red-400/20 rounded-lg bg-red-900/10">
                <p class="font-medium">Error rendering diagram</p>
                <p class="text-sm mt-1">${error.message}</p>
              </div>
            `;
          }
        });
      } catch (error) {
        console.error('Mermaid render error:', error);
        if (mermaidRef.current) {
          mermaidRef.current.innerHTML = `
            <div class="text-red-400 p-4 border border-red-400/20 rounded-lg bg-red-900/10">
              <p class="font-medium">Error rendering diagram</p>
              <p class="text-sm mt-1">${error.message}</p>
            </div>
          `;
        }
      }
    }
  }, [chart]);

  if (!chart) {
    return (
      <div className="text-gray-400 p-4 border border-gray-700 rounded-lg bg-gray-900/50">
        <p>No diagram data available</p>
      </div>
    );
  }

  return (
    <div className={`mermaid-container ${className}`}>
      {title && (
        <h3 className="text-lg font-medium text-white mb-3 flex items-center">
          <span className="mr-2">📊</span>
          {title}
        </h3>
      )}
      <div className="bg-gray-900 border border-gray-700 rounded-lg p-4 overflow-auto">
        <div ref={mermaidRef} className="mermaid-diagram flex justify-center" />
      </div>
    </div>
  );
};

export default MermaidDiagram;
