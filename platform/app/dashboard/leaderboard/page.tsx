"use client";
import { useEffect, useState, useCallback } from "react";
import { Trophy, Loader2, ChevronDown, ChevronUp, Clock, Target, CheckCircle, Flame, Medal, Swords } from "lucide-react";
import { createClient } from "@/lib/supabase";
import type { Contest, ContestResult } from "@/app/admin/contests/types";

function pad(n: number) { return String(n).padStart(2, "0"); }
function formatTime(secs: number) { const m = Math.floor(secs / 60); return `${m}m ${pad(secs % 60)}s`; }
function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

const MEDAL_EMOJI = ["🥇", "🥈", "🥉"];
const COLORS = ["#6366F1", "#8B5CF6", "#10B981", "#F59E0B", "#EF4444", "#06B6D4", "#EC4899"];

// ── Contest card with expandable leaderboard ───────────────────────
interface ContestWithResults extends Contest {
    results: (ContestResult & { profiles?: { full_name: string | null; email: string | null } })[];
}

function ContestLeaderboardCard({
    contest, userId,
}: { contest: ContestWithResults; userId: string | null }) {
    const [open, setOpen] = useState(false);
    const results = contest.results;
    const myResult = results.find(r => r.user_id === userId);
    const myRank = myResult ? results.findIndex(r => r.user_id === userId) + 1 : null;

    return (
        <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-sm overflow-hidden transition-all">
            {/* Card header — always visible */}
            <button
                onClick={() => setOpen(o => !o)}
                className="w-full flex items-center justify-between px-6 py-5 hover:bg-[#FAFAFA] transition-colors text-left">
                <div className="flex items-center gap-4">
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] flex items-center justify-center flex-shrink-0">
                        <Trophy className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <div className="text-base font-black text-[#111827]">{contest.title}</div>
                        <div className="text-xs text-[#9CA3AF] mt-0.5 flex items-center gap-2">
                            <span className="capitalize">{contest.topic}</span>
                            <span>·</span>
                            <span>{results.length} participant{results.length !== 1 ? "s" : ""}</span>
                            <span>·</span>
                            <span>{formatDate(contest.announced_at!)}</span>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-4 flex-shrink-0">
                    {myRank && (
                        <div className={`text-center px-3 py-1.5 rounded-xl ${myRank <= 3 ? "bg-[#FEF3C7] border border-[#FCD34D]" : "bg-[#EEF2FF]"}`}>
                            <div className="text-lg font-black text-[#6366F1]">
                                {myRank <= 3 ? MEDAL_EMOJI[myRank - 1] : `#${myRank}`}
                            </div>
                            <div className="text-[10px] text-[#9CA3AF] font-bold">your rank</div>
                        </div>
                    )}
                    {/* Mini podium preview */}
                    <div className="hidden sm:flex items-end gap-1.5">
                        {results.slice(0, 3).map((r, i) => (
                            <div key={r.id} className="text-center">
                                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold`}
                                    style={{ backgroundColor: COLORS[i] }}>
                                    {(r.profiles?.full_name ?? "?")[0]?.toUpperCase()}
                                </div>
                            </div>
                        ))}
                    </div>
                    {open
                        ? <ChevronUp className="w-4 h-4 text-[#9CA3AF]" />
                        : <ChevronDown className="w-4 h-4 text-[#9CA3AF]" />}
                </div>
            </button>

            {/* Expanded results */}
            {open && (
                <div className="border-t border-[#F3F4F6]">
                    {/* Column headers */}
                    <div className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-3 px-6 py-3 bg-[#F9FAFB] text-[10px] font-black text-[#9CA3AF] uppercase tracking-widest">
                        <div className="w-10">Rank</div>
                        <div>Participant</div>
                        <div className="text-right">Score</div>
                        <div className="text-right hidden sm:block">Accuracy</div>
                        <div className="text-right">Time</div>
                    </div>
                    <div className="divide-y divide-[#F9FAFB]">
                        {results.map((r, idx) => {
                            const rank = idx + 1;
                            const isMe = r.user_id === userId;
                            return (
                                <div key={r.id}
                                    className={`grid grid-cols-[auto_1fr_auto_auto_auto] gap-3 px-6 py-3.5 items-center ${isMe ? "bg-[#EEF2FF] border-l-4 border-l-[#6366F1]" : "hover:bg-[#FAFAFA]"}`}>
                                    <div className="w-10 text-center text-lg font-black">
                                        {rank <= 3 ? MEDAL_EMOJI[rank - 1] : <span className="text-sm text-[#9CA3AF]">#{rank}</span>}
                                    </div>
                                    <div className="flex items-center gap-2.5 min-w-0">
                                        <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-white text-xs font-bold"
                                            style={{ backgroundColor: isMe ? "#6366F1" : COLORS[rank % COLORS.length] }}>
                                            {(r.profiles?.full_name ?? "?")[0]?.toUpperCase()}
                                        </div>
                                        <div className={`text-sm font-bold truncate ${isMe ? "text-[#6366F1]" : "text-[#111827]"}`}>
                                            {r.profiles?.full_name ?? "Unknown"}
                                            {isMe && <span className="ml-1.5 text-[10px] font-black bg-[#C7D2FE] text-[#6366F1] px-1.5 py-0.5 rounded-full">you</span>}
                                        </div>
                                    </div>
                                    <div className={`text-sm font-black text-right ${isMe ? "text-[#6366F1]" : "text-[#111827]"}`}>
                                        {r.score}<span className="text-[#9CA3AF] text-xs font-normal">/{r.total_questions}</span>
                                    </div>
                                    <div className={`text-sm font-bold text-right hidden sm:block ${Number(r.accuracy) >= 70 ? "text-[#10B981]" : "text-[#F59E0B]"}`}>
                                        {Number(r.accuracy).toFixed(1)}%
                                    </div>
                                    <div className="text-sm text-[#6B7280] text-right">{formatTime(r.time_taken_seconds)}</div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}

// ── Weekly aggregate leaderboard ──────────────────────────────────
interface WeeklyEntry {
    user_id: string;
    name: string;
    totalScore: number;
    totalContests: number;
    avgAccuracy: number;
    bestRank: number;
}

// ── Main page ─────────────────────────────────────────────────────
export default function LeaderboardPage() {
    const [contests, setContests] = useState<ContestWithResults[]>([]);
    const [weekly, setWeekly] = useState<WeeklyEntry[]>([]);
    const [myUserId, setMyUserId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        setLoading(true);
        const supabase = createClient();

        const { data: { user } } = await supabase.auth.getUser();
        if (user) setMyUserId(user.id);

        // Fetch all contests with published leaderboards
        const { data: contestsRaw } = await supabase
            .from("contests")
            .select("*")
            .not("announced_at", "is", null)
            .order("announced_at", { ascending: false });

        if (!contestsRaw || contestsRaw.length === 0) {
            setContests([]);
            setWeekly([]);
            setLoading(false);
            return;
        }

        const contestIds = contestsRaw.map(c => c.id);

        // Fetch all results for those contests
        const { data: allResRaw } = await supabase
            .from("contest_results")
            .select("id, contest_id, user_id, score, total_questions, accuracy, time_taken_seconds, rank, submitted_at")
            .in("contest_id", contestIds)
            .order("score", { ascending: false });

        // Fetch all user profiles in one shot
        const allUserIds = [...new Set((allResRaw ?? []).map(r => r.user_id))];
        const { data: profilesData } = allUserIds.length > 0
            ? await supabase.from("profiles").select("id, full_name, email").in("id", allUserIds)
            : { data: [] };

        const profileMap: Record<string, { full_name: string | null; email: string | null }> = {};
        (profilesData ?? []).forEach(pr => { profileMap[pr.id] = pr; });

        // Group results by contest and sort each group by score desc
        const resultsByContest: Record<string, ContestWithResults["results"]> = {};
        (allResRaw ?? []).forEach(r => {
            if (!resultsByContest[r.contest_id]) resultsByContest[r.contest_id] = [];
            resultsByContest[r.contest_id].push({
                ...r,
                profiles: profileMap[r.user_id] ?? { full_name: null, email: null },
            });
        });
        // Sort each contest by score desc, time asc
        Object.keys(resultsByContest).forEach(cid => {
            resultsByContest[cid].sort((a, b) => {
                if (b.score !== a.score) return b.score - a.score;
                return a.time_taken_seconds - b.time_taken_seconds;
            });
        });

        const merged: ContestWithResults[] = contestsRaw.map(c => ({
            ...(c as Contest),
            results: resultsByContest[c.id] ?? [],
        }));
        setContests(merged);

        // ── Weekly aggregate (last 7 days) ──────────────────────────
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        const weeklyResults = (allResRaw ?? []).filter(r => r.submitted_at >= weekAgo);

        const weekMap: Record<string, { scores: number[]; accuracies: number[]; ranks: number[] }> = {};
        weeklyResults.forEach(r => {
            if (!weekMap[r.user_id]) weekMap[r.user_id] = { scores: [], accuracies: [], ranks: [] };
            weekMap[r.user_id].scores.push(r.score);
            weekMap[r.user_id].accuracies.push(Number(r.accuracy));
            if (r.rank) weekMap[r.user_id].ranks.push(r.rank);
        });

        const weeklyEntries: WeeklyEntry[] = Object.entries(weekMap).map(([uid, d]) => ({
            user_id: uid,
            name: profileMap[uid]?.full_name ?? "Unknown",
            totalScore: d.scores.reduce((a, b) => a + b, 0),
            totalContests: d.scores.length,
            avgAccuracy: d.accuracies.length > 0 ? d.accuracies.reduce((a, b) => a + b, 0) / d.accuracies.length : 0,
            bestRank: d.ranks.length > 0 ? Math.min(...d.ranks) : 99,
        }));

        weeklyEntries.sort((a, b) => b.totalScore - a.totalScore || b.avgAccuracy - a.avgAccuracy);
        setWeekly(weeklyEntries);
        setLoading(false);
    }, []);

    useEffect(() => { load(); }, [load]);

    const myWeeklyRank = weekly.findIndex(e => e.user_id === myUserId) + 1;

    if (loading) {
        return (
            <div className="flex items-center justify-center py-32 text-[#6B7280]">
                <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading leaderboard…
            </div>
        );
    }

    return (
        <div className="animate-fade-in-up max-w-4xl mx-auto">

            {/* Header */}
            <div className="flex items-center justify-between mb-7">
                <div>
                    <h1 className="text-2xl font-black text-[#111827] mb-1 flex items-center gap-2.5">
                        <Trophy className="w-6 h-6 text-[#F59E0B]" /> Leaderboard
                    </h1>
                    <p className="text-sm text-[#6B7280]">
                        All published contest results and weekly rankings.
                    </p>
                </div>
                {myWeeklyRank > 0 && (
                    <div className="bg-[#EEF2FF] border border-[#C7D2FE] rounded-xl px-4 py-2 text-sm text-[#6B7280]">
                        Your weekly rank: <strong className="text-[#6366F1]">#{myWeeklyRank}</strong>
                    </div>
                )}
            </div>

            {/* ── Section 1: Contest Results ──────────────────────────────── */}
            <div className="mb-10">
                <h2 className="text-xs font-black text-[#9CA3AF] uppercase tracking-widest mb-4 flex items-center gap-2">
                    <Medal className="w-4 h-4 text-[#6366F1]" /> Contest Results
                </h2>

                {contests.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-[#E5E7EB] flex flex-col items-center justify-center py-20 text-center">
                        <Swords className="w-12 h-12 text-[#E5E7EB] mb-3" />
                        <p className="text-[#9CA3AF] font-semibold mb-1">No results published yet</p>
                        <p className="text-sm text-[#D1D5DB]">Once the admin publishes a contest leaderboard, it will appear here.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {contests.map(c => (
                            <ContestLeaderboardCard key={c.id} contest={c} userId={myUserId} />
                        ))}
                    </div>
                )}
            </div>

            {/* ── Section 2: Weekly Top ───────────────────────────────────── */}
            <div>
                <h2 className="text-xs font-black text-[#9CA3AF] uppercase tracking-widest mb-4 flex items-center gap-2">
                    <Flame className="w-4 h-4 text-[#F59E0B]" /> Top This Week (All Contests)
                </h2>

                {weekly.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-[#E5E7EB] flex flex-col items-center justify-center py-14 text-center">
                        <Trophy className="w-10 h-10 text-[#E5E7EB] mb-3" />
                        <p className="text-sm text-[#9CA3AF]">No contest activity in the past 7 days.</p>
                    </div>
                ) : (
                    <>
                        {/* Top 3 podium */}
                        {weekly.length >= 2 && (
                            <div className="bg-gradient-to-br from-[#EEF2FF] to-[#F5F3FF] rounded-2xl border border-[#E0E7FF] p-6 mb-4">
                                <div className="text-center text-xs font-black text-[#9CA3AF] uppercase tracking-widest mb-5">🏆 Top 3 This Week</div>
                                <div className="flex items-end justify-center gap-5">
                                    {/* 2nd */}
                                    {weekly[1] && (
                                        <div className="text-center flex-1 max-w-[110px]">
                                            <div className="w-12 h-12 rounded-xl bg-[#8B5CF6] flex items-center justify-center text-white text-lg font-black mb-1 mx-auto">
                                                {weekly[1].name[0]?.toUpperCase()}
                                            </div>
                                            <div className="text-xs font-bold text-[#374151] truncate">{weekly[1].name}</div>
                                            <div className="text-[10px] text-[#9CA3AF]">{weekly[1].totalScore} pts</div>
                                            <div className="h-14 bg-[#DDD6FE] rounded-t-lg w-12 mx-auto mt-1 flex items-end justify-center pb-1">
                                                <span className="text-xl">🥈</span>
                                            </div>
                                        </div>
                                    )}
                                    {/* 1st */}
                                    <div className="text-center flex-1 max-w-[130px]">
                                        <div className="w-16 h-16 rounded-xl bg-[#6366F1] flex items-center justify-center text-white text-2xl font-black mb-1 mx-auto shadow-lg shadow-[#6366F1]/30">
                                            {weekly[0].name[0]?.toUpperCase()}
                                        </div>
                                        <div className="text-sm font-black text-[#374151] truncate">{weekly[0].name}</div>
                                        <div className="text-xs text-[#6366F1] font-semibold">{weekly[0].totalScore} pts</div>
                                        <div className="h-20 bg-[#6366F1] rounded-t-lg w-16 mx-auto mt-1 flex items-end justify-center pb-1">
                                            <span className="text-2xl">🥇</span>
                                        </div>
                                    </div>
                                    {/* 3rd */}
                                    {weekly[2] && (
                                        <div className="text-center flex-1 max-w-[110px]">
                                            <div className="w-12 h-12 rounded-xl bg-[#10B981] flex items-center justify-center text-white text-lg font-black mb-1 mx-auto">
                                                {weekly[2].name[0]?.toUpperCase()}
                                            </div>
                                            <div className="text-xs font-bold text-[#374151] truncate">{weekly[2].name}</div>
                                            <div className="text-[10px] text-[#9CA3AF]">{weekly[2].totalScore} pts</div>
                                            <div className="h-10 bg-[#A7F3D0] rounded-t-lg w-12 mx-auto mt-1 flex items-end justify-center pb-1">
                                                <span className="text-xl">🥉</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Full weekly table */}
                        <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-sm overflow-hidden">
                            <div className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-4 px-6 py-3 border-b border-[#F3F4F6] text-[10px] font-black text-[#9CA3AF] uppercase tracking-widest">
                                <div className="w-10">Rank</div>
                                <div>Participant</div>
                                <div className="text-right">Contests</div>
                                <div className="text-right hidden sm:block">Avg Accuracy</div>
                                <div className="text-right">Total Score</div>
                            </div>
                            <div className="divide-y divide-[#F9FAFB]">
                                {weekly.map((entry, idx) => {
                                    const rank = idx + 1;
                                    const isMe = entry.user_id === myUserId;
                                    return (
                                        <div key={entry.user_id}
                                            className={`grid grid-cols-[auto_1fr_auto_auto_auto] gap-4 px-6 py-4 items-center ${isMe ? "bg-[#EEF2FF] border-l-4 border-l-[#6366F1]" : "hover:bg-[#FAFAFA]"}`}>
                                            <div className="w-10 text-center text-lg font-black">
                                                {rank <= 3 ? MEDAL_EMOJI[rank - 1] : <span className="text-sm text-[#9CA3AF]">#{rank}</span>}
                                            </div>
                                            <div className="flex items-center gap-2.5 min-w-0">
                                                <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-white text-xs font-bold"
                                                    style={{ backgroundColor: isMe ? "#6366F1" : COLORS[rank % COLORS.length] }}>
                                                    {entry.name[0]?.toUpperCase()}
                                                </div>
                                                <div className={`text-sm font-bold truncate ${isMe ? "text-[#6366F1]" : "text-[#111827]"}`}>
                                                    {entry.name}
                                                    {isMe && <span className="ml-1.5 text-[10px] font-black bg-[#C7D2FE] text-[#6366F1] px-1.5 py-0.5 rounded-full">you</span>}
                                                </div>
                                            </div>
                                            <div className="text-sm text-[#6B7280] text-right flex items-center gap-1 justify-end">
                                                <Target className="w-3 h-3" /> {entry.totalContests}
                                            </div>
                                            <div className={`text-sm font-bold text-right hidden sm:flex items-center gap-1 justify-end ${entry.avgAccuracy >= 70 ? "text-[#10B981]" : "text-[#F59E0B]"}`}>
                                                <CheckCircle className="w-3 h-3" /> {entry.avgAccuracy.toFixed(1)}%
                                            </div>
                                            <div className={`text-sm font-black text-right ${isMe ? "text-[#6366F1]" : "text-[#374151]"}`}>
                                                {entry.totalScore} pts
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* My rank highlight */}
                        {myWeeklyRank > 0 && (
                            <div className="mt-4 bg-gradient-to-r from-[#EEF2FF] to-[#F5F3FF] border border-[#C7D2FE] rounded-2xl p-4 flex items-center gap-4">
                                <div className="text-2xl">
                                    {myWeeklyRank <= 3 ? MEDAL_EMOJI[myWeeklyRank - 1] : `#${myWeeklyRank}`}
                                </div>
                                <div className="flex-1">
                                    <div className="text-sm font-black text-[#4338CA]">
                                        {myWeeklyRank === 1 ? "You're #1 this week! 🎉" : `You're ranked #${myWeeklyRank} this week.`}
                                    </div>
                                    <div className="text-xs text-[#818CF8] mt-0.5">
                                        {weekly[myWeeklyRank - 1]?.totalContests} contest{weekly[myWeeklyRank - 1]?.totalContests !== 1 ? "s" : ""} completed
                                        · {weekly[myWeeklyRank - 1]?.totalScore} total points
                                        · {weekly[myWeeklyRank - 1]?.avgAccuracy.toFixed(1)}% avg accuracy
                                    </div>
                                </div>
                                <Clock className="w-5 h-5 text-[#C7D2FE]" />
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
