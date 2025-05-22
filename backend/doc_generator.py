import logging
from typing import Dict, List, Optional
from llm_client import llm_client

logger = logging.getLogger(__name__)

class DocumentationGenerator:
    
    def __init__(self):
        self.max_content_length = 1000000  # Increased for full content
    
    def _truncate_content_if_needed(self, content: str) -> str:
        """Truncate only if absolutely necessary"""
        if len(content) <= self.max_content_length:
            return content
        
        # Smart truncation - keep important parts
        half_length = self.max_content_length // 2
        truncated = (
            content[:half_length] + 
            "\n\n... [CONTENT TRUNCATED - MIDDLE SECTION REMOVED FOR PROCESSING] ...\n\n" + 
            content[-half_length:]
        )
        logger.warning(f"Content truncated from {len(content)} to {len(truncated)} chars")
        return truncated
    
    async def generate_comprehensive_summary(self, content: str) -> Optional[str]:
        """Generate comprehensive summary of repository content"""
        truncated_content = self._truncate_content_if_needed(content)
        
        prompt = f"""
Analyze this repository content and create a comprehensive, detailed summary that covers:

1. **Purpose & Overview**: What this repository does and its main goals
2. **Architecture & Structure**: High-level architecture and how components are organized
3. **Key Technologies**: Programming languages, frameworks, libraries used
4. **Main Components**: Core modules, classes, and their responsibilities
5. **Data Flow**: How data moves through the system
6. **External Dependencies**: Third-party integrations and APIs
7. **Configuration & Setup**: Important config files and setup requirements

Provide a detailed summary that would help someone new understand the entire codebase quickly.

Repository Content:
{truncated_content}
"""
        
        result = await llm_client.generate_content(prompt)
        logger.info("Generated comprehensive repository summary")
        return result
    
    async def identify_abstractions(self, content: str) -> Optional[str]:
        """Step 1: Identify key abstractions using FULL repo content"""
        # Use full content as requested
        prompt = f"""
Analyze this ENTIRE codebase and identify the most important abstractions, components, modules, and concepts that a new contributor must understand to effectively contribute to this project.

Focus on identifying:
- **Core Classes & Modules**: Main classes, functions, and modules that drive the application
- **Architectural Patterns**: Design patterns, architectural styles used
- **Key Data Structures**: Important data models, schemas, interfaces
- **Business Logic Components**: Core functionality and business rules
- **Integration Points**: APIs, databases, external services
- **Configuration & Infrastructure**: Build systems, deployment, configuration

Limit to the TOP 10-12 most critical abstractions that someone new needs to understand first.

For each abstraction, provide:
- Name and brief description
- Location in codebase
- Why it's important for new contributors

Full Repository Content:
{content}
"""
        
        result = await llm_client.generate_content(prompt)
        logger.info("Identified key abstractions from full repository content")
        return result
    
    async def analyze_relationships(self, abstractions: str, comprehensive_summary: str) -> Optional[str]:
        """Step 2: Analyze relationships using comprehensive summary"""
        prompt = f"""
Based on these identified abstractions and the comprehensive repository summary, analyze the relationships and dependencies between components.

Key Abstractions:
{abstractions}

Comprehensive Repository Summary:
{comprehensive_summary}

Create a relationship analysis that shows:
- **Component Dependencies**: Which components depend on others and why
- **Data Flow Patterns**: How data moves between different parts of the system
- **Communication Patterns**: How different modules interact (function calls, events, APIs)
- **Hierarchical Structure**: Parent-child relationships and system layers
- **Critical Paths**: Main execution flows a new contributor should understand

Focus on relationships that are crucial for new contributors to understand the system architecture.
"""
        
        result = await llm_client.generate_content(prompt)
        logger.info("Analyzed component relationships")
        return result
    
    async def order_chapters(self, abstractions: str, relationships: str) -> Optional[str]:
        """Step 3: Create 4-5 chapter structure based on importance"""
        prompt = f"""
Based on the abstractions and relationships, create a logical 4-5 chapter structure for documentation that will help new contributors understand and contribute to this repository effectively.

Abstractions:
{abstractions}

Relationships:
{relationships}

Create exactly 4-5 chapters that follow this learning progression:
1. **Getting Started & Overview** (always first)
2. **Core Architecture & Components**
3. **Key Workflows & Data Flow**
4. **Integration & External Dependencies**
5. **Contributing Guidelines & Development Setup** (if needed)

For each chapter, specify:
- Chapter number and title
- What topics it covers
- Why this order makes sense for new contributors
- Key learning objectives

Focus on the most important and relevant aspects that enable fast-tracking repository understanding.
"""
        
        result = await llm_client.generate_content(prompt)
        logger.info("Created chapter ordering (4-5 chapters)")
        return result
    
    async def write_chapter(self, chapter_info: str, abstractions: str, relationships: str, comprehensive_summary: str, repo_url: str) -> Optional[str]:
        """Write detailed documentation for a single chapter"""
        prompt = f"""
Write comprehensive documentation for this specific chapter of the repository guide.

Repository: {repo_url}

Chapter to Write:
{chapter_info}

Available Context:
Key Abstractions: {abstractions}
Component Relationships: {relationships}
Repository Summary: {comprehensive_summary}

IMPORTANT: Format your response as clean, well-structured markdown with:

1. Start with a main chapter header using # (H1)
2. Use ## for major sections (H2)  
3. Use ### for subsections (H3)
4. Use proper code blocks with language specification:
   ```javascript
   // code here
   ```
5. Use bullet points with - or *
6. Use numbered lists with 1. 2. 3.
7. Use **bold** for emphasis
8. Use `inline code` for variables/functions
9. Leave blank lines between sections for proper spacing

Write detailed documentation that includes:
- Clear explanations of concepts
- Code examples with proper formatting
- Practical guidance for new contributors
- Step-by-step processes where applicable
- Troubleshooting tips

Make sure the markdown renders properly with good visual hierarchy and spacing.
"""
        
        result = await llm_client.generate_content(prompt)
        logger.info(f"Generated detailed chapter documentation")
        return result
    
    async def create_introduction(self, comprehensive_summary: str, abstractions: str, repo_url: str) -> Optional[str]:
        """Create comprehensive introduction page"""
        prompt = f"""
Create a comprehensive introduction page for new contributors to this repository.

Repository: {repo_url}
Repository Summary: {comprehensive_summary}
Key Abstractions: {abstractions}

IMPORTANT: Format as clean, well-structured markdown:

Create an introduction following this exact structure:

# Repository Guide for New Contributors

## Welcome & Purpose
- What this repository does and why it exists
- Who should use this guide
- What you'll learn from this documentation

## Quick Start Overview
- High-level architecture summary
- Key technologies and frameworks used
- Prerequisites for contributing

## Repository Structure
```
repo-name/
├── folder1/
│   ├── subfolder/
│   └── files...
├── folder2/
└── README.md
```

## Key Technologies
- **Technology 1**: Description and purpose
- **Technology 2**: Description and purpose

## How to Use This Guide
1. Start with this introduction
2. Read Chapter 1 for architecture overview
3. Follow subsequent chapters in order
4. Use the navigation to jump between sections

## Getting Started Checklist
- [ ] Clone the repository
- [ ] Install dependencies
- [ ] Set up development environment
- [ ] Run the application locally
- [ ] Verify setup works

## Need Help?
- Check the troubleshooting section
- Review common issues
- Contact maintainers

Make sure to use proper markdown formatting with clear headers, code blocks, and lists.
"""
        
        result = await llm_client.generate_content(prompt)
        logger.info("Created comprehensive introduction")
        return result
    
    async def generate_full_documentation(self, repo_url: str, summary: str, tree: str, content: str) -> Dict:
        """Main method that orchestrates the entire documentation generation process"""
        try:
            logger.info(f"Starting documentation generation for {repo_url}")
            
            # Step 1: Generate comprehensive summary
            logger.info("Step 1: Generating comprehensive repository summary...")
            comprehensive_summary = await self.generate_comprehensive_summary(content)
            if not comprehensive_summary:
                return {"error": "Failed to generate comprehensive summary"}
            
            # Step 2: Identify abstractions (using full content)
            logger.info("Step 2: Identifying abstractions from full content...")
            abstractions = await self.identify_abstractions(content)
            if not abstractions:
                return {"error": "Failed to identify abstractions"}
            
            # Step 3: Analyze relationships (using comprehensive summary)
            logger.info("Step 3: Analyzing relationships...")
            relationships = await self.analyze_relationships(abstractions, comprehensive_summary)
            if not relationships:
                return {"error": "Failed to analyze relationships"}
            
            # Step 4: Order chapters (4-5 chapters)
            logger.info("Step 4: Creating chapter structure...")
            chapter_structure = await self.order_chapters(abstractions, relationships)
            if not chapter_structure:
                return {"error": "Failed to create chapter structure"}
            
            # Step 5: Create introduction
            logger.info("Step 5: Creating introduction...")
            introduction = await self.create_introduction(comprehensive_summary, abstractions, repo_url)
            if not introduction:
                return {"error": "Failed to create introduction"}
            
            # Step 6: Write individual chapters (parse chapter structure and write each)
            logger.info("Step 6: Writing individual chapters...")
            chapters = {}
            
            # Better parsing of chapters to extract clean titles
            chapter_lines = []
            for line in chapter_structure.split('\n'):
                line = line.strip()
                if line and any(keyword in line.lower() for keyword in ['chapter', '1.', '2.', '3.', '4.', '5.']):
                    # Clean the line to get a better title
                    clean_line = line.replace('**', '').replace('*', '').strip()
                    if clean_line and len(clean_line) > 5:  # Avoid very short lines
                        chapter_lines.append(clean_line)
            
            # Remove duplicates while preserving order
            seen = set()
            unique_chapters = []
            for chapter in chapter_lines[:5]:  # Limit to 5 chapters
                chapter_key = chapter.lower().replace(' ', '')
                if chapter_key not in seen:
                    seen.add(chapter_key)
                    unique_chapters.append(chapter)
            
            for i, chapter_line in enumerate(unique_chapters, 1):
                logger.info(f"Writing Chapter {i}: {chapter_line[:60]}...")
                chapter_content = await self.write_chapter(
                    chapter_info=f"Chapter {i}: {chapter_line}",
                    abstractions=abstractions,
                    relationships=relationships,
                    comprehensive_summary=comprehensive_summary,
                    repo_url=repo_url
                )
                
                if chapter_content:
                    chapters[f"chapter_{i}"] = {
                        "title": chapter_line,
                        "content": chapter_content
                    }
                else:
                    logger.warning(f"Failed to generate Chapter {i}")
            
            if not chapters:
                return {"error": "Failed to generate any chapters"}
            
            logger.info(f"Documentation generation completed successfully with {len(chapters)} chapters")
            
            return {
                "success": True,
                "repo_url": repo_url,
                "introduction": introduction,
                "chapters": chapters,
                "metadata": {
                    "comprehensive_summary": comprehensive_summary,
                    "abstractions": abstractions,
                    "relationships": relationships,
                    "chapter_structure": chapter_structure,
                    "total_chapters": len(chapters)
                }
            }
            
        except Exception as e:
            logger.error(f"Error in documentation generation: {str(e)}")
            return {"error": f"Documentation generation failed: {str(e)}"}

# Global instance
doc_generator = DocumentationGenerator()