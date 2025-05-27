import logging
from typing import Dict, List, Optional
from llm_client import llm_client
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
    
    def _parse_chapter_structure(self, chapter_structure: str) -> List[Dict]:
        """Parse chapter structure into clean format"""
        chapters = []
        lines = chapter_structure.split('\n')
        
        current_chapter = None
        chapter_counter = 1
        
        for line in lines:
            line = line.strip()
            if not line:
                continue
                
            # Check if this line looks like a chapter title
            if (re.match(r'^#+\s+', line) or 
                re.match(r'^\d+\.', line) or
                re.match(r'^Chapter\s+\d+', line, re.IGNORECASE) or
                any(keyword in line.lower() for keyword in ['chapter', 'overview', 'architecture', 'getting started', 'setup', 'contributing'])):
                
                if current_chapter:
                    chapters.append(current_chapter)
                
                title = self._clean_chapter_title(line)
                current_chapter = {
                    'number': chapter_counter,
                    'title': title,
                    'description': ''
                }
                chapter_counter += 1
            elif current_chapter and line:
                # Add to description
                current_chapter['description'] += line + ' '
        
        # Add the last chapter
        if current_chapter:
            chapters.append(current_chapter)
        
        # Ensure we have at least 3 chapters with good titles
        if len(chapters) < 3:
            default_chapters = [
                {'number': 1, 'title': 'Getting Started & Overview', 'description': 'Introduction to the repository and setup guide'},
                {'number': 2, 'title': 'Core Architecture & Components', 'description': 'Understanding the main components and architecture'},
                {'number': 3, 'title': 'Key Workflows & Data Flow', 'description': 'How data flows through the system and main workflows'}
            ]
            chapters = default_chapters[:3]
        
        return chapters[:5]  # Max 5 chapters
    
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
        truncated_content = self._truncate_content_if_needed(content)
        
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

Repository Content:
{truncated_content}
"""
                
        result = await llm_client.generate_content(prompt)
        logger.info("Identified key abstractions from full repository content")
        return result
            
    async def analyze_relationships(self, abstractions: str, comprehensive_summary: str) -> Optional[str]:
        """Step 2: Analyze relationships using comprehensive summary"""
        prompt = f"""
Based on these identified abstractions and the comprehensive repository summary, analyze the relationships and dependencies between core abstractions.

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
    
    async def create_chapter_structure(self, abstractions: str, relationships: str) -> Optional[str]:
        """Step 3: Create structured chapter plan"""
        prompt = f"""
Based on the abstractions and relationships, create EXACTLY 3 chapters for documentation that will help new contributors understand and contribute to this repository effectively.

Abstractions:
{abstractions}

Relationships:
{relationships}

For each chapter, you may provide:
- Clear title starting with "Chapter X:"
- Each code block should be BELOW 10 lines! If longer code blocks are needed, break them down into smaller pieces and walk through them one-by-one. Aggressively simplify the code to make it minimal.
- 2-3 sentence description of what it covers
- Each chapter should be self-contained and cover a distinct aspect of the repository.
- Describe the internal implementation to help understand what's under the hood
- Then dive deeper into code for the internal implementation with references to files. Provide example code blocks, but make them similarly simple and beginner-friendly
- Why this order makes sense for new contributors
- End the chapter with a brief conclusion that summarizes what was learned

Focus on the most important aspects that enable fast-tracking repository understanding.
"""
        
        result = await llm_client.generate_content(prompt)
        logger.info("Created structured chapter plan")
        return result
    
    async def write_chapter(self, chapter_info: Dict, abstractions: str, relationships: str, comprehensive_summary: str, repo_url: str) -> Optional[str]:
        """Write detailed documentation for a single chapter"""
        prompt = f"""
Write comprehensive documentation for Chapter {chapter_info['number']}: {chapter_info['title']}.

Repository: {repo_url}

Chapter Information:
- Title: {chapter_info['title']}
- Description: {chapter_info['description']}

Available Context:
Key Abstractions: {abstractions}
Component Relationships: {relationships}
Repository Summary: {comprehensive_summary}

Write detailed documentation for this chapter that includes:
- **Clear explanations** of concepts covered in this chapter
- **Code examples** with explanations where relevant (keep code blocks under 10 lines each)
- **Step-by-step guides** where appropriate
- **Practical guidance** for new contributors
- **Links between concepts** and how they fit in the bigger picture
- **Common patterns** and best practices shown in the code
- **Troubleshooting tips** for common issues in this area

Format in clean markdown with:
- Proper headers (##, ###)
- Code blocks with language specification
- Lists and tables where helpful
- Clear section divisions

Make this chapter comprehensive enough that someone reading it can understand this aspect of the repository thoroughly.
"""
        
        result = await llm_client.generate_content(prompt)
        logger.info(f"Generated detailed chapter {chapter_info['number']} documentation")
        return result
    
    async def create_introduction(self, comprehensive_summary: str, abstractions: str, repo_url: str) -> Optional[str]:
        """Create comprehensive introduction page"""
        prompt = f"""
Create a comprehensive introduction page for new contributors to this repository.

Repository: {repo_url}
Repository Summary: {comprehensive_summary}
Key Abstractions: {abstractions}

Create an introduction that includes:

## Introduction
- What this repository does
- Who should use this guide
- What you'll learn from this documentation

## Quick Start Overview
- High-level architecture summary
- Key technologies and frameworks used
- Prerequisites for contributing

## Repository Structure
- Main directories and their purposes
- Important files new contributors should know about
- How the codebase is organized

## How to Use This Guide
- What each chapter covers
- Recommended reading order
- How to get help

## Getting Started Checklist
- Setup requirements
- Installation steps
- How to run the project locally
- How to verify your setup works

Format in clean markdown that serves as a welcoming entry point for new contributors.
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
            
            # Step 4: Create structured chapter plan
            logger.info("Step 4: Creating structured chapter plan...")
            raw_chapter_structure = await self.create_chapter_structure(abstractions, relationships)
            if not raw_chapter_structure:
                return {"error": "Failed to create chapter structure"}
            
            # Step 5: Parse chapter structure
            logger.info("Step 5: Parsing chapter structure...")
            parsed_chapters = self._parse_chapter_structure(raw_chapter_structure)
            
            # Step 6: Create introduction
            logger.info("Step 6: Creating introduction...")
            introduction = await self.create_introduction(comprehensive_summary, abstractions, repo_url)
            if not introduction:
                return {"error": "Failed to create introduction"}
            
            # Step 7: Write individual chapters
            logger.info("Step 7: Writing individual chapters...")
            chapters = {}
            
            for chapter_info in parsed_chapters:
                chapter_key = f"chapter_{chapter_info['number']}"
                logger.info(f"Writing Chapter {chapter_info['number']}: {chapter_info['title']}")
                
                chapter_content = await self.write_chapter(
                    chapter_info=chapter_info,
                    abstractions=abstractions,
                    relationships=relationships,
                    comprehensive_summary=comprehensive_summary,
                    repo_url=repo_url
                )
                
                if chapter_content:
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
                "metadata": {
                    "comprehensive_summary": comprehensive_summary,
                    "abstractions": abstractions,
                    "relationships": relationships,
                    "raw_chapter_structure": raw_chapter_structure,
                    "total_chapters": len(chapters)
                }
            }
            
        except Exception as e:
            logger.error(f"Error in documentation generation: {str(e)}")
            return {"error": f"Documentation generation failed: {str(e)}"}

# Global instance
doc_generator = DocumentationGenerator()