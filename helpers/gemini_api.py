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
        Generate {num_questions} well-structured multiple-choice questions on the topic: **{topic}**, suitable for learners at the **{level}** level.

💡 Adapt based on the nature of the topic:
- If the topic involves coding, programming, or data science (e.g., regression, algorithms, libraries), then include a mix of **conceptual and code-based MCQs**. Code questions should reflect real-world use cases and follow proper indentation without markdown.
- If the topic is academic or non-programming (e.g., math, civics, physics, finance), then only include **conceptual or factual MCQs**. Avoid including any code.

The goal is to make the questions engaging, well-aligned with the topic, and appropriate for the given learner level.


        Format each question exactly like this:

        For regular questions:
        What is pandas used for?
        A) Data manipulation
        B) Web development
        C) Game development
        D) Image processing
        Correct: A

        For code-based questions (always write the question first, then the code):
        What will be the output of this code?
        df = pd.read_csv('data.csv')
        print(df.head())
        A) Shows first 5 rows
        B) Shows last 5 rows
        C) Shows all rows
        D) Shows no rows
        Correct: A

        Rules:
        - Make questions direct and concise
        - For code questions, always write the question first
        - Write code directly without any markdown tags or language indicators and with proper python indentation
        - No extra text or comments in the code
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
    # First try to get code between the question and first option
    first_line = text.split('\n')[0]
    remaining_text = text[len(first_line):].strip()
    code_text = ''
    
    for line in remaining_text.split('\n'):
        if line.strip().startswith('A)'):
            break
        if line.strip() and not line.strip().startswith('```'):
            code_text += line + '\n'
    
    return code_text.strip() if code_text.strip() else None
