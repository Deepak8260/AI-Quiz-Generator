"use client";
import { useRef } from "react";
import { Download } from "lucide-react";

interface CertificateModalProps {
  topic: string;
  scorePct: number;               // already calculated %
  correctAnswers: number;
  totalQuestions: number;
  difficulty: string;
  userName: string;
  earnedAt: string;               // ISO date string from DB
  certId: string;                 // e.g. "QLST-20260309-A3F8"
  onClose: () => void;
}

export default function CertificateModal({
  topic, scorePct, correctAnswers, totalQuestions,
  difficulty, userName, earnedAt, certId, onClose,
}: CertificateModalProps) {
  const certRef = useRef<HTMLDivElement>(null);

  const formattedDate = new Date(earnedAt).toLocaleDateString("en-US", {
    year: "numeric", month: "long", day: "numeric",
  });

  const handleDownload = () => {
    const win = window.open("", "_blank");
    if (!win) { alert("Please allow popups for PDF download."); return; }

    win.document.write(`<!DOCTYPE html>
<html>
<head>
  <title>Questly Certificate – ${topic}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Georgia, 'Times New Roman', serif; background: #fff; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .cert {
      width: 900px; margin: 0 auto; padding: 60px 80px;
      border: 12px solid #6366F1; min-height: 600px;
      display: flex; flex-direction: column; align-items: center;
      justify-content: center; text-align: center;
      background: linear-gradient(135deg, #EEF2FF 0%, #fff 50%, #F5F3FF 100%);
    }
    .badge   { font-size: 80px; margin-bottom: 16px; }
    .issuer  { font-size: 12px; color: #6366F1; font-weight: bold; letter-spacing: 4px; text-transform: uppercase; margin-bottom: 24px; }
    .title   { font-size: 44px; font-weight: bold; color: #111827; margin-bottom: 6px; }
    .sub     { font-size: 16px; color: #6B7280; margin-bottom: 32px; }
    .name    { font-size: 38px; color: #6366F1; font-style: italic; border-bottom: 2px solid #6366F1; padding-bottom: 6px; display: inline-block; margin: 8px 0 32px; }
    .body    { font-size: 17px; color: #374151; margin-bottom: 6px; }
    .topic   { font-size: 24px; font-weight: bold; color: #111827; margin: 8px 0 28px; }
    .score   { font-size: 56px; font-weight: bold; color: #059669; margin: 8px 0; }
    .meta    { font-size: 14px; color: #6B7280; margin-bottom: 36px; }
    .footer  { display: flex; justify-content: space-between; width: 100%; margin-top: 48px; padding-top: 20px; border-top: 1px solid #E5E7EB; font-size: 13px; color: #6B7280; }
    .cert-id { font-family: monospace; font-size: 11px; color: #9CA3AF; margin-top: 12px; }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body>
  <div class="cert">
    <div class="badge">🏆</div>
    <div class="issuer">Questly · AI-Powered Learning Platform</div>
    <div class="title">Certificate of Achievement</div>
    <div class="sub">This certifies that</div>
    <div class="name">${userName}</div>
    <div class="body">has successfully completed the quiz on</div>
    <div class="topic">${topic}</div>
    <div class="body">with a score of</div>
    <div class="score">${scorePct}%</div>
    <div class="meta">${correctAnswers} out of ${totalQuestions} correct · ${difficulty.charAt(0).toUpperCase() + difficulty.slice(1)} difficulty</div>
    <div class="footer">
      <span>📅 Issued: ${formattedDate}</span>
      <span>✅ Passing criteria: ≥ 70%</span>
      <span>🎓 Verified by Questly</span>
    </div>
    <div class="cert-id">Certificate ID: ${certId}</div>
  </div>
</body>
</html>`);
    win.document.close();
    setTimeout(() => { win.print(); win.close(); }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden">

        {/* Preview */}
        <div
          ref={certRef}
          className="bg-gradient-to-br from-[#EEF2FF] via-white to-[#F5F3FF] p-10 border-8 border-[#6366F1] text-center"
        >
          <div className="text-5xl mb-3">🏆</div>
          <div className="text-xs font-black text-[#6366F1] tracking-[4px] uppercase mb-4">
            Questly · AI-Powered Learning Platform
          </div>
          <h2 className="text-3xl font-black text-[#111827] mb-1">Certificate of Achievement</h2>
          <p className="text-[#6B7280] mb-5">This certifies that</p>
          <div className="text-3xl font-bold text-[#6366F1] italic border-b-2 border-[#6366F1] inline-block pb-1 mb-5">
            {userName}
          </div>
          <p className="text-[#374151] mb-1">has successfully completed the quiz on</p>
          <p className="text-xl font-black text-[#111827] mb-4">{topic}</p>
          <div className="text-5xl font-black text-[#059669] mb-1">{scorePct}%</div>
          <div className="text-sm text-[#6B7280] mb-4">
            {correctAnswers}/{totalQuestions} correct · {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)} difficulty
          </div>
          <div className="flex items-center justify-between text-xs text-[#9CA3AF] border-t border-[#E5E7EB] pt-4 mt-2">
            <span>📅 {formattedDate}</span>
            <span>✅ Passing: ≥ 70%</span>
            <span>🎓 Verified by Questly</span>
          </div>
          <div className="text-[10px] text-[#9CA3AF] mt-2 font-mono">{certId}</div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 p-5 bg-[#F9FAFB]">
          <button
            onClick={handleDownload}
            className="flex-1 flex items-center justify-center gap-2 bg-[#6366F1] hover:bg-[#4F46E5] text-white font-semibold py-3 rounded-xl transition-all hover:shadow-lg text-sm"
          >
            <Download className="w-4 h-4" /> Download Certificate (PDF)
          </button>
          <button
            onClick={onClose}
            className="px-5 py-3 border border-[#E5E7EB] bg-white text-[#374151] font-semibold rounded-xl hover:bg-[#F9FAFB] text-sm"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
