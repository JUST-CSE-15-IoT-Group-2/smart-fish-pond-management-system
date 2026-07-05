"use client";

import Image from "next/image";
import { Waves } from "lucide-react";

export default function Home() {
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
          <a href="/dashboard/updates" className="hover:text-brand-moss transition-colors">Updates</a>
          <a href="/dashboard/controls" className="hover:text-brand-moss transition-colors">Controls</a>
          <a href="/dashboard/settings" className="hover:text-brand-moss transition-colors">Network</a>
        </div>

        {/* (Removed LAN Login link) */}
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
          {/* Launch Console — goes directly to dashboard */}
          <a
            href="/dashboard"
            className="w-full sm:w-auto px-10 py-4 bg-brand-forest hover:bg-brand-sage text-white text-sm font-bold rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-[1.02] cursor-pointer text-center uppercase tracking-wider"
          >
            Launch Console
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
