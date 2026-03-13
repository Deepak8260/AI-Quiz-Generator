"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
    Plus, Loader2, RefreshCw, Trophy, Calendar, Users,
    Edit2, Trash2, Play, Radio, Square, Eye, ChevronLeft,
    ChevronRight, Search, Filter
} from "lucide-react";
import { createClient } from "@/lib/supabase";
import StatusBadge from "./_components/StatusBadge";
import ContestFormModal from "./_components/ContestFormModal";
import ParticipantsDrawer from "./_components/ParticipantsDrawer";
import type { Contest, ContestStatus } from "./types";

const PAGE_SIZE = 10;

function formatDate(iso: string) {
    return new Date(iso).toLocaleString("en-US", {
        month: "short", day: "numeric", year: "numeric",
        hour: "2-digit", minute: "2-digit",
    });
}

function DiffBadge({ diff }: { diff: string }) {
    const cfg =
        diff === "easy" ? { bg: "#052e16", text: "#4ade80" } :
            diff === "hard" ? { bg: "#2d0a0a", text: "#f87171" } :
                { bg: "#422006", text: "#fbbf24" };
    return (
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full capitalize"
            style={{ backgroundColor: cfg.bg, color: cfg.text }}>
            {diff}
        </span>
    );
}

type ConfirmAction = {
    label: string;
    message: string;
    intent: "danger" | "warning" | "success";
    onConfirm: () => Promise<void>;
} | null;

function ConfirmDialog({ action, onCancel }: { action: NonNullable<ConfirmAction>; onCancel: () => void }) {
    const [loading, setLoading] = useState(false);
    const color = action.intent === "danger" ? "#EF4444" : action.intent === "warning" ? "#F59E0B" : "#10B981";

    const run = async () => {
        setLoading(true);
        await action.onConfirm();
        setLoading(false);
        onCancel();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
            onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}>
            <div className="bg-[#0F172A] border border-[#1E293B] rounded-2xl p-6 max-w-sm w-full shadow-2xl">
                <div className="text-3xl mb-3 text-center">
                    {action.intent === "danger" ? "🗑️" : action.intent === "warning" ? "⚠️" : "✅"}
                </div>
                <h3 className="text-lg font-black text-white text-center mb-2">{action.label}</h3>
                <p className="text-sm text-[#94a3b8] text-center mb-6">{action.message}</p>
                <div className="flex gap-3">
                    <button onClick={onCancel}
                        className="flex-1 py-2.5 text-sm font-semibold text-[#64748B] border border-[#1E293B] rounded-xl hover:bg-[#1E293B] transition-all">
                        Cancel
                    </button>
                    <button onClick={run} disabled={loading}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-bold text-white rounded-xl transition-all disabled:opacity-50"
                        style={{ backgroundColor: color }}>
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : action.label}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function AdminContestsPage() {
    const [contests, setContests] = useState<Contest[]>([]);
    const [loading, setLoading] = useState(true);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(0);
    const [search, setSearch] = useState("");
    const [filterStatus, setFilterStatus] = useState<ContestStatus | "all">("all");

    const [showCreateModal, setShowCreateModal] = useState(false);
    const [editingContest, setEditingContest] = useState<Contest | null>(null);
    const [participantsFor, setParticipantsFor] = useState<Contest | null>(null);
    const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);

    const fetchContests = useCallback(async () => {
        setLoading(true);
        const supabase = createClient();

        let query = supabase
            .from("contests")
            .select("*", { count: "exact" })
            .order("created_at", { ascending: false })
            .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

        if (filterStatus !== "all") query = query.eq("status", filterStatus);
        if (search.trim()) query = query.ilike("title", `%${search.trim()}%`);

        const { data, count } = await query;

        // Fetch participant counts via SECURITY DEFINER RPC (bypasses RLS)
        const ids = (data ?? []).map(c => c.id);
        let countMap: Record<string, number> = {};
        if (ids.length > 0) {
            const countResults = await Promise.all(
                ids.map(async (cid) => {
                    const { data: cnt } = await supabase
                        .rpc("get_contest_participant_count", { contest_id_input: cid });
                    return { cid, count: (cnt as number) ?? 0 };
                })
            );
            countResults.forEach(({ cid, count }) => { countMap[cid] = count; });
        }

        setContests((data ?? []).map(c => ({ ...c, participant_count: countMap[c.id] ?? 0 })));
        setTotal(count ?? 0);
        setLoading(false);
    }, [page, search, filterStatus]);

    useEffect(() => { fetchContests(); }, [fetchContests]);

    const supabaseAction = async (
        id: string,
        update: Partial<Contest>,
        label: string,
        message: string,
        intent: "danger" | "warning" | "success"
    ) => {
        setConfirmAction({
            label, message, intent,
            onConfirm: async () => {
                const supabase = createClient();
                if ("_delete" in update) {
                    await supabase.from("contests").delete().eq("id", id);
                } else {
                    await supabase.from("contests").update(update).eq("id", id);
                }
                await fetchContests();
            },
        });
    };

    const handlePublish = (c: Contest) => supabaseAction(c.id, { status: "published" }, "Publish Contest", `"${c.title}" will be visible to all users and enrollable.`, "success");
    const handleForceStart = (c: Contest) => supabaseAction(c.id, { status: "live" }, "Force Start", `"${c.title}" will go live immediately regardless of its scheduled start time.`, "warning");
    const handleEnd = (c: Contest) => supabaseAction(c.id, { status: "ended" }, "End Contest", `This will permanently end "${c.title}". The leaderboard will become final.`, "warning");
    const handleDelete = (c: Contest) => supabaseAction(c.id, { _delete: true } as Partial<Contest>, "Delete Contest", `"${c.title}" will be permanently deleted. This cannot be undone.`, "danger");

    const totalPages = Math.ceil(total / PAGE_SIZE);

    return (
        <div className="animate-fade-in-up">

            {/* Modals / Drawers */}
            {(showCreateModal || editingContest) && (
                <ContestFormModal
                    contest={editingContest}
                    onClose={() => { setShowCreateModal(false); setEditingContest(null); }}
                    onSaved={() => { setShowCreateModal(false); setEditingContest(null); fetchContests(); }}
                />
            )}
            {participantsFor && (
                <ParticipantsDrawer
                    contestId={participantsFor.id}
                    contestTitle={participantsFor.title}
                    onClose={() => setParticipantsFor(null)}
                />
            )}
            {confirmAction && (
                <ConfirmDialog action={confirmAction} onCancel={() => setConfirmAction(null)} />
            )}

            {/* ── Header ─────────────────────────────────────────── */}
            <div className="flex items-center justify-between mb-7">
                <div>
                    <h1 className="text-2xl font-black text-white mb-1 flex items-center gap-2.5">
                        <Trophy className="w-6 h-6 text-[#6366F1]" /> Live Quiz Contests
                    </h1>
                    <p className="text-sm text-[#64748B]">
                        Create and manage live competitive quiz contests.
                    </p>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="flex items-center gap-2 bg-[#6366F1] hover:bg-[#4F46E5] text-white font-bold px-4 py-2.5 rounded-xl text-sm transition-all hover:shadow-lg hover:shadow-[#6366F1]/20 hover:-translate-y-0.5"
                >
                    <Plus className="w-4 h-4" /> New Contest
                </button>
            </div>

            {/* ── Filters ─────────────────────────────────────────── */}
            <div className="flex items-center gap-3 mb-5">
                <div className="relative flex-1 max-w-xs">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#475569]" />
                    <input
                        type="text"
                        value={search}
                        onChange={e => { setSearch(e.target.value); setPage(0); }}
                        placeholder="Search contests…"
                        className="w-full bg-[#0F172A] border border-[#1E293B] text-white placeholder-[#475569] rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:border-[#6366F1] focus:ring-2 focus:ring-[#6366F1]/20 transition-all"
                    />
                </div>
                <div className="flex items-center gap-1.5 bg-[#0F172A] border border-[#1E293B] rounded-xl px-3 py-1.5">
                    <Filter className="w-3.5 h-3.5 text-[#475569]" />
                    {(["all", "draft", "published", "live", "ended", "cancelled"] as const).map(s => (
                        <button
                            key={s}
                            onClick={() => { setFilterStatus(s); setPage(0); }}
                            className={`px-3 py-1 rounded-lg text-xs font-bold capitalize transition-all ${filterStatus === s
                                    ? "bg-[#6366F1] text-white"
                                    : "text-[#64748B] hover:text-white hover:bg-[#1E293B]"
                                }`}
                        >
                            {s}
                        </button>
                    ))}
                </div>
                <button onClick={fetchContests} disabled={loading}
                    className="flex items-center gap-1.5 text-sm text-[#64748B] bg-[#0F172A] border border-[#1E293B] px-3 py-2.5 rounded-xl hover:border-[#334155] hover:text-white transition-all disabled:opacity-50">
                    <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
                </button>
            </div>

            {/* ── Table ───────────────────────────────────────────── */}
            <div className="bg-[#0F172A] border border-[#1E293B] rounded-2xl overflow-hidden">

                {/* Table header */}
                <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_auto] gap-4 px-6 py-3 border-b border-[#1E293B] text-[10px] font-black text-[#475569] uppercase tracking-widest">
                    <div>Contest</div>
                    <div>Status</div>
                    <div>Start Time</div>
                    <div className="flex items-center gap-1"><Users className="w-3 h-3" /> Participants</div>
                    <div>Difficulty</div>
                    <div>Actions</div>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-20 text-[#64748B]">
                        <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading contests…
                    </div>
                ) : contests.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <Trophy className="w-12 h-12 text-[#1E293B] mb-3" />
                        <p className="text-[#64748B] font-semibold mb-1">No contests found</p>
                        <p className="text-[#475569] text-sm">Create your first contest to get started.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-[#0F172A]">
                        {contests.map((contest) => {
                            const canEdit = contest.status === "draft" || contest.status === "published";
                            const canDelete = contest.status === "draft";
                            return (
                                <div
                                    key={contest.id}
                                    className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_auto] gap-4 px-6 py-4 items-center hover:bg-[#1E293B]/40 transition-colors"
                                >
                                    {/* Title + topic */}
                                    <div className="min-w-0">
                                        <Link href={`/admin/contests/${contest.id}`} className="text-sm font-bold text-white hover:text-[#6366F1] transition-colors line-clamp-1">
                                            {contest.title}
                                        </Link>
                                        <div className="text-xs text-[#475569] mt-0.5">{contest.topic}</div>
                                    </div>

                                    {/* Status */}
                                    <div><StatusBadge status={contest.status} /></div>

                                    {/* Start time */}
                                    <div className="flex items-center gap-1.5 text-xs text-[#64748B]">
                                        <Calendar className="w-3 h-3 flex-shrink-0" />
                                        <span>{formatDate(contest.start_time)}</span>
                                    </div>

                                    {/* Participants */}
                                    <div className="flex items-center gap-1 text-sm font-semibold text-white">
                                        <Users className="w-3.5 h-3.5 text-[#64748B]" />
                                        {contest.participant_count ?? 0}
                                        {contest.max_participants && (
                                            <span className="text-[#475569] text-xs">/ {contest.max_participants}</span>
                                        )}
                                    </div>

                                    {/* Difficulty */}
                                    <div><DiffBadge diff={contest.difficulty} /></div>

                                    {/* Actions */}
                                    <div className="flex items-center gap-1">
                                        {/* View detail */}
                                        <Link href={`/admin/contests/${contest.id}`}
                                            className="p-2 text-[#64748B] hover:text-white hover:bg-[#1E293B] rounded-lg transition-all" title="View Detail">
                                            <Eye className="w-3.5 h-3.5" />
                                        </Link>

                                        {/* Participants */}
                                        <button onClick={() => setParticipantsFor(contest)}
                                            className="p-2 text-[#64748B] hover:text-white hover:bg-[#1E293B] rounded-lg transition-all" title="View Participants">
                                            <Users className="w-3.5 h-3.5" />
                                        </button>

                                        {/* Edit (draft/published only) */}
                                        {canEdit && (
                                            <button onClick={() => setEditingContest(contest)}
                                                className="p-2 text-[#64748B] hover:text-[#6366F1] hover:bg-[#1E293B] rounded-lg transition-all" title="Edit Contest">
                                                <Edit2 className="w-3.5 h-3.5" />
                                            </button>
                                        )}

                                        {/* Publish (draft only) */}
                                        {contest.status === "draft" && (
                                            <button onClick={() => handlePublish(contest)}
                                                className="p-2 text-[#64748B] hover:text-[#60a5fa] hover:bg-[#1E293B] rounded-lg transition-all" title="Publish Contest">
                                                <Play className="w-3.5 h-3.5" />
                                            </button>
                                        )}

                                        {/* Force start (published only) */}
                                        {contest.status === "published" && (
                                            <button onClick={() => handleForceStart(contest)}
                                                className="p-2 text-[#64748B] hover:text-[#4ade80] hover:bg-[#1E293B] rounded-lg transition-all" title="Force Start">
                                                <Radio className="w-3.5 h-3.5" />
                                            </button>
                                        )}

                                        {/* End (live only) */}
                                        {contest.status === "live" && (
                                            <button onClick={() => handleEnd(contest)}
                                                className="p-2 text-[#64748B] hover:text-[#fbbf24] hover:bg-[#1E293B] rounded-lg transition-all" title="End Contest">
                                                <Square className="w-3.5 h-3.5" />
                                            </button>
                                        )}

                                        {/* Delete (draft only) */}
                                        {canDelete && (
                                            <button onClick={() => handleDelete(contest)}
                                                className="p-2 text-[#64748B] hover:text-[#EF4444] hover:bg-[#1E293B] rounded-lg transition-all" title="Delete Contest">
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Pagination footer */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between px-6 py-4 border-t border-[#1E293B]">
                        <span className="text-xs text-[#475569]">
                            Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} of {total} contests
                        </span>
                        <div className="flex items-center gap-2">
                            <button onClick={() => setPage(p => p - 1)} disabled={page === 0}
                                className="p-2 text-[#64748B] hover:text-white hover:bg-[#1E293B] rounded-lg transition-all disabled:opacity-40 disabled:pointer-events-none">
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <span className="text-xs text-white font-semibold">{page + 1} / {totalPages}</span>
                            <button onClick={() => setPage(p => p + 1)} disabled={page >= totalPages - 1}
                                className="p-2 text-[#64748B] hover:text-white hover:bg-[#1E293B] rounded-lg transition-all disabled:opacity-40 disabled:pointer-events-none">
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Stats bar */}
            <div className="grid grid-cols-5 gap-4 mt-6">
                {(["draft", "published", "live", "ended", "cancelled"] as ContestStatus[]).map(s => {
                    const count = contests.filter(c => c.status === s).length;
                    return (
                        <button key={s} onClick={() => setFilterStatus(s === filterStatus ? "all" : s)}
                            className={`bg-[#0F172A] border rounded-xl p-4 text-center transition-all hover:border-[#334155] cursor-pointer ${filterStatus === s ? "border-[#6366F1]" : "border-[#1E293B]"
                                }`}>
                            <div className="text-2xl font-black text-white">{count}</div>
                            <StatusBadge status={s} />
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
