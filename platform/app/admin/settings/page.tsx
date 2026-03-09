"use client";
import { useState } from "react";
import { Save, CheckCircle, AlertTriangle, Sliders, Zap, Trophy, RotateCcw } from "lucide-react";

interface Setting { key: string; label: string; desc: string; defaultVal: string | number; type: "number" | "text"; }

const SETTINGS: { section: string; items: Setting[] }[] = [
  {
    section: "Quiz Limits",
    items: [
      { key: "max_quizzes_free",     label: "Max Quizzes (Free)",   desc: "Monthly quiz limit for free users",     defaultVal: 10,  type: "number" },
      { key: "max_quizzes_pro",      label: "Max Quizzes (Pro)",    desc: "Monthly quiz limit for pro users",      defaultVal: 999, type: "number" },
      { key: "max_questions_per_quiz",label:"Max Questions/Quiz",   desc: "Maximum questions in one quiz",         defaultVal: 20,  type: "number" },
    ],
  },
  {
    section: "AI Generation",
    items: [
      { key: "ai_daily_limit",       label: "AI Daily Limit",       desc: "Max AI requests per day globally",      defaultVal: 500, type: "number" },
      { key: "ai_model",             label: "AI Model",             desc: "Model name used for quiz generation",   defaultVal: "gemini-2.0-flash", type: "text" },
      { key: "ai_max_tokens",        label: "Max Tokens/Request",   desc: "Token limit per AI request",            defaultVal: 2048, type: "number" },
    ],
  },
  {
    section: "Certificates & XP",
    items: [
      { key: "cert_pass_threshold",  label: "Cert Threshold (%)",   desc: "Minimum score to earn a certificate",  defaultVal: 70,  type: "number" },
      { key: "xp_per_correct",       label: "XP per Correct",       desc: "XP awarded per correct answer",         defaultVal: 10,  type: "number" },
      { key: "xp_bonus_cert",        label: "XP Cert Bonus",        desc: "Bonus XP for earning a certificate",   defaultVal: 100, type: "number" },
    ],
  },
];

function useLocalSetting(key: string, def: string | number) {
  const stored = typeof window !== "undefined" ? localStorage.getItem(`admin_cfg_${key}`) : null;
  const [val, setVal] = useState<string>(stored ?? String(def));
  const save = (v: string) => {
    setVal(v);
    if (typeof window !== "undefined") localStorage.setItem(`admin_cfg_${key}`, v);
  };
  return [val, save] as const;
}

function SettingRow({ item }: { item: Setting }) {
  const [val, setVal] = useLocalSetting(item.key, item.defaultVal);
  return (
    <div className="flex items-center justify-between py-3.5 border-b border-[#1E293B] last:border-b-0">
      <div className="flex-1 min-w-0 mr-6">
        <div className="text-sm font-semibold text-white">{item.label}</div>
        <div className="text-xs text-[#475569] mt-0.5">{item.desc}</div>
        <div className="text-[9px] font-mono text-[#334155] mt-0.5">{item.key}</div>
      </div>
      <input
        type={item.type === "number" ? "number" : "text"}
        value={val}
        onChange={e => setVal(e.target.value)}
        className="w-40 px-3 py-2 bg-[#1E293B] border border-[#334155] rounded-xl text-sm text-white text-right outline-none focus:border-[#6366F1] transition-colors font-mono"
      />
    </div>
  );
}

export default function AdminSettings() {
  const [saved, setSaved]   = useState(false);
  const [err,   setErr]     = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const resetAll = () => {
    if (!confirm("Reset all settings to defaults?")) return;
    if (typeof window !== "undefined") {
      Object.keys(localStorage).filter(k => k.startsWith("admin_cfg_")).forEach(k => localStorage.removeItem(k));
    }
    window.location.reload();
  };

  return (
    <div className="animate-fade-in-up max-w-2xl">
      <div className="flex items-center justify-between mb-7">
        <div>
          <h1 className="text-2xl font-black text-white mb-1">System Settings</h1>
          <p className="text-sm text-[#64748B]">Configure platform-wide limits and behaviour</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={resetAll}
            className="flex items-center gap-1.5 text-sm text-[#64748B] border border-[#334155] bg-[#1E293B] px-4 py-2 rounded-xl hover:border-[#EF4444] hover:text-[#EF4444] transition-all">
            <RotateCcw className="w-3.5 h-3.5"/> Reset
          </button>
          <button onClick={handleSave}
            className="flex items-center gap-1.5 text-sm text-white bg-[#6366F1] hover:bg-[#4F46E5] px-5 py-2 rounded-xl transition-all font-semibold">
            <Save className="w-3.5 h-3.5"/> Save All
          </button>
        </div>
      </div>

      {saved && (
        <div className="flex items-center gap-2 text-sm bg-[#0d2b20] border border-[#10B981] text-[#10B981] px-4 py-2.5 rounded-xl mb-5">
          <CheckCircle className="w-4 h-4"/> Settings saved to browser storage.
        </div>
      )}

      <div className="space-y-5">
        {SETTINGS.map(group => (
          <div key={group.section} className="bg-[#0F172A] border border-[#1E293B] rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-[#1E293B] flex items-center gap-3 bg-[#0B1120]">
              <div className="w-8 h-8 rounded-xl bg-[#6366F1]/10 flex items-center justify-center text-[#6366F1]">
                {group.section.includes("Quiz") ? <Sliders className="w-4 h-4"/> :
                 group.section.includes("AI")   ? <Zap className="w-4 h-4"/> :
                 <Trophy className="w-4 h-4"/>}
              </div>
              <h2 className="text-sm font-black text-[#94a3b8] uppercase tracking-wider">{group.section}</h2>
            </div>
            <div className="px-5">
              {group.items.map(item => <SettingRow key={item.key} item={item}/>)}
            </div>
          </div>
        ))}

        {/* Info notice */}
        <div className="flex items-start gap-3 bg-[#1E293B] border border-[#334155] rounded-2xl p-4">
          <AlertTriangle className="w-4 h-4 text-[#F59E0B] flex-shrink-0 mt-0.5"/>
          <div>
            <p className="text-xs font-semibold text-[#94a3b8] mb-1">Browser-Persisted Settings</p>
            <p className="text-xs text-[#475569] leading-relaxed">
              These settings are saved in <code className="text-[#6366F1]">localStorage</code> for demo purposes.
              In production, persist them in a <code className="text-[#6366F1]">admin_settings</code> Supabase table and read from there in your API routes.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
