"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Clock, Zap, Trophy, XCircle, Award, Loader2, AlertTriangle, RefreshCw
} from "lucide-react";
import { createClient } from "@/lib/supabase";

interface QuizAttempt {
  id: string;
  topic: string;
  difficulty: string;
  question_type: string;
  total_questions: number;
  correct_answers: number;
  score_pct: number;
  time_taken_secs: number;
  passed: boolean;
  certificate_earned: boolean;
  created_at: string;
}

const LEVEL_COLOR = {
  easy:   { bg: "#D1FAE5", text: "#065F46", border: "#6EE7B7" },
  medium: { bg: "#FEF3C7", text: "#92400E", border: "#FCD34D" },
  hard:   { bg: "#FEE2E2", text: "#991B1B", border: "#FECACA" },
} as const;

function fmt(secs: number) {
  if (!secs) return "—";
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}m ${s.toString().padStart(2, "0")}s`;
}

function fmtDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      month: "short", day: "numeric", year: "numeric",
    });
  } catch { return iso; }
}

export default function QuizzesPage() {
  const [quizzes, setQuizzes] = useState<QuizAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    const supabase = createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    const { data, error: dbErr } = await supabase
      .from("questly_quiz_attempts")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (dbErr) {
      setError(dbErr.message);
    } else {
      setQuizzes(data ?? []);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const passed  = quizzes.filter(q => q.passed).length;
  const avgScore = quizzes.length
    ? Math.round(quizzes.reduce((s, q) => s + q.score_pct, 0) / quizzes.length)
    : 0;
  const certs = quizzes.filter(q => q.certificate_earned).length;

  return (
    <div className="animate-fade-in-up">
      {/* Header */}
      <div className="flex items-center justify-between mb-7">
        <div>
          <h1 className="text-2xl font-black text-[#111827] dark:text-[#f8fafc] mb-1">My Quizzes</h1>
          <p className="text-sm text-[#6B7280] dark:text-[#94a3b8]">
            {quizzes.length} quizzes · {passed} passed · {avgScore}% avg
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={load}
            className="p-2 rounded-xl border border-[#E5E7EB] dark:border-[#334155] bg-white dark:bg-[#1e293b] text-[#6B7280] hover:bg-[#F3F4F6] dark:hover:bg-[#334155] transition-all"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <Link
            href="/dashboard/generate"
            className="flex items-center gap-1.5 text-sm font-semibold text-white bg-[#6366F1] hover:bg-[#4F46E5] px-4 py-2 rounded-xl transition-all hover:-translate-y-0.5 hover:shadow-md"
          >
            <Zap className="w-3.5 h-3.5" /> New Quiz
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total Quizzes",  value: quizzes.length, color: "text-[#6366F1]" },
          { label: "Passed (≥70%)",  value: passed,          color: "text-[#10B981]" },
          { label: "Average Score",  value: `${avgScore}%`,  color: "text-[#F59E0B]" },
          { label: "Certificates",   value: certs,           color: "text-[#8B5CF6]" },
        ].map(s => (
          <div key={s.label} className="bg-white dark:bg-[#1e293b] rounded-xl border border-[#E5E7EB] dark:border-[#334155] p-4 text-center">
            <div className={`text-2xl font-black ${s.color}`}>{s.value}</div>
            <div className="text-xs text-[#6B7280] dark:text-[#94a3b8] font-medium mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20 text-[#9CA3AF]">
          <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading…
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="bg-white dark:bg-[#1e293b] border border-[#FECACA] dark:border-[#7f1d1d] rounded-2xl overflow-hidden">
          <div className="flex items-start gap-3 px-5 py-4 bg-[#FEF2F2] dark:bg-[#1c0809]">
            <AlertTriangle className="w-5 h-5 text-[#DC2626] flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-bold text-[#DC2626]">Table not found — run setup SQL</p>
              <p className="text-xs text-[#EF4444] font-mono mt-1">{error}</p>
              <details className="mt-3">
                <summary className="text-xs font-semibold text-[#DC2626] cursor-pointer">Show setup SQL ▶</summary>
                <pre className="mt-2 bg-[#0F172A] text-[#94A3B8] p-4 rounded-xl text-xs overflow-x-auto leading-relaxed">{`CREATE TABLE IF NOT EXISTS questly_quiz_attempts (
  id                 uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id            uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  topic              text NOT NULL,
  difficulty         text NOT NULL,
  question_type      text,
  total_questions    int  NOT NULL,
  correct_answers    int  NOT NULL,
  score_pct          int  NOT NULL,
  time_taken_secs    int,
  passed             boolean NOT NULL DEFAULT false,
  certificate_earned boolean NOT NULL DEFAULT false,
  created_at         timestamptz DEFAULT now() NOT NULL
);
ALTER TABLE questly_quiz_attempts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Own attempts" ON questly_quiz_attempts;
CREATE POLICY "Own attempts" ON questly_quiz_attempts
  FOR ALL USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);`}</pre>
              </details>
            </div>
          </div>
        </div>
      )}

      {/* Empty */}
      {!loading && !error && quizzes.length === 0 && (
        <div className="bg-white dark:bg-[#1e293b] rounded-2xl border border-[#E5E7EB] dark:border-[#334155] p-16 text-center">
          <div className="text-5xl mb-4">📝</div>
          <h3 className="text-lg font-bold text-[#111827] dark:text-[#f8fafc] mb-2">No quizzes yet</h3>
          <p className="text-sm text-[#6B7280] dark:text-[#94a3b8] mb-6">
            Generate a quiz and it will appear here automatically.
          </p>
          <Link
            href="/dashboard/generate"
            className="inline-flex items-center gap-2 bg-[#6366F1] hover:bg-[#4F46E5] text-white font-semibold px-6 py-3 rounded-xl transition-all hover:shadow-lg text-sm"
          >
            <Zap className="w-4 h-4" /> Generate First Quiz
          </Link>
        </div>
      )}

      {/* Table */}
      {!loading && !error && quizzes.length > 0 && (
        <div className="bg-white dark:bg-[#1e293b] rounded-2xl border border-[#E5E7EB] dark:border-[#334155] shadow-sm overflow-hidden">
          <div className="grid grid-cols-[1fr_auto_auto_auto_auto_auto] gap-4 px-6 py-3 border-b border-[#F3F4F6] dark:border-[#334155] text-xs font-black text-[#9CA3AF] uppercase tracking-widest">
            <div>Quiz</div>
            <div>Level</div>
            <div>Score</div>
            <div className="hidden sm:block">Time</div>
            <div>Cert</div>
            <div>Action</div>
          </div>
          <div className="divide-y divide-[#F9FAFB] dark:divide-[#1e293b]">
            {quizzes.map((q) => {
              const lc = LEVEL_COLOR[(q.difficulty ?? "medium").toLowerCase() as keyof typeof LEVEL_COLOR] ?? LEVEL_COLOR.medium;
              return (
                <div
                  key={q.id}
                  className="grid grid-cols-[1fr_auto_auto_auto_auto_auto] gap-4 px-6 py-4 items-center hover:bg-[#FAFAFA] dark:hover:bg-[#263348] transition-colors"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-[#111827] dark:text-[#f8fafc] truncate">{q.topic}</div>
                    <div className="text-xs text-[#9CA3AF] mt-0.5 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {fmtDate(q.created_at)}
                      <span className="ml-1">· {q.correct_answers}/{q.total_questions} correct</span>
                    </div>
                  </div>
                  <div
                    className="text-xs font-bold px-2.5 py-1 rounded-full border capitalize whitespace-nowrap"
                    style={{ backgroundColor: lc.bg, color: lc.text, borderColor: lc.border }}
                  >
                    {q.difficulty}
                  </div>
                  <div className={`text-sm font-black ${q.passed ? "text-[#10B981]" : "text-[#F59E0B]"}`}>
                    {q.score_pct}%
                  </div>
                  <div className="text-xs text-[#9CA3AF] hidden sm:block">{fmt(q.time_taken_secs)}</div>
                  <div title={q.certificate_earned ? "Certificate earned" : "Score < 70%"}>
                    {q.certificate_earned
                      ? <Trophy className="w-4 h-4 text-[#F59E0B]" />
                      : <XCircle className="w-4 h-4 text-[#E5E7EB] dark:text-[#334155]" />}
                  </div>
                  <div>
                    {q.certificate_earned
                      ? (
                        <Link href="/dashboard/generate" className="text-xs text-[#10B981] hover:text-[#059669] font-semibold flex items-center gap-0.5">
                          <Award className="w-3.5 h-3.5" /> Cert
                        </Link>
                      ) : (
                        <Link href="/dashboard/generate" className="text-xs text-[#6366F1] hover:text-[#4F46E5] font-semibold">
                          Retry
                        </Link>
                      )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
