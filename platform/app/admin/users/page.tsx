"use client";
import { useEffect, useState, useMemo } from "react";
import {
  Search, Filter, Trash2, Shield, UserX, RefreshCw,
  ChevronDown, Loader2, CheckCircle, XCircle, ChevronLeft, ChevronRight as ChevronRight2
} from "lucide-react";
import { createClient } from "@/lib/supabase";

interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
  role: string;
  created_at: string;
  quizCount: number;
  certCount: number;
  avgScore: number;
  lastActive: string | null;
}

const PAGE_SIZE = 15;

function relTime(iso: string | null) {
  if (!iso) return "—";
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function AdminUsers() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [page,     setPage]     = useState(1);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const load = async () => {
    setLoading(true);
    const supabase = createClient();

    const [profilesRes, attemptsRes] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("questly_quiz_attempts").select("user_id, score_pct, certificate_earned, created_at"),
    ]);

    const attempts = attemptsRes.data ?? [];
    const attemptsByUser: Record<string, { count: number; certs: number; totalScore: number; last: string }> = {};
    attempts.forEach(a => {
      if (!attemptsByUser[a.user_id]) {
        attemptsByUser[a.user_id] = { count: 0, certs: 0, totalScore: 0, last: a.created_at };
      }
      attemptsByUser[a.user_id].count++;
      if (a.certificate_earned) attemptsByUser[a.user_id].certs++;
      attemptsByUser[a.user_id].totalScore += a.score_pct;
      if (a.created_at > attemptsByUser[a.user_id].last) attemptsByUser[a.user_id].last = a.created_at;
    });

    const merged: Profile[] = (profilesRes.data ?? []).map(p => {
      const ua = attemptsByUser[p.id];
      return {
        id: p.id,
        full_name: p.full_name,
        email: p.email,
        role: p.role ?? "user",
        created_at: p.created_at,
        quizCount:  ua?.count ?? 0,
        certCount:  ua?.certs ?? 0,
        avgScore:   ua ? Math.round(ua.totalScore / ua.count) : 0,
        lastActive: ua?.last ?? null,
      };
    });

    setProfiles(merged);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const showMsg = (text: string, ok: boolean) => {
    setMsg({ text, ok });
    setTimeout(() => setMsg(null), 3000);
  };

  // Promote / demote role
  const toggleRole = async (profile: Profile) => {
    const newRole = profile.role === "super_admin" ? "user" : "super_admin";
    const supabase = createClient();
    const { error } = await supabase.from("profiles").update({ role: newRole }).eq("id", profile.id);
    if (error) { showMsg(error.message, false); return; }
    setProfiles(prev => prev.map(p => p.id === profile.id ? { ...p, role: newRole } : p));
    showMsg(`${profile.full_name ?? "User"} is now ${newRole}`, true);
  };

  // Delete user data
  const deleteUserData = async (profile: Profile) => {
    if (!confirm(`Delete all data for ${profile.full_name ?? profile.email}? This cannot be undone.`)) return;
    const supabase = createClient();
    await supabase.from("questly_quiz_attempts").delete().eq("user_id", profile.id);
    await supabase.from("profiles").delete().eq("id", profile.id);
    setProfiles(prev => prev.filter(p => p.id !== profile.id));
    showMsg("User data deleted.", true);
  };

  const filtered = useMemo(() => {
    let list = profiles;
    if (search.trim()) list = list.filter(p =>
      (p.full_name?.toLowerCase().includes(search.toLowerCase())) ||
      (p.email?.toLowerCase().includes(search.toLowerCase()))
    );
    if (roleFilter !== "all") list = list.filter(p => p.role === roleFilter);
    return list;
  }, [profiles, search, roleFilter]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="animate-fade-in-up">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-white mb-1">User Management</h1>
          <p className="text-sm text-[#64748B]">{profiles.length} registered users</p>
        </div>
        <button onClick={load} className="flex items-center gap-2 text-sm text-[#94a3b8] bg-[#1E293B] border border-[#334155] px-4 py-2 rounded-xl hover:border-[#6366F1] transition-all">
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* Toast */}
      {msg && (
        <div className={`flex items-center gap-2 text-sm px-4 py-2.5 rounded-xl border mb-4 ${msg.ok ? "bg-[#0d2b20] border-[#10B981] text-[#10B981]" : "bg-[#1c0809] border-[#EF4444] text-[#EF4444]"}`}>
          {msg.ok ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />} {msg.text}
        </div>
      )}

      {/* Filter bar */}
      <div className="bg-[#0F172A] rounded-2xl border border-[#1E293B] px-5 py-4 mb-5 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-[200px] bg-[#1E293B] border border-[#334155] rounded-xl px-3 py-2">
          <Search className="w-3.5 h-3.5 text-[#475569]" />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search name or email…"
            className="bg-transparent text-sm text-white placeholder:text-[#475569] outline-none w-full" />
        </div>
        <div className="relative flex items-center gap-1.5 bg-[#1E293B] border border-[#334155] rounded-xl px-3 py-2 text-xs text-[#94a3b8]">
          <Filter className="w-3 h-3 text-[#475569]" />
          <span className="text-[#475569] font-semibold">Role:</span>
          <select value={roleFilter} onChange={e => { setRoleFilter(e.target.value); setPage(1); }}
            className="bg-transparent outline-none font-semibold text-white pr-4 appearance-none cursor-pointer">
            <option value="all">All</option>
            <option value="user">User</option>
            <option value="super_admin">Admin</option>
          </select>
          <ChevronDown className="w-3 h-3 text-[#475569] absolute right-2 pointer-events-none" />
        </div>
      </div>

      {/* Table */}
      <div className="bg-[#0F172A] rounded-2xl border border-[#1E293B] overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr_auto] gap-4 px-5 py-3 border-b border-[#1E293B] text-[9px] font-black text-[#475569] uppercase tracking-widest">
          <div>User</div><div>Role</div><div>Quizzes</div><div>Certs</div><div>Avg Score</div><div>Last Active</div><div>Actions</div>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-16 text-[#475569]">
            <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading users…
          </div>
        ) : paged.length === 0 ? (
          <div className="py-12 text-center text-[#475569] text-sm">No users found</div>
        ) : (
          <div className="divide-y divide-[#1E293B]">
            {paged.map(p => (
              <div key={p.id} className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr_auto] gap-4 px-5 py-3.5 items-center hover:bg-[#1E293B]/40 transition-colors">
                {/* User */}
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-white truncate">{p.full_name ?? "—"}</div>
                  <div className="text-xs text-[#475569] truncate">{p.email ?? p.id.slice(0,12) + "…"}</div>
                </div>
                {/* Role */}
                <div>
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${p.role === "super_admin" ? "bg-[#EF4444]/15 text-[#EF4444]" : "bg-[#1E293B] text-[#64748B]"}`}>
                    {p.role === "super_admin" ? "Admin" : "User"}
                  </span>
                </div>
                {/* Stats */}
                <div className="text-sm font-bold text-[#94a3b8]">{p.quizCount}</div>
                <div className="text-sm font-bold text-[#F59E0B]">{p.certCount}</div>
                <div className={`text-sm font-bold ${p.avgScore >= 70 ? "text-[#10B981]" : p.avgScore > 0 ? "text-[#F59E0B]" : "text-[#475569]"}`}>
                  {p.avgScore > 0 ? `${p.avgScore}%` : "—"}
                </div>
                <div className="text-xs text-[#475569]">{relTime(p.lastActive)}</div>
                {/* Actions */}
                <div className="flex items-center gap-1">
                  <button title={p.role === "super_admin" ? "Demote" : "Promote to Admin"}
                    onClick={() => toggleRole(p)}
                    className={`p-1.5 rounded-lg transition-colors ${p.role === "super_admin" ? "text-[#EF4444] hover:bg-[#EF4444]/10" : "text-[#6366F1] hover:bg-[#6366F1]/10"}`}>
                    <Shield className="w-3.5 h-3.5" />
                  </button>
                  <button title="Delete user data"
                    onClick={() => deleteUserData(p)}
                    className="p-1.5 rounded-lg text-[#475569] hover:text-[#EF4444] hover:bg-[#EF4444]/10 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {pages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-[#1E293B] text-xs text-[#475569]">
            <span>Page {page} of {pages} · {filtered.length} users</span>
            <div className="flex gap-2">
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
                className="p-1.5 rounded-lg disabled:opacity-30 hover:bg-[#1E293B] text-[#94a3b8] transition-colors">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button disabled={page === pages} onClick={() => setPage(p => p + 1)}
                className="p-1.5 rounded-lg disabled:opacity-30 hover:bg-[#1E293B] text-[#94a3b8] transition-colors">
                <ChevronRight2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
