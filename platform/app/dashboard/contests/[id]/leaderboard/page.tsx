"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
    ArrowLeft, Loader2, Trophy, Clock, Target,
    CheckCircle, Zap, Swords
} from "lucide-react";
import { createClient } from "@/lib/supabase";
import type { Contest, ContestResult } from "@/app/admin/contests/types";

function pad(n: number) { return String(n).padStart(2, "0"); }

function formatTime(secs: number) {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}m ${pad(s)}s`;
}

const MEDAL = ["🥇", "🥈", "🥉"];
const MEDAL_COLORS = [
    { bg: "#FEF3C7", border: "#FCD34D", text: "#92400E" },  // gold
    { bg: "#F1F5F9", border: "#CBD5E1", text: "#334155" },  // silver
    { bg: "#FEF2E4", border: "#F4B86A", text: "#92400E" },  // bronze
];

// Re-rank results: score DESC → time ASC → name ASC
function rankResults(raw: ContestResult[]): ContestResult[] {
    const sorted = [...raw].sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        if (a.time_taken_seconds !== b.time_taken_seconds) return a.time_taken_seconds - b.time_taken_seconds;
        const nameA = (a.profiles?.full_name ?? "").toLowerCase();
        const nameB = (b.profiles?.full_name ?? "").toLowerCase();
        return nameA.localeCompare(nameB);
    });
    return sorted.map((r, i) => ({ ...r, rank: i + 1 }));
}

// ── Winner Announcement Banner ───────────────────────────────────
function WinnerBanner({ results }: { results: ContestResult[] }) {
    const top3 = results.slice(0, 3);
    return (
        <div className="bg-gradient-to-r from-[#FEF3C7] via-[#FDE68A] to-[#FEF3C7] border-2 border-[#FCD34D] rounded-2xl p-6 mb-6 text-center relative overflow-hidden animate-fade-in">
            <div className="absolute inset-0 opacity-10 pointer-events-none"
                style={{ backgroundImage: "radial-gradient(circle at 20% 50%, #FCD34D 0%, transparent 50%), radial-gradient(circle at 80% 50%, #F59E0B 0%, transparent 50%)" }} />
            <div className="text-4xl mb-2">🎉</div>
            <h2 className="text-xl font-black text-[#92400E] mb-1">Contest Winners Announced!</h2>
            <p className="text-sm text-[#B45309] mb-4">Congratulations to our top performers!</p>
            <div className="flex items-end justify-center gap-4">
                {top3.map((r, i) => (
                    <div key={r.id} className="text-center">
                        <div className="text-2xl mb-1">{MEDAL[i]}</div>
                        <div className="text-sm font-black text-[#92400E]">
                            {r.profiles?.full_name ?? "Unknown"}
                        </div>
                        <div className="text-xs text-[#B45309]">{r.score}/{r.total_questions} correct</div>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ── Podium for top 3 ─────────────────────────────────────────────
function Podium({ results }: { results: ContestResult[] }) {
    const [first, second, third] = results;
    const order = [second, first, third].filter(Boolean);  // visual order: 2nd, 1st, 3rd

    return (
        <div className="flex items-end justify-center gap-4 px-4 py-2 mb-6">
            {order.map((r) => {
                const rankIdx = (r.rank ?? 1) - 1;
                const mc = MEDAL_COLORS[rankIdx] ?? MEDAL_COLORS[2];
                const heights = [16, 24, 12]; // 2nd, 1st, 3rd column heights in units
                const height = [second, first, third].indexOf(r);
                return (
                    <div key={r.id} className="text-center flex-1 max-w-[140px]">
                        <div
                            className="w-14 h-14 rounded-2xl border-4 border-white shadow-lg flex items-center justify-center text-white text-xl font-black mb-1 mx-auto"
                            style={{ backgroundColor: ["#8B5CF6", "#6366F1", "#10B981"][rankIdx] ?? "#6366F1" }}
                        >
                            {(r.profiles?.full_name ?? "?")[0]?.toUpperCase()}
                        </div>
                        <div className="text-xs font-bold text-[#374151] truncate max-w-[120px] mx-auto">
                            {r.profiles?.full_name ?? "Unknown"}
                        </div>
                        <div className="text-[10px] text-[#9CA3AF] mb-1">{r.score}/{r.total_questions}</div>
                        <div
                            className="rounded-t-xl w-full mx-auto flex items-end justify-center pb-1 shadow-sm"
                            style={{
                                height: `${[heights[height] ?? 12] * 4}px`,
                                backgroundColor: mc.bg,
                                border: `1px solid ${mc.border}`,
                            }}
                        >
                            <span className="text-xl">{MEDAL[rankIdx]}</span>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

export default function ContestLeaderboardPage() {
    const { id } = useParams<{ id: string }>();

    const [contest, setContest] = useState<Contest | null>(null);
    const [results, setResults] = useState<ContestResult[]>([]);
    const [userId, setUserId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const prevResultsRef = useRef<ContestResult[]>([]);

    const loadResults = useCallback(async () => {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) setUserId(user.id);

        const [{ data: c }, { data: rawResults }] = await Promise.all([
            supabase.from("contests").select("*").eq("id", id).single(),
            supabase
                .from("contest_results")
                .select("*, profiles(full_name, email)")
                .eq("contest_id", id),
        ]);

        if (c) setContest(c as Contest);
        const ranked = rankResults((rawResults as ContestResult[]) ?? []);
        setResults(ranked);
        prevResultsRef.current = ranked;
        setLoading(false);
    }, [id]);

    useEffect(() => { loadResults(); }, [loadResults]);

    // ── Realtime: re-rank on each new result ─────────────────────
    useEffect(() => {
        const supabase = createClient();

        const channel = supabase
            .channel(`leaderboard-${id}`)
            .on("postgres_changes", {
                event: "*", schema: "public", table: "contest_results",
                filter: `contest_id=eq.${id}`,
            }, () => { loadResults(); })
            // Also watch for winner announcement
            .on("postgres_changes", {
                event: "UPDATE", schema: "public", table: "contests",
                filter: `id=eq.${id}`,
            }, (payload) => {
                setContest(prev => prev ? { ...prev, ...(payload.new as Contest) } : prev);
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [id, loadResults]);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-32 text-[#6B7280]">
                <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading leaderboard…
            </div>
        );
    }

    const isLive = contest?.status === "live";
    const isAnnounced = Boolean(contest?.announced_at);
    const myResult = results.find(r => r.user_id === userId);

    return (
        <div className="max-w-3xl mx-auto animate-fade-in-up">

            {/* Top nav */}
            <div className="flex items-center justify-between mb-6">
                <Link href="/dashboard/contests"
                    className="inline-flex items-center gap-1.5 text-[#6B7280] hover:text-[#111827] text-sm font-medium transition-colors">
                    <ArrowLeft className="w-4 h-4" /> All Contests
                </Link>
                {isLive && (
                    <div className="flex items-center gap-1.5 text-xs font-black text-[#10B981] bg-[#D1FAE5] border border-[#6EE7B7] px-3 py-1.5 rounded-full">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-ping" />
                        Live — updates in real-time
                    </div>
                )}
            </div>

            {/* Contest title */}
            <div className="mb-5">
                <h1 className="text-2xl font-black text-[#111827] flex items-center gap-2.5">
                    <Trophy className="w-6 h-6 text-[#F59E0B]" />
                    {contest?.title ?? "Leaderboard"}
                </h1>
                <p className="text-sm text-[#6B7280] mt-1">
                    {contest?.topic} · {results.length} participant{results.length !== 1 ? "s" : ""} submitted
                </p>
            </div>

            {/* Winner announcement banner */}
            {isAnnounced && results.length > 0 && (
                <WinnerBanner results={results} />
            )}

            {/* Podium for top 3 */}
            {results.length >= 2 && (
                <div className="bg-gradient-to-br from-[#EEF2FF] to-[#F5F3FF] rounded-2xl border border-[#E0E7FF] p-5 mb-6">
                    <div className="text-center text-xs font-black text-[#9CA3AF] uppercase tracking-widest mb-4">
                        🏆 Top {Math.min(3, results.length)}
                    </div>
                    <Podium results={results.slice(0, 3)} />
                </div>
            )}

            {/* Your result highlight */}
            {myResult && (
                <div className="bg-[#EEF2FF] border-2 border-[#6366F1] rounded-2xl p-4 mb-5 flex items-center gap-4">
                    <div className="text-2xl font-black text-[#6366F1] w-12 text-center">
                        {myResult.rank && myResult.rank <= 3 ? MEDAL[myResult.rank - 1] : `#${myResult.rank}`}
                    </div>
                    <div className="flex-1">
                        <div className="text-sm font-black text-[#4338CA]">Your Result</div>
                        <div className="flex items-center gap-3 mt-1 text-sm text-[#6366F1]">
                            <span className="flex items-center gap-1"><Target className="w-3.5 h-3.5" /> {myResult.score}/{myResult.total_questions}</span>
                            <span className="flex items-center gap-1"><CheckCircle className="w-3.5 h-3.5" /> {Number(myResult.accuracy).toFixed(1)}%</span>
                            <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {formatTime(myResult.time_taken_seconds)}</span>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="text-2xl font-black text-[#6366F1]">{Number(myResult.accuracy).toFixed(0)}%</div>
                        <div className="text-xs text-[#818CF8]">accuracy</div>
                    </div>
                </div>
            )}

            {/* Full results table */}
            <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-[#F3F4F6] flex items-center justify-between">
                    <h2 className="text-sm font-black text-[#9CA3AF] uppercase tracking-widest">All Results</h2>
                    {isLive && (
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-[#6B7280]">
                            <Zap className="w-3 h-3 text-[#6366F1]" /> Auto-refreshing
                        </div>
                    )}
                </div>

                {/* Table header */}
                <div className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-4 px-6 py-3 bg-[#F9FAFB] border-b border-[#F3F4F6] text-[10px] font-black text-[#9CA3AF] uppercase tracking-widest">
                    <div className="w-10">Rank</div>
                    <div>Participant</div>
                    <div className="text-right">Score</div>
                    <div className="text-right hidden sm:block">Accuracy</div>
                    <div className="text-right">Time</div>
                </div>

                {results.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                        <Swords className="w-12 h-12 text-[#E5E7EB] mb-3" />
                        <p className="text-[#9CA3AF] text-sm">
                            {isLive ? "Waiting for participants to submit…" : "No results yet"}
                        </p>
                    </div>
                ) : (
                    <div className="divide-y divide-[#F9FAFB]">
                        {results.map((r) => {
                            const isMe = r.user_id === userId;
                            const rankN = r.rank ?? 0;
                            const isTop3 = rankN <= 3;

                            return (
                                <div
                                    key={r.id}
                                    className={`grid grid-cols-[auto_1fr_auto_auto_auto] gap-4 px-6 py-4 items-center transition-all ${isMe
                                            ? "bg-[#EEF2FF] border-l-4 border-l-[#6366F1]"
                                            : "hover:bg-[#FAFAFA]"
                                        }`}
                                    style={{
                                        // Smooth rank change animation via CSS order
                                        transition: "transform 0.4s ease, opacity 0.3s ease",
                                    }}
                                >
                                    {/* Rank */}
                                    <div className="w-10 flex items-center justify-center text-lg font-black">
                                        {isTop3 ? MEDAL[rankN - 1] : <span className="text-sm text-[#9CA3AF]">#{rankN}</span>}
                                    </div>

                                    {/* Participant */}
                                    <div className="min-w-0 flex items-center gap-3">
                                        <div
                                            className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-white text-xs font-bold"
                                            style={{ backgroundColor: isMe ? "#6366F1" : ["#8B5CF6", "#10B981", "#F59E0B", "#EF4444", "#06B6D4"][rankN % 5] }}
                                        >
                                            {(r.profiles?.full_name ?? "?")[0]?.toUpperCase()}
                                        </div>
                                        <div className="min-w-0">
                                            <div className={`text-sm font-bold truncate ${isMe ? "text-[#6366F1]" : "text-[#111827]"}`}>
                                                {r.profiles?.full_name ?? "Unknown"}
                                                {isMe && <span className="ml-1.5 text-[10px] font-black text-[#6366F1] bg-[#C7D2FE] px-1.5 py-0.5 rounded-full">you</span>}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Score */}
                                    <div className="text-right">
                                        <div className={`text-sm font-black ${isMe ? "text-[#6366F1]" : "text-[#111827]"}`}>
                                            {r.score}<span className="text-[#9CA3AF] text-xs font-normal">/{r.total_questions}</span>
                                        </div>
                                    </div>

                                    {/* Accuracy */}
                                    <div className="text-right hidden sm:block">
                                        <div className={`text-sm font-bold ${Number(r.accuracy) >= 70 ? "text-[#10B981]" : "text-[#F59E0B]"}`}>
                                            {Number(r.accuracy).toFixed(1)}%
                                        </div>
                                    </div>

                                    {/* Time */}
                                    <div className="text-right">
                                        <div className="text-sm text-[#6B7280]">{formatTime(r.time_taken_seconds)}</div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Bottom CTA */}
            <div className="mt-5 flex items-center justify-center gap-3">
                <Link href="/dashboard/contests"
                    className="flex items-center gap-2 bg-white border border-[#E5E7EB] text-[#6B7280] font-semibold px-5 py-2.5 rounded-xl hover:bg-[#F9FAFB] text-sm transition-all">
                    <ArrowLeft className="w-4 h-4" /> All Contests
                </Link>
                <Link href="/dashboard/generate"
                    className="flex items-center gap-2 bg-[#6366F1] hover:bg-[#4F46E5] text-white font-bold px-5 py-2.5 rounded-xl text-sm transition-all hover:shadow-lg hover:shadow-[#6366F1]/25">
                    <Zap className="w-4 h-4" /> Practice Quiz
                </Link>
            </div>
        </div>
    );
}
