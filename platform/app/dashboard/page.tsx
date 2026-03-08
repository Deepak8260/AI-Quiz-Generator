import Link from "next/link";
import { Zap, Trophy, Flame, BarChart3, BookOpen, TrendingUp, TrendingDown, ArrowRight, Star } from "lucide-react";

export default function DashboardPage() {
  return (
    <div className="space-y-7 animate-fade-in-up">

      {/* ── Welcome Banner ─────────────────────────────────────── */}
      <div className="bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] rounded-2xl p-7 text-white relative overflow-hidden">
        <div className="absolute right-0 top-0 w-64 h-full opacity-10">
          <svg viewBox="0 0 200 200" className="w-full h-full">
            <circle cx="160" cy="60" r="80" fill="white"/>
            <circle cx="40" cy="150" r="50" fill="white"/>
          </svg>
        </div>
        <div className="relative">
          <p className="text-indigo-200 text-sm font-medium mb-1">Good morning, Deepak 👋</p>
          <h2 className="text-2xl font-black mb-3">Ready to learn something new today?</h2>
          <p className="text-indigo-200 text-sm mb-5">You&apos;ve completed 3 quizzes this week. Keep up the great momentum!</p>
          <Link
            href="/dashboard/generate"
            className="inline-flex items-center gap-2 bg-white text-[#6366F1] font-bold text-sm px-5 py-2.5 rounded-xl hover:shadow-lg transition-all hover:-translate-y-0.5"
          >
            <Zap className="w-4 h-4" />
            Generate Quiz
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* ── Stats Row ──────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {STATS.map((s, i) => (
          <div key={i} className="bg-white rounded-2xl border border-[#E5E7EB] p-5 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5">
            <div className="flex items-start justify-between mb-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center`} style={{ backgroundColor: s.color + "15" }}>
                <s.icon className="w-5 h-5" style={{ color: s.color }} />
              </div>
              <span className={`text-xs font-bold flex items-center gap-0.5 ${s.up ? "text-[#10B981]" : "text-[#EF4444]"}`}>
                {s.up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {s.change}
              </span>
            </div>
            <div className="text-3xl font-black text-[#111827] mb-1">{s.value}</div>
            <div className="text-xs font-medium text-[#6B7280]">{s.label}</div>
          </div>
        ))}
      </div>

      {/* ── Two-col grid ───────────────────────────────────────── */}
      <div className="grid lg:grid-cols-3 gap-6">

        {/* Recent quizzes */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-[#E5E7EB] shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-[#F3F4F6]">
            <h3 className="font-bold text-[#111827]">Recent Quizzes</h3>
            <Link href="/dashboard/quizzes" className="text-xs text-[#6366F1] font-semibold hover:text-[#4F46E5] flex items-center gap-0.5">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="divide-y divide-[#F9FAFB]">
            {RECENT_QUIZZES.map((q, i) => (
              <div key={i} className="px-6 py-4 flex items-center gap-4 hover:bg-[#FAFAFA] transition-colors">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0`} style={{ backgroundColor: q.color + "15" }}>
                  {q.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-[#111827] truncate">{q.topic}</div>
                  <div className="text-xs text-[#9CA3AF]">{q.difficulty} · {q.date}</div>
                </div>
                <div className="text-right">
                  <div className={`text-sm font-black ${q.score >= 70 ? "text-[#10B981]" : "text-[#F59E0B]"}`}>{q.score}%</div>
                  <div className="text-xs text-[#9CA3AF]">{q.score >= 70 ? "✓ Passed" : "Needs work"}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-5">
          {/* XP / Streak card */}
          <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <Flame className="w-4 h-4 text-[#F59E0B]" />
              <span className="text-sm font-bold text-[#111827]">Current Streak</span>
            </div>
            <div className="flex items-end gap-2 mb-3">
              <span className="text-5xl font-black text-[#F59E0B]">7</span>
              <span className="text-[#6B7280] text-sm mb-2">days 🔥</span>
            </div>
            <div className="flex gap-1 mb-3">
              {[...Array(7)].map((_, i) => (
                <div key={i} className={`flex-1 h-6 rounded-md ${i < 7 ? "bg-[#F59E0B]" : "bg-[#F3F4F6]"}`} />
              ))}
            </div>
            <p className="text-xs text-[#9CA3AF]">Longest: 14 days · XP: 2,450</p>
          </div>

          {/* Quick generate */}
          <div className="bg-gradient-to-br from-[#EEF2FF] to-[#F5F3FF] rounded-2xl border border-[#E0E7FF] p-5">
            <div className="flex items-center gap-2 mb-3">
              <Zap className="w-4 h-4 text-[#6366F1]" />
              <span className="text-sm font-bold text-[#4338CA]">Quick Generate</span>
            </div>
            <p className="text-xs text-[#6B7280] mb-4">Jump into a quick quiz on your weakest topic.</p>
            <div className="space-y-2 mb-4">
              {["Python Basics", "Linear Algebra", "SQL Queries"].map((t, i) => (
                <Link key={i} href="/dashboard/generate" className="flex items-center justify-between px-3 py-2 bg-white rounded-lg text-xs font-medium text-[#374151] hover:text-[#6366F1] hover:border-[#C7D2FE] border border-[#E5E7EB] transition-colors">
                  {t} <ArrowRight className="w-3 h-3" />
                </Link>
              ))}
            </div>
          </div>

          {/* Top topics */}
          <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-sm p-5">
            <h4 className="text-sm font-bold text-[#111827] mb-3">Top Topics</h4>
            <div className="space-y-2.5">
              {TOP_TOPICS.map((t, i) => (
                <div key={i}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-medium text-[#374151]">{t.name}</span>
                    <span className="text-[#6B7280] font-semibold">{t.pct}%</span>
                  </div>
                  <div className="h-1.5 bg-[#F3F4F6] rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${t.pct}%`, backgroundColor: t.color }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Leaderboard preview ────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#F3F4F6]">
          <h3 className="font-bold text-[#111827] flex items-center gap-2">
            <Star className="w-4 h-4 text-[#F59E0B]" /> Top Learners This Week
          </h3>
          <Link href="/dashboard/leaderboard" className="text-xs text-[#6366F1] font-semibold hover:text-[#4F46E5] flex items-center gap-0.5">
            Full leaderboard <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        <div className="divide-y divide-[#F9FAFB]">
          {LEADERBOARD.map((u, i) => (
            <div key={i} className={`px-6 py-3.5 flex items-center gap-4 ${i === 2 ? "bg-[#FFFBEB]" : ""}`}>
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-black ${
                i === 0 ? "bg-[#FEF3C7] text-[#F59E0B]" : i === 1 ? "bg-[#F3F4F6] text-[#6B7280]" : i === 2 ? "bg-[#FEF3C7] text-[#D97706]" : "text-[#9CA3AF] text-xs"
              }`}>
                {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1}
              </div>
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: u.color }}>
                {u.name[0]}
              </div>
              <div className="flex-1">
                <div className="text-sm font-semibold text-[#111827]">{u.name}</div>
                <div className="text-xs text-[#9CA3AF]">{u.quizzes} quizzes</div>
              </div>
              <div className="text-sm font-black text-[#6366F1]">{u.xp.toLocaleString()} XP</div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}

// ── Data ──────────────────────────────────────────────────────
const STATS = [
  { icon: BookOpen, color: "#6366F1", value: "24", label: "Quizzes Taken", change: "+3 this week", up: true },
  { icon: BarChart3, color: "#10B981", value: "78%", label: "Avg Score", change: "+5%", up: true },
  { icon: Flame, color: "#F59E0B", value: "7", label: "Day Streak", change: "Personal best!", up: true },
  { icon: Trophy, color: "#8B5CF6", value: "5", label: "Certificates", change: "+1 this month", up: true },
];

const RECENT_QUIZZES = [
  { emoji: "🐍", color: "#6366F1", topic: "Python Data Structures", difficulty: "Medium", date: "Today", score: 85 },
  { emoji: "🤖", color: "#8B5CF6", topic: "Machine Learning Basics", difficulty: "Hard", date: "Yesterday", score: 72 },
  { emoji: "🗄️", color: "#10B981", topic: "SQL Fundamentals", difficulty: "Easy", date: "2 days ago", score: 92 },
  { emoji: "📐", color: "#F59E0B", topic: "Linear Algebra", difficulty: "Hard", date: "3 days ago", score: 61 },
];

const TOP_TOPICS = [
  { name: "Python", pct: 88, color: "#6366F1" },
  { name: "Machine Learning", pct: 74, color: "#8B5CF6" },
  { name: "SQL", pct: 91, color: "#10B981" },
  { name: "Statistics", pct: 65, color: "#F59E0B" },
];

const LEADERBOARD = [
  { name: "Ananya R.", quizzes: 48, xp: 5240, color: "#6366F1" },
  { name: "Ravi K.", quizzes: 41, xp: 4890, color: "#8B5CF6" },
  { name: "You", quizzes: 24, xp: 2450, color: "#F59E0B" },
  { name: "Priya M.", quizzes: 19, xp: 2100, color: "#10B981" },
];
