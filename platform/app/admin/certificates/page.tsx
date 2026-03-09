"use client";
import { useEffect, useState } from "react";
import { Trophy, Loader2, RefreshCw, Trash2, Award, Eye, User } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase";

interface Profile { id: string; full_name: string | null; email: string | null; }

interface Cert {
  id: string;
  user_id: string;
  topic: string;
  difficulty: string;
  score_pct: number;
  correct_answers: number;
  total_questions: number;
  created_at: string;
  // joined:
  userName: string;
  userEmail: string;
}

const DIFF_COLOR: Record<string,string> = { easy:"#10B981", medium:"#6366F1", hard:"#EF4444" };

function makeCertId(id: string, t: string) {
  const d = new Date(t);
  return `QLST-${d.getFullYear()}${String(d.getMonth()+1).padStart(2,"0")}${String(d.getDate()).padStart(2,"0")}-${id.replace(/-/g,"").slice(0,6).toUpperCase()}`;
}

export default function AdminCertificates() {
  const [certs,   setCerts]   = useState<Cert[]>([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState("");

  const load = async () => {
    setLoading(true);
    const supabase = createClient();

    const [certsRes, profilesRes] = await Promise.all([
      supabase.from("questly_quiz_attempts").select("*").eq("certificate_earned",true).order("created_at",{ascending:false}),
      supabase.from("profiles").select("id, full_name, email"),
    ]);

    // Build a profile lookup map
    const profileMap: Record<string, Profile> = {};
    (profilesRes.data ?? []).forEach(p => { profileMap[p.id] = p; });

    const merged: Cert[] = (certsRes.data ?? []).map(c => {
      const p = profileMap[c.user_id];
      return {
        ...c,
        userName:  p?.full_name ?? "Unknown User",
        userEmail: p?.email     ?? c.user_id.slice(0,12) + "…",
      };
    });

    setCerts(merged);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const revoke = async (id: string) => {
    if (!confirm("Revoke this certificate?")) return;
    const supabase = createClient();
    await supabase.from("questly_quiz_attempts").update({ certificate_earned: false }).eq("id", id);
    setCerts(prev => prev.filter(c => c.id !== id));
  };

  const filtered = search
    ? certs.filter(c =>
        c.topic.toLowerCase().includes(search.toLowerCase()) ||
        c.userName.toLowerCase().includes(search.toLowerCase()) ||
        c.userEmail.toLowerCase().includes(search.toLowerCase())
      )
    : certs;

  // Stats
  const uniqueUsers   = new Set(certs.map(c => c.user_id)).size;
  const avgScore      = certs.length ? Math.round(certs.reduce((s,c)=>s+c.score_pct,0)/certs.length) : 0;
  const topicCounts   = certs.reduce<Record<string,number>>((acc,c)=>{ acc[c.topic]=(acc[c.topic]||0)+1; return acc; },{});
  const topTopics     = Object.entries(topicCounts).sort((a,b)=>b[1]-a[1]).slice(0,5);

  return (
    <div className="animate-fade-in-up">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-white mb-1">Certificate Management</h1>
          <p className="text-sm text-[#64748B]">{certs.length} certificates issued across {uniqueUsers} users</p>
        </div>
        <button onClick={load} className="flex items-center gap-2 text-sm text-[#94a3b8] bg-[#1E293B] border border-[#334155] px-4 py-2 rounded-xl hover:border-[#6366F1] transition-all">
          <RefreshCw className="w-4 h-4"/>Refresh
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label:"Total Issued",     value:certs.length, color:"#F59E0B" },
          { label:"Unique Earners",   value:uniqueUsers,  color:"#6366F1" },
          { label:"Avg Score",        value:`${avgScore}%`, color:"#10B981" },
          { label:"Topics Covered",   value:Object.keys(topicCounts).length, color:"#8B5CF6" },
        ].map(s=>(
          <div key={s.label} className="bg-[#0F172A] border border-[#1E293B] rounded-2xl p-4 text-center">
            <div className="text-2xl font-black mb-0.5" style={{color:s.color}}>{s.value}</div>
            <div className="text-xs text-[#64748B]">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-4 gap-6">
        {/* Top certified topics sidebar */}
        <div className="bg-[#0F172A] border border-[#1E293B] rounded-2xl p-5">
          <h3 className="text-xs font-black text-[#64748B] uppercase tracking-widest mb-4 flex items-center gap-2">
            <Award className="w-3.5 h-3.5"/>Top Topics
          </h3>
          <div className="space-y-3">
            {topTopics.map(([t,c],i)=>(
              <div key={t} className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-[#1E293B] flex items-center justify-center text-[9px] font-black text-[#64748B]">{i+1}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-white truncate">{t}</div>
                  <div className="text-[10px] text-[#475569]">{c} cert{c!==1?"s":""}</div>
                </div>
              </div>
            ))}
            {topTopics.length === 0 && <p className="text-xs text-[#475569] italic">No data yet</p>}
          </div>
        </div>

        {/* Main table */}
        <div className="lg:col-span-3 bg-[#0F172A] border border-[#1E293B] rounded-2xl overflow-hidden">
          {/* Search */}
          <div className="px-5 py-3 border-b border-[#1E293B]">
            <input value={search} onChange={e=>setSearch(e.target.value)}
              placeholder="Search by user name, email, or topic…"
              className="w-full bg-[#1E293B] border border-[#334155] rounded-xl px-3 py-2 text-sm text-white placeholder:text-[#475569] outline-none focus:border-[#6366F1] transition-colors"/>
          </div>

          {/* Header */}
          <div className="grid grid-cols-[1fr_1.5fr_1fr_1fr_1fr_auto] gap-3 px-5 py-3 border-b border-[#1E293B] text-[9px] font-black text-[#475569] uppercase tracking-widest">
            <div>User</div><div>Topic</div><div>Level</div><div>Score</div><div>Issued</div><div>Actions</div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12 text-[#475569]">
              <Loader2 className="w-4 h-4 animate-spin mr-2"/>Loading…
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center text-[#475569] text-sm">No certificates found</div>
          ) : (
            <div className="divide-y divide-[#1E293B] max-h-[600px] overflow-y-auto">
              {filtered.map(c => {
                const col = DIFF_COLOR[c.difficulty?.toLowerCase()] ?? "#6366F1";
                return (
                  <div key={c.id} className="grid grid-cols-[1fr_1.5fr_1fr_1fr_1fr_auto] gap-3 px-5 py-3.5 items-center hover:bg-[#1E293B]/40 transition-colors">
                    {/* User */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <User className="w-3 h-3 text-[#64748B] flex-shrink-0"/>
                        <span className="text-xs font-semibold text-white truncate">{c.userName}</span>
                      </div>
                      <div className="text-[10px] text-[#475569] truncate">{c.userEmail}</div>
                    </div>
                    {/* Topic */}
                    <div className="min-w-0">
                      <div className="text-[9px] font-mono text-[#6366F1] mb-0.5">{makeCertId(c.id,c.created_at)}</div>
                      <div className="text-xs font-semibold text-white truncate">{c.topic}</div>
                    </div>
                    {/* Level */}
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full capitalize inline-block w-fit"
                      style={{backgroundColor:col+"20",color:col}}>{c.difficulty}</span>
                    {/* Score */}
                    <div className="text-sm font-black text-[#10B981]">{c.score_pct}%
                      <div className="text-[10px] font-normal text-[#475569]">{c.correct_answers}/{c.total_questions} correct</div>
                    </div>
                    {/* Date */}
                    <div className="text-xs text-[#475569]">
                      {new Date(c.created_at).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}
                    </div>
                    {/* Actions */}
                    <div className="flex items-center gap-1">
                      <Link href={`/admin/users/${c.user_id}`} title="View user's full quiz history"
                        className="p-1.5 rounded-lg text-[#475569] hover:text-[#6366F1] hover:bg-[#6366F1]/10 transition-colors">
                        <Eye className="w-3.5 h-3.5"/>
                      </Link>
                      <button onClick={()=>revoke(c.id)} title="Revoke certificate"
                        className="p-1.5 rounded-lg text-[#475569] hover:text-[#EF4444] hover:bg-[#EF4444]/10 transition-colors">
                        <Trash2 className="w-3.5 h-3.5"/>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
