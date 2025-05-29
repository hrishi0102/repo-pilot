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
        self.system_api_key = os.environ.get('GEMINI_API_KEY')
        if not self.system_api_key:
            raise ValueError("GEMINI_API_KEY environment variable is required")
        
        self.system_client = genai.Client(api_key=self.system_api_key)

    async def generate_content(self, prompt: str, user_api_key: str = None) -> Optional[str]:
        """Generate content using Gemini API with error handling and delay"""
        try:
            # Determine which API key and client to use
            api_key = user_api_key if user_api_key else self.system_api_key
            client = genai.Client(api_key=api_key) if user_api_key else self.system_client
            
            logger.info(f"Sending prompt to Gemini (length: {len(prompt)} chars) | Using: {'User Key' if user_api_key else 'System Key'}")
            
            # Add 15 second delay before API call to prevent overloading
            logger.info("Waiting 15 seconds before API call...")
            await asyncio.sleep(15)
            
            response = client.models.generate_content(
                model="gemini-2.0-flash-lite",
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
            
            # If user key failed and we have a system key, try fallback
            if user_api_key and self.system_api_key and user_api_key != self.system_api_key:
                logger.info("User API key failed, attempting fallback to system key...")
                try:
                    await asyncio.sleep(5)  # Brief delay before fallback
                    
                    response = self.system_client.models.generate_content(
                        model="gemini-2.0-flash-lite",
                        contents=[prompt]
                    )
                    
                    if response and hasattr(response, "text") and response.text:
                        logger.info(f"Fallback successful - received response (length: {len(response.text)} chars)")
                        return response.text
                    else:
                        logger.warning("Empty response from Gemini fallback")
                        return None
                        
                except Exception as fallback_error:
                    logger.error(f"Fallback to system key also failed: {str(fallback_error)}")
                    return None
            
            return None

    async def validate_api_key(self, api_key: str) -> bool:
        """Validate an API key by making a minimal test request"""
        try:
            if not api_key.strip():
                return False
                
            test_client = genai.Client(api_key=api_key.strip())
            
            # Make a minimal test request
            response = test_client.models.generate_content(
                model="gemini-2.0-flash-lite",
                contents=["test"]
            )
            
            return response and hasattr(response, "text")
            
        except Exception as e:
            logger.error(f"API key validation failed: {str(e)}")
            return False

# Global instance
llm_client = LLMClient()