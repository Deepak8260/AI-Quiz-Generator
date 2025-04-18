import google.generativeai as genai
import os
import re
from dotenv import load_dotenv
from fastapi import HTTPException
from typing import Optional

# Load environment variables from .env
load_dotenv()
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

def generate_mcqs(topic: str, level: str, num_questions: int = 20) -> list:
    
    try:
        prompt = f"""
        You are an expert quiz generator.

        Generate {num_questions} technical multiple-choice questions based on the topic: **{topic}** for **{level}** level learners.

        📝 Follow this strict format for each question:

        Q1: [Question text]

        [If the question needs code, include it like this:]
        ```python
        # Your Python code here
        ```
        A) Option text
        B) Option text
        C) Option text
        D) Option text

        🔒 Rules:
        - Each question must have exactly 4 practical and relevant options (A to D)
        - Use triple backticks with 'python' for code blocks
        - Number questions sequentially (Q1, Q2, Q3, etc.)
        - Format options exactly as shown above
        - Ensure each question is unique and relevant to the topic
        """

        model = genai.GenerativeModel("gemini-1.5-flash")
        response = model.generate_content(prompt)
        text = response.text.strip()

        # Regex to capture each full question block including options
        question_pattern = re.compile(r"(Q\d+:.*?)(?=Q\d+:|$)", re.DOTALL)
        matches = question_pattern.findall(text)

        questions = []
        for q_text in matches:
            # Extract options
            options_pattern = re.compile(r"([A-D]\).*?)(?=[A-D]\)|$)", re.DOTALL)
            options = options_pattern.findall(q_text)
            
            questions.append({
                "question": q_text.split("\n")[0].strip(),
                "code": extract_code(q_text),
                "options": [opt.strip() for opt in options]
            })

        return questions

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate quiz: {str(e)}")

def extract_code(text: str) -> Optional[str]:
    code_pattern = re.compile(r"```python(.*?)```", re.DOTALL)
    match = code_pattern.search(text)
    return match.group(1).strip() if match else None
