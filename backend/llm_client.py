import os
import logging
import asyncio
from google import genai
from typing import Optional
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger(__name__)

class LLMClient:
    def __init__(self):
        api_key = os.environ.get('GEMINI_API_KEY')
        if not api_key:
            raise ValueError("GEMINI_API_KEY environment variable is required")
        
        self.client = genai.Client(api_key=api_key)

    async def generate_content(self, prompt: str) -> Optional[str]:
        """Generate content using Gemini API with error handling and delay"""
        try:
            logger.info(f"Sending prompt to Gemini (length: {len(prompt)} chars)")
            
            # Add 15 second delay before API call to prevent overloading
            logger.info("Waiting 15 seconds before API call...")
            await asyncio.sleep(15)
            
            response = self.client.models.generate_content(
                model="gemini-2.0-flash",
                contents=[prompt]
            )
            
            if response and hasattr(response, "text") and response.text:
                logger.info(f"Received response (length: {len(response.text)} chars)")
                return response.text
            else:
                logger.warning("Empty response from Gemini")
                return None

        except Exception as e:
            logger.error(f"Error calling Gemini API: {str(e)}")
            return None

# Global instance
llm_client = LLMClient()