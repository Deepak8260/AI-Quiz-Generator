"use client";
import { useRef } from "react";
import { Download, X } from "lucide-react";

interface CertificateModalProps {
  topic: string;
  scorePct: number;
  correctAnswers: number;
  totalQuestions: number;
  difficulty: string;
  userName: string;
  earnedAt: string;
  certId: string;
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

  const diffLabel = difficulty.charAt(0).toUpperCase() + difficulty.slice(1);

  const handleDownload = () => {
    const win = window.open("", "_blank");
    if (!win) { alert("Please allow popups for PDF download."); return; }
    win.document.write(`<!DOCTYPE html>
<html>
<head>
  <title>Questly Certificate – ${topic}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Georgia, serif; background: #fff; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .cert {
      width: 900px; margin: 40px auto; padding: 60px 80px;
      border: 12px solid #6366F1;
      display: flex; flex-direction: column; align-items: center;
      text-align: center;
      background: linear-gradient(135deg, #EEF2FF 0%, #fff 60%, #F5F3FF 100%);
    }
    .badge    { font-size: 72px; margin-bottom: 12px; }
    .issuer   { font-size: 11px; color: #6366F1; font-weight: bold; letter-spacing: 4px; text-transform: uppercase; margin-bottom: 20px; }
    .title    { font-size: 42px; font-weight: bold; color: #111827; margin-bottom: 6px; }
    .sub      { font-size: 16px; color: #6B7280; margin-bottom: 20px; }
    .name     { font-size: 36px; color: #6366F1; font-style: italic; border-bottom: 2px solid #6366F1; padding-bottom: 6px; display: inline-block; margin-bottom: 20px; }
    .body     { font-size: 16px; color: #374151; margin-bottom: 6px; }
    .topic    { font-size: 22px; font-weight: bold; color: #111827; margin: 6px 0 20px; }
    .score    { font-size: 52px; font-weight: bold; color: #059669; margin: 4px 0; }
    .meta     { font-size: 14px; color: #6B7280; margin-bottom: 32px; }
    .footer   { display: flex; justify-content: space-between; width: 100%; padding-top: 20px; border-top: 1px solid #E5E7EB; font-size: 13px; color: #6B7280; }
    .cert-id  { font-family: monospace; font-size: 11px; color: #9CA3AF; margin-top: 12px; }
    @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
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
    <div class="meta">${correctAnswers} out of ${totalQuestions} correct · ${diffLabel} difficulty</div>
    <div class="footer">
      <span>📅 Issued: ${formattedDate}</span>
      <span>✅ Passing criteria: ≥ 70%</span>
      <span>🎓 Verified by Questly</span>
    </div>
    <div class="cert-id">${certId}</div>
  </div>
</body>
</html>`);
    win.document.close();
    setTimeout(() => { win.print(); win.close(); }, 600);
  };

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Modal — max height so it never overflows */}
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">

        {/* Top bar with close button */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-[#F3F4F6] flex-shrink-0">
          <span className="text-sm font-bold text-[#111827]">Certificate Preview</span>
          <button onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-[#9CA3AF] hover:bg-[#F3F4F6] hover:text-[#374151] transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable certificate body */}
        <div className="overflow-y-auto flex-1">
          <div
            ref={certRef}
            className="m-4 rounded-xl border-4 border-[#6366F1] bg-gradient-to-br from-[#EEF2FF] via-white to-[#F5F3FF] p-6 text-center"
          >
            {/* Trophy */}
            <div className="text-4xl mb-2">🏆</div>

            {/* Issuer */}
            <div className="text-[9px] font-black text-[#6366F1] tracking-[3px] uppercase mb-3">
              Questly · AI-Powered Learning Platform
            </div>

            {/* Title */}
            <h2 className="text-xl font-black text-[#111827] mb-1">Certificate of Achievement</h2>
            <p className="text-xs text-[#6B7280] mb-3">This certifies that</p>

            {/* Name */}
            <div className="text-xl font-bold text-[#6366F1] italic border-b-2 border-[#6366F1] inline-block pb-1 mb-3">
              {userName}
            </div>

            {/* Body */}
            <p className="text-xs text-[#374151] mb-0.5">has successfully completed the quiz on</p>
            <p className="text-base font-black text-[#111827] mb-3">{topic}</p>

            {/* Score */}
            <div className="text-4xl font-black text-[#059669] mb-0.5">{scorePct}%</div>
            <div className="text-xs text-[#6B7280] mb-4">
              {correctAnswers}/{totalQuestions} correct · {diffLabel} difficulty
            </div>

            {/* Footer strip */}
            <div className="grid grid-cols-3 gap-2 text-[9px] text-[#9CA3AF] border-t border-[#E5E7EB] pt-3 mt-1">
              <div className="text-center">📅 {formattedDate}</div>
              <div className="text-center">✅ Passing: ≥ 70%</div>
              <div className="text-center">🎓 Verified by Questly</div>
            </div>

            {/* Cert ID */}
            <div className="text-[8px] text-[#C4C4C4] font-mono mt-2">{certId}</div>
          </div>
        </div>

        {/* Sticky action bar */}
        <div className="flex gap-3 px-5 py-4 border-t border-[#F3F4F6] bg-[#F9FAFB] flex-shrink-0">
          <button
            onClick={handleDownload}
            className="flex-1 flex items-center justify-center gap-2 bg-[#6366F1] hover:bg-[#4F46E5] text-white font-semibold py-2.5 rounded-xl transition-all hover:shadow-lg text-sm"
          >
            <Download className="w-4 h-4" /> Download Certificate (PDF)
          </button>
          <button
            onClick={onClose}
            className="px-5 py-2.5 border border-[#E5E7EB] bg-white text-[#374151] font-semibold rounded-xl hover:bg-[#F9FAFB] text-sm transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
