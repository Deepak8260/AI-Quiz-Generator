import google.generativeai as genai
import os
import re
from dotenv import load_dotenv
from fastapi import HTTPException
from typing import Optional

# Load environment variables
load_dotenv()
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

def generate_mcqs(topic: str, level: str, num_questions: int = 20) -> list:
    try:
        processed_questions = generate_and_process_questions(topic, level, num_questions)
        
        # If we got fewer questions than requested, only generate the missing ones
        while len(processed_questions) < num_questions:
            remaining = num_questions - len(processed_questions)
            print(f"Generating {remaining} more questions...")
            extra_questions = generate_and_process_questions(topic, level, remaining)
            if extra_questions:  # Only extend if we got valid questions
                processed_questions.extend(extra_questions)
        
        # Trim if we somehow got more questions than requested
        if len(processed_questions) > num_questions:
            processed_questions = processed_questions[:num_questions]
            
        return processed_questions

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate quiz: {str(e)}")

def generate_and_process_questions(topic: str, level: str, num: int) -> list:
    prompt = f"""
            Generate {num} high-quality multiple-choice questions (MCQs) on the topic: "{topic}", suitable for learners at the "{level}" level.

            Each MCQ must follow this exact format:

            [Question text here]  
            [Insert code here only if applicable — placed immediately after the question text, without any quotes or formatting]  
            A) Option A  
            B) Option B  
            C) Option C  
            D) Option D  
            Correct: X

            ───────────────────────────────
            ✔ Example with code:
            What will this code output?

            df = pd.DataFrame({{'A': [1, 2], 'B': [3, 4]}})
            print(df.shape)

            A) (2, 2)  
            B) (2, 1)  
            C) (1, 2)  
            D) (4, 2)  
            Correct: A

            ✔ Example without code:
            What is the capital of Japan?  
            A) Seoul  
            B) Tokyo  
            C) Beijing  
            D) Bangkok  
            Correct: B

            ───────────────────────────────
            Guidelines:

            1. Each question **must have exactly four options**, labeled A) through D), followed by a **'Correct: X'** line on a separate line — **regardless of difficulty level (easy, medium, or hard)**.
            2. For technical or coding-related topics (like Python, Pandas, SQL, ML, etc.):
            - Include a mix of:
                - Conceptual questions
                - Code-based questions using realistic, minimal code snippets
            - Code must:
                - Be written exactly as it would appear in a script (no markdown or quotes)
                - Be properly indented and placed directly after the question (if applicable)
            3. **Do not include markdown**, quotes, comments, extra line breaks, or emojis.
            4. If **any option (A–D) or the 'Correct:' line is missing**, you must regenerate the entire question.
            5. Questions must be **clear, self-contained, and properly formatted**.
            6. For the **"hard" level**:
            - Include advanced scenarios, uncommon edge cases, or trick questions.
            - Code snippets should challenge deep understanding of behavior, performance, or memory.
            - But **still follow the exact MCQ format with A–D options and Correct: X** line.

            The goal is to ensure every question is **complete**, **cleanly formatted**, and **ready to use**, even at the hard level.

            Now generate {num} complete and valid MCQs for the topic: "{topic}".
            """

    model = genai.GenerativeModel("models/gemini-2.5-flash")
    response = model.generate_content(prompt)
    text = response.text.strip()

    # Parse and process questions
    questions = []
    current_question = []
    for line in text.split('\n'):
        line = line.strip()
        if not line and current_question and any(l.startswith("Correct:") for l in current_question):
            questions.append('\n'.join(current_question))
            current_question = []
        elif not line.startswith('Question') and not line.startswith('─'):
            current_question.append(line)
    
    # Add last question if any
    if current_question and any(l.startswith("Correct:") for l in current_question):
        questions.append('\n'.join(current_question))

    processed_questions = []
    for q_text in questions:
        if not q_text.strip() or 'Correct:' not in q_text:
            continue
        
        lines = q_text.split('\n')
        question_text = next((line for line in lines if line.strip()), '')
        options_pattern = re.compile(r"([A-D]\).*?)(?=[A-D]\)|Correct:|$)", re.DOTALL)
        options = options_pattern.findall(q_text)
        correct_answer_pattern = re.compile(r"Correct:\s*([A-D])", re.IGNORECASE)
        correct_answer_match = correct_answer_pattern.search(q_text)
        correct_answer = correct_answer_match.group(1) if correct_answer_match else 'A'

        if question_text and len(options) == 4:
            processed_questions.append({
                "question": question_text,
                "code": extract_code(q_text),
                "options": [opt.strip() for opt in options],
                "correct_answer": correct_answer
            })

    return processed_questions

def extract_code(text: str) -> Optional[str]:
    lines = text.split('\n')
    code_lines = []
    in_code = False
    for line in lines[1:]:
        line_stripped = line.strip()
        if line_stripped.startswith('A)'):
            break
        if line_stripped.startswith('import') or '=' in line_stripped:
            in_code = True
        if in_code and line_stripped:
            code_lines.append(line)
    return '\n'.join(code_lines) if code_lines else None
