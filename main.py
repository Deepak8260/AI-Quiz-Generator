from fastapi import FastAPI, HTTPException, Request, Form, Cookie
from fastapi.templating import Jinja2Templates
from fastapi.staticfiles import StaticFiles
from helpers.gemini_api import generate_mcqs
from fastapi.responses import RedirectResponse, FileResponse
from PIL import Image, ImageDraw, ImageFont
from itsdangerous import URLSafeSerializer, BadSignature
from database import save_attempt, get_all_attempts, get_stats, get_chart_data, delete_attempt
import os
import re
import json
from dotenv import load_dotenv

load_dotenv()

app = FastAPI()
app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")

# ── Config ──────────────────────────────────────────────────────────────────
GENERATED_DIR = "generated"
os.makedirs(GENERATED_DIR, exist_ok=True)

ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "admin123")
SECRET_KEY     = os.getenv("SECRET_KEY", "changeme")
signer         = URLSafeSerializer(SECRET_KEY, salt="admin-session")

# ── In-memory quiz session ───────────────────────────────────────────────────
quiz_data = {}


# ── Auth helpers ─────────────────────────────────────────────────────────────
def is_admin(request: Request) -> bool:
    token = request.cookies.get("admin_session")
    if not token:
        return False
    try:
        signer.loads(token)
        return True
    except BadSignature:
        return False


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

        quiz_data["questions"]     = questions
        quiz_data["name"]          = name
        quiz_data["topic"]         = topic
        quiz_data["level"]         = level
        quiz_data["num_questions"] = num_questions

        return templates.TemplateResponse(
            "quiz.html",
            {"request": request, "questions": questions, "topic": topic, "level": level},
        )
    except Exception as e:
        print("Error:", str(e))
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/submit-quiz")
async def submit_quiz(request: Request):
    try:
        form_data = await request.form()

        questions = quiz_data.get("questions", [])
        if not questions:
            return RedirectResponse(url="/?error=session_expired", status_code=303)

        answers = {}
        for key, value in form_data.items():
            if key.startswith("q"):
                answers[int(key[1:])] = value

        correct_answers = {i: q.get("correct_answer", "A") for i, q in enumerate(questions, 1)}
        score           = sum(1 for q, a in answers.items() if a == correct_answers.get(q, ""))
        total_questions = len(questions)

        quiz_data["score"]          = score
        quiz_data["total_questions"] = total_questions

        # ── Persist to SQLite ──────────────────────────────────────────────
        save_attempt(
            name          = quiz_data.get("name", "Anonymous"),
            topic         = quiz_data.get("topic", "Unknown"),
            level         = quiz_data.get("level", "unknown"),
            num_questions = total_questions,
            score         = score,
        )
        # ──────────────────────────────────────────────────────────────────

        return templates.TemplateResponse(
            "results.html",
            {
                "request": request,
                "score": score,
                "total_questions": total_questions,
                "answers": answers,
                "correct_answers": correct_answers,
                "questions": questions,
            },
        )
    except Exception as e:
        print("Error:", str(e))
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/check-eligibility")
async def check_eligibility(request: Request):
    score = quiz_data.get("score")
    if score is None:
        return RedirectResponse(url="/?error=session_expired", status_code=303)

    total_questions = quiz_data.get("total_questions", 0)
    is_eligible     = total_questions > 0 and (score / total_questions) * 100 >= 70

    return templates.TemplateResponse(
        "certificate_eligibility.html",
        {"request": request, "score": score, "total_questions": total_questions, "is_eligible": is_eligible},
    )


@app.get("/generate-certificate")
async def generate_certificate():
    name = quiz_data.get("name")
    if not name:
        return RedirectResponse(url="/?error=session_expired", status_code=303)

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
    text = name.title()
    bbox = draw.textbbox((0, 0), text, font=font)
    w, h = bbox[2] - bbox[0], bbox[3] - bbox[1]
    draw.text(((W - w) / 2, (H / 2) - 50), text, fill="black", font=font)

    score = quiz_data.get("score", 0)
    total = quiz_data.get("total_questions", 0)
    score_text = f"Score: {score}/{total} ({(score/total*100):.1f}%)" if total else ""
    try:
        score_font = ImageFont.truetype("arial.ttf", 60)
    except:
        score_font = font

    score_bbox = draw.textbbox((0, 0), score_text, font=score_font)
    score_w    = score_bbox[2] - score_bbox[0]
    draw.text(((W - score_w) / 2, H - 200), score_text, fill="#7C3AED", font=score_font)

    safe_name     = re.sub(r"[^\w]", "_", name.title()).strip("_") or "certificate"
    cert_filename = f"{safe_name}_certificate.png"
    cert_path     = os.path.join(GENERATED_DIR, cert_filename)
    image.save(cert_path, format="PNG")

    return FileResponse(path=cert_path, filename=cert_filename, media_type="image/png")


@app.get("/preview/{filename}")
async def preview_certificate(filename: str):
    return FileResponse(f"generated/{filename}", media_type="image/png")


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

    per_page = 10
    all_rows = get_all_attempts(search=search, sort_by=sort_by, order=order)
    total_rows = len(all_rows)
    total_pages = max(1, (total_rows + per_page - 1) // per_page)
    page   = max(1, min(page, total_pages))
    rows   = all_rows[(page - 1) * per_page : page * per_page]

    stats      = get_stats()
    chart_data = get_chart_data()

    return templates.TemplateResponse(
        "admin/dashboard.html",
        {
            "request":     request,
            "rows":        rows,
            "stats":       stats,
            "chart_json":  json.dumps(chart_data),
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
