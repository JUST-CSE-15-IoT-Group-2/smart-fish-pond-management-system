"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import GoogleIcon from "../components/GoogleIcon";
import { Waves, Zap, ArrowRight, ShieldCheck, UserCheck, AlertCircle } from "lucide-react";
import { authApi } from "../lib/api";

function HomeContent() {
  const searchParams = useSearchParams();
  const authParam = searchParams.get("auth");

  const [user, setUser] = useState(null);

  // Dynamic API URL — works from localhost OR LAN IP (192.168.x.x)
  const apiUrl = typeof window !== "undefined"
    ? `http://${window.location.hostname}:5000`
    : (process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000");

  useEffect(() => {
    authApi.me()
      .then((data) => setUser(data))
      .catch(() => setUser(null));
  }, []);

  return (
    <div className="relative min-h-screen bg-white text-black font-sans flex flex-col items-center justify-start overflow-x-hidden selection:bg-brand-moss selection:text-white">

      {/* Floating Navigation */}
      <nav className="fixed top-6 left-1/2 -translate-x-1/2 w-[90%] max-w-5xl bg-brand-slate text-white px-6 py-3.5 rounded-full flex items-center justify-between shadow-lg backdrop-blur-md z-50 border border-brand-forest/20 transition-all duration-300 hover:shadow-xl">
        <div className="flex items-center gap-2.5">
          {/* Logo Icon */}
          <div className="bg-brand-forest p-2 rounded-full flex items-center justify-center">
            <Waves className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold tracking-tight text-sm sm:text-base">FPMS</span>
        </div>

        {/* Desktop Navigation Links */}
        <div className="hidden md:flex items-center gap-8 text-xs font-semibold uppercase tracking-wider text-white">
          <Link href="/dashboard/updates" className="hover:text-brand-moss transition-colors">Updates</Link>
          <Link href="/dashboard/controls" className="hover:text-brand-moss transition-colors">Controls</Link>
          <Link href="/dashboard/settings" className="hover:text-brand-moss transition-colors">Network</Link>
        </div>

        {/* Auth CTA in Header */}
        <div>
          {user ? (
            <Link
              href="/dashboard"
              className="flex items-center gap-2 px-4 py-1.5 bg-brand-forest hover:bg-brand-sage text-white text-xs font-bold rounded-full transition-all"
            >
              <UserCheck className="w-3.5 h-3.5 text-brand-moss" />
              <span>Console</span>
            </Link>
          ) : (
            <a
              href={`${apiUrl}/api/auth/dev-login`}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-brand-forest hover:bg-brand-sage text-white text-xs font-bold rounded-full transition-all shadow-sm"
            >
              <Zap className="w-3.5 h-3.5 text-yellow-300" />
              <span>Quick Login</span>
            </a>
          )}
        </div>
      </nav>

      {/* Grid Pattern Background Accent */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#e5e7eb_1px,transparent_1px),linear-gradient(to_bottom,#e5e7eb_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none opacity-40 z-0"></div>

      {/* Hero Section */}
      <main className="relative z-10 w-full max-w-5xl px-6 pt-36 pb-24 flex flex-col items-center justify-start text-center flex-1">

        {/* Auth Alert Notification (if redirected with failure / not configured) */}
        {authParam && (
          <div className="mb-6 w-full max-w-lg p-3.5 bg-amber-50 border border-amber-200 rounded-2xl flex items-center gap-3 text-amber-800 text-xs sm:text-sm font-medium shadow-sm">
            <AlertCircle className="w-5 h-5 flex-shrink-0 text-amber-600" />
            <span>
              {authParam === "not_configured"
                ? "Google OAuth is not configured yet in backend/.env. Use Quick Access below to enter the dashboard."
                : "Authentication failed. Please try Quick Access below."}
            </span>
          </div>
        )}

        {/* Network Status Badge */}
        <div className="mb-6 inline-flex items-center gap-2 border border-brand-slate/20 rounded-full px-3.5 py-1 text-xs font-bold text-black uppercase tracking-wider bg-white/80 shadow-sm">
          <ShieldCheck className="w-3.5 h-3.5 text-brand-forest" />
          Network-Enabled IoT Ecosystem
        </div>

        {/* Hero Text */}
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-black leading-[1.15] max-w-4xl">
          Fish Pond <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-slate via-brand-forest to-brand-sage">Management System</span>
        </h1>

        <p className="mt-6 text-base sm:text-lg md:text-xl text-black max-w-2xl font-light leading-relaxed">
          Take control of your aquaculture infrastructure over the network. Real-time water parameter telemetry, automatic device management, and remote feeding automation combined in one beautiful network interface.
        </p>

        {/* Action Buttons */}
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 w-full sm:w-auto">
          {user ? (
            /* Logged in state */
            <Link
              href="/dashboard"
              className="w-full sm:w-auto px-8 py-4 bg-brand-forest hover:bg-brand-sage text-white text-sm font-semibold rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-[1.02] flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Go to Dashboard ({user.name})</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          ) : (
            /* Not logged in state */
            <>
              {/* Primary 1-Click Dev / Local Access */}
              <a
                href={`${apiUrl}/api/auth/dev-login`}
                className="w-full sm:w-auto px-7 py-3.5 bg-brand-forest hover:bg-brand-sage text-white text-sm font-semibold rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-[1.02] flex items-center justify-center gap-2.5 cursor-pointer text-center group"
              >
                <Zap className="w-4 h-4 text-yellow-300 transition-transform group-hover:scale-110" />
                <span>Launch Console (Quick Access)</span>
              </a>

              {/* Google Login Button */}
              <a
                href={`${apiUrl}/api/auth/google`}
                className="w-full sm:w-auto px-6 py-3.5 bg-white hover:bg-gray-50 border border-brand-slate/20 text-black text-sm font-semibold rounded-xl transition-all duration-300 flex items-center justify-center gap-3 shadow-md hover:shadow-lg hover:scale-[1.02] group cursor-pointer"
              >
                <GoogleIcon className="transition-transform duration-300 group-hover:scale-110" />
                <span>Google Login</span>
              </a>
            </>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-5xl px-6 py-8 border-t border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-black/60 z-10 bg-white">
        <p>© {new Date().getFullYear()} FPMS Systems. All rights reserved.</p>
        <div className="flex gap-6">
          <a href="#privacy" className="hover:text-black transition-colors">Privacy Policy</a>
          <a href="#terms" className="hover:text-black transition-colors">Terms of Service</a>
          <a href="#support" className="hover:text-black transition-colors">Network Support</a>
        </div>
      </footer>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white" />}>
      <HomeContent />
    </Suspense>
  );
}
