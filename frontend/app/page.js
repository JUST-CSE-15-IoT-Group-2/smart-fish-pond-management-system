"use client";

import Image from "next/image";
import { Waves, BarChart3, Zap, Shield, Smartphone, TrendingUp, MapPin, Clock } from "lucide-react";

export default function Home() {
  const features = [
    {
      icon: BarChart3,
      title: "Real-Time Monitoring",
      description: "Track water pH, temperature, and oxygen levels with instant telemetry updates across your network.",
    },
    {
      icon: Zap,
      title: "Automatic Feeding",
      description: "Schedule and manage feeding automation with precision control and intelligent distribution systems.",
    },
    {
      icon: Shield,
      title: "Secure Network",
      description: "Enterprise-grade security protocols protecting your aquaculture data and device communications.",
    },
    {
      icon: Smartphone,
      title: "Remote Access",
      description: "Control your pond system from anywhere with our responsive web and mobile interface.",
    },
    {
      icon: TrendingUp,
      title: "Analytics Dashboard",
      description: "Comprehensive insights with historical data analysis and performance trend visualization.",
    },
    {
      icon: Clock,
      title: "24/7 Automation",
      description: "Continuous system monitoring with automated alerts and intelligent device management.",
    },
  ];

  const stats = [
    { value: "99.9%", label: "Network Uptime" },
    { value: "<500ms", label: "Sensor Response" },
    { value: "Real-Time", label: "Data Sync" },
    { value: "∞", label: "Scalability" },
  ];

  return (
    <div className="relative min-h-screen bg-white text-black font-sans flex flex-col items-center justify-start overflow-x-hidden selection:bg-brand-moss selection:text-white">

      {/* Floating Navigation */}
      <nav className="fixed top-6 left-1/2 -translate-x-1/2 w-[90%] max-w-5xl bg-brand-slate text-white px-6 py-3.5 rounded-full flex items-center justify-between shadow-lg backdrop-blur-md z-50 border border-brand-forest/20 transition-all duration-300 hover:shadow-xl">
        <div className="flex items-center gap-2.5">
          <div className="bg-brand-forest p-2 rounded-full flex items-center justify-center">
            <Waves className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold tracking-tight text-sm sm:text-base">FPMS</span>
        </div>

        <div className="hidden md:flex items-center gap-8 text-xs font-semibold uppercase tracking-wider text-white">
          <a href="/dashboard/updates" className="hover:text-brand-moss transition-colors">Updates</a>
          <a href="/dashboard/controls" className="hover:text-brand-moss transition-colors">Controls</a>
          <a href="/dashboard/settings" className="hover:text-brand-moss transition-colors">Network</a>
        </div>
      </nav>

      {/* Grid Pattern Background Accent */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#e5e7eb_1px,transparent_1px),linear-gradient(to_bottom,#e5e7eb_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none opacity-40 z-0"></div>

      {/* Hero Section */}
      <main className="relative z-10 w-full max-w-5xl px-6 pt-36 pb-20 flex flex-col items-center justify-start text-center flex-1">
        <div className="mb-6 inline-flex items-center gap-2 border border-brand-slate/20 rounded-full px-3.5 py-1 text-xs font-bold text-black uppercase tracking-wider bg-white/80 shadow-sm">
          Network-Enabled IoT Ecosystem
        </div>

        <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-black leading-[1.15] max-w-4xl">
          Fish Pond <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-slate via-brand-forest to-brand-sage">Management System</span>
        </h1>

        <p className="mt-6 text-base sm:text-lg md:text-xl text-black max-w-2xl font-light leading-relaxed">
          Take control of your aquaculture infrastructure over the network. Real-time water parameter telemetry, automatic device management, and remote feeding automation combined in one beautiful network interface.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 w-full sm:w-auto">
          <a
            href="/dashboard"
            className="w-full sm:w-auto px-10 py-4 bg-brand-forest hover:bg-brand-sage text-white text-sm font-bold rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-[1.02] cursor-pointer text-center uppercase tracking-wider"
          >
            Launch Console
          </a>
        </div>
      </main>

      {/* Stats Section */}
      <section className="relative z-10 w-full max-w-5xl px-6 py-16 flex items-center justify-center">
        <div className="w-full grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
          {stats.map((stat, idx) => (
            <div key={idx} className="flex flex-col items-center justify-center p-6 rounded-xl bg-gradient-to-br from-brand-slate/5 to-brand-forest/5 shadow-sm hover:shadow-md transition-shadow duration-300">
              <p className="text-2xl md:text-3xl font-bold text-brand-forest">{stat.value}</p>
              <p className="text-xs md:text-sm text-black/70 font-semibold uppercase tracking-wider mt-2">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features Section - Cards with Shadows */}
      <section className="relative z-10 w-full max-w-5xl px-6 py-24 flex flex-col items-center justify-start">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-black mb-4">Powerful Features</h2>
          <p className="text-lg text-black/70 max-w-2xl">Everything you need to manage your aquaculture system efficiently and effectively</p>
        </div>

        <div className="w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          {features.map((feature, idx) => {
            const Icon = feature.icon;
            return (
              <div
                key={idx}
                className="group relative p-8 bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 overflow-hidden"
              >
                {/* Gradient overlay on hover */}
                <div className="absolute inset-0 bg-gradient-to-br from-brand-forest/3 to-brand-sage/3 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                
                <div className="relative z-10">
                  <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-brand-forest to-brand-sage rounded-xl mb-6 shadow-md group-hover:shadow-lg transition-shadow">
                    <Icon className="w-7 h-7 text-white" />
                  </div>
                  
                  <h3 className="text-xl font-bold text-black mb-3 group-hover:text-brand-forest transition-colors">
                    {feature.title}
                  </h3>
                  
                  <p className="text-black/70 font-light leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* How It Works Section */}
      <section className="relative z-10 w-full max-w-5xl px-6 py-24 flex flex-col items-center justify-start">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-black mb-4">How It Works</h2>
          <p className="text-lg text-black/70 max-w-2xl">A simple, streamlined workflow for managing your aquaculture ecosystem</p>
        </div>

        <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
          {[
            { step: "01", title: "Connect Devices", desc: "Link your IoT sensors and controllers to the network" },
            { step: "02", title: "Monitor & Track", desc: "Real-time data collection and parameter tracking" },
            { step: "03", title: "Automate & Control", desc: "Set schedules and manage systems remotely" },
          ].map((item, idx) => (
            <div key={idx} className="relative p-8 bg-white rounded-2xl shadow-lg hover:shadow-xl transition-shadow duration-300">
              <div className="flex items-start gap-6">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center h-12 w-12 rounded-xl bg-brand-forest text-white font-bold text-lg shadow-md">
                    {item.step}
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-black mb-2">{item.title}</h3>
                  <p className="text-black/70 text-sm">{item.desc}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative z-10 w-full max-w-5xl px-6 py-24">
        <div className="w-full bg-gradient-to-r from-brand-slate to-brand-forest rounded-3xl shadow-2xl p-12 md:p-16 text-white text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">Ready to Transform Your Aquaculture?</h2>
          <p className="text-lg text-white/90 mb-8 max-w-2xl mx-auto">
            Join modern pond managers who are automating their systems and maximizing efficiency
          </p>
          <a
            href="/dashboard"
            className="inline-block px-12 py-4 bg-white text-brand-forest font-bold rounded-xl hover:bg-brand-moss hover:text-white transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-[1.02] uppercase tracking-wider"
          >
            Start Managing Today
          </a>
        </div>
      </section>

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
