import re
import logging

logger = logging.getLogger(__name__)

class MarkdownCleaner:
    """Production-ready markdown cleaner for LLM outputs"""
    
    def __init__(self):
        self.code_block_pattern = re.compile(r'```(\w*)\n(.*?)```', re.DOTALL)
        self.inline_code_pattern = re.compile(r'`([^`]+)`')
        
    def clean_markdown(self, content: str) -> str:
        """Clean and normalize markdown content from LLM"""
        if not content:
            return ""
        
        # Step 1: Preserve code blocks by replacing them with placeholders
        code_blocks = []
        def preserve_code_block(match):
            code_blocks.append(match.group(0))
            return f"__CODE_BLOCK_{len(code_blocks)-1}__"
        
        content = self.code_block_pattern.sub(preserve_code_block, content)
        
        # Step 2: Preserve inline code
        inline_codes = []
        def preserve_inline_code(match):
            inline_codes.append(match.group(0))
            return f"__INLINE_CODE_{len(inline_codes)-1}__"
        
        content = self.inline_code_pattern.sub(preserve_inline_code, content)
        
        # Step 3: Fix common markdown issues
        lines = content.split('\n')
        cleaned_lines = []
        
        for i, line in enumerate(lines):
            # Skip empty lines at the start
            if i == 0 and not line.strip():
                continue
                
            # Fix heading formatting
            line = self._fix_heading(line)
            
            # Fix list formatting
            line = self._fix_list_item(line)
            
            # Fix bold/italic formatting
            line = self._fix_emphasis(line)
            
            # Remove excessive whitespace
            if line.strip() or (i > 0 and i < len(lines) - 1):
                cleaned_lines.append(line.rstrip())
        
        content = '\n'.join(cleaned_lines)
        
        # Step 4: Ensure proper spacing
        content = self._ensure_proper_spacing(content)
        
        # Step 5: Restore code blocks and inline code
        for i, code_block in enumerate(code_blocks):
            content = content.replace(f"__CODE_BLOCK_{i}__", code_block)
        
        for i, inline_code in enumerate(inline_codes):
            content = content.replace(f"__INLINE_CODE_{i}__", inline_code)
        
        # Step 6: Final cleanup
        content = self._final_cleanup(content)
        
        return content
    
    def _fix_heading(self, line: str) -> str:
        """Fix heading formatting"""
        # Remove excessive # symbols
        if line.startswith('#'):
            match = re.match(r'^(#{1,6})\s*(.+)', line)
            if match:
                level = len(match.group(1))
                text = match.group(2).strip()
                # Remove trailing # symbols
                text = re.sub(r'\s*#+\s*$', '', text)
                return f"{'#' * level} {text}"
        return line
    
    def _fix_list_item(self, line: str) -> str:
        """Fix list item formatting"""
        # Fix bullet points
        line = re.sub(r'^\s*[\*\-\+]\s+', '- ', line)
        # Fix numbered lists
        line = re.sub(r'^(\s*)\d+\.\s+', r'\g<1>1. ', line)
        return line
    
    def _fix_emphasis(self, line: str) -> str:
        """Fix bold and italic formatting"""
        # Fix bold
        line = re.sub(r'\*\*\s+([^*]+)\s+\*\*', r'**\1**', line)
        # Fix italic
        line = re.sub(r'\*\s+([^*]+)\s+\*', r'*\1*', line)
        return line
    
    def _ensure_proper_spacing(self, content: str) -> str:
        """Ensure proper spacing between elements"""
        # Add blank line before headings
        content = re.sub(r'([^\n])\n(#{1,6}\s)', r'\1\n\n\2', content)
        
        # Add blank line before code blocks
        content = re.sub(r'([^\n])\n```', r'\1\n\n```', content)
        
        # Add blank line after code blocks
        content = re.sub(r'```\n([^\n])', r'```\n\n\1', content)
        
        # Remove excessive blank lines
        content = re.sub(r'\n{3,}', '\n\n', content)
        
        return content
    
    def _final_cleanup(self, content: str) -> str:
        """Final cleanup pass"""
        # Ensure document starts with a heading
        if not content.strip().startswith('#'):
            lines = content.strip().split('\n')
            if lines and not lines[0].startswith('#'):
                # Try to identify a title from the first line
                first_line = lines[0].strip()
                if first_line and len(first_line) < 100:
                    lines[0] = f"# {first_line}"
                    content = '\n'.join(lines)
        
        # Remove trailing whitespace
        content = '\n'.join(line.rstrip() for line in content.split('\n'))
        
        # Ensure single newline at the end
        content = content.strip() + '\n'
        
        return content
    
    def validate_markdown(self, content: str) -> dict:
        """Validate markdown structure"""
        issues = []
        
        # Check for headings
        if not re.search(r'^#{1,6}\s', content, re.MULTILINE):
            issues.append("No headings found")
        
        # Check for unclosed code blocks
        code_blocks = re.findall(r'```', content)
        if len(code_blocks) % 2 != 0:
            issues.append("Unclosed code blocks detected")
        
        # Check for excessive line breaks
        if re.search(r'\n{4,}', content):
            issues.append("Excessive line breaks found")
        
        return {
            "valid": len(issues) == 0,
            "issues": issues,
            "cleaned": len(issues) > 0
        }

# Global instance
markdown_cleaner = MarkdownCleaner()