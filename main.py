from fastapi import FastAPI, HTTPException, Request, Form
from fastapi.templating import Jinja2Templates
from fastapi.staticfiles import StaticFiles
from helpers.gemini_api import generate_mcqs
from typing import Dict, List, Optional

app = FastAPI()
app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")

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
        
        # Debug print to check questions
        #print("Generated Questions:", questions)
        
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
async def submit_quiz(
    request: Request,
    form_data: Dict = Form(...)
):
    try:
        # Extract answers from form data
        answers = {}
        for key, value in form_data.items():
            if key.startswith('q'):
                question_index = int(key[1:])
                answers[question_index] = value
        
        # For demo purposes, assume all correct answers are 'A'
        # In a real application, you would get the correct answers from the backend
        correct_answers = {i: 'A' for i in range(1, len(answers) + 1)}
        
        # Calculate score
        score = sum(1 for q, a in answers.items() if a == correct_answers.get(q, ''))
        total_questions = len(answers)
        
        return templates.TemplateResponse(
            "results.html",
            {
                "request": request,
                "score": score,
                "total_questions": total_questions,
                "answers": answers,
                "correct_answers": correct_answers
            }
        )
    except Exception as e:
        print("Error:", str(e))  # Debug print
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
