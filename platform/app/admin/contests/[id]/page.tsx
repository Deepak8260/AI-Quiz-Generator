"use client";
import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
    ArrowLeft, Loader2, Trophy, Users, Clock, Calendar,
    Radio, Square, Play, Edit2, Megaphone, RefreshCw,
    Target, CheckCircle, AlertTriangle
} from "lucide-react";
import { createClient } from "@/lib/supabase";
import StatusBadge from "../_components/StatusBadge";
import ContestFormModal from "../_components/ContestFormModal";
import type { Contest, ContestResult, ContestParticipant } from "../types";

function formatDate(iso: string) {
    return new Date(iso).toLocaleString("en-US", {
        month: "long", day: "numeric", year: "numeric",
        hour: "2-digit", minute: "2-digit",
    });
}

function formatSeconds(secs: number) {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}m ${s.toString().padStart(2, "0")}s`;
}

type ConfirmOpts = {
    title: string;
    message: string;
    confirmLabel: string;
    intent: "danger" | "warning" | "success";
    onConfirm: () => Promise<void>;
} | null;

function ConfirmModal({ opts, onCancel }: { opts: NonNullable<ConfirmOpts>; onCancel: () => void }) {
    const [busy, setBusy] = useState(false);
    const colors = { danger: "#EF4444", warning: "#F59E0B", success: "#10B981" };
    const color = colors[opts.intent];
    const run = async () => { setBusy(true); await opts.onConfirm(); setBusy(false); onCancel(); };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
            onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}>
            <div className="bg-[#0F172A] border border-[#1E293B] rounded-2xl p-6 max-w-sm w-full shadow-2xl">
                <h3 className="text-lg font-black text-white mb-2">{opts.title}</h3>
                <p className="text-sm text-[#94a3b8] mb-6">{opts.message}</p>
                <div className="flex gap-3">
                    <button onClick={onCancel}
                        className="flex-1 py-2.5 text-sm font-semibold text-[#64748B] border border-[#1E293B] rounded-xl hover:bg-[#1E293B] transition-all">
                        Cancel
                    </button>
                    <button onClick={run} disabled={busy}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-bold text-white rounded-xl transition-all disabled:opacity-50"
                        style={{ backgroundColor: color }}>
                        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : opts.confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}

const MEDAL: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };

export default function ContestDetailPage() {
    const { id } = useParams<{ id: string }>();
    const router = useRouter();

    const [contest, setContest] = useState<Contest | null>(null);
    const [participants, setParticipants] = useState<ContestParticipant[]>([]);
    const [results, setResults] = useState<ContestResult[]>([]);
    const [loading, setLoading] = useState(true);
    const [showEdit, setShowEdit] = useState(false);
    const [confirmOpts, setConfirmOpts] = useState<ConfirmOpts>(null);
    const [tab, setTab] = useState<"participants" | "results">("participants");

    const load = useCallback(async () => {
        setLoading(true);
        const supabase = createClient();

        const [{ data: c }, { data: parts }, { data: ress }] = await Promise.all([
            supabase.from("contests").select("*").eq("id", id).single(),
            supabase
                .from("contest_participants")
                .select("*, profiles(full_name, email)")
                .eq("contest_id", id)
                .order("enrolled_at", { ascending: false }),
            supabase
                .from("contest_results")
                .select("*, profiles(full_name, email)")
                .eq("contest_id", id)
                .order("rank", { ascending: true }),
        ]);

        if (!c) { router.replace("/admin/contests"); return; }
        setContest(c as Contest);
        setParticipants((parts as ContestParticipant[]) ?? []);
        setResults((ress as ContestResult[]) ?? []);
        setLoading(false);
    }, [id, router]);

    useEffect(() => { load(); }, [load]);

    // ── Action helpers ──────────────────────────────────────────────
    const supabaseUpdate = (update: Partial<Contest>) => async () => {
        const supabase = createClient();
        await supabase.from("contests").update(update).eq("id", id);
        await load();
    };

    const handlePublish = () => setConfirmOpts({ title: "Publish Contest", message: "This makes the contest visible and enrollable by users.", confirmLabel: "Publish", intent: "success", onConfirm: supabaseUpdate({ status: "published" }) });
    const handleForceStart = () => setConfirmOpts({ title: "Force Start", message: "The contest will go live immediately regardless of its schedule.", confirmLabel: "Go Live", intent: "warning", onConfirm: supabaseUpdate({ status: "live" }) });
    const handleEnd = () => setConfirmOpts({ title: "End Contest", message: "This finalises the leaderboard. Participants can no longer submit.", confirmLabel: "End Contest", intent: "warning", onConfirm: supabaseUpdate({ status: "ended" }) });
    const handleAnnounce = () => setConfirmOpts({
        title: "Announce Winners",
        message: "This will display a winner banner to all users viewing the leaderboard. Only do this after the results are final.",
        confirmLabel: "Announce!",
        intent: "success",
        onConfirm: supabaseUpdate({ announced_at: new Date().toISOString() }),
    });

    if (loading) {
        return (
            <div className="flex items-center justify-center py-32 text-[#64748B]">
                <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading contest…
            </div>
        );
    }

    if (!contest) return null;

    const canEdit = contest.status === "draft" || contest.status === "published";
    const isAnnounced = Boolean(contest.announced_at);
    const endTime = new Date(new Date(contest.start_time).getTime() + contest.duration_minutes * 60_000);

    return (
        <div className="animate-fade-in-up max-w-5xl mx-auto">

            {/* Modals */}
            {showEdit && (
                <ContestFormModal
                    contest={contest}
                    onClose={() => setShowEdit(false)}
                    onSaved={() => { setShowEdit(false); load(); }}
                />
            )}
            {confirmOpts && (
                <ConfirmModal opts={confirmOpts} onCancel={() => setConfirmOpts(null)} />
            )}

            {/* ── Back + breadcrumb ── */}
            <div className="flex items-center gap-2 mb-6">
                <Link href="/admin/contests"
                    className="flex items-center gap-1.5 text-[#64748B] hover:text-white text-sm font-medium transition-colors">
                    <ArrowLeft className="w-4 h-4" /> Contests
                </Link>
                <span className="text-[#334155]">/</span>
                <span className="text-sm text-white font-semibold truncate max-w-xs">{contest.title}</span>
            </div>

            {/* ── Header card ───────────────────────────────────────────── */}
            <div className="bg-[#0F172A] border border-[#1E293B] rounded-2xl p-6 mb-6">
                <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2 flex-wrap">
                            <StatusBadge status={contest.status} />
                            {isAnnounced && (
                                <span className="flex items-center gap-1.5 text-xs font-bold bg-[#422006] text-[#fbbf24] px-3 py-1 rounded-full">
                                    <Megaphone className="w-3 h-3" /> Winners Announced
                                </span>
                            )}
                        </div>
                        <h1 className="text-2xl font-black text-white mb-1">{contest.title}</h1>
                        {contest.description && (
                            <p className="text-sm text-[#94a3b8]">{contest.description}</p>
                        )}
                    </div>

                    {/* Action buttons */}
                    <div className="flex flex-col gap-2 flex-shrink-0">
                        {canEdit && (
                            <button onClick={() => setShowEdit(true)}
                                className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-[#94a3b8] border border-[#1E293B] rounded-xl hover:bg-[#1E293B] hover:text-white transition-all">
                                <Edit2 className="w-3.5 h-3.5" /> Edit
                            </button>
                        )}
                        {contest.status === "draft" && (
                            <button onClick={handlePublish}
                                className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-white bg-[#2563EB] hover:bg-[#1d4ed8] rounded-xl transition-all">
                                <Play className="w-3.5 h-3.5" /> Publish
                            </button>
                        )}
                        {contest.status === "published" && (
                            <button onClick={handleForceStart}
                                className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-white bg-[#16a34a] hover:bg-[#15803d] rounded-xl transition-all">
                                <Radio className="w-3.5 h-3.5" /> Force Start
                            </button>
                        )}
                        {contest.status === "live" && (
                            <button onClick={handleEnd}
                                className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-white bg-[#D97706] hover:bg-[#B45309] rounded-xl transition-all">
                                <Square className="w-3.5 h-3.5" /> End Contest
                            </button>
                        )}
                        {contest.status === "ended" && !isAnnounced && (
                            <button onClick={handleAnnounce}
                                className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-white bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] hover:from-[#4F46E5] hover:to-[#7C3AED] rounded-xl transition-all shadow-lg shadow-[#6366F1]/20">
                                <Megaphone className="w-3.5 h-3.5" /> Announce Winners
                            </button>
                        )}
                        <button onClick={load}
                            className="flex items-center gap-2 px-4 py-2 text-sm text-[#64748B] border border-[#1E293B] rounded-xl hover:bg-[#1E293B] transition-all">
                            <RefreshCw className="w-3.5 h-3.5" /> Refresh
                        </button>
                    </div>
                </div>

                {/* Meta grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                        { icon: <Target className="w-4 h-4" />, label: "Topic", value: contest.topic, color: "#6366F1" },
                        { icon: <Calendar className="w-4 h-4" />, label: "Start Time", value: formatDate(contest.start_time), color: "#60a5fa" },
                        { icon: <Clock className="w-4 h-4" />, label: "Duration", value: `${contest.duration_minutes} min`, color: "#fbbf24" },
                        {
                            icon: <Users className="w-4 h-4" />, label: "Participants",
                            value: contest.max_participants
                                ? `${participants.length} / ${contest.max_participants}`
                                : `${participants.length} enrolled`,
                            color: "#4ade80"
                        },
                    ].map(m => (
                        <div key={m.label} className="bg-[#0B1120] rounded-xl p-4 border border-[#1E293B]">
                            <div className="flex items-center gap-1.5 text-xs font-black text-[#475569] uppercase tracking-widest mb-2">
                                <span style={{ color: m.color }}>{m.icon}</span>
                                {m.label}
                            </div>
                            <div className="text-sm font-bold text-white">{m.value}</div>
                        </div>
                    ))}
                </div>

                {/* Leaderboard link */}
                {(contest.status === "live" || contest.status === "ended") && (
                    <div className="mt-4 flex items-center justify-between bg-[#0B1120] border border-[#1E293B] rounded-xl px-4 py-3">
                        <div className="flex items-center gap-2 text-sm text-[#94a3b8]">
                            <Trophy className="w-4 h-4 text-[#fbbf24]" />
                            Live Leaderboard is active
                        </div>
                        <Link href={`/dashboard/contests/${id}/leaderboard`} target="_blank"
                            className="text-xs font-bold text-[#6366F1] hover:text-[#4F46E5] transition-colors">
                            View Leaderboard →
                        </Link>
                    </div>
                )}
            </div>

            {/* ── Tabs ───────────────────────────────────────────────────── */}
            <div className="flex gap-1 bg-[#0F172A] border border-[#1E293B] rounded-xl p-1 mb-5 w-fit">
                {(["participants", "results"] as const).map(t => (
                    <button key={t} onClick={() => setTab(t)}
                        className={`px-5 py-2 rounded-lg text-sm font-bold capitalize transition-all ${tab === t ? "bg-[#6366F1] text-white" : "text-[#64748B] hover:text-white"
                            }`}>
                        {t === "participants" ? `Participants (${participants.length})` : `Results (${results.length})`}
                    </button>
                ))}
            </div>

            {/* ── Participants tab ─────────────────────────────────────────── */}
            {tab === "participants" && (
                <div className="bg-[#0F172A] border border-[#1E293B] rounded-2xl overflow-hidden">
                    {participants.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-center">
                            <Users className="w-12 h-12 text-[#1E293B] mb-3" />
                            <p className="text-[#64748B]">No participants yet</p>
                        </div>
                    ) : (
                        <>
                            <div className="grid grid-cols-[auto_1fr_1fr_auto] gap-4 px-6 py-3 border-b border-[#1E293B] text-[10px] font-black text-[#475569] uppercase tracking-widest">
                                <div>#</div><div>Name</div><div>Email</div><div>Enrolled</div>
                            </div>
                            <div className="divide-y divide-[#1E293B]">
                                {participants.map((p, i) => {
                                    const name = p.profiles?.full_name ?? "Unknown";
                                    const email = p.profiles?.email ?? "—";
                                    const colors = ["#6366F1", "#8B5CF6", "#10B981", "#F59E0B", "#EF4444", "#06B6D4"];
                                    const col = colors[i % colors.length];
                                    return (
                                        <div key={p.id} className="grid grid-cols-[auto_1fr_1fr_auto] gap-4 px-6 py-3.5 items-center hover:bg-[#1E293B]/40 transition-colors">
                                            <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: col }}>
                                                {name[0]?.toUpperCase()}
                                            </div>
                                            <div className="text-sm font-semibold text-white">{name}</div>
                                            <div className="text-sm text-[#64748B]">{email}</div>
                                            <div className="text-xs text-[#475569]">
                                                {new Date(p.enrolled_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* ── Results tab ─────────────────────────────────────────────── */}
            {tab === "results" && (
                <div className="bg-[#0F172A] border border-[#1E293B] rounded-2xl overflow-hidden">
                    {results.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-center">
                            <Trophy className="w-12 h-12 text-[#1E293B] mb-3" />
                            <p className="text-[#64748B]">
                                {contest.status === "live" ? "Waiting for participants to submit…" : "No results yet"}
                            </p>
                        </div>
                    ) : (
                        <>
                            <div className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-4 px-6 py-3 border-b border-[#1E293B] text-[10px] font-black text-[#475569] uppercase tracking-widest">
                                <div>Rank</div><div>Participant</div><div>Score</div><div>Accuracy</div><div>Time</div>
                            </div>
                            <div className="divide-y divide-[#1E293B]">
                                {results.map((r) => {
                                    const name = r.profiles?.full_name ?? "Unknown";
                                    const medal = r.rank ? MEDAL[r.rank] : null;
                                    const isTop3 = r.rank && r.rank <= 3;
                                    return (
                                        <div key={r.id}
                                            className={`grid grid-cols-[auto_1fr_auto_auto_auto] gap-4 px-6 py-4 items-center transition-colors ${isTop3 ? "bg-[#422006]/20 border-l-4 border-l-[#F59E0B]" : "hover:bg-[#1E293B]/40"
                                                }`}>
                                            <div className="w-10 text-lg font-black text-center">
                                                {medal ?? <span className="text-sm text-[#64748B]">#{r.rank}</span>}
                                            </div>
                                            <div className="min-w-0">
                                                <div className="text-sm font-bold text-white">{name}</div>
                                                <div className="text-xs text-[#64748B]">{r.profiles?.email}</div>
                                            </div>
                                            <div className="text-sm font-black text-white text-right">
                                                {r.score}<span className="text-[#64748B] text-xs">/{r.total_questions}</span>
                                            </div>
                                            <div className="flex items-center gap-1 text-sm font-semibold text-right">
                                                {r.accuracy >= 70
                                                    ? <CheckCircle className="w-3.5 h-3.5 text-[#4ade80]" />
                                                    : <AlertTriangle className="w-3.5 h-3.5 text-[#fbbf24]" />}
                                                <span className={r.accuracy >= 70 ? "text-[#4ade80]" : "text-[#fbbf24]"}>
                                                    {Number(r.accuracy).toFixed(1)}%
                                                </span>
                                            </div>
                                            <div className="text-sm text-[#64748B] text-right">
                                                {formatSeconds(r.time_taken_seconds)}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}
