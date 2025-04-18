from fastapi import FastAPI, HTTPException, Request, Form
from fastapi.templating import Jinja2Templates
from fastapi.staticfiles import StaticFiles
from helpers.gemini_api import generate_mcqs
from typing import Dict, List, Optional
from fastapi.responses import RedirectResponse
import json

app = FastAPI()
app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")

# Store questions in memory (in a real app, use a proper session management)
quiz_data = {}

@app.get("/")
async def home(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})

@app.post("/generate-quiz")
async def create_quiz(
    request: Request,
    topic: str = Form(...),
    level: str = Form(...),
    num_questions: int = Form(default=20)
):
    try:
        # Get questions from Gemini API
        questions = generate_mcqs(
            topic=topic,
            level=level,
            num_questions=num_questions
        )
        
        # Store questions in memory
        quiz_data['questions'] = questions
        
        return templates.TemplateResponse(
            "quiz.html",
            {
                "request": request, 
                "questions": questions,
                "topic": topic,
                "level": level
            }
        )
    except Exception as e:
        print("Error:", str(e))  # Debug print
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/submit-quiz")
async def submit_quiz(request: Request):
    try:
        # Get form data from request
        form_data = await request.form()
        
        # Get questions from stored data
        questions = quiz_data.get('questions', [])
        if not questions:
            raise HTTPException(status_code=400, detail="No questions found. Please generate a new quiz.")
        
        # Extract answers from form data
        answers = {}
        for key, value in form_data.items():
            if key.startswith('q'):
                question_index = int(key[1:])
                answers[question_index] = value
        
        # Get correct answers from questions
        correct_answers = {}
        for i, question in enumerate(questions, 1):
            # For now, assume the first option (A) is correct
            # In a real app, you would store the correct answer when generating questions
            correct_answers[i] = 'A'
        
        # Calculate score
        score = sum(1 for q, a in answers.items() if a == correct_answers.get(q, ''))
        total_questions = len(questions)
        
        return templates.TemplateResponse(
            "results.html",
            {
                "request": request,
                "score": score,
                "total_questions": total_questions,
                "answers": answers,
                "correct_answers": correct_answers,
                "questions": questions
            }
        )
    except Exception as e:
        print("Error:", str(e))  # Debug print
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
