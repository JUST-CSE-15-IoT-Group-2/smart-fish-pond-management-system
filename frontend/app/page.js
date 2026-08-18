"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Waves,
  ShieldCheck,
  Lock,
  User,
  ArrowRight,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  LogOut,
  Radio,
} from "lucide-react";
import { authApi } from "../lib/api";

function HomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const authParam = searchParams.get("auth");

  const [currentUser, setCurrentUser] = useState(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  // Form State
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    authApi
      .me()
      .then((data) => {
        setCurrentUser(data);
      })
      .catch(() => {
        setCurrentUser(null);
      })
      .finally(() => {
        setIsCheckingAuth(false);
      });
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!userId.trim() || !password) {
      setErrorMsg("Please enter both User ID and Password.");
      return;
    }

    setSubmitting(true);
    setErrorMsg("");

    try {
      const res = await authApi.login({
        userId: userId.trim(),
        password: password,
      });
      if (res && res.user) {
        setCurrentUser(res.user);
        router.push("/dashboard");
      }
    } catch (err) {
      setErrorMsg(err.message || "Invalid User ID or Password. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogout = async () => {
    try {
      await authApi.logout();
      setCurrentUser(null);
    } catch (_) {
      setCurrentUser(null);
    }
  };

  return (
    <div className="relative min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col items-center justify-between overflow-x-hidden selection:bg-brand-moss selection:text-white">
      {/* Dynamic Background Pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(#2B5748_1px,transparent_1px)] [background-size:24px_24px] opacity-15 pointer-events-none z-0" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[500px] bg-gradient-to-b from-brand-forest/10 via-brand-sage/5 to-transparent blur-3xl pointer-events-none z-0" />

      {/* Floating Navigation Header */}
      <nav className="relative z-20 w-[92%] max-w-5xl mt-6 bg-brand-slate/95 text-white px-6 py-3.5 rounded-full flex items-center justify-between shadow-xl backdrop-blur-md border border-white/10">
        <div className="flex items-center gap-3">
          <div className="bg-brand-forest p-2 rounded-xl flex items-center justify-center shadow-inner">
            <Waves className="w-4 h-4 text-brand-moss animate-pulse" />
          </div>
          <div>
            <span className="font-extrabold tracking-wider text-sm sm:text-base text-white">FPMS</span>
            <span className="hidden sm:inline-block ml-2 text-[10px] uppercase font-bold tracking-widest text-brand-moss bg-brand-forest/40 px-2 py-0.5 rounded-md">
              Secure IoT
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-2 text-xs font-semibold text-white/80">
            <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            <span>Pond Gateway Active</span>
          </div>

          {currentUser && (
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-300 text-xs font-semibold rounded-full transition-all border border-red-500/30 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          )}
        </div>
      </nav>

      {/* Main Section */}
      <main className="relative z-10 w-full max-w-5xl px-4 py-12 sm:py-16 flex flex-col lg:flex-row items-center justify-center gap-12 lg:gap-16 flex-1">
        
        {/* Left Column: Brand & Info */}
        <div className="w-full lg:w-1/2 flex flex-col items-center lg:items-start text-center lg:text-left">
          <div className="inline-flex items-center gap-2 border border-brand-forest/20 rounded-full px-3.5 py-1 text-xs font-bold text-brand-forest uppercase tracking-wider bg-brand-forest/5 shadow-sm mb-6">
            <ShieldCheck className="w-4 h-4 text-brand-forest" />
            Protected Aquaculture Console
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 leading-[1.12]">
            Fish Pond <br className="hidden sm:inline" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-slate via-brand-forest to-brand-sage">
              Management System
            </span>
          </h1>

          <p className="mt-5 text-base sm:text-lg text-slate-600 font-normal leading-relaxed max-w-lg">
            Authorized telemetry, smart motor control, scheduled feeding automation, and real-time pond ecosystem monitoring.
          </p>

          <div className="mt-8 grid grid-cols-2 gap-4 w-full max-w-md">
            <div className="p-3.5 rounded-2xl bg-white/80 border border-slate-200/80 shadow-sm backdrop-blur-sm">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Access Control</div>
              <div className="text-sm font-bold text-slate-800 mt-1 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Strict Security</span>
              </div>
            </div>
            <div className="p-3.5 rounded-2xl bg-white/80 border border-slate-200/80 shadow-sm backdrop-blur-sm">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Telemetry Link</div>
              <div className="text-sm font-bold text-slate-800 mt-1 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-brand-forest" />
                <span>Live Socket.IO</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Interactive Login / Session Card */}
        <div className="w-full lg:w-5/12 max-w-md">
          {isCheckingAuth ? (
            <div className="bg-white/90 backdrop-blur-xl border border-slate-200 rounded-3xl p-8 shadow-2xl flex flex-col items-center justify-center min-h-[360px]">
              <div className="bg-brand-forest/10 p-4 rounded-2xl mb-4">
                <Waves className="w-8 h-8 text-brand-forest animate-pulse" />
              </div>
              <p className="text-sm font-semibold text-slate-600">Verifying session...</p>
            </div>
          ) : currentUser ? (
            /* Logged in state card */
            <div className="bg-white/95 backdrop-blur-xl border border-slate-200/90 rounded-3xl p-8 shadow-2xl transition-all duration-300">
              <div className="flex items-center gap-4 mb-6 pb-6 border-b border-slate-100">
                <div className="w-14 h-14 rounded-2xl bg-brand-forest text-white flex items-center justify-center font-bold text-xl shadow-md border-2 border-brand-moss">
                  {(currentUser.name || currentUser.userId || "U").slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <div className="text-xs font-semibold text-brand-forest uppercase tracking-wider">
                    Authenticated Session
                  </div>
                  <h2 className="text-xl font-extrabold text-slate-900 mt-0.5">
                    {currentUser.name || currentUser.userId}
                  </h2>
                  <div className="text-xs text-slate-500 mt-0.5">
                    Role: <span className="font-semibold text-slate-700 capitalize">{currentUser.role || "Admin"}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <Link
                  href="/dashboard"
                  className="w-full py-4 px-6 bg-brand-forest hover:bg-brand-sage text-white font-bold text-sm rounded-2xl shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center gap-2 group cursor-pointer"
                >
                  <span>Enter Dashboard Console</span>
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </Link>

                <button
                  onClick={handleLogout}
                  className="w-full py-3 px-6 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-2xl transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Log out of current account</span>
                </button>
              </div>
            </div>
          ) : (
            /* Login Form Card */
            <div className="bg-white/95 backdrop-blur-xl border border-slate-200/90 rounded-3xl p-8 shadow-2xl relative overflow-hidden transition-all duration-300">
              {/* Header inside Card */}
              <div className="mb-6">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-brand-forest/10 rounded-full text-brand-forest text-xs font-bold uppercase tracking-wider mb-2">
                  <Lock className="w-3.5 h-3.5" />
                  <span>Dashboard Login</span>
                </div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">Sign In</h2>
                <p className="text-xs text-slate-500 mt-1">
                  Enter your credentials configured in the system environment to continue.
                </p>
              </div>

              {/* Error Alert */}
              {errorMsg && (
                <div className="mb-5 p-3.5 bg-red-50 border border-red-200/80 rounded-2xl flex items-start gap-2.5 text-red-800 text-xs font-medium animate-fadeIn">
                  <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleLogin} className="space-y-4">
                {/* User ID Input */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    User ID / Username
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <User className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      value={userId}
                      onChange={(e) => setUserId(e.target.value)}
                      placeholder="e.g. admin"
                      required
                      autoComplete="username"
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-forest focus:bg-white transition-all font-medium"
                    />
                  </div>
                </div>

                {/* Password Input */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      autoComplete="current-password"
                      className="w-full pl-10 pr-11 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-forest focus:bg-white transition-all font-medium"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full mt-2 py-3.5 px-6 bg-brand-forest hover:bg-brand-sage active:scale-[0.99] disabled:opacity-60 text-white font-bold text-sm rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {submitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Authenticating...</span>
                    </>
                  ) : (
                    <>
                      <span>Sign In to Dashboard</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 w-full max-w-5xl px-6 py-6 border-t border-slate-200/80 flex flex-col sm:flex-row justify-between items-center gap-3 text-xs text-slate-500">
        <p>© {new Date().getFullYear()} FPMS Smart Aquaculture Ecosystem. All rights reserved.</p>
        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-600">
          <ShieldCheck className="w-3.5 h-3.5 text-brand-forest" />
          <span>Credential Sync & JWT Encrypted</span>
        </div>
      </footer>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50" />}>
      <HomeContent />
    </Suspense>
  );
}
