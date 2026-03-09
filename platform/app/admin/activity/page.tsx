"use client";
import { useEffect, useState, useRef } from "react";
import { Activity, Trophy, BookOpen, Loader2, RefreshCw, Wifi } from "lucide-react";
import { createClient } from "@/lib/supabase";

interface Event { id:string; type:"quiz_taken"|"cert_earned"; topic:string; score_pct:number; passed:boolean; certificate_earned:boolean; difficulty:string; user_id:string; created_at:string; }

function relTime(iso:string) {
  const diff = Math.floor((Date.now()-new Date(iso).getTime())/1000);
  if (diff<60) return "just now";
  if (diff<3600) return `${Math.floor(diff/60)}m ago`;
  if (diff<86400) return `${Math.floor(diff/3600)}h ago`;
  return `${Math.floor(diff/86400)}d ago`;
}

const DIFF_COLOR: Record<string,string> = { easy:"#10B981", medium:"#6366F1", hard:"#EF4444" };

export default function AdminActivity() {
  const [events,    setEvents]    = useState<Event[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [live,      setLive]      = useState(true);
  const [newCount,  setNewCount]  = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastIdRef   = useRef<string | null>(null);

  const load = async (silent=false) => {
    if (!silent) setLoading(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("questly_quiz_attempts")
      .select("id,topic,score_pct,passed,certificate_earned,difficulty,user_id,created_at")
      .order("created_at",{ascending:false})
      .limit(50);
    const items = (data ?? []).map(d=>({...d, type: d.certificate_earned?"cert_earned":"quiz_taken"} as Event));
    if (silent && items.length > 0 && lastIdRef.current && items[0].id !== lastIdRef.current) {
      const prev = events.map(e=>e.id);
      const newItems = items.filter(e=>!prev.includes(e.id));
      if (newItems.length > 0) setNewCount(c=>c+newItems.length);
    }
    setEvents(items);
    if (items.length) lastIdRef.current = items[0].id;
    if (!silent) setLoading(false);
  };

  useEffect(() => {
    load();
    intervalRef.current = setInterval(()=>load(true), 10000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  useEffect(() => {
    if (!live) { if (intervalRef.current) clearInterval(intervalRef.current); }
    else { intervalRef.current = setInterval(()=>load(true), 10000); }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [live]);

  const todayEvents = events.filter(e => new Date(e.created_at).toDateString() === new Date().toDateString());

  return (
    <div className="animate-fade-in-up">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-white mb-1">Live Activity</h1>
          <p className="text-sm text-[#64748B]">Platform-wide quiz events · auto-refreshes every 10s</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={()=>setLive(v=>!v)}
            className={`flex items-center gap-2 text-sm px-4 py-2 rounded-xl border transition-all font-semibold ${live ? "bg-[#0d2b20] border-[#10B981] text-[#10B981]" : "bg-[#1E293B] border-[#334155] text-[#64748B]"}`}>
            <Wifi className="w-4 h-4"/> {live?"Live":"Paused"}
          </button>
          <button onClick={()=>{setNewCount(0);load();}} className="flex items-center gap-2 text-sm text-[#94a3b8] bg-[#1E293B] border border-[#334155] px-4 py-2 rounded-xl hover:border-[#6366F1] transition-all">
            <RefreshCw className="w-4 h-4"/>
            {newCount>0 && <span className="bg-[#EF4444] text-white text-[9px] font-black px-1.5 py-0.5 rounded-full">{newCount} new</span>}
          </button>
        </div>
      </div>

      {/* Today stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label:"Events Today",    value:todayEvents.length,                           color:"#6366F1", icon:<Activity className="w-4 h-4"/> },
          { label:"Passed Today",    value:todayEvents.filter(e=>e.passed).length,       color:"#10B981", icon:<BookOpen className="w-4 h-4"/> },
          { label:"Certs Today",     value:todayEvents.filter(e=>e.certificate_earned).length, color:"#F59E0B", icon:<Trophy className="w-4 h-4"/> },
        ].map(s=>(
          <div key={s.label} className="bg-[#0F172A] border border-[#1E293B] rounded-2xl p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{backgroundColor:s.color+"20",color:s.color}}>{s.icon}</div>
            <div>
              <div className="text-xl font-black text-white">{s.value}</div>
              <div className="text-xs text-[#64748B]">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Event feed */}
      <div className="bg-[#0F172A] border border-[#1E293B] rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-[#1E293B]">
          <h3 className="text-xs font-black text-[#64748B] uppercase tracking-widest">Recent Events</h3>
          <div className="flex items-center gap-1.5 text-[10px] text-[#10B981] font-semibold">
            <div className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse"/>
            {live?"Monitoring":"Paused"}
          </div>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-16 text-[#475569]"><Loader2 className="w-5 h-5 animate-spin mr-2"/>Loading…</div>
        ) : (
          <div className="divide-y divide-[#1E293B] max-h-[600px] overflow-y-auto">
            {events.map(e => {
              const col = DIFF_COLOR[e.difficulty?.toLowerCase()]??"#6366F1";
              return (
                <div key={e.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-[#1E293B]/40 transition-colors">
                  {/* Icon */}
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{backgroundColor: e.certificate_earned?"#F59E0B20":"#6366F120"}}>
                    {e.certificate_earned
                      ? <Trophy className="w-4 h-4 text-[#F59E0B]"/>
                      : <BookOpen className="w-4 h-4 text-[#6366F1]"/>}
                  </div>
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-white truncate">
                      {e.certificate_earned ? "🏆 Certificate earned: " : "📝 Quiz completed: "}{e.topic}
                    </div>
                    <div className="text-xs text-[#475569] font-mono">{e.user_id.slice(0,8)}…</div>
                  </div>
                  {/* Score */}
                  <span className={`text-sm font-black ${e.passed?"text-[#10B981]":"text-[#F59E0B]"}`}>{e.score_pct}%</span>
                  {/* Difficulty */}
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full capitalize"
                    style={{backgroundColor:col+"20",color:col}}>{e.difficulty}</span>
                  {/* Time */}
                  <div className="w-20 text-right text-xs text-[#475569]">{relTime(e.created_at)}</div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
