import { NextRequest, NextResponse } from "next/server";

export interface QuizQuestion {
  id: string;
  question: string;
  code?: string;              // optional code snippet shown below the question
  options: string[];          // always 4 options (even for T/F: ["True","False","",""])
  correctIndex: number;       // 0-3
  explanation: string;
}

export interface GeneratedQuiz {
  id: string;
  topic: string;
  difficulty: string;
  questionType: string;
  questions: QuizQuestion[];
  createdAt: string;
}

export async function POST(req: NextRequest) {
  try {
    const { topic, difficulty, numQuestions, questionType, aiMode } = await req.json();

    if (!topic?.trim()) {
      return NextResponse.json({ error: "Topic is required" }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Gemini API key not configured" }, { status: 500 });
    }

    // Build prompt based on questionType
    const typeInstruction =
      questionType === "truefalse"
        ? "Generate True/False questions. For each question, options MUST be exactly [\"True\", \"False\"] with 2 empty strings [\"True\",\"False\",\"\",\"\"]. correctIndex must be 0 (True) or 1 (False)."
        : questionType === "mixed"
        ? "Mix MCQ and True/False questions. For True/False questions use options [\"True\",\"False\",\"\",\"\"], for MCQ use 4 distinct answer options."
        : "Generate Multiple Choice Questions (MCQ) with exactly 4 distinct answer options each.";

    const difficultyGuide =
      difficulty === "easy"
        ? "beginner-friendly, straightforward concepts"
        : difficulty === "hard"
        ? "advanced, nuanced, expert-level concepts"
        : "intermediate, moderately challenging concepts";

    const isCodeTopic = /python|javascript|java|c\+\+|typescript|sql|coding|programming|algorithm|data structure|react|node|html|css|bash|rust|go|kotlin|swift/i.test(topic);

    const prompt = `You are a professional quiz generator. Generate exactly ${numQuestions} quiz questions about: "${topic}".

Difficulty: ${difficulty} (${difficultyGuide})
${typeInstruction}
AI Mode: ${aiMode}

CRITICAL: Respond ONLY with a valid JSON object. No markdown, no explanation, no code blocks wrapping the JSON.

JSON format:
{
  "questions": [
    {
      "question": "Clear, specific question text (do NOT embed code here)",
      "code": "optional_code_snippet_here_or_empty_string",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctIndex": 0,
      "explanation": "Brief explanation of why this is correct (1-2 sentences)"
    }
  ]
}

Rules:
- correctIndex is 0-based (0=first option, 1=second, etc.)
- Each question must be unique and test different concepts
- Explanations must be educational and concise
- Do NOT include the correct answer text in the question itself
- Generate exactly ${numQuestions} questions
${isCodeTopic ? `- For programming/code questions: put the code snippet in the "code" field (plain text, no markdown fences), leave empty string if no code needed
- Write question text naturally referring to "the code above" or "the following code"
- Include code-based questions where appropriate (output prediction, bug finding, syntax questions)` : '- Set "code" to empty string "" for all questions'}`;

    // Try models in priority order
    const MODELS = [
      "gemini-2.5-flash",
    ];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let geminiData: any = null;
    let lastError = "";

    for (const model of MODELS) {
      const geminiRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.7,
              topK: 40,
              topP: 0.95,
              maxOutputTokens: 8192,
            },
          }),
        }
      );

      if (geminiRes.ok) {
        geminiData = await geminiRes.json();
        break;
      } else {
        const errBody = await geminiRes.text();
        lastError = `Model ${model} → HTTP ${geminiRes.status}: ${errBody}`;
        console.error("Gemini attempt failed:", lastError);
      }
    }

    if (!geminiData) {
      console.error("All Gemini models failed. Last error:", lastError);
      return NextResponse.json(
        { error: `Gemini API failed: ${lastError.slice(0, 200)}` },
        { status: 502 }
      );
    }

    const rawText: string = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

    // Strip any markdown code block wrappers if Gemini adds them
    const cleaned = rawText
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    let parsed: { questions: Omit<QuizQuestion, "id">[] };
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      console.error("Failed to parse Gemini response:", cleaned);
      return NextResponse.json({ error: "Failed to parse AI response. Please try again." }, { status: 500 });
    }

    if (!Array.isArray(parsed?.questions) || parsed.questions.length === 0) {
      return NextResponse.json({ error: "AI returned no questions. Please try again." }, { status: 500 });
    }

    // Normalize and validate each question
    const questions: QuizQuestion[] = parsed.questions.slice(0, numQuestions).map((q, i) => ({
      id: `q${i + 1}`,
      question: q.question ?? "Question unavailable",
      code: typeof q.code === "string" && q.code.trim() ? q.code.trim() : undefined,
      options: Array.isArray(q.options) && q.options.length >= 2
        ? q.options.slice(0, 4)
        : ["True", "False", "", ""],
      correctIndex: typeof q.correctIndex === "number" ? q.correctIndex : 0,
      explanation: q.explanation ?? "",
    }));

    const quiz: GeneratedQuiz = {
      id: `quiz_${Date.now()}`,
      topic,
      difficulty,
      questionType,
      questions,
      createdAt: new Date().toISOString(),
    };

    return NextResponse.json({ quiz });
  } catch (err) {
    console.error("Quiz generation error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
