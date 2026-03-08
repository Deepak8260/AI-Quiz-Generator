import Link from "next/link";
import { Trophy, Download, Share2, ExternalLink, CheckCircle, Lock } from "lucide-react";

const CERTS = [
  { id: "QZAI-20260308-001", topic: "Python Data Structures", score: 85, date: "Mar 8, 2026", level: "Medium", earned: true },
  { id: "QZAI-20260306-002", topic: "SQL Fundamentals", score: 92, date: "Mar 6, 2026", level: "Easy", earned: true },
  { id: "QZAI-20260304-003", topic: "Machine Learning Basics", score: 78, date: "Mar 4, 2026", level: "Hard", earned: true },
  { id: "QZAI-20260301-004", topic: "React.js Hooks", score: 88, date: "Mar 1, 2026", level: "Medium", earned: true },
  { id: "QZAI-20260228-005", topic: "Data Visualization", score: 95, date: "Feb 28, 2026", level: "Easy", earned: true },
];

const LOCKED = [
  { topic: "Deep Learning", score: 61, needed: 70 },
  { topic: "Linear Algebra", score: 65, needed: 70 },
];

export default function CertificatesPage() {
  return (
    <div className="animate-fade-in-up">
      {/* Header */}
      <div className="flex items-center justify-between mb-7">
        <div>
          <h1 className="text-2xl font-black text-[#111827] mb-1">Certificates</h1>
          <p className="text-sm text-[#6B7280]">You&apos;ve earned {CERTS.length} certificates. Score 70%+ on any quiz to earn one.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-[#D1FAE5] border border-[#6EE7B7] text-[#065F46] text-xs font-bold px-3 py-1.5 rounded-full">
            <Trophy className="w-3 h-3" />
            {CERTS.length} Earned
          </div>
        </div>
      </div>

      {/* Earned certs grid */}
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5 mb-8">
        {CERTS.map((cert, i) => (
          <div key={i} className="bg-white rounded-2xl border border-[#E5E7EB] shadow-sm overflow-hidden hover:shadow-md transition-all hover:-translate-y-0.5 group">
            {/* Certificate visual */}
            <div className="h-36 bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] relative flex items-center justify-center overflow-hidden">
              <div className="absolute inset-0 opacity-10">
                <div className="absolute top-2 left-2 w-20 h-20 border-2 border-white rounded-full" />
                <div className="absolute bottom-2 right-2 w-14 h-14 border-2 border-white rounded-full" />
              </div>
              <div className="relative text-center">
                <div className="text-4xl mb-1">🏆</div>
                <div className="text-white text-xs font-bold tracking-widest uppercase opacity-80">Certificate</div>
                <div className="text-white text-xs opacity-60 mt-0.5">{cert.id}</div>
              </div>
              <div className="absolute top-3 right-3 bg-white/20 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                {cert.level}
              </div>
            </div>

            {/* Info */}
            <div className="p-4">
              <h3 className="font-bold text-[#111827] mb-1 text-sm">{cert.topic}</h3>
              <div className="flex items-center justify-between text-xs text-[#6B7280] mb-3">
                <span className="flex items-center gap-1">
                  <CheckCircle className="w-3 h-3 text-[#10B981]" />
                  Score: <strong className="text-[#10B981]">{cert.score}%</strong>
                </span>
                <span>{cert.date}</span>
              </div>
              <div className="flex gap-2">
                <button className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold text-[#6366F1] border border-[#E0E7FF] rounded-lg py-2 hover:bg-[#EEF2FF] transition-colors">
                  <Download className="w-3.5 h-3.5" />
                  Download
                </button>
                <button className="flex items-center justify-center gap-1.5 text-xs font-semibold text-[#6B7280] border border-[#E5E7EB] rounded-lg px-3 py-2 hover:bg-[#F9FAFB] transition-colors">
                  <Share2 className="w-3.5 h-3.5" />
                </button>
                <button className="flex items-center justify-center text-xs font-semibold text-[#6B7280] border border-[#E5E7EB] rounded-lg px-3 py-2 hover:bg-[#F9FAFB] transition-colors">
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Locked/In Progress */}
      {LOCKED.length > 0 && (
        <div>
          <h2 className="text-base font-bold text-[#111827] mb-4 flex items-center gap-2">
            <Lock className="w-4 h-4 text-[#9CA3AF]" />
            In Progress
          </h2>
          <div className="grid md:grid-cols-2 gap-4">
            {LOCKED.map((cert, i) => (
              <div key={i} className="bg-white rounded-2xl border border-[#E5E7EB] p-5 flex items-center gap-4">
                <div className="w-12 h-12 bg-[#F3F4F6] rounded-xl flex items-center justify-center text-2xl flex-shrink-0">
                  📚
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-[#111827] text-sm mb-1">{cert.topic}</h3>
                  <div className="h-1.5 bg-[#F3F4F6] rounded-full overflow-hidden mb-1">
                    <div
                      className="h-full bg-[#F59E0B] rounded-full transition-all"
                      style={{ width: `${(cert.score / cert.needed) * 100}%` }}
                    />
                  </div>
                  <p className="text-xs text-[#9CA3AF]">{cert.score}% · Need {cert.needed}% to unlock</p>
                </div>
                <Link href="/dashboard/generate" className="text-xs font-semibold text-[#6366F1] bg-[#EEF2FF] px-3 py-1.5 rounded-lg hover:bg-[#E0E7FF] transition-colors whitespace-nowrap">
                  Retry →
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
