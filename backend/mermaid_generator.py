import logging
from typing import Dict, List, Optional
from llm_client import llm_client
import re

logger = logging.getLogger(__name__)

class MermaidDiagramGenerator:
    
    def __init__(self):
        self.max_content_length = 500000  # Slightly smaller for mermaid processing
    
    def _truncate_content_if_needed(self, content: str) -> str:
        """Truncate content if needed for mermaid processing"""
        if len(content) <= self.max_content_length:
            return content
        
        half_length = self.max_content_length // 2
        truncated = (
            content[:half_length] + 
            "\n\n... [CONTENT TRUNCATED FOR MERMAID PROCESSING] ...\n\n" + 
            content[-half_length:]        )
        logger.warning(f"Content truncated for mermaid from {len(content)} to {len(truncated)} chars")
        return truncated
    
    def _clean_mermaid_code(self, mermaid_text: str) -> str:
        """Clean and validate mermaid code"""
        if not mermaid_text:
            return ""
        
        # Remove markdown code blocks if present
        lines = mermaid_text.strip().split('\n')
        cleaned_lines = []
        in_code_block = False
        
        for line in lines:
            stripped_line = line.strip()
            if stripped_line.startswith('```'):
                # Toggle code block state when we encounter any ``` line
                in_code_block = not in_code_block
                continue
            
            # If we're inside a code block, collect the content
            if in_code_block:
                cleaned_lines.append(line)
        
        # If no code blocks were found, return the original text
        if not cleaned_lines and not any(line.strip().startswith('```') for line in lines):
            cleaned_lines = lines
        
        result = '\n'.join(cleaned_lines).strip()        # Fix common syntax issues
        result = self._fix_mermaid_syntax(result)
        
        # Post-process for additional cleaning
        result = self._post_process_mermaid(result)
        
        # Validate the final result
        if not self._validate_mermaid_diagram(result):
            logger.warning(f"Generated mermaid diagram failed validation: {result[:100]}...")
            return ""
        
        return result
    
    def _fix_mermaid_syntax(self, mermaid_text: str) -> str:
        """Fix common mermaid syntax issues"""
        lines = mermaid_text.split('\n')
        fixed_lines = []
        
        for i, line in enumerate(lines):
            stripped = line.strip()
            
            # Skip empty lines
            if not stripped:
                fixed_lines.append(line)
                continue
            
            # Fix missing newlines after 'end' statements
            if stripped == 'end':
                fixed_lines.append(line)
                # Add newline if next line starts a new subgraph
                if i + 1 < len(lines) and lines[i + 1].strip().startswith('subgraph'):
                    fixed_lines.append('')
                continue
            
            # Clean up arrow syntax - remove double dashes and special chars
            if '-->' in stripped or '--' in stripped:
                # Fix double dashes in arrows
                line = line.replace(' -- ', ' --> ')
                line = line.replace('--  ', '-- ')
                
                # Remove problematic characters from labels
                import re
                # Fix colons in the middle of connections
                line = re.sub(r'(\w+)\s*--\s*([^>]*)::', r'\1 -- \2_', line)                # Clean up node IDs - replace problematic characters
                line = re.sub(r'(\w+)\s*-->\s*(\w+)', lambda m: f"{self._clean_node_id(m.group(1))} --> {self._clean_node_id(m.group(2))}", line)
                
            # Fix node names with special characters
            if '[' in stripped and ']' in stripped:                # Replace problematic characters in node labels
                import re
                line = re.sub(r'\[([^\]]*)\.(xaml\.cs|cs)([^\]]*)\]', r'[\1_\2\3]', line)
                line = re.sub(r'\[([^\]]*)\s-\s([^\]]*)\]', r'[\1_\2]', line)
            
            fixed_lines.append(line)
        
        return '\n'.join(fixed_lines)
    
    def _clean_node_id(self, node_id: str) -> str:
        """Clean node ID to only contain valid characters"""
        import re
        # Replace invalid characters with underscores
        cleaned = re.sub(r'[^a-zA-Z0-9_]', '_', node_id)
        # Ensure it starts with a letter
        if cleaned and not cleaned[0].isalpha():
            cleaned = 'node_' + cleaned
        return cleaned or 'node'
    
    def _clean_label(self, label: str) -> str:
        """Clean label text for mermaid compatibility"""
        import re
        # Remove or replace problematic characters while keeping readability
        cleaned = label.replace('(', '_').replace(')', '_').replace(':', '_').replace('-', '_')
        return re.sub(r'[^\w\s_]', '_', cleaned)
    
    def _validate_mermaid_diagram(self, mermaid_text: str) -> bool:
        """Validate if mermaid diagram syntax is correct"""
        if not mermaid_text or not mermaid_text.strip():
            return False
        
        lines = mermaid_text.strip().split('\n')
        if not lines:
            return False
        
        # Check if it starts with a valid diagram type
        first_line = lines[0].strip()
        valid_starts = ['graph', 'flowchart', 'sequenceDiagram', 'classDiagram', 'erDiagram']
        
        return any(first_line.startswith(start) for start in valid_starts)
    
    async def generate_architecture_diagram(self, repo_url: str, summary: str, tree: str, content: str, user_api_key: str = None) -> Optional[str]:
        """Generate high-level architecture diagram"""
        truncated_content = self._truncate_content_if_needed(content)
        
        prompt = f"""
You are a technical architect creating mermaid diagrams. Generate ONLY the mermaid code for a high-level architecture diagram.

Repository: {repo_url}
Summary: {summary}
Tree Structure: {tree}
Content: {truncated_content}

Create a flowchart diagram showing:
1. Main entry points (API endpoints, main files)
2. Core business logic components
3. Data persistence layers
4. External services/dependencies
5. Key data flows between components

Use this format:
```
flowchart TD
    A[Component_Name] --> B[Another_Component]
    B --> C{{Decision_Point}}
    C -->|Yes| D[Action]
    C -->|No| E[Alternative]
    
    subgraph "Module Group"
        D
        E
    end
```

STRICT SYNTAX RULES:
- Use only letters, numbers, underscores in node IDs (no special chars like ., -, ::)
- Replace spaces with underscores in node IDs
- Use simple arrow syntax: A --> B (not -- or multiple dashes)
- Always put newline after 'end' before next subgraph
- Use meaningful but simple component names
- Maximum 12 nodes to keep it readable
- No special characters in node labels except brackets

Output ONLY the mermaid flowchart code, no markdown blocks, no explanations.
"""
        
        result = await llm_client.generate_content(prompt, user_api_key)
        if result:
            result = self._clean_mermaid_code(result)
            logger.info("Generated architecture diagram")
        return result
    
    async def generate_data_flow_diagram(self, repo_url: str, summary: str, abstractions: str, relationships: str, user_api_key: str = None) -> Optional[str]:
        """Generate data flow diagram showing how data moves through the system"""
        
        prompt = f"""
You are creating a mermaid data flow diagram. Generate ONLY the mermaid code.

Repository: {repo_url}
Summary: {summary}
Abstractions: {abstractions}
Relationships: {relationships}

Create a flowchart showing data flow:
1. Where data enters the system
2. How data is processed/transformed
3. Where data is stored
4. What data is returned/output

Use this format:
```
flowchart LR
    Input[User_Input] --> Process1[Validation]
    Process1 --> Process2[Business_Logic]
    Process2 --> Store[(Database)]
    Process2 --> Output[API_Response]
    
    subgraph "Processing Pipeline"
        Process1
        Process2
    end
```

STRICT SYNTAX RULES:
- Use only letters, numbers, underscores in node IDs
- Replace spaces with underscores in node IDs
- Use simple arrow syntax: A --> B
- Always put newline after 'end' before next subgraph
- Use [(Database)] for storage, [Process] for operations
- Maximum 10 nodes
- No special characters in node labels

Output ONLY the mermaid flowchart code, no markdown blocks, no explanations.
"""
        
        result = await llm_client.generate_content(prompt, user_api_key)
        if result:
            result = self._clean_mermaid_code(result)
            logger.info("Generated data flow diagram")
        return result
    
    async def generate_component_relationship_diagram(self, abstractions: str, relationships: str, user_api_key: str = None) -> Optional[str]:
        """Generate component relationship diagram showing how modules/classes interact"""
        prompt = f"""
You are creating a mermaid component relationship diagram. Generate ONLY the mermaid code.

Abstractions: {abstractions}
Relationships: {relationships}

Create a graph showing component relationships:
1. Main classes/modules as nodes
2. Dependencies and interactions as edges
3. Inheritance or composition relationships
4. Import/usage relationships

Use this format:
```
graph TD
    ClassA --> ClassB
    ClassA -.-> InterfaceC
    ClassB --> DataStore
    
    subgraph "Core Layer"
        ClassA
        ClassB
    end
    
    subgraph "Data Layer"
        DataStore
    end
```

Guidelines:
- Use solid arrows --> for strong dependencies
- Use dotted arrows -.-> for weak dependencies/interfaces
- Use different shapes for different types (classes, interfaces, data)
- Group related components in subgraphs by layer/module
- Maximum 10-12 nodes
- Show actual class/module names from the codebase

Output ONLY the mermaid graph code, no markdown blocks, no explanations.
"""
        
        result = await llm_client.generate_content(prompt, user_api_key)
        if result:
            result = self._clean_mermaid_code(result)
            logger.info("Generated component relationship diagram")
        return result
    
    async def generate_sequence_diagram(self, repo_url: str, abstractions: str, relationships: str, user_api_key: str = None) -> Optional[str]:
        """Generate sequence diagram showing typical user interaction flow"""
        prompt = f"""
You are creating a mermaid sequence diagram. Generate ONLY the mermaid code.

Repository: {repo_url}
Abstractions: {abstractions}
Relationships: {relationships}

Create a sequence diagram showing a typical user interaction flow:
1. User/Client initiating request
2. Main components processing the request
3. Database/external service interactions
4. Response flow back to user

Use this format:
```
sequenceDiagram
    participant User
    participant API
    participant Service
    participant DB
    
    User->>API: Request
    API->>Service: Process
    Service->>DB: Query
    DB-->>Service: Data
    Service-->>API: Result
    API-->>User: Response
```

Guidelines:
- Use actual component names from the codebase
- Show one main user workflow/use case
- Use ->> for requests and -->> for responses
- Include error handling if relevant
- Maximum 8-10 interactions
- Focus on the most important user journey

Output ONLY the mermaid sequenceDiagram code, no markdown blocks, no explanations.
"""
        
        result = await llm_client.generate_content(prompt, user_api_key)
        if result:
            result = self._clean_mermaid_code(result)
            logger.info("Generated sequence diagram")
        return result
    
    async def generate_file_structure_diagram(self, tree: str, user_api_key: str = None) -> Optional[str]:
        """Generate a simplified file structure diagram"""
        prompt = f"""
You are creating a mermaid file structure diagram. Generate ONLY the mermaid code.

File Tree Structure:
{tree}

Create a flowchart showing the important file/folder structure:
1. Main project folders
2. Key configuration files
3. Important source code directories
4. Build/deployment artifacts

Use this format:
```
flowchart TD
    Root[Project Root]
    Root --> Src[src/]
    Root --> Config[config/]
    Src --> Components[components/]
    Src --> Utils[utils/]
    
    subgraph "Source Code"
        Components
        Utils
    end
```

Guidelines:
- Only show important directories and files (skip node_modules, .git, etc.)
- Use folder/ notation for directories
- Group related folders in subgraphs
- Maximum 12-15 nodes
- Focus on the main project structure
- Use meaningful labels

Output ONLY the mermaid flowchart code, no markdown blocks, no explanations.
"""
        
        result = await llm_client.generate_content(prompt, user_api_key)
        if result:
            result = self._clean_mermaid_code(result)
            logger.info("Generated file structure diagram")
        return result
    
    async def generate_all_diagrams(self, repo_url: str, summary: str, tree: str, content: str, abstractions: str, relationships: str, user_api_key: str = None) -> Dict[str, str]:
        """Generate all diagram types for the repository"""
        try:
            logger.info(f"Starting mermaid diagram generation for {repo_url}")
            
            diagrams = {}
            
            # Generate architecture diagram
            logger.info("Generating architecture diagram...")
            architecture = await self.generate_architecture_diagram(repo_url, summary, tree, content, user_api_key)
            if architecture:
                diagrams['architecture'] = architecture
            
            # Generate data flow diagram
            logger.info("Generating data flow diagram...")
            data_flow = await self.generate_data_flow_diagram(repo_url, summary, abstractions, relationships, user_api_key)
            if data_flow:
                diagrams['data_flow'] = data_flow
            
            # Generate component relationship diagram
            logger.info("Generating component relationship diagram...")
            components = await self.generate_component_relationship_diagram(abstractions, relationships, user_api_key)
            if components:
                diagrams['components'] = components
            
            # Generate sequence diagram
            logger.info("Generating sequence diagram...")
            sequence = await self.generate_sequence_diagram(repo_url, abstractions, relationships, user_api_key)
            if sequence:
                diagrams['sequence'] = sequence
            
            # Generate file structure diagram
            logger.info("Generating file structure diagram...")
            file_structure = await self.generate_file_structure_diagram(tree, user_api_key)
            if file_structure:
                diagrams['file_structure'] = file_structure
            
            logger.info(f"Generated {len(diagrams)} mermaid diagrams successfully")
            return diagrams
            
        except Exception as e:
            logger.error(f"Error generating mermaid diagrams: {str(e)}")
            return {}
    
    def _post_process_mermaid(self, mermaid_text: str) -> str:
        """Post-process mermaid diagram to fix common syntax issues"""
        if not mermaid_text:
            return ""
        
        import re
        
        # Fix parentheses nodes - convert (Node) to [Node] 
        lines = mermaid_text.split('\n')
        processed_lines = []
        
        for line in lines:
            # Convert standalone parentheses nodes to bracket nodes
            if '-->' in line:
                # Fix (Node) patterns in connections
                line = re.sub(r'\(([^)]+)\)\s*--', r'[\1] --', line)
                line = re.sub(r'-->\s*\(([^)]+)\)', r'--> [\1]', line)
            
            # Clean node declarations  
            if '[' in line and ']' in line:
                # Remove file extensions in node labels for cleaner display
                line = re.sub(r'\[([^[\]]*)\.(sln|xaml|cs|cpp|h)([^[\]]*)\]', r'[\1_\2\3]', line)
            
            processed_lines.append(line)
        
        return '\n'.join(processed_lines)

# Global instance
mermaid_generator = MermaidDiagramGenerator()
