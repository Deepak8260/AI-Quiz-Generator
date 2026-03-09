import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const cookieStore = await cookies();

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll(); },
          setAll(list) {
            list.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          },
        },
      }
    );

    // Verify session server-side
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error("[save-attempt] Auth error:", authError);
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const {
      topic, difficulty, question_type,
      total_questions, correct_answers,
      score_pct, time_taken_secs, passed, certificate_earned,
    } = body;

    // Insert into our clean table — schema is 100% known, no legacy issues
    const { data, error } = await supabase
      .from("questly_quiz_attempts")
      .insert({
        user_id:            user.id,
        topic:              topic             ?? "Unknown",
        difficulty:         difficulty        ?? "medium",
        question_type:      question_type     ?? "mcq",
        total_questions:    total_questions   ?? 0,
        correct_answers:    correct_answers   ?? 0,
        score_pct:          score_pct         ?? 0,
        time_taken_secs:    time_taken_secs   ?? 0,
        passed:             passed            ?? false,
        certificate_earned: certificate_earned ?? false,
      })
      .select()
      .single();

    if (error) {
      console.error("[save-attempt] Insert error:", error);
      return NextResponse.json(
        { error: error.message, hint: error.hint, code: error.code },
        { status: 500 }
      );
    }

    console.log("[save-attempt] ✅ Saved:", data.id);
    return NextResponse.json({ success: true, id: data.id });
  } catch (err) {
    console.error("[save-attempt] Unexpected:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
