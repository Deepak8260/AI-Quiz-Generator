from fastapi import FastAPI, HTTPException, Request, Form
from fastapi.templating import Jinja2Templates
from fastapi.staticfiles import StaticFiles
from helpers.gemini_api import generate_mcqs
from typing import Dict, List, Optional
from fastapi.responses import RedirectResponse, HTMLResponse, FileResponse, StreamingResponse
import json
from PIL import Image, ImageDraw, ImageFont
import os
from io import BytesIO

app = FastAPI()
app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")

# Directory for generated certificates
GENERATED_DIR = "generated"
os.makedirs(GENERATED_DIR, exist_ok=True)

# Store questions in memory (in a real app, use a proper session management)
quiz_data = {}

@app.get("/")
async def home(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})

@app.get("/check-eligibility")
async def check_eligibility(request: Request):
    """Check if the user is eligible for a certificate based on their quiz score"""
    score = quiz_data.get('score', 0)
    total_questions = quiz_data.get('total_questions', 0)
    is_eligible = False
    
    if total_questions > 0:
        percentage = (score / total_questions) * 100
        is_eligible = percentage >= 70
    
    return templates.TemplateResponse(
        "certificate_eligibility.html",
        {
            "request": request,
            "score": score,
            "total_questions": total_questions,
            "is_eligible": is_eligible
        }
    )

@app.post("/generate-quiz")
async def create_quiz(
    request: Request,
    name: str = Form(...),
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
        # Store user's name so we can generate a certificate later
        quiz_data['name'] = name
        
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
            correct_answers[i] = question.get('correct_answer', 'A')
        
        # Calculate score
        score = sum(1 for q, a in answers.items() if a == correct_answers.get(q, ''))
        total_questions = len(questions)
        
        # Store score in quiz_data for the certificate eligibility check
        quiz_data['score'] = score
        quiz_data['total_questions'] = total_questions
        
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

@app.get("/generate-certificate")
async def generate_certificate():
    """Generate certificate image using stored name and return it as a download.
    The user's name must have been saved in `quiz_data['name']` when they generated the quiz.
    """
    name = quiz_data.get('name')
    if not name:
        raise HTTPException(status_code=400, detail="No name found. Please enter your name on the home page before generating a quiz.")

    # Load the certificate template
    template_path = "static/certificates/cert.png"  # Use PNG instead of PDF
    try:
        image = Image.open(template_path)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error loading certificate template: {str(e)}")

    draw = ImageDraw.Draw(image)

    # Try to use a more elegant font, fallback to arial if not found
    try:
        font = ImageFont.truetype("BRUSHSCI.TTF", 120)  # Brush Script MT
    except:
        try:
            font = ImageFont.truetype("SCRIPTBL.TTF", 120)  # Script Bold
        except:
            font = ImageFont.truetype("arial.ttf", 100)  # Fallback with larger size

    # Get image dimensions
    W, H = image.size
    
    # Center name
    text = name.title()
    bbox = draw.textbbox((0, 0), text, font=font)
    w, h = bbox[2] - bbox[0], bbox[3] - bbox[1]
    position = ((W - w) / 2, (H / 2) - 50)  # Adjusted position

    # Draw the name
    draw.text(position, text, fill="black", font=font)

    # Add score if needed
    score = quiz_data.get('score', 0)
    total = quiz_data.get('total_questions', 0)
    score_text = f"Score: {score}/{total} ({(score/total*100):.1f}%)"
    
    try:
        score_font = ImageFont.truetype("arial.ttf", 60)
    except:
        score_font = font

    score_bbox = draw.textbbox((0, 0), score_text, font=score_font)
    score_w = score_bbox[2] - score_bbox[0]
    score_position = ((W - score_w) / 2, H - 200)
    draw.text(score_position, score_text, fill="#7C3AED", font=score_font)

    # Save to memory buffer
    img_byte_arr = BytesIO()
    image.save(img_byte_arr, format='PNG')
    img_byte_arr.seek(0)

    # Return the image directly from memory
    return StreamingResponse(
        img_byte_arr,
        media_type="image/png",
        headers={
            'Content-Disposition': f'attachment; filename="{name}_certificate.png"'
        }
    )

@app.get("/preview/{filename}")
async def preview_certificate(filename: str):
    """
    Direct image preview with download option
    """
    return FileResponse(f"generated/{filename}", media_type="image/png")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
