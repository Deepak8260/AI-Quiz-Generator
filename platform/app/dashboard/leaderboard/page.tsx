import { Trophy, Medal, Flame, BookOpen, TrendingUp } from "lucide-react";

const GLOBAL_LEADERS = [
  { rank: 1, name: "Ananya R.", avatar: "#6366F1", xp: 12480, quizzes: 124, streak: 45, badge: "🥇" },
  { rank: 2, name: "Marcus T.", avatar: "#8B5CF6", xp: 10920, quizzes: 98, streak: 32, badge: "🥈" },
  { rank: 3, name: "Ravi K.", avatar: "#10B981", xp: 9540, quizzes: 87, streak: 28, badge: "🥉" },
  { rank: 4, name: "Priya M.", avatar: "#F59E0B", xp: 8320, quizzes: 74, streak: 21, badge: null },
  { rank: 5, name: "James L.", avatar: "#EF4444", xp: 7780, quizzes: 68, streak: 15, badge: null },
  { rank: 6, name: "Sarah K.", avatar: "#6366F1", xp: 7120, quizzes: 61, streak: 18, badge: null },
  { rank: 7, name: "Alex M.", avatar: "#8B5CF6", xp: 6890, quizzes: 59, streak: 9, badge: null },
  { rank: 8, name: "Chen W.", avatar: "#10B981", xp: 6540, quizzes: 55, streak: 14, badge: null },
  { rank: 21, name: "You", avatar: "#6366F1", xp: 2450, quizzes: 24, streak: 7, badge: null, isYou: true },
];

export default function LeaderboardPage() {
  return (
    <div className="animate-fade-in-up">
      <div className="flex items-center justify-between mb-7">
        <div>
          <h1 className="text-2xl font-black text-[#111827] mb-1">Leaderboard</h1>
          <p className="text-sm text-[#6B7280]">Top learners ranked by XP this week. Complete more quizzes to climb!</p>
        </div>
        <div className="text-sm text-[#6B7280] bg-white border border-[#E5E7EB] rounded-xl px-4 py-2">
          Your rank: <strong className="text-[#6366F1]">#21</strong>
        </div>
      </div>

      {/* Podium */}
      <div className="bg-gradient-to-br from-[#EEF2FF] to-[#F5F3FF] rounded-2xl border border-[#E0E7FF] p-7 mb-6">
        <h2 className="text-center text-xs font-black text-[#9CA3AF] uppercase tracking-widest mb-7">🏆 Top 3 This Week</h2>
        <div className="flex items-end justify-center gap-4">
          {/* 2nd */}
          <div className="text-center">
            <div className="w-16 h-16 rounded-2xl border-4 border-white shadow-md flex items-center justify-center text-white text-xl font-black mb-2 mx-auto" style={{ backgroundColor: GLOBAL_LEADERS[1].avatar }}>
              {GLOBAL_LEADERS[1].name[0]}
            </div>
            <div className="text-sm font-bold text-[#374151]">{GLOBAL_LEADERS[1].name}</div>
            <div className="text-xs text-[#6B7280]">{GLOBAL_LEADERS[1].xp.toLocaleString()} XP</div>
            <div className="mt-2 h-16 bg-[#C7D2FE] rounded-t-lg w-16 mx-auto flex items-end justify-center pb-1">
              <span className="text-2xl">🥈</span>
            </div>
          </div>
          {/* 1st */}
          <div className="text-center">
            <div className="w-20 h-20 rounded-2xl border-4 border-white shadow-lg flex items-center justify-center text-white text-2xl font-black mb-2 mx-auto" style={{ backgroundColor: GLOBAL_LEADERS[0].avatar }}>
              {GLOBAL_LEADERS[0].name[0]}
            </div>
            <div className="text-sm font-bold text-[#374151]">{GLOBAL_LEADERS[0].name}</div>
            <div className="text-xs text-[#6366F1] font-semibold">{GLOBAL_LEADERS[0].xp.toLocaleString()} XP</div>
            <div className="mt-2 h-24 bg-[#6366F1] rounded-t-lg w-20 mx-auto flex items-end justify-center pb-1">
              <span className="text-3xl">🥇</span>
            </div>
          </div>
          {/* 3rd */}
          <div className="text-center">
            <div className="w-16 h-16 rounded-2xl border-4 border-white shadow-md flex items-center justify-center text-white text-xl font-black mb-2 mx-auto" style={{ backgroundColor: GLOBAL_LEADERS[2].avatar }}>
              {GLOBAL_LEADERS[2].name[0]}
            </div>
            <div className="text-sm font-bold text-[#374151]">{GLOBAL_LEADERS[2].name}</div>
            <div className="text-xs text-[#6B7280]">{GLOBAL_LEADERS[2].xp.toLocaleString()} XP</div>
            <div className="mt-2 h-12 bg-[#DDD6FE] rounded-t-lg w-16 mx-auto flex items-end justify-center pb-1">
              <span className="text-2xl">🥉</span>
            </div>
          </div>
        </div>
      </div>

      {/* Full table */}
      <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-[#F3F4F6]">
          <div className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-4 text-xs font-black text-[#9CA3AF] uppercase tracking-widest">
            <div className="w-8">#</div>
            <div>Learner</div>
            <div className="text-right hidden sm:block">Quizzes</div>
            <div className="text-right">Streak</div>
            <div className="text-right">XP</div>
          </div>
        </div>

        <div className="divide-y divide-[#F9FAFB]">
          {GLOBAL_LEADERS.map((user, i) => (
            <div key={i}>
              {/* Gap indicator */}
              {user.isYou && i > 0 && GLOBAL_LEADERS[i-1].rank < user.rank - 1 && (
                <div className="px-6 py-2 text-center text-xs text-[#9CA3AF] bg-[#FAFAFA]">
                  · · · {user.rank - GLOBAL_LEADERS[i-1].rank - 1} more users · · ·
                </div>
              )}
              <div className={`px-6 py-4 grid grid-cols-[auto_1fr_auto_auto_auto] gap-4 items-center transition-colors ${user.isYou ? "bg-[#EEF2FF] border-l-4 border-l-[#6366F1]" : "hover:bg-[#FAFAFA]"}`}>
                <div className="w-8 text-sm font-black text-[#9CA3AF]">
                  {user.badge ?? user.rank}
                </div>
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center text-white text-sm font-bold" style={{ backgroundColor: user.avatar }}>
                    {user.name[0]}
                  </div>
                  <div className="min-w-0">
                    <div className={`text-sm font-bold truncate ${user.isYou ? "text-[#6366F1]" : "text-[#111827]"}`}>
                      {user.name} {user.isYou && <span className="text-xs font-medium text-[#6366F1] ml-1">(you)</span>}
                    </div>
                  </div>
                </div>
                <div className="text-sm text-[#6B7280] text-right hidden sm:flex items-center gap-1 justify-end">
                  <BookOpen className="w-3 h-3" /> {user.quizzes}
                </div>
                <div className="text-sm text-[#F59E0B] font-semibold text-right flex items-center gap-1 justify-end">
                  <Flame className="w-3 h-3" /> {user.streak}d
                </div>
                <div className={`text-sm font-black text-right ${user.isYou ? "text-[#6366F1]" : "text-[#374151]"}`}>
                  {user.xp.toLocaleString()}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Boost card */}
      <div className="mt-5 bg-gradient-to-r from-[#FEF3C7] to-[#FDE68A] rounded-2xl border border-[#FCD34D]/50 p-5 flex items-center gap-4">
        <div className="text-3xl">🔥</div>
        <div className="flex-1">
          <p className="font-bold text-[#92400E] text-sm mb-0.5">You&apos;re #21 — keep going!</p>
          <p className="text-xs text-[#B45309]">Complete 5 more quizzes this week to reach the Top 10. Each quiz earns you 50+ XP.</p>
        </div>
        <a href="/dashboard/generate" className="bg-[#F59E0B] hover:bg-[#D97706] text-white text-sm font-bold px-4 py-2 rounded-xl transition-colors whitespace-nowrap">
          Generate Quiz
        </a>
      </div>
    </div>
  );
}
