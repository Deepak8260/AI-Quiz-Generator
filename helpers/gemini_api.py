import google.generativeai as genai
import os
import re
from dotenv import load_dotenv
from fastapi import HTTPException
from typing import Optional

# Load environment variables
load_dotenv()
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

def generate_mcqs(topic: str, level: str, num_questions: int = 10) -> list:
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
            Example with code:
            What will this code output?

            df = pd.DataFrame({{'A': [1, 2], 'B': [3, 4]}})
            print(df.shape)

            A) (2, 2)  
            B) (2, 1)  
            C) (1, 2)  
            D) (4, 2)  
            Correct: A

            Example with multiline output:
            What will be the result of executing the following code?

            s = pd.Series([5.0, 7.0, None], name="C")
            print(s)

            A)
            0    5.0
            1    7.0
            2    NaN
            Name: C, dtype: float64
            B)
            0    5.0
            1    7.0
            2    0.0
            Name: C, dtype: float64
            C)
            0.0
            7.0
            NaN
            D)
            [5.0, 7.0, nan]
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

            1. Each question **must have exactly four options**, labeled A) through D), followed by a **'Correct: X'** line on a separate line.
            2. For technical or coding-related topics (like Python, Pandas, SQL, NumPy, etc.):
                - Include a mix of:
                    - Conceptual questions
                    - Code-based questions using realistic, minimal code snippets
                - Code must:
                    - Be written exactly as it would appear in a script (no markdown or quotes)
                    - Be properly indented and placed directly after the question (if applicable)
            3. If the answer options include **multiline outputs**, such as:
                - Series
                - DataFrames
                - `print()` results
                - NumPy arrays
                - Console-style representations  
            ➤ Then **wrap the entire output inside triple backticks ( ``` )** to mimic real Python terminal display.
            4. **Do not include markdown formatting like `**bold**`, `# headings`, emojis, or comments.**
            5. If **any option (A–D) or the 'Correct:' line is missing**, regenerate the entire question.
            6. Questions must be **clear, self-contained, and properly formatted**.
            7. For the **"hard" level**:
                - Include advanced scenarios, uncommon edge cases, or trick questions.
                - Code snippets should challenge deep understanding of behavior, performance, or memory.
                - But **still follow the exact MCQ format with A–D options and a Correct: X line**.

            **Additional Output Formatting Rule**:

            - If the MCQ involves printing output from code (e.g., using `print()`), the **options must reflect the output exactly as it would appear in a real terminal or console**.
            - This includes:
            - Proper line breaks
            - Indentation
            - Tabular/structured formats (like from `pandas.DataFrame` or similar libraries)
            - Avoid writing DataFrame outputs inline; **show them as console-printed blocks**, like:

                ```
                B
                A   
                0  5
                1 10
                ```

            - **Do not compress** multi-line outputs into single-line strings like `A B 0 5 1 10`.
            - This formatting rule **applies to all code outputs**, not just Pandas — including outputs from NumPy, Python print statements, custom objects, or standard output formatting.

            The goal is to ensure every question is **complete**, **cleanly formatted**, and **ready to use**, even at the hard level.

            Now generate {num} complete and valid MCQs for the topic: "{topic}".
            """

    model = genai.GenerativeModel("gemini-1.5-flash")
    response = model.generate_content(prompt)
    text = response.text.strip()

    processed_questions = []
    current_question = {
        "question": "",
        "code": None,
        "options": [],
        "correct_answer": None
    }
    code_buffer = []

    for line in text.split('\n'):
        line = line.rstrip()

        # Skip empty lines but save question if it's complete
        if not line.strip():
            if current_question["question"] and len(current_question["options"]) == 4:
                if code_buffer:
                    current_question["code"] = '\n'.join(code_buffer)
                processed_questions.append(current_question.copy())

                # Reset for next question
                current_question = {
                    "question": "",
                    "code": None,
                    "options": [],
                    "correct_answer": None
                }
                code_buffer = []
            continue

        # Handle options like A), B), etc.
        if line.strip().startswith(('A)', 'B)', 'C)', 'D)')):
            if code_buffer:
                current_question["code"] = '\n'.join(code_buffer)
                code_buffer = []
            current_question["options"].append(line[2:].strip())
            continue

        # Handle correct answer
        if line.strip().startswith('Correct:'):
            current_question["correct_answer"] = line.split(':', 1)[1].strip()
            continue

        # Handle question or code
        if not current_question["options"]:
            if not current_question["question"]:
                current_question["question"] = line.strip()
            else:
                code_buffer.append(line)

    # Save the last question if it's complete
    if current_question["question"] and len(current_question["options"]) == 4:
        if code_buffer:
            current_question["code"] = '\n'.join(code_buffer)
        processed_questions.append(current_question)

    return processed_questions
