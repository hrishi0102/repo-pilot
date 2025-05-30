import logging
from typing import Dict, List, Optional
from llm_client import llm_client
from markdown_cleaner import markdown_cleaner
from mermaid_generator import mermaid_generator
import re

logger = logging.getLogger(__name__)

class DocumentationGenerator:
    
    def __init__(self):
        self.max_content_length = 750000
    
    def _truncate_content_if_needed(self, content: str) -> str:
        """Truncate only if absolutely necessary"""
        if len(content) <= self.max_content_length:
            return content
        
        half_length = self.max_content_length // 2
        truncated = (
            content[:half_length] + 
            "\n\n... [CONTENT TRUNCATED - MIDDLE SECTION REMOVED FOR PROCESSING] ...\n\n" + 
            content[-half_length:]
        )
        logger.warning(f"Content truncated from {len(content)} to {len(truncated)} chars")
        return truncated
    
    def _clean_chapter_title(self, title: str) -> str:
        """Clean and normalize chapter titles"""
        # Remove markdown formatting and numbering
        cleaned = re.sub(r'^#+\s*', '', title.strip())
        cleaned = re.sub(r'^\d+\.\s*', '', cleaned)
        cleaned = re.sub(r'^Chapter\s+\d+:?\s*', '', cleaned, flags=re.IGNORECASE)
        cleaned = re.sub(r'\*\*([^*]+)\*\*', r'\1', cleaned)  # Remove bold
        return cleaned.strip()
    
    async def generate_comprehensive_summary(self, content: str, user_api_key: str = None) -> Optional[str]:
        """Generate comprehensive summary of repository content"""
        truncated_content = self._truncate_content_if_needed(content)
        
        prompt = f"""
You are creating documentation for developers. Output ONLY clean, properly formatted markdown.

FORMATTING RULES:
- Use proper markdown headings (# for h1, ## for h2, etc.)
- Code blocks must use triple backticks with language identifier
- Lists should use - for bullets or 1. for numbered
- Bold text uses **text**
- Links use [text](url)
- NO raw HTML, NO mixed formatting

Analyze this repository and create a comprehensive summary:

Repository Content:
{truncated_content}

Create a well-structured summary covering:
1. Purpose & Overview
2. Architecture & Structure  
3. Key Technologies
4. Main Components
5. Data Flow
6. External Dependencies
7. Configuration & Setup

Output clean markdown only. Start with # Repository Overview
"""
        
        result = await llm_client.generate_content(prompt, user_api_key)
        if result:
            result = markdown_cleaner.clean_markdown(result)
            logger.info("Generated and cleaned comprehensive repository summary")
        return result
    
    async def identify_abstractions(self, content: str, user_api_key: str = None) -> Optional[str]:
        """Step 1: Identify key abstractions using FULL repo content"""
        truncated_content = self._truncate_content_if_needed(content)
        
        prompt = f"""
Analyze the codebase/repository context.
Identify the top 5-10 core most important abstractions to help those new to the codebase.

For each abstraction, provide:
1. A concise name
2. A beginner-friendly description explaining what it is with a simple analogy, in around 100 words.
Output ONLY clean, properly formatted markdown.

Repository Content:
{truncated_content}

Output format:
# Key Abstractions

## 1. [Abstraction Name]
- **Description**: Brief description
- **Location**: Where to find it
- **Importance**: Why it matters

## 2. [Next Abstraction]
...

Use proper markdown formatting. No HTML, no mixed formatting.
"""
                
        result = await llm_client.generate_content(prompt, user_api_key)
        if result:
            result = markdown_cleaner.clean_markdown(result)
            logger.info("Identified and cleaned key abstractions")
        return result
            
    async def analyze_relationships(self, abstractions: str, comprehensive_summary: str, user_api_key: str = None) -> Optional[str]:
        """Step 2: Analyze relationships using comprehensive summary"""
        prompt = f"""
You are creating documentation for developers. Output ONLY clean, properly formatted markdown.

Based on the following abstractions and relevant code snippets from the project, analyze component relationships:

Key Abstractions:
{abstractions}

Repository Summary:
{comprehensive_summary}

Please provide:
1. A high-level summary of the project's main purpose and functionality in a few beginner-friendly sentences. Use markdown formatting with **bold** and *italic* text to highlight important concepts.
2. A list (relationships) describing the key interactions between these abstractions. For each relationship, specify:
    - from_abstraction: Index of the source abstraction (e.g., `0 # AbstractionName1`)
    - to_abstraction: Index of the target abstraction (e.g., `1 # AbstractionName2`)
    - label: A brief label for the interaction **in just a few words** (e.g., "Manages", "Inherits", "Uses").
    Ideally the relationship should be backed by one abstraction calling or passing parameters to another.
    Simplify the relationship and exclude those non-important ones.

IMPORTANT: Make sure EVERY abstraction is involved in at least ONE relationship (either as source or target). Each abstraction index must appear at least once across all relationships.
Create a relationship analysis with:

# Component Relationships

## Dependencies
- Component A → Component B (reason)
- ...

## Data Flow
1. Step-by-step data flow
2. ...

## Communication Patterns
- Pattern description
- ...

Use proper markdown formatting. Code examples use ```language blocks.
"""
        
        result = await llm_client.generate_content(prompt, user_api_key)
        if result:
            result = markdown_cleaner.clean_markdown(result)
            logger.info("Analyzed and cleaned component relationships")
        return result
    
    async def create_chapter_structure(self, abstractions: str, relationships: str, user_api_key: str = None) -> Optional[str]:
        """Step 3: Create structured chapter plan"""
        prompt = f"""
        This is used to figure out the most logical  order to teach the abstractions and relationships.Analyzes dependencies to determine what needs to be learned first.
        Create a A sensible learning sequence that builds knowledge step by step. Start from foundational concepts, data flow, core abstractions, relatoinships, and finally the full system.
        You are creating documentation for developers. Make a proper learning plan such that the developer understands the repository as a whole in a step by step fashion.
        Output ONLY clean, properly formatted markdown.
Create EXACTLY 4 chapters based on:

Abstractions:
{abstractions}

Relationships:
{relationships}

Output format:
# Documentation Structure

## Chapter 1: [Title]
Description of what this chapter covers...

## Chapter 2: [Title]
Description of what this chapter covers...

## Chapter 3: [Title]
Description of what this chapter covers...

## Chapter 4: [Title]
Description of what this chapter covers...

Use clear, descriptive titles. No "Chapter X:" prefix needed.
"""
        
        result = await llm_client.generate_content(prompt, user_api_key)
        if result:
            result = markdown_cleaner.clean_markdown(result)
            logger.info("Created and cleaned chapter structure")
        return result
    
    async def write_chapter(self, chapter_info: Dict, abstractions: str, relationships: str, comprehensive_summary: str, repo_url: str, user_api_key: str = None) -> Optional[str]:
        """Write detailed documentation for a single chapter"""
        prompt = f"""
You are writing Chapter {chapter_info['number']} of a technical tutorial. Output ONLY clean, well-structured markdown.

Your job is to clearly explain this part of the system to junior developers in a way that is beginner-friendly, yet thorough. 
Use everything available: the abstractions, relationships, and previously written content. Treat this as a guided code walkthrough.

FORMATTING RULES:
1. Start with # {chapter_info['title']}
2. Use ## for major sections, ### for subsections
3. Code blocks must use ```language syntax
4. Keep code examples under 10 lines each
5. Use - for bullet lists, 1. for numbered lists
6. Bold important terms with **text**
7. NO HTML, NO raw formatting STRICTLY.

Chapter: {chapter_info['title']}
Description: {chapter_info['description']}

Context:
-Repository: {repo_url}
-Summary: {comprehensive_summary}
-Abstractions (functions, classes, components): {abstractions}
-Relationships (calls, imports, dependencies): {relationships}

TASK:
1. Begin with a short introduction to this chapter: what its about and why it matters.
2. Use the **abstractions** to show what code is involved in this step.
3. Use the **relationships** to explain how this code connects with other parts of the system (e.g., which modules call it, or what it depends on).
4. If the abstraction is complex, break it down into key concepts. Explain each concept one-by-one in a very beginner-friendly way
5. Each code block should be BELOW 20 lines! If longer code blocks are needed, break them down into smaller pieces and walk through them one-by-one. Aggresively simplify the code to make it minimal. Use comments to skip non-important implementation details. Each code block should have a beginner friendly explanation right after it
6. Walk through the logic step by step. Explain things like:
   - What each file/function/class does
   - How the data flows
   - Why its structured this way
7. Show **small code snippets** to illustrate key pieces. Prefer real examples from the codebase.
8. Explain any tricky or interesting logic clearly.
9. Finish with a brief summary and possibly a "Whats Next" section that previews the next chapter.

Write as if you're teaching a junior dev sitting beside you. Assume they know basic Python/JS/etc., but not the codebase.

Write comprehensive documentation including:
- Clear explanations
- Code examples (properly formatted)
- Step-by-step guides
- Best practices
- Common patterns

NOTE: Output clean markdown only. Start with the chapter title as # heading.
"""
        
        result = await llm_client.generate_content(prompt, user_api_key)
        if result:
            result = markdown_cleaner.clean_markdown(result)
            # Ensure chapter starts with proper heading
            if not result.strip().startswith('#'):
                result = f"# {chapter_info['title']}\n\n{result}"
            logger.info(f"Generated and cleaned chapter {chapter_info['number']}")
        return result
    
    async def create_introduction(self, comprehensive_summary: str, abstractions: str, repo_url: str, user_api_key: str = None) -> Optional[str]:
        """Create comprehensive detailed introduction page"""
        prompt = f"""
You are creating the introduction page for technical documentation. Output ONLY clean, properly formatted markdown.

Repository: {repo_url}
Summary: {comprehensive_summary}
Abstractions: {abstractions}

Create an introduction with these sections:

# Introduction

## Overview
What this repository does and who should use it...

## Quick Start
Basic setup steps...

## Repository Structure
```
folder/
  subfolder/
    file.ext
```

## Prerequisites
- Required software
- Knowledge needed

## Getting Started
1. Step one
2. Step two
...

Output clean markdown only. Use proper headings, code blocks, and lists.
"""
        
        result = await llm_client.generate_content(prompt, user_api_key)
        if result:
            result = markdown_cleaner.clean_markdown(result)
            logger.info("Created and cleaned introduction")
        return result
    
    def _parse_chapter_structure(self, chapter_structure: str) -> List[Dict]:
        """Parse chapter structure into clean format"""
        chapters = []
        
        # Use regex to find all chapter headings
        chapter_pattern = re.compile(r'^##\s+(?:Chapter\s+\d+:\s*)?(.+?)$', re.MULTILINE)
        matches = list(chapter_pattern.finditer(chapter_structure))
        
        for i, match in enumerate(matches):
            title = self._clean_chapter_title(match.group(1))
            
            # Extract description - text between this heading and the next
            start = match.end()
            end = matches[i + 1].start() if i + 1 < len(matches) else len(chapter_structure)
            description = chapter_structure[start:end].strip()
            
            # Clean description - remove extra whitespace and take first paragraph
            description_lines = [line.strip() for line in description.split('\n') if line.strip()]
            description = ' '.join(description_lines[:3])  # Take first 3 lines max
            
            chapters.append({
                'number': i + 1,
                'title': title,
                'description': description[:200] + '...' if len(description) > 200 else description
            })
        
        # Fallback if no chapters found
        if not chapters:
            chapters = [
                {'number': 1, 'title': 'Getting Started & Overview', 'description': 'Introduction to the repository and setup guide'},
                {'number': 2, 'title': 'Core Architecture & Components', 'description': 'Understanding the main components and architecture'},
                {'number': 3, 'title': 'Key Workflows & Implementation', 'description': 'How the system works and implementation details'}
            ]
        
        return chapters[:4]  # Limit to 4 chapters
    
    async def generate_full_documentation(self, repo_url: str, summary: str, tree: str, content: str, user_api_key: str = None) -> Dict:
        """Main method that orchestrates the entire documentation generation process"""
        try:
            logger.info(f"Starting documentation generation for {repo_url} | Using: {'User Key' if user_api_key else 'System Key'}")
            
            # Step 1: Generate comprehensive summary
            logger.info("Step 1: Generating comprehensive repository summary...")
            comprehensive_summary = await self.generate_comprehensive_summary(content, user_api_key)
            if not comprehensive_summary:
                return {"error": "Failed to generate comprehensive summary"}
            
            # Step 2: Identify abstractions (using full content)
            logger.info("Step 2: Identifying abstractions from full content...")
            abstractions = await self.identify_abstractions(content, user_api_key)
            if not abstractions:
                return {"error": "Failed to identify abstractions"}
            
            # Step 3: Analyze relationships (using comprehensive summary)
            logger.info("Step 3: Analyzing relationships...")
            relationships = await self.analyze_relationships(abstractions, comprehensive_summary, user_api_key)
            if not relationships:
                return {"error": "Failed to analyze relationships"}
            
            # Step 4: Create structured chapter plan
            logger.info("Step 4: Creating structured chapter plan...")
            raw_chapter_structure = await self.create_chapter_structure(abstractions, relationships, user_api_key)
            if not raw_chapter_structure:
                return {"error": "Failed to create chapter structure"}
            
            # Step 5: Parse chapter structure
            logger.info("Step 5: Parsing chapter structure...")
            parsed_chapters = self._parse_chapter_structure(raw_chapter_structure)
            
            # Step 6: Create introduction
            logger.info("Step 6: Creating introduction...")
            introduction = await self.create_introduction(comprehensive_summary, abstractions, repo_url, user_api_key)
            if not introduction:
                return {"error": "Failed to create introduction"}
              # Step 7: Generate mermaid diagrams
            logger.info("Step 7: Generating mermaid diagrams...")
            mermaid_diagrams = await mermaid_generator.generate_all_diagrams(
                repo_url=repo_url,
                summary=comprehensive_summary,
                tree=tree,
                content=content,
                abstractions=abstractions,
                relationships=relationships,
                user_api_key=user_api_key
            )
              # Step 8: Write individual chapters
            logger.info("Step 8: Writing individual chapters...")
            chapters = {}
            
            for chapter_info in parsed_chapters:
                chapter_key = f"chapter_{chapter_info['number']}"
                logger.info(f"Writing Chapter {chapter_info['number']}: {chapter_info['title']}")
                
                chapter_content = await self.write_chapter(
                    chapter_info=chapter_info,
                    abstractions=abstractions,
                    relationships=relationships,
                    comprehensive_summary=comprehensive_summary,
                    repo_url=repo_url,
                    user_api_key=user_api_key
                )
                
                if chapter_content:
                    # Validate the chapter content
                    validation = markdown_cleaner.validate_markdown(chapter_content)
                    if validation['cleaned']:
                        logger.warning(f"Chapter {chapter_info['number']} had markdown issues: {validation['issues']}")
                    
                    chapters[chapter_key] = {
                        "number": chapter_info['number'],
                        "title": chapter_info['title'],
                        "content": chapter_content,
                        "description": chapter_info['description'].strip()
                    }
                else:
                    logger.warning(f"Failed to generate Chapter {chapter_info['number']}")
            
            if not chapters:
                return {"error": "Failed to generate any chapters"}
            
            logger.info(f"Documentation generation completed successfully with {len(chapters)} chapters")
            return {
                "success": True,
                "repo_url": repo_url,
                "introduction": introduction,
                "chapters": chapters,
                "mermaid_diagrams": mermaid_diagrams,
                "metadata": {
                    "comprehensive_summary": comprehensive_summary,
                    "abstractions": abstractions,
                    "relationships": relationships,
                    "raw_chapter_structure": raw_chapter_structure,
                    "total_chapters": len(chapters),
                    "total_diagrams": len(mermaid_diagrams)
                }
            }
            
        except Exception as e:
            logger.error(f"Error in documentation generation: {str(e)}")
            return {"error": f"Documentation generation failed: {str(e)}"}

# Global instance
doc_generator = DocumentationGenerator()