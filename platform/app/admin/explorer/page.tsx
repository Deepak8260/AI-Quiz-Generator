"use client";
import { useState, useEffect } from "react";
import { Search, Loader2, RefreshCw, ChevronLeft, ChevronRight, Database, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase";

type TableName = "questly_quiz_attempts" | "profiles";

const TABLES: { name: TableName; label: string; desc: string; cols: string[] }[] = [
  { name: "questly_quiz_attempts", label: "Quiz Attempts", desc: "All quiz attempt records",
    cols: ["id","user_id","topic","difficulty","score_pct","passed","certificate_earned","created_at"] },
  { name: "profiles", label: "User Profiles", desc: "Registered user profiles",
    cols: ["id","full_name","email","role","created_at"] },
];

const PAGE_SIZE = 15;

function Cell({ val }: { val: unknown }) {
  if (val === null || val === undefined) return <span className="text-[#334155] italic text-[10px]">null</span>;
  if (typeof val === "boolean") return (
    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${val ? "bg-[#10B981]/15 text-[#10B981]" : "bg-[#EF4444]/15 text-[#EF4444]"}`}>
      {val ? "true" : "false"}
    </span>
  );
  const str = String(val);
  if (str.length > 36) return <span className="font-mono text-[10px] text-[#64748B]">{str.slice(0,12)}…</span>;
  return <span className="text-xs text-[#94a3b8]">{str}</span>;
}

export default function AdminExplorer() {
  const [activeTable, setActiveTable] = useState<TableName>("questly_quiz_attempts");
  const [rows,    setRows]    = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState("");
  const [page,    setPage]    = useState(1);
  const [count,   setCount]   = useState(0);

  const info = TABLES.find(t => t.name === activeTable)!;

  const load = async () => {
    setLoading(true);
    const supabase = createClient();
    const { data, count: c } = await supabase
      .from(activeTable)
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range((page-1)*PAGE_SIZE, page*PAGE_SIZE - 1);
    setRows(data ?? []);
    setCount(c ?? 0);
    setLoading(false);
  };
  useEffect(() => { load(); }, [activeTable, page]);

  const deleteRow = async (id: string) => {
    if (!confirm("Delete this row permanently?")) return;
    const supabase = createClient();
    await supabase.from(activeTable).delete().eq("id", id);
    setRows(prev => prev.filter(r => r.id !== id));
    setCount(c => c - 1);
  };

  const filtered = search.trim()
    ? rows.filter(r => Object.values(r).some(v => String(v).toLowerCase().includes(search.toLowerCase())))
    : rows;

  const pages = Math.max(1, Math.ceil(count / PAGE_SIZE));

  return (
    <div className="animate-fade-in-up">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-white mb-1">Database Explorer</h1>
          <p className="text-sm text-[#64748B]">View and manage Supabase tables</p>
        </div>
        <button onClick={load} className="flex items-center gap-2 text-sm text-[#94a3b8] bg-[#1E293B] border border-[#334155] px-4 py-2 rounded-xl hover:border-[#6366F1] transition-all">
          <RefreshCw className="w-4 h-4"/>Refresh
        </button>
      </div>

      {/* Table selector */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {TABLES.map(t => (
          <button key={t.name} onClick={() => { setActiveTable(t.name); setPage(1); setSearch(""); }}
            className={`flex items-start gap-3 p-4 rounded-2xl border transition-all text-left ${
              activeTable === t.name
                ? "bg-[#6366F1]/10 border-[#6366F1] text-white"
                : "bg-[#0F172A] border-[#1E293B] text-[#64748B] hover:border-[#334155]"
            }`}>
            <Database className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: activeTable === t.name ? "#6366F1" : undefined }}/>
            <div>
              <div className="font-bold text-sm">{t.label}</div>
              <div className="text-xs mt-0.5 opacity-70">{t.desc}</div>
              <div className="text-[9px] mt-1 font-mono opacity-50">{t.name}</div>
            </div>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex items-center gap-2 flex-1 bg-[#0F172A] border border-[#1E293B] rounded-xl px-3 py-2">
          <Search className="w-3.5 h-3.5 text-[#475569]"/>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder={`Search in ${info.label}…`}
            className="bg-transparent text-sm text-white placeholder:text-[#475569] outline-none w-full"/>
        </div>
        <span className="text-xs text-[#475569] whitespace-nowrap">{count} total rows</span>
      </div>

      {/* Table */}
      <div className="bg-[#0F172A] border border-[#1E293B] rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          {/* Header */}
          <div className="flex gap-0 border-b border-[#1E293B] px-4 py-2.5 min-w-max">
            {info.cols.map(col => (
              <div key={col} className="w-40 flex-shrink-0 text-[9px] font-black text-[#475569] uppercase tracking-widest">{col}</div>
            ))}
            <div className="w-12 text-[9px] font-black text-[#475569] uppercase tracking-widest">Del</div>
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-16 text-[#475569]">
              <Loader2 className="w-5 h-5 animate-spin mr-2"/>Loading…
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center text-[#475569] text-sm">No rows</div>
          ) : (
            <div className="divide-y divide-[#1E293B]">
              {filtered.map((row, ri) => (
                <div key={ri} className="flex gap-0 px-4 py-2.5 hover:bg-[#1E293B]/40 transition-colors min-w-max">
                  {info.cols.map(col => (
                    <div key={col} className="w-40 flex-shrink-0 pr-2 truncate"><Cell val={row[col]}/></div>
                  ))}
                  <div className="w-12">
                    <button onClick={() => deleteRow(String(row.id))} title="Delete row"
                      className="p-1 rounded text-[#475569] hover:text-[#EF4444] hover:bg-[#EF4444]/10 transition-colors">
                      <Trash2 className="w-3.5 h-3.5"/>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pagination */}
        {pages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-[#1E293B] text-xs text-[#475569]">
            <span>Page {page} of {pages} · {count} rows</span>
            <div className="flex gap-2">
              <button disabled={page===1} onClick={()=>setPage(p=>p-1)}
                className="p-1.5 rounded-lg disabled:opacity-30 hover:bg-[#1E293B] text-[#94a3b8]">
                <ChevronLeft className="w-4 h-4"/>
              </button>
              <button disabled={page===pages} onClick={()=>setPage(p=>p+1)}
                className="p-1.5 rounded-lg disabled:opacity-30 hover:bg-[#1E293B] text-[#94a3b8]">
                <ChevronRight className="w-4 h-4"/>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
