"use client";

import Image from "next/image";
import GoogleIcon from "../components/GoogleIcon";

export default function Home() {
  // Dynamic API URL — works from localhost OR LAN IP (192.168.x.x)
  const apiUrl = typeof window !== "undefined"
    ? `http://${window.location.hostname}:5000`
    : (process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000");

  return (
    <div className="relative min-h-screen bg-white text-black font-sans flex flex-col items-center justify-start overflow-x-hidden selection:bg-brand-moss selection:text-white">

      {/* Floating Navigation */}
      <nav className="fixed top-6 left-1/2 -translate-x-1/2 w-[90%] max-w-5xl bg-brand-slate text-white px-6 py-3.5 rounded-full flex items-center justify-between shadow-lg backdrop-blur-md z-50 border border-brand-forest/20 transition-all duration-300 hover:shadow-xl">
        <div className="flex items-center gap-2.5">
          {/* Logo Icon */}
          <div className="bg-brand-forest p-2 rounded-full flex items-center justify-center">
            <svg
              className="w-4 h-4 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
              />
            </svg>
          </div>
          <span className="font-bold tracking-tight text-sm sm:text-base">FPMS</span>
        </div>

        {/* Desktop Navigation Links */}
        <div className="hidden md:flex items-center gap-8 text-xs font-semibold uppercase tracking-wider text-white">
          <a href="#monitor" className="hover:text-brand-moss transition-colors">Monitor</a>
          <a href="#controls" className="hover:text-brand-moss transition-colors">Controls</a>
          <a href="#network" className="hover:text-brand-moss transition-colors">Network</a>
        </div>

        {/* Dev Sign-in in Nav */}
        <div>
          <a
            href={`${apiUrl}/api/auth/dev-login`}
            className="bg-brand-moss hover:bg-white border border-brand-moss text-white hover:text-black text-xs font-semibold px-4 py-2 rounded-full shadow-md transition-all duration-300 flex items-center gap-2 group cursor-pointer"
          >
            <span>LAN Login</span>
          </a>
        </div>
      </nav>

      {/* Grid Pattern Background Accent */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#e5e7eb_1px,transparent_1px),linear-gradient(to_bottom,#e5e7eb_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none opacity-40 z-0"></div>

      {/* Hero Section */}
      <main className="relative z-10 w-full max-w-5xl px-6 pt-36 pb-24 flex flex-col items-center justify-start text-center flex-1">

        {/* Network Status Badge */}
        <div className="mb-6 inline-flex items-center gap-2 border border-brand-slate/20 rounded-full px-3.5 py-1 text-xs font-bold text-black uppercase tracking-wider bg-white/80 shadow-sm">
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
          {/* Launch Console — goes directly to dashboard (if already logged in) */}
          <a
            href="/dashboard"
            className="w-full sm:w-auto px-7 py-3.5 bg-brand-forest hover:bg-brand-sage text-white text-sm font-semibold rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-[1.02] cursor-pointer text-center"
          >
            Launch Console
          </a>

          {/* Google Login Button */}
          <a
            href={`${apiUrl}/api/auth/google`}
            className="w-full sm:w-auto px-6 py-3.5 bg-white hover:bg-gray-50 border border-brand-slate/20 text-black text-sm font-semibold rounded-xl transition-all duration-300 flex items-center justify-center gap-3 shadow-md hover:shadow-lg hover:scale-[1.02] group cursor-pointer"
          >
            <GoogleIcon className="transition-transform duration-300 group-hover:scale-110" />
            <span>Google Login</span>
          </a>

          {/* Dev Login Button */}
          <a
            href={`${apiUrl}/api/auth/dev-login`}
            className="w-full sm:w-auto px-6 py-3.5 bg-brand-slate hover:bg-brand-moss text-white text-sm font-semibold rounded-xl transition-all duration-300 flex items-center justify-center gap-3 shadow-md hover:shadow-lg hover:scale-[1.02] cursor-pointer"
          >
            <span>📱 LAN Testing Login</span>
          </a>
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
