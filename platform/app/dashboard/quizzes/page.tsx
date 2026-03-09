"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  CheckCircle, XCircle, Clock, Zap, Trophy, Award, Loader2, AlertTriangle
} from "lucide-react";
import { createClient } from "@/lib/supabase";

interface QuizAttempt {
  id: string;
  topic: string;
  difficulty: string;
  total_questions: number;
  correct_answers: number;
  score_pct: number;
  time_taken_secs: number;
  passed: boolean;
  certificate_earned: boolean;
  created_at: string;
}

const LEVEL_COLOR = {
  easy:   { bg: "#D1FAE5", text: "#065F46", border: "#6EE7B7", label: "Easy" },
  medium: { bg: "#FEF3C7", text: "#92400E", border: "#FCD34D", label: "Medium" },
  hard:   { bg: "#FEE2E2", text: "#991B1B", border: "#FECACA", label: "Hard" },
} as const;

function formatTime(secs: number) {
  if (!secs) return "—";
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}m ${s.toString().padStart(2, "0")}s`;
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch { return iso; }
}

// SQL the user needs to run once in Supabase
const SETUP_SQL = `-- Run this ONCE in Supabase SQL Editor → New Query
-- Safe to run even if table already exists

ALTER TABLE quiz_attempts ADD COLUMN IF NOT EXISTS topic text;
ALTER TABLE quiz_attempts ADD COLUMN IF NOT EXISTS difficulty text;
ALTER TABLE quiz_attempts ADD COLUMN IF NOT EXISTS question_type text;
ALTER TABLE quiz_attempts ADD COLUMN IF NOT EXISTS total_questions int;
ALTER TABLE quiz_attempts ADD COLUMN IF NOT EXISTS correct_answers int;
ALTER TABLE quiz_attempts ADD COLUMN IF NOT EXISTS score_pct int;
ALTER TABLE quiz_attempts ADD COLUMN IF NOT EXISTS time_taken_secs int;
ALTER TABLE quiz_attempts ADD COLUMN IF NOT EXISTS passed boolean;
ALTER TABLE quiz_attempts ADD COLUMN IF NOT EXISTS certificate_earned boolean;
ALTER TABLE quiz_attempts ADD COLUMN IF NOT EXISTS user_id uuid;
ALTER TABLE quiz_attempts ADD COLUMN IF NOT EXISTS created_at timestamptz default now();

-- Enable RLS and add policy (safe if already exists)
ALTER TABLE quiz_attempts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own attempts" ON quiz_attempts;
CREATE POLICY "Users can manage own attempts"
  ON quiz_attempts FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);`;

export default function QuizzesPage() {
  const [quizzes, setQuizzes] = useState<QuizAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [dbError, setDbError] = useState<string | null>(null);
  const [showSql, setShowSql] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const supabase = createClient();

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const { data, error: dbErr } = await supabase
        .from("quiz_attempts")
        .select("id, topic, difficulty, total_questions, correct_answers, score_pct, time_taken_secs, passed, certificate_earned, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (dbErr) {
        setDbError(dbErr.message);
      } else {
        setQuizzes((data ?? []) as QuizAttempt[]);
      }
      setLoading(false);
    };
    load();
  }, []);

  const handleCopy = () => {
    navigator.clipboard.writeText(SETUP_SQL);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const passed = quizzes.filter(q => q.passed).length;
  const avgScore = quizzes.length > 0
    ? Math.round(quizzes.reduce((s, q) => s + (q.score_pct ?? 0), 0) / quizzes.length)
    : 0;
  const certs = quizzes.filter(q => q.certificate_earned).length;

  return (
    <div className="animate-fade-in-up">
      {/* Header */}
      <div className="flex items-center justify-between mb-7">
        <div>
          <h1 className="text-2xl font-black text-[#111827] mb-1">My Quizzes</h1>
          <p className="text-sm text-[#6B7280]">
            {quizzes.length} quizzes taken · {passed} passed · {avgScore}% average
          </p>
        </div>
        <Link
          href="/dashboard/generate"
          className="flex items-center gap-1.5 text-sm font-semibold text-white bg-[#6366F1] hover:bg-[#4F46E5] px-4 py-2 rounded-xl transition-all hover:-translate-y-0.5 hover:shadow-md"
        >
          <Zap className="w-3.5 h-3.5" /> New Quiz
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total Quizzes", value: quizzes.length, color: "text-[#6366F1]" },
          { label: "Passed (≥70%)", value: passed, color: "text-[#10B981]" },
          { label: "Average Score", value: `${avgScore}%`, color: "text-[#F59E0B]" },
          { label: "Certificates", value: certs, color: "text-[#8B5CF6]" },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-[#E5E7EB] p-4 text-center">
            <div className={`text-2xl font-black ${s.color}`}>{s.value}</div>
            <div className="text-xs text-[#6B7280] font-medium mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20 text-[#9CA3AF]">
          <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading your quizzes...
        </div>
      )}

      {/* DB error — shows fix instructions */}
      {!loading && dbError && (
        <div className="bg-white border border-[#FECACA] rounded-2xl overflow-hidden">
          <div className="flex items-start gap-3 px-5 py-4 bg-[#FEF2F2]">
            <AlertTriangle className="w-5 h-5 text-[#DC2626] flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-bold text-[#DC2626]">Database setup needed</p>
              <p className="text-xs text-[#EF4444] mt-0.5">
                The quiz_attempts table is missing some columns or RLS policy. Run the SQL below once in
                your <strong>Supabase Dashboard → SQL Editor</strong>, then refresh this page.
              </p>
            </div>
            <button
              onClick={() => setShowSql(s => !s)}
              className="text-xs font-semibold text-[#DC2626] border border-[#FECACA] px-3 py-1.5 rounded-lg hover:bg-[#FEE2E2] transition-colors shrink-0"
            >
              {showSql ? "Hide SQL" : "Show SQL →"}
            </button>
          </div>
          {showSql && (
            <div className="relative">
              <pre className="bg-[#0F172A] text-[#94A3B8] text-xs font-mono p-5 overflow-x-auto leading-relaxed max-h-80">
                <code>{SETUP_SQL}</code>
              </pre>
              <button
                onClick={handleCopy}
                className="absolute top-3 right-3 bg-[#1E293B] hover:bg-[#334155] text-[#94A3B8] text-xs px-3 py-1.5 rounded-lg transition-colors font-medium"
              >
                {copied ? "✓ Copied!" : "Copy SQL"}
              </button>
            </div>
          )}
          <div className="px-5 py-3 bg-[#F9FAFB] border-t border-[#FEE2E2] text-xs text-[#9CA3AF]">
            Technical error: {dbError}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!loading && !dbError && quizzes.length === 0 && (
        <div className="bg-white rounded-2xl border border-[#E5E7EB] p-16 text-center">
          <div className="text-5xl mb-4">📝</div>
          <h3 className="text-lg font-bold text-[#111827] mb-2">No quizzes yet</h3>
          <p className="text-sm text-[#6B7280] mb-6">
            Generate your first AI quiz and it will appear here automatically.
          </p>
          <Link
            href="/dashboard/generate"
            className="inline-flex items-center gap-2 bg-[#6366F1] hover:bg-[#4F46E5] text-white font-semibold px-6 py-3 rounded-xl transition-all hover:shadow-lg text-sm"
          >
            <Zap className="w-4 h-4" /> Generate First Quiz
          </Link>
        </div>
      )}

      {/* Quiz list */}
      {!loading && !dbError && quizzes.length > 0 && (
        <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-sm overflow-hidden">
          <div className="grid grid-cols-[1fr_auto_auto_auto_auto_auto] gap-4 px-6 py-3 border-b border-[#F3F4F6] text-xs font-black text-[#9CA3AF] uppercase tracking-widest">
            <div>Quiz</div>
            <div>Level</div>
            <div>Score</div>
            <div className="hidden sm:block">Time</div>
            <div>Cert</div>
            <div>Action</div>
          </div>
          <div className="divide-y divide-[#F9FAFB]">
            {quizzes.map((q) => {
              const lc = LEVEL_COLOR[(q.difficulty ?? "medium").toLowerCase() as keyof typeof LEVEL_COLOR] ?? LEVEL_COLOR.medium;
              return (
                <div key={q.id} className="grid grid-cols-[1fr_auto_auto_auto_auto_auto] gap-4 px-6 py-4 items-center hover:bg-[#FAFAFA] transition-colors">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-[#111827] truncate">{q.topic ?? "Unknown"}</div>
                    <div className="text-xs text-[#9CA3AF] mt-0.5 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {formatDate(q.created_at)}
                      {q.correct_answers != null && (
                        <span className="ml-1">· {q.correct_answers}/{q.total_questions} correct</span>
                      )}
                    </div>
                  </div>
                  <div
                    className="text-xs font-bold px-2.5 py-1 rounded-full border capitalize whitespace-nowrap"
                    style={{ backgroundColor: lc.bg, color: lc.text, borderColor: lc.border }}
                  >
                    {lc.label}
                  </div>
                  <div className={`text-sm font-black ${(q.score_pct ?? 0) >= 70 ? "text-[#10B981]" : "text-[#F59E0B]"}`}>
                    {q.score_pct ?? 0}%
                  </div>
                  <div className="text-xs text-[#9CA3AF] hidden sm:block">{formatTime(q.time_taken_secs)}</div>
                  <div title={q.certificate_earned ? "Certificate earned ≥70%" : "No certificate (<70%)"}>
                    {q.certificate_earned
                      ? <Trophy className="w-4 h-4 text-[#F59E0B]" />
                      : <XCircle className="w-4 h-4 text-[#E5E7EB]" />}
                  </div>
                  <div>
                    <Link
                      href="/dashboard/generate"
                      className={`text-xs font-semibold flex items-center gap-0.5 whitespace-nowrap ${q.certificate_earned ? "text-[#10B981] hover:text-[#059669]" : "text-[#6366F1] hover:text-[#4F46E5]"}`}
                    >
                      {q.certificate_earned
                        ? <><Award className="w-3.5 h-3.5" /> Cert</>
                        : <>Retry</>}
                    </Link>
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
