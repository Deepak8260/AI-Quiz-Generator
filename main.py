import uuid
import os
import re
import json
from dotenv import load_dotenv

from fastapi import FastAPI, HTTPException, Request, Form
from fastapi.templating import Jinja2Templates
from fastapi.staticfiles import StaticFiles
from fastapi.responses import RedirectResponse, FileResponse, Response
from PIL import Image, ImageDraw, ImageFont
from itsdangerous import URLSafeSerializer, BadSignature

from helpers.gemini_api import generate_mcqs
from database import (
    save_session, get_session, update_session_score,
    save_attempt,
    get_all_attempts, get_stats, get_chart_data, delete_attempt,
)

load_dotenv()

app = FastAPI()
app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")

# ── Config ───────────────────────────────────────────────────────────────────
# Use /tmp on Vercel (read-only filesystem), local folder otherwise
GENERATED_DIR  = "/tmp" if os.getenv("VERCEL") else "generated"
os.makedirs(GENERATED_DIR, exist_ok=True)

ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "admin123")
SECRET_KEY     = os.getenv("SECRET_KEY", "changeme")
signer         = URLSafeSerializer(SECRET_KEY, salt="admin-session")

SESSION_COOKIE = "quiz_session_id"


# ── Admin auth helper ─────────────────────────────────────────────────────────
def is_admin(request: Request) -> bool:
    token = request.cookies.get("admin_session")
    if not token:
        return False
    try:
        signer.loads(token)
        return True
    except BadSignature:
        return False


# ── Session helper ────────────────────────────────────────────────────────────
def get_current_session(request: Request) -> dict | None:
    """Read session_id from cookie and fetch from Supabase."""
    session_id = request.cookies.get(SESSION_COOKIE)
    return get_session(session_id)


# ════════════════════════════════════════════════════════════════════════════
# PUBLIC ROUTES
# ════════════════════════════════════════════════════════════════════════════

@app.get("/")
async def home(request: Request):
    error = request.query_params.get("error")
    return templates.TemplateResponse("index.html", {"request": request, "error": error})


@app.post("/generate-quiz")
async def create_quiz(
    request: Request,
    name: str = Form(...),
    topic: str = Form(...),
    level: str = Form(...),
    num_questions: int = Form(default=10),
):
    try:
        questions = generate_mcqs(topic=topic, level=level, num_questions=num_questions)

        # Create a new unique session and persist to Supabase
        session_id = str(uuid.uuid4())
        save_session(
            session_id    = session_id,
            name          = name,
            topic         = topic,
            level         = level,
            num_questions = num_questions,
            questions     = questions,
        )

        # Render the quiz page
        response = templates.TemplateResponse(
            "quiz.html",
            {"request": request, "questions": questions, "topic": topic, "level": level},
        )
        # Set session cookie so every subsequent request can look up this session
        response.set_cookie(
            SESSION_COOKIE,
            session_id,
            httponly=True,
            samesite="lax",
            max_age=7200,   # 2 hours
        )
        return response

    except Exception as e:
        print("Error generating quiz:", str(e))
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/submit-quiz")
async def submit_quiz(request: Request):
    try:
        form_data = await request.form()

        # Load session from Supabase via cookie
        session = get_current_session(request)
        if not session or not session.get("questions"):
            return RedirectResponse(url="/?error=session_expired", status_code=303)

        questions = session["questions"]   # already a list (JSONB auto-parsed)

        # Calculate score
        answers = {}
        for key, value in form_data.items():
            if key.startswith("q"):
                answers[int(key[1:])] = value

        correct_answers = {i: q.get("correct_answer", "A") for i, q in enumerate(questions, 1)}
        score           = sum(1 for q, a in answers.items() if a == correct_answers.get(q, ""))
        total_questions = len(questions)

        # Persist score back to the session row
        update_session_score(session["id"], score, total_questions)

        # Also write to the admin attempts table
        save_attempt(
            name          = session.get("name", "Anonymous"),
            topic         = session.get("topic", "Unknown"),
            level         = session.get("level", "unknown"),
            num_questions = total_questions,
            score         = score,
        )

        return templates.TemplateResponse(
            "results.html",
            {
                "request":         request,
                "score":           score,
                "total_questions": total_questions,
                "answers":         answers,
                "correct_answers": correct_answers,
                "questions":       questions,
            },
        )

    except Exception as e:
        print("Error submitting quiz:", str(e))
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/check-eligibility")
async def check_eligibility(request: Request):
    session = get_current_session(request)

    if not session or session.get("score") is None:
        return RedirectResponse(url="/?error=session_expired", status_code=303)

    score           = session["score"]
    total_questions = session.get("total_questions", 0)
    is_eligible     = total_questions > 0 and (score / total_questions) * 100 >= 70

    return templates.TemplateResponse(
        "certificate_eligibility.html",
        {
            "request":         request,
            "score":           score,
            "total_questions": total_questions,
            "is_eligible":     is_eligible,
        },
    )


@app.get("/generate-certificate")
async def generate_certificate(request: Request):
    session = get_current_session(request)
    if not session:
        return RedirectResponse(url="/?error=session_expired", status_code=303)

    name            = session.get("name", "Student")
    score           = session.get("score", 0)
    total_questions = session.get("total_questions", 0)

    template_path = "static/certificates/cert.png"
    try:
        image = Image.open(template_path)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error loading certificate template: {str(e)}")

    draw = ImageDraw.Draw(image)

    try:
        font = ImageFont.truetype("BRUSHSCI.TTF", 120)
    except:
        try:
            font = ImageFont.truetype("SCRIPTBL.TTF", 120)
        except:
            try:
                font = ImageFont.truetype("arial.ttf", 100)
            except:
                font = ImageFont.load_default()

    W, H = image.size
    text  = name.title()
    bbox  = draw.textbbox((0, 0), text, font=font)
    w     = bbox[2] - bbox[0]
    draw.text(((W - w) / 2, (H / 2) - 50), text, fill="black", font=font)

    if total_questions:
        score_text = f"Score: {score}/{total_questions} ({(score/total_questions*100):.1f}%)"
        try:
            score_font = ImageFont.truetype("arial.ttf", 60)
        except:
            score_font = font
        sb    = draw.textbbox((0, 0), score_text, font=score_font)
        sw    = sb[2] - sb[0]
        draw.text(((W - sw) / 2, H - 200), score_text, fill="#7C3AED", font=score_font)

    safe_name     = re.sub(r"[^\w]", "_", name.title()).strip("_") or "certificate"
    cert_filename = f"{safe_name}_certificate.png"
    cert_path     = os.path.join(GENERATED_DIR, cert_filename)
    image.save(cert_path, format="PNG")

    return FileResponse(path=cert_path, filename=cert_filename, media_type="image/png")


@app.get("/preview/{filename}")
async def preview_certificate(filename: str):
    return FileResponse(f"{GENERATED_DIR}/{filename}", media_type="image/png")


# ════════════════════════════════════════════════════════════════════════════
# ADMIN ROUTES
# ════════════════════════════════════════════════════════════════════════════

@app.get("/admin/login")
async def admin_login_page(request: Request):
    if is_admin(request):
        return RedirectResponse(url="/admin", status_code=302)
    error = request.query_params.get("error")
    return templates.TemplateResponse("admin/login.html", {"request": request, "error": error})


@app.post("/admin/login")
async def admin_login(request: Request, password: str = Form(...)):
    if password == ADMIN_PASSWORD:
        token    = signer.dumps("admin")
        response = RedirectResponse(url="/admin", status_code=303)
        response.set_cookie("admin_session", token, httponly=True, samesite="lax")
        return response
    return RedirectResponse(url="/admin/login?error=wrong_password", status_code=303)


@app.get("/admin/logout")
async def admin_logout():
    response = RedirectResponse(url="/admin/login", status_code=302)
    response.delete_cookie("admin_session")
    return response


@app.get("/admin")
async def admin_dashboard(
    request: Request,
    search: str = "",
    sort_by: str = "timestamp",
    order: str = "desc",
    page: int = 1,
):
    if not is_admin(request):
        return RedirectResponse(url="/admin/login", status_code=302)

    per_page    = 10
    all_rows    = get_all_attempts(search=search, sort_by=sort_by, order=order)
    total_rows  = len(all_rows)
    total_pages = max(1, (total_rows + per_page - 1) // per_page)
    page        = max(1, min(page, total_pages))
    rows        = all_rows[(page - 1) * per_page : page * per_page]

    return templates.TemplateResponse(
        "admin/dashboard.html",
        {
            "request":     request,
            "rows":        rows,
            "stats":       get_stats(),
            "chart_json":  json.dumps(get_chart_data()),
            "search":      search,
            "sort_by":     sort_by,
            "order":       order,
            "page":        page,
            "total_pages": total_pages,
            "total_rows":  total_rows,
        },
    )


@app.post("/admin/delete/{attempt_id}")
async def admin_delete(request: Request, attempt_id: int):
    if not is_admin(request):
        return RedirectResponse(url="/admin/login", status_code=302)
    delete_attempt(attempt_id)
    return RedirectResponse(url="/admin", status_code=303)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
