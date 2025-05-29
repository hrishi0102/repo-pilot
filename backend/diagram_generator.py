import logging
from typing import Dict, List, Optional
from llm_client import llm_client
from markdown_cleaner import markdown_cleaner

logger = logging.getLogger(__name__)

class DiagramGenerator:
    
    def __init__(self):
        self.max_nodes = 15  
    
    async def generate_architecture_diagram(self, abstractions: str, relationships: str, repo_url: str) -> Optional[str]:
        """Generate a high-level architecture flowchart diagram"""
        prompt = f"""
You are creating a technical architecture diagram using Mermaid flowchart syntax for a repository.

Repository: {repo_url}

Key Abstractions:
{abstractions}

Relationships:
{relationships}

Create a clean, readable Mermaid flowchart that shows:
1. Main components/modules as nodes
2. Data flow and dependencies as arrows
3. Group related components in subgraphs when appropriate
4. Use appropriate node shapes (rectangles for modules, diamonds for decisions, cylinders for databases, etc.)

RULES:
- Output ONLY the Mermaid code block
- Use flowchart TD (top-down) orientation
- Keep it simple with max 12-15 nodes
- Use descriptive but concise labels
- Use subgraphs to group related components
- Show clear data flow with labeled arrows

Example format:
```mermaid
flowchart TD
    A[Component A] --> B[Component B]
    B --> C{{Decision Point}}
    C -->|Yes| D[(Database)]
    C -->|No| E[Alternative Path]
    
    subgraph "Core System"
        A
        B
    end
    
    subgraph "Data Layer"
        D
    end
```

Generate the architecture diagram now:
"""
        
        result = await llm_client.generate_content(prompt)
        if result:
            
            result = self._extract_mermaid_code(result)
            logger.info("Generated architecture diagram")
        return result
    
    async def generate_class_diagram(self, abstractions: str, content: str, repo_url: str) -> Optional[str]:
        """Generate a class/component diagram showing relationships"""
        
        truncated_content = content[:50000] if len(content) > 50000 else content
        
        prompt = f"""
You are creating a class/component diagram using Mermaid classDiagram syntax for a repository.

Repository: {repo_url}

Key Abstractions:
{abstractions}

Code Sample:
{truncated_content}

Create a Mermaid class diagram that shows:
1. Main classes/components with key methods and properties
2. Inheritance and composition relationships
3. Interface implementations
4. Dependencies between classes

RULES:
- Output ONLY the Mermaid code block
- Use classDiagram syntax
- Keep it focused with max 8-10 classes
- Show key methods and properties only (not all)
- Use proper UML relationship symbols:
  - <|-- for inheritance
  - *-- for composition
  - o-- for aggregation
  - --> for association
  - ..|> for interface implementation

Example format:
```mermaid
classDiagram
    class BaseClass {{
        +String property
        +method() void
    }}
    
    class ConcreteClass {{
        +specificMethod() String
    }}
    
    BaseClass <|-- ConcreteClass
    ConcreteClass --> HelperClass
```

Generate the class diagram now:
"""
        
        result = await llm_client.generate_content(prompt)
        if result:
            result = self._extract_mermaid_code(result)
            logger.info("Generated class diagram")
        return result
    
    async def generate_sequence_diagram(self, abstractions: str, relationships: str, repo_url: str) -> Optional[str]:
        """Generate a sequence diagram showing key interactions"""
        prompt = f"""
You are creating a sequence diagram using Mermaid sequenceDiagram syntax for a repository.

Repository: {repo_url}

Key Abstractions:
{abstractions}

Relationships:
{relationships}

Create a Mermaid sequence diagram that shows:
1. Key user/system interactions
2. Flow of requests/responses
3. Main actors and components
4. Critical process flows

RULES:
- Output ONLY the Mermaid code block
- Use sequenceDiagram syntax
- Focus on 1-2 main workflows
- Keep it simple with max 5-6 participants
- Show clear message flow with descriptive labels
- Use notes and activate/deactivate when appropriate

Example format:
```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant Backend
    participant Database
    
    User->>Frontend: Submit request
    Frontend->>Backend: Process data
    activate Backend
    Backend->>Database: Query data
    Database-->>Backend: Return results
    Backend-->>Frontend: Send response
    deactivate Backend
    Frontend-->>User: Display results
```

Generate the sequence diagram now:
"""
        
        result = await llm_client.generate_content(prompt)
        if result:
            result = self._extract_mermaid_code(result)
            logger.info("Generated sequence diagram")
        return result
    
    async def generate_folder_structure_diagram(self, tree: str, repo_url: str) -> Optional[str]:
        """Generate a mindmap or flowchart showing repository structure"""
        prompt = f"""
You are creating a repository structure diagram using Mermaid mindmap syntax.

Repository: {repo_url}

Repository Tree:
{tree}

Create a Mermaid mindmap that shows:
1. Repository root as the center
2. Main folders as primary branches
3. Important subfolders and files as secondary branches
4. Focus on structure and organization

RULES:
- Output ONLY the Mermaid code block
- Use mindmap syntax
- Keep it organized and not too cluttered
- Show only the most important folders/files
- Use indentation to show hierarchy

Example format:
```mermaid
mindmap
  root((Repository))
    src
      components
        Header.jsx
        Footer.jsx
      utils
        helpers.js
    docs
      README.md
    tests
      unit
      integration
```

Generate the repository structure mindmap now:
"""
        
        result = await llm_client.generate_content(prompt)
        if result:
            result = self._extract_mermaid_code(result)
            logger.info("Generated folder structure diagram")
        return result
    
    def _extract_mermaid_code(self, content: str) -> str:
        """Extract just the mermaid code from a response"""
        if not content:
            return ""
        
       
        lines = content.split('\n')
        mermaid_lines = []
        in_mermaid_block = False
        
        for line in lines:
            if line.strip().startswith('```mermaid'):
                in_mermaid_block = True
                continue
            elif line.strip() == '```' and in_mermaid_block:
                break
            elif in_mermaid_block:
                mermaid_lines.append(line)
        
        
        if mermaid_lines:
            return '\n'.join(mermaid_lines).strip()
        
        # Otherwise, try to find mermaid keywords and extract relevant content
        content_lower = content.lower()
        if any(keyword in content_lower for keyword in ['flowchart', 'classDiagram', 'sequenceDiagram', 'mindmap']):
            # Return the content as-is, it might be just the mermaid code
            return content.strip()
        
        return ""
    
    async def generate_all_diagrams(self, repo_url: str, abstractions: str, relationships: str, tree: str, content: str) -> Dict[str, str]:
        """Generate all diagram types for the repository"""
        try:
            logger.info(f"Starting diagram generation for {repo_url}")
            
            diagrams = {}
            
            # architecture diagram
            logger.info("Generating architecture diagram...")
            arch_diagram = await self.generate_architecture_diagram(abstractions, relationships, repo_url)
            if arch_diagram:
                diagrams['architecture'] = arch_diagram
            
            # class diagram
            logger.info("Generating class diagram...")
            class_diagram = await self.generate_class_diagram(abstractions, content, repo_url)
            if class_diagram:
                diagrams['class'] = class_diagram
            
            # sequence diagram
            logger.info("Generating sequence diagram...")
            sequence_diagram = await self.generate_sequence_diagram(abstractions, relationships, repo_url)
            if sequence_diagram:
                diagrams['sequence'] = sequence_diagram
            
            # folder structure diagram
            logger.info("Generating folder structure diagram...")
            structure_diagram = await self.generate_folder_structure_diagram(tree, repo_url)
            if structure_diagram:
                diagrams['structure'] = structure_diagram
            
            logger.info(f"Generated {len(diagrams)} diagrams successfully")
            return diagrams
            
        except Exception as e:
            logger.error(f"Error generating diagrams: {str(e)}")
            return {}


diagram_generator = DiagramGenerator()
