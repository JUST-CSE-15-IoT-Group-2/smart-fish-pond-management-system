"use client";

import { useState, useEffect } from "react";

export default function PondStatusDashboard() {
  const [pumpActive, setPumpActive] = useState(true);
  const [feederStatus, setFeederStatus] = useState("Idle");
  const [flowRate, setFlowRate] = useState(75);
  const [waterTemp, setWaterTemp] = useState(24.5);
  const [oxygenLevel, setOxygenLevel] = useState(6.8);
  const [phLevel, setPhLevel] = useState(7.4);

  // Simulate slight fluctuation in live metrics to make it feel alive
  useEffect(() => {
    const interval = setInterval(() => {
      setWaterTemp((prev) => +(prev + (Math.random() - 0.5) * 0.2).toFixed(1));
      setOxygenLevel((prev) =>
        +(
          prev +
          (Math.random() - 0.5) * 0.1 +
          (pumpActive ? 0.05 : -0.05)
        ).toFixed(1)
      );
      setPhLevel((prev) => +(prev + (Math.random() - 0.5) * 0.05).toFixed(2));
    }, 3000);

    return () => clearInterval(interval);
  }, [pumpActive]);

  const triggerFeeding = () => {
    if (feederStatus !== "Idle") return;
    setFeederStatus("Feeding...");
    setTimeout(() => {
      setFeederStatus("Feeding Complete");
      setTimeout(() => setFeederStatus("Idle"), 2000);
    }, 3000);
  };

  return (
    <div className="w-full max-w-4xl bg-brand-slate rounded-2xl shadow-xl border border-brand-forest/20 overflow-hidden text-white transition-all duration-300">
      {/* Dashboard Header */}
      <div className="px-6 py-5 border-b border-brand-forest/10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <span className="text-xs uppercase tracking-widest text-brand-moss font-semibold">
            Pond ID: #FPM-209-NET
          </span>
          <h2 className="text-xl font-bold tracking-tight text-white mt-1">
            Network Operations Console
          </h2>
        </div>
        <div className="flex items-center gap-3 bg-brand-forest/30 px-3.5 py-1.5 rounded-full border border-brand-sage/20">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-moss opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-brand-moss"></span>
          </span>
          <span className="text-xs font-medium text-brand-moss tracking-wider uppercase">
            Live Link Connected
          </span>
        </div>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-brand-forest/10">
        {/* Metric 1 */}
        <div className="p-6 bg-brand-slate flex flex-col justify-between min-h-[120px]">
          <span className="text-xs font-semibold text-brand-moss uppercase tracking-wider">
            Water Temp
          </span>
          <div className="flex items-baseline gap-1 mt-2">
            <span className="text-3xl font-bold tracking-tight text-white">
              {waterTemp}
            </span>
            <span className="text-sm text-brand-moss font-medium">°C</span>
          </div>
          <span className="text-xs text-white/70 mt-2">Optimal range: 22-26°C</span>
        </div>

        {/* Metric 2 */}
        <div className="p-6 bg-brand-slate flex flex-col justify-between min-h-[120px]">
          <span className="text-xs font-semibold text-brand-moss uppercase tracking-wider">
            pH Level
          </span>
          <div className="flex items-baseline gap-1 mt-2">
            <span className="text-3xl font-bold tracking-tight text-white">
              {phLevel}
            </span>
            <span className="text-sm text-brand-moss font-medium">pH</span>
          </div>
          <span className="text-xs text-white/70 mt-2">Optimal range: 7.0-8.0</span>
        </div>

        {/* Metric 3 */}
        <div className="p-6 bg-brand-slate flex flex-col justify-between min-h-[120px]">
          <span className="text-xs font-semibold text-brand-moss uppercase tracking-wider">
            Dissolved Oxygen
          </span>
          <div className="flex items-baseline gap-1 mt-2">
            <span className="text-3xl font-bold tracking-tight text-white">
              {oxygenLevel}
            </span>
            <span className="text-sm text-brand-moss font-medium">mg/L</span>
          </div>
          <span className="text-xs text-white/70 mt-2">Optimal range: &gt; 5.0</span>
        </div>

        {/* Metric 4 */}
        <div className="p-6 bg-brand-slate flex flex-col justify-between min-h-[120px]">
          <span className="text-xs font-semibold text-brand-moss uppercase tracking-wider">
            Filter Flow Rate
          </span>
          <div className="flex items-baseline gap-1 mt-2">
            <span className="text-3xl font-bold tracking-tight text-white">
              {pumpActive ? `${flowRate}%` : "0%"}
            </span>
          </div>
          <span className="text-xs text-white/70 mt-2">
            {pumpActive ? "Pump Status: Good" : "Pump Status: Stopped"}
          </span>
        </div>
      </div>

      {/* Control Actions & Visuals Section */}
      <div className="p-6 bg-[#1f282b] border-t border-brand-forest/10 grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
        {/* Control Box */}
        <div className="space-y-5">
          <h3 className="text-sm font-bold uppercase tracking-wider text-brand-moss">
            Network Commands
          </h3>
          
          <div className="flex flex-wrap gap-3">
            {/* Pump Toggle Button */}
            <button
              onClick={() => setPumpActive(!pumpActive)}
              className={`px-4 py-2.5 rounded-lg text-sm font-semibold tracking-wide transition-all duration-300 shadow-md flex items-center gap-2 cursor-pointer ${
                pumpActive
                  ? "bg-brand-forest hover:bg-brand-sage text-white"
                  : "bg-brand-sage hover:bg-brand-moss text-white"
              }`}
            >
              <svg
                className={`w-4 h-4 text-white ${pumpActive ? "animate-spin" : ""}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              {pumpActive ? "Stop Aeration Pump" : "Start Aeration Pump"}
            </button>

            {/* Feeder Button */}
            <button
              onClick={triggerFeeding}
              disabled={feederStatus !== "Idle"}
              className={`px-4 py-2.5 rounded-lg text-sm font-semibold tracking-wide transition-all duration-300 shadow-md cursor-pointer ${
                feederStatus === "Idle"
                  ? "bg-brand-forest hover:bg-brand-sage text-white"
                  : "bg-brand-slate text-white/50 border border-brand-forest/20 cursor-not-allowed"
              }`}
            >
              {feederStatus === "Idle" ? "Dispense Feed" : feederStatus}
            </button>
          </div>

          {/* Flow Rate Slider */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-brand-moss uppercase tracking-wider">
                Water Flow Controller
              </span>
              <span className="font-bold text-white">
                {pumpActive ? `${flowRate} L/min` : "0 L/min"}
              </span>
            </div>
            <input
              type="range"
              min="20"
              max="150"
              value={flowRate}
              onChange={(e) => setFlowRate(Number(e.target.value))}
              disabled={!pumpActive}
              className="w-full h-1.5 bg-brand-slate rounded-lg appearance-none cursor-pointer accent-brand-moss border border-brand-forest/20 disabled:opacity-40 disabled:cursor-not-allowed"
            />
          </div>
        </div>

        {/* Dynamic Water Animation Visualizer */}
        <div className="relative h-28 bg-brand-slate rounded-xl overflow-hidden border border-brand-forest/20 flex items-center justify-center">
          <div className="absolute inset-0 z-0 opacity-20 flex flex-col justify-end">
            <svg
              className={`w-[200%] h-16 fill-brand-moss/80 translate-y-3 ${
                pumpActive ? "animate-wave" : "transition-transform duration-1000 translate-y-8"
              }`}
              viewBox="0 0 1200 120"
              xmlns="http://www.w3.org/2000/svg"
              preserveAspectRatio="none"
            >
              <path d="M0,60 C150,90 350,30 500,60 C650,90 850,30 1000,60 C1150,90 1350,30 1500,60 L1500,120 L0,120 Z" />
            </svg>
            <svg
              className={`w-[200%] h-12 fill-brand-sage/60 translate-y-3 -mt-8 ${
                pumpActive
                  ? "animate-wave [animation-delay:-4s] [animation-duration:8s]"
                  : "transition-transform duration-1000 translate-y-8"
              }`}
              viewBox="0 0 1200 120"
              xmlns="http://www.w3.org/2000/svg"
              preserveAspectRatio="none"
            >
              <path d="M0,50 C150,20 350,80 500,50 C650,20 850,80 1000,50 C1150,20 1350,80 1500,50 L1500,120 L0,120 Z" />
            </svg>
          </div>
          
          <div className="z-10 text-center flex flex-col items-center">
            <div className="text-xs uppercase tracking-widest text-brand-moss font-semibold">
              Aeration Velocity
            </div>
            <div className="text-xl font-bold tracking-tight text-white mt-1">
              {pumpActive ? `${(flowRate * 1.5).toFixed(0)} RPM` : "OFFLINE"}
            </div>
            {pumpActive && (
              <span className="text-[10px] text-brand-sage font-medium mt-1">
                Water turnover: ~3.2 hrs
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
