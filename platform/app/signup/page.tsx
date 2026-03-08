"use client";
import Link from "next/link";
import { useState } from "react";
import { Eye, EyeOff, Zap, ArrowRight } from "lucide-react";

export default function SignupPage() {
  const [showPw, setShowPw] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", confirm: "" });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // TODO: Supabase signup
    await new Promise(r => setTimeout(r, 1500));
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#F7F8FC] flex">
      {/* Left panel */}
      <div className="hidden lg:flex flex-col w-1/2 bg-[#6366F1] p-12 justify-between">
        <Link href="/" className="flex items-center gap-2.5 text-white font-bold text-xl">
          <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center text-white font-black text-lg">Q</div>
          QuizAI
        </Link>

        <div className="max-w-md">
          <h2 className="text-4xl font-black text-white mb-4 leading-tight">
            Your AI-powered learning journey starts here.
          </h2>
          <p className="text-indigo-200 text-lg mb-8">
            Generate quizzes, track progress, earn certificates — all powered by Google Gemini AI.
          </p>

          <div className="space-y-4">
            {["Generate quizzes on any topic", "Get AI explanations for every answer", "Track your learning with analytics", "Earn shareable certificates"].map((item, i) => (
              <div key={i} className="flex items-center gap-3 text-white">
                <div className="w-5 h-5 bg-white/20 rounded-full flex items-center justify-center text-xs">✓</div>
                <span className="text-sm">{item}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3 text-indigo-200 text-sm">
          <div className="flex -space-x-2">
            {["#818CF8", "#A78BFA", "#34D399", "#FCD34D"].map((c, i) => (
              <div key={i} className="w-8 h-8 rounded-full border-2 border-[#6366F1]" style={{ backgroundColor: c }} />
            ))}
          </div>
          Join 10,000+ learners already on QuizAI
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <Link href="/" className="lg:hidden inline-flex items-center gap-2 font-bold text-[#111827] text-xl mb-6">
              <div className="w-8 h-8 bg-[#6366F1] rounded-lg flex items-center justify-center text-white font-black">Q</div>
              QuizAI
            </Link>
            <h1 className="text-3xl font-black text-[#111827] mb-2">Create your account</h1>
            <p className="text-[#6B7280]">Start learning for free. No credit card needed.</p>
          </div>

          <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-sm p-8">
            {/* Google signup */}
            <button className="w-full flex items-center justify-center gap-3 border border-[#E5E7EB] rounded-xl py-2.5 text-sm font-medium text-[#374151] hover:bg-[#F9FAFB] transition-colors mb-6">
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="flex-1 h-px bg-[#E5E7EB]" />
              <span className="text-xs text-[#9CA3AF] font-medium">OR</span>
              <div className="flex-1 h-px bg-[#E5E7EB]" />
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-semibold text-[#374151] block mb-1.5">Full Name</label>
                <input
                  type="text"
                  placeholder="Deepak Kumar"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  required
                  className="w-full px-4 py-2.5 bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl text-sm text-[#111827] placeholder-[#9CA3AF] focus:outline-none focus:border-[#6366F1] focus:ring-2 focus:ring-[#6366F1]/15 transition-all"
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-[#374151] block mb-1.5">Email</label>
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                  required
                  className="w-full px-4 py-2.5 bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl text-sm text-[#111827] placeholder-[#9CA3AF] focus:outline-none focus:border-[#6366F1] focus:ring-2 focus:ring-[#6366F1]/15 transition-all"
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-[#374151] block mb-1.5">Password</label>
                <div className="relative">
                  <input
                    type={showPw ? "text" : "password"}
                    placeholder="At least 8 characters"
                    value={form.password}
                    onChange={e => setForm({ ...form, password: e.target.value })}
                    required
                    className="w-full px-4 py-2.5 pr-11 bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl text-sm text-[#111827] placeholder-[#9CA3AF] focus:outline-none focus:border-[#6366F1] focus:ring-2 focus:ring-[#6366F1]/15 transition-all"
                  />
                  <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-[#6B7280]">
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#6366F1] hover:bg-[#4F46E5] disabled:opacity-60 text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2 transition-all hover:-translate-y-0.5 hover:shadow-lg text-sm mt-2"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Zap className="w-4 h-4" />
                    Create Free Account
                  </>
                )}
              </button>
            </form>
          </div>

          <p className="text-center text-sm text-[#6B7280] mt-5">
            Already have an account?{" "}
            <Link href="/login" className="text-[#6366F1] font-semibold hover:text-[#4F46E5]">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
