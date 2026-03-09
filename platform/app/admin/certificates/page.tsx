"use client";
import { useEffect, useState } from "react";
import { Trophy, Loader2, RefreshCw, Trash2, Award } from "lucide-react";
import { createClient } from "@/lib/supabase";

interface Cert { id:string; user_id:string; topic:string; difficulty:string; score_pct:number; correct_answers:number; total_questions:number; created_at:string; }

const DIFF_COLOR: Record<string,string> = { easy:"#10B981", medium:"#6366F1", hard:"#EF4444" };

function makeCertId(id:string, t:string) {
  const d = new Date(t);
  return `QLST-${d.getFullYear()}${String(d.getMonth()+1).padStart(2,"0")}${String(d.getDate()).padStart(2,"0")}-${id.replace(/-/g,"").slice(0,6).toUpperCase()}`;
}

export default function AdminCertificates() {
  const [certs,   setCerts]   = useState<Cert[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const supabase = createClient();
    const { data } = await supabase.from("questly_quiz_attempts").select("*").eq("certificate_earned",true).order("created_at",{ascending:false});
    setCerts(data ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const revoke = async (id:string) => {
    if (!confirm("Revoke this certificate?")) return;
    const supabase = createClient();
    await supabase.from("questly_quiz_attempts").update({certificate_earned:false}).eq("id",id);
    setCerts(prev => prev.filter(c=>c.id!==id));
  };

  const topTopics = certs.reduce<Record<string,number>>((acc,c)=>{ acc[c.topic]=(acc[c.topic]||0)+1; return acc; },{});
  const topList = Object.entries(topTopics).sort((a,b)=>b[1]-a[1]).slice(0,5);

  return (
    <div className="animate-fade-in-up">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-white mb-1">Certificate Management</h1>
          <p className="text-sm text-[#64748B]">{certs.length} certificates issued</p>
        </div>
        <button onClick={load} className="flex items-center gap-2 text-sm text-[#94a3b8] bg-[#1E293B] border border-[#334155] px-4 py-2 rounded-xl hover:border-[#6366F1] transition-all">
          <RefreshCw className="w-4 h-4"/>Refresh
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-[#0F172A] border border-[#1E293B] rounded-2xl p-4 text-center">
          <div className="text-3xl font-black text-[#F59E0B] mb-0.5">{certs.length}</div>
          <div className="text-xs text-[#64748B]">Total Issued</div>
        </div>
        <div className="bg-[#0F172A] border border-[#1E293B] rounded-2xl p-4 text-center">
          <div className="text-3xl font-black text-[#10B981] mb-0.5">
            {certs.length ? Math.round(certs.reduce((s,c)=>s+c.score_pct,0)/certs.length) : 0}%
          </div>
          <div className="text-xs text-[#64748B]">Avg Score</div>
        </div>
        <div className="bg-[#0F172A] border border-[#1E293B] rounded-2xl p-4 text-center">
          <div className="text-3xl font-black text-[#8B5CF6] mb-0.5">{new Set(certs.map(c=>c.user_id)).size}</div>
          <div className="text-xs text-[#64748B]">Unique Earners</div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Top certified topics */}
        <div className="bg-[#0F172A] border border-[#1E293B] rounded-2xl p-5">
          <h3 className="text-xs font-black text-[#64748B] uppercase tracking-widest mb-4 flex items-center gap-2">
            <Award className="w-3.5 h-3.5"/>Top Certified Topics
          </h3>
          <div className="space-y-3">
            {topList.map(([t,c],i)=>(
              <div key={t} className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-[#1E293B] flex items-center justify-center text-[9px] font-black text-[#64748B]">{i+1}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-white truncate">{t}</div>
                  <div className="text-[10px] text-[#475569]">{c} certs</div>
                </div>
                <Trophy className="w-3.5 h-3.5 text-[#F59E0B] flex-shrink-0"/>
              </div>
            ))}
          </div>
        </div>

        {/* Certificate list */}
        <div className="lg:col-span-2 bg-[#0F172A] border border-[#1E293B] rounded-2xl overflow-hidden">
          <div className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-3 px-5 py-3 border-b border-[#1E293B] text-[9px] font-black text-[#475569] uppercase tracking-widest">
            <div>Certificate ID / Topic</div><div>Level</div><div>Score</div><div>Issued</div><div>Revoke</div>
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-12 text-[#475569]"><Loader2 className="w-4 h-4 animate-spin mr-2"/>Loading…</div>
          ) : (
            <div className="divide-y divide-[#1E293B] max-h-[520px] overflow-y-auto">
              {certs.map(c => {
                const col = DIFF_COLOR[c.difficulty?.toLowerCase()]??"#6366F1";
                return (
                  <div key={c.id} className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-3 px-5 py-3 items-center hover:bg-[#1E293B]/40 transition-colors">
                    <div className="min-w-0">
                      <div className="text-[9px] font-mono text-[#6366F1] mb-0.5">{makeCertId(c.id,c.created_at)}</div>
                      <div className="text-xs font-semibold text-white truncate">{c.topic}</div>
                    </div>
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full capitalize inline-block w-fit"
                      style={{backgroundColor:col+"20",color:col}}>{c.difficulty}</span>
                    <div className="text-sm font-black text-[#10B981]">{c.score_pct}%</div>
                    <div className="text-xs text-[#475569]">
                      {new Date(c.created_at).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}
                    </div>
                    <button onClick={()=>revoke(c.id)} title="Revoke certificate"
                      className="p-1.5 rounded-lg text-[#475569] hover:text-[#EF4444] hover:bg-[#EF4444]/10 transition-colors">
                      <Trash2 className="w-3.5 h-3.5"/>
                    </button>
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
