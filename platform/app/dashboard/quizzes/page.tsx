import Link from "next/link";
import { BookOpen, CheckCircle, XCircle, Clock, ArrowRight, Filter } from "lucide-react";

const QUIZZES = [
  { id: "q1", topic: "Python Data Structures", level: "Medium", score: 85, total: 10, date: "Mar 8, 2026", time: "8m 24s", cert: true },
  { id: "q2", topic: "SQL Fundamentals", level: "Easy", score: 92, total: 10, date: "Mar 6, 2026", time: "5m 12s", cert: true },
  { id: "q3", topic: "Machine Learning Basics", level: "Hard", score: 72, total: 15, date: "Mar 4, 2026", time: "18m 45s", cert: true },
  { id: "q4", topic: "Linear Algebra", level: "Hard", score: 61, total: 10, date: "Mar 3, 2026", time: "14m 32s", cert: false },
  { id: "q5", topic: "React.js Hooks", level: "Medium", score: 88, total: 12, date: "Mar 1, 2026", time: "10m 08s", cert: true },
  { id: "q6", topic: "Data Visualization", level: "Easy", score: 95, total: 8, date: "Feb 28, 2026", time: "4m 55s", cert: true },
  { id: "q7", topic: "Deep Learning", level: "Hard", score: 60, total: 15, date: "Feb 26, 2026", time: "22m 10s", cert: false },
  { id: "q8", topic: "Statistics for Data Science", level: "Medium", score: 79, total: 10, date: "Feb 24, 2026", time: "12m 18s", cert: true },
];

const LEVEL_COLOR = {
  Easy: { bg: "#D1FAE5", text: "#065F46", border: "#6EE7B7" },
  Medium: { bg: "#FEF3C7", text: "#92400E", border: "#FCD34D" },
  Hard: { bg: "#FEE2E2", text: "#991B1B", border: "#FECACA" },
} as const;

export default function QuizzesPage() {
  const passed = QUIZZES.filter(q => q.score >= 70).length;
  const avgScore = Math.round(QUIZZES.reduce((s, q) => s + q.score, 0) / QUIZZES.length);

  return (
    <div className="animate-fade-in-up">
      {/* Header */}
      <div className="flex items-center justify-between mb-7">
        <div>
          <h1 className="text-2xl font-black text-[#111827] mb-1">My Quizzes</h1>
          <p className="text-sm text-[#6B7280]">{QUIZZES.length} quizzes taken · {passed} passed · {avgScore}% average</p>
        </div>
        <div className="flex gap-2">
          <button className="flex items-center gap-1.5 text-sm font-medium text-[#6B7280] border border-[#E5E7EB] bg-white px-3 py-2 rounded-xl hover:bg-[#F9FAFB] transition-colors">
            <Filter className="w-3.5 h-3.5" /> Filter
          </button>
          <Link href="/dashboard/generate" className="flex items-center gap-1.5 text-sm font-semibold text-white bg-[#6366F1] hover:bg-[#4F46E5] px-4 py-2 rounded-xl transition-all hover:-translate-y-0.5 hover:shadow-md">
            + New Quiz
          </Link>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-[#E5E7EB] p-4 text-center">
          <div className="text-2xl font-black text-[#6366F1]">{QUIZZES.length}</div>
          <div className="text-xs text-[#6B7280] font-medium mt-0.5">Total Quizzes</div>
        </div>
        <div className="bg-white rounded-xl border border-[#E5E7EB] p-4 text-center">
          <div className="text-2xl font-black text-[#10B981]">{passed}</div>
          <div className="text-xs text-[#6B7280] font-medium mt-0.5">Passed (≥70%)</div>
        </div>
        <div className="bg-white rounded-xl border border-[#E5E7EB] p-4 text-center">
          <div className="text-2xl font-black text-[#F59E0B]">{avgScore}%</div>
          <div className="text-xs text-[#6B7280] font-medium mt-0.5">Average Score</div>
        </div>
      </div>

      {/* Quiz list */}
      <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-sm overflow-hidden">
        <div className="grid grid-cols-[1fr_auto_auto_auto_auto_auto] gap-4 px-6 py-3 border-b border-[#F3F4F6] text-xs font-black text-[#9CA3AF] uppercase tracking-widest">
          <div>Quiz</div>
          <div>Level</div>
          <div>Score</div>
          <div className="hidden sm:block">Time</div>
          <div>Cert</div>
          <div></div>
        </div>
        <div className="divide-y divide-[#F9FAFB]">
          {QUIZZES.map((q) => {
            const lc = LEVEL_COLOR[q.level as keyof typeof LEVEL_COLOR];
            const pct = Math.round((q.score / q.total) * 10) || q.score;
            return (
              <div key={q.id} className="grid grid-cols-[1fr_auto_auto_auto_auto_auto] gap-4 px-6 py-4 items-center hover:bg-[#FAFAFA] transition-colors">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-[#111827] truncate">{q.topic}</div>
                  <div className="text-xs text-[#9CA3AF] mt-0.5 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {q.date}
                  </div>
                </div>
                <div className="text-xs font-bold px-2 py-1 rounded-full border" style={{ backgroundColor: lc.bg, color: lc.text, borderColor: lc.border }}>
                  {q.level}
                </div>
                <div className={`text-sm font-black ${q.score >= 70 ? "text-[#10B981]" : "text-[#F59E0B]"}`}>
                  {q.score}%
                </div>
                <div className="text-xs text-[#9CA3AF] hidden sm:block">{q.time}</div>
                <div>
                  {q.cert
                    ? <CheckCircle className="w-4 h-4 text-[#10B981]" />
                    : <XCircle className="w-4 h-4 text-[#E5E7EB]" />}
                </div>
                <div>
                  <Link href={`/dashboard/results/${q.id}`} className="text-xs text-[#6366F1] hover:text-[#4F46E5] font-semibold flex items-center gap-0.5">
                    Review <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
