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
        Generate {num_questions} technical multiple-choice questions about **{topic}** for **{level}** level learners.

        Format each question exactly like this:
        What is pandas used for?
        A) Data manipulation
        B) Web development
        C) Game development
        D) Image processing
        Correct: A

        If code is needed:
        How to read a CSV file in pandas?
        ```python
        df = pd.read_csv('data.csv')
        ```
        A) Correct way
        B) Incorrect way
        C) Another way
        D) Wrong way
        Correct: A

        Rules:
        - Make questions direct and concise
        - No Q1:, Q2: prefixes
        - No extra text or comments
        - Include code only if essential for the question
        - Always end with Correct: X where X is A, B, C, or D
        - Make all options relevant and realistic
        """

        model = genai.GenerativeModel("gemini-1.5-flash")
        response = model.generate_content(prompt)
        text = response.text.strip()

        # Split text into individual questions
        questions = []
        current_question = []
        lines = text.split('\n')
        
        for line in lines:
            line = line.strip()
            if not line:
                if current_question:
                    questions.append('\n'.join(current_question))
                    current_question = []
            else:
                current_question.append(line)
        
        if current_question:
            questions.append('\n'.join(current_question))

        # Process each question
        processed_questions = []
        for q_text in questions:
            if not q_text.strip():
                continue
                
            # Extract options
            options_pattern = re.compile(r"([A-D]\).*?)(?=[A-D]\)|Correct:|$)", re.DOTALL)
            options = options_pattern.findall(q_text)
            
            # Extract correct answer
            correct_answer_pattern = re.compile(r"Correct:\s*([A-D])", re.IGNORECASE)
            correct_answer_match = correct_answer_pattern.search(q_text)
            correct_answer = correct_answer_match.group(1) if correct_answer_match else 'A'
            
            # Get question text (first line)
            question_text = q_text.split('\n')[0].strip()
            
            processed_questions.append({
                "question": question_text,
                "code": extract_code(q_text),
                "options": [opt.strip() for opt in options if opt.strip()],
                "correct_answer": correct_answer
            })

        return processed_questions

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate quiz: {str(e)}")

def extract_code(text: str) -> Optional[str]:
    code_pattern = re.compile(r"```python(.*?)```", re.DOTALL)
    match = code_pattern.search(text)
    return match.group(1).strip() if match else None
