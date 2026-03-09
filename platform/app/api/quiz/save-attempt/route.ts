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

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const {
      topic, difficulty, question_type,
      total_questions, correct_answers,
      score_pct, time_taken_secs, passed, certificate_earned,
    } = body;

    const userName: string =
      (user.user_metadata?.full_name as string) ||
      (user.user_metadata?.name as string) ||
      user.email?.split("@")[0] ||
      "User";

    // ── Payload: known required columns first, then legacy aliases ────
    // Alias columns are tried first and stripped one-by-one if rejected
    const payload: Record<string, unknown> = {
      user_id:           user.id,
      name:              userName,
      level:             difficulty,
      topic,
      difficulty,
      question_type,
      total_questions,
      correct_answers,
      score_pct,
      score:             score_pct,
      time_taken_secs,
      time_taken:        time_taken_secs,
      duration:          time_taken_secs,
      passed,
      certificate_earned,
      email:             user.email ?? "",
      quiz_topic:        topic,
      subject:           topic,
      category:          topic,
      percentage:        score_pct,
      total:             total_questions,
      correct:           correct_answers,
      date:              new Date().toISOString(),
      created_at:        new Date().toISOString(),
    };

    // ── Self-healing insert: strip unknown columns and retry ──────────
    // Handles both PGRST204 (PostgREST schema cache) and 42703 (Postgres)
    // Loops until success or all guesses exhausted
    let lastError: { message: string; hint?: string; code?: string } | null = null;

    for (let attempt = 0; attempt < 20; attempt++) {
      const { data, error } = await supabase
        .from("quiz_attempts")
        .insert({ ...payload })
        .select();

      if (!error) {
        console.log(`[save-attempt] Saved on attempt ${attempt + 1}`);
        return NextResponse.json({ success: true, data });
      }

      lastError = error;

      // Extract the bad column name from either error type:
      // PGRST204: "Could not find the 'COLNAME' column of 'quiz_attempts' in the schema cache"
      // 42703:    "column \"COLNAME\" of relation \"quiz_attempts\" does not exist"
      let badCol: string | null = null;

      if (error.code === "PGRST204") {
        const m = error.message.match(/Could not find the '([^']+)' column/);
        badCol = m?.[1] ?? null;
      } else if (error.code === "42703") {
        const m = error.message.match(/column "([^"]+)"/);
        badCol = m?.[1] ?? null;
      }

      if (badCol && badCol in payload) {
        console.warn(`[save-attempt] Attempt ${attempt + 1}: column "${badCol}" rejected, removing and retrying…`);
        delete payload[badCol];
        continue;
      }

      // Not a column error — stop retrying
      break;
    }

    console.error("[save-attempt] All attempts failed. Last error:", lastError);
    return NextResponse.json(
      { error: lastError?.message ?? "Unknown error", hint: lastError?.hint },
      { status: 500 }
    );
  } catch (err) {
    console.error("[save-attempt] Unexpected:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
