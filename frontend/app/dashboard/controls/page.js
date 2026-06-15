"use client";

import { useState, useEffect, useRef } from "react";
import { Trash2, Plus, Power, ShieldAlert, Wifi, WifiOff, RefreshCw, Clock, Gauge } from "lucide-react";
import { controlsApi } from "../../../lib/api";
import { io } from "socket.io-client";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

// Speed colour: green at low, amber at mid, blue at full
function getSpeedColor(speed) {
  if (speed < 30) return "#9CB080"; // brand-moss (low)
  if (speed < 70) return "#f59e0b"; // amber (mid)
  return "#60a5fa";                 // blue (high)
}

export default function ControlsPage() {
  const [connectionActive, setConnectionActive] = useState(true);
  const [motorEnabled, setMotorEnabled] = useState(false);
  const [motorSpeed, setMotorSpeed] = useState(50);
  const [pendingSpeed, setPendingSpeed] = useState(50); // local slider value before save
  const [feedingTimes, setFeedingTimes] = useState([]);
  const [newTime, setNewTime] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const socketRef = useRef(null);
  const speedDebounceRef = useRef(null);

  // ─── Initial data fetch ────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        const [feedingData, motorData] = await Promise.all([
          controlsApi.getFeeding(),
          controlsApi.getMotor(),
        ]);
        setFeedingTimes(feedingData.times || []);
        setMotorEnabled(motorData.enabled);
        setConnectionActive(motorData.connectionActive);
        setMotorSpeed(motorData.speed ?? 50);
        setPendingSpeed(motorData.speed ?? 50);
      } catch (err) {
        console.error("Failed to load controls:", err);
      } finally {
        setLoading(false);
      }
    };
    load();

    // Socket.IO for real-time motor/connection state updates
    const socket = io(API_URL);
    socketRef.current = socket;

    socket.on("motor:update", ({ enabled, connectionActive: conn, speed }) => {
      setMotorEnabled(enabled);
      setConnectionActive(conn);
      if (speed !== undefined) {
        setMotorSpeed(speed);
        setPendingSpeed(speed);
      }
    });

    return () => socket.disconnect();
  }, []);

  // ─── Feeding schedule handlers ─────────────────────────────────────────
  const handleAddTime = async (e) => {
    e.preventDefault();
    if (!newTime) return;

    const [hours, minutes] = newTime.split(":");
    const hourNum = parseInt(hours);
    const ampm = hourNum >= 12 ? "PM" : "AM";
    const formattedHour = hourNum % 12 || 12;
    const timeString = `${String(formattedHour).padStart(2, "0")}:${minutes} ${ampm}`;

    if (feedingTimes.includes(timeString)) { setNewTime(""); return; }

    const updatedTimes = [...feedingTimes, timeString].sort();
    setFeedingTimes(updatedTimes);
    setNewTime("");
    setSaving(true);
    try { await controlsApi.setFeeding(updatedTimes); }
    catch (err) { console.error("Failed to save feeding schedule:", err); }
    finally { setSaving(false); }
  };

  const handleRemoveTime = async (timeToRemove) => {
    const updatedTimes = feedingTimes.filter((t) => t !== timeToRemove);
    setFeedingTimes(updatedTimes);
    setSaving(true);
    try { await controlsApi.setFeeding(updatedTimes); }
    catch (err) { console.error("Failed to save feeding schedule:", err); }
    finally { setSaving(false); }
  };

  // ─── Motor toggle ──────────────────────────────────────────────────────
  const handleMotorToggle = async () => {
    const newState = !motorEnabled;
    setMotorEnabled(newState);
    try {
      await controlsApi.setMotor({ enabled: newState });
    } catch (err) {
      console.error("Failed to update motor state:", err);
      setMotorEnabled(!newState);
    }
  };

  // ─── Speed slider — debounced save ────────────────────────────────────
  const handleSpeedChange = (e) => {
    const val = Number(e.target.value);
    setPendingSpeed(val);

    // Debounce: wait 400ms after user stops sliding before saving
    clearTimeout(speedDebounceRef.current);
    speedDebounceRef.current = setTimeout(async () => {
      setMotorSpeed(val);
      try {
        await controlsApi.setMotor({ speed: val });
      } catch (err) {
        console.error("Failed to update speed:", err);
      }
    }, 400);
  };

  // ─── Connection toggle ─────────────────────────────────────────────────
  const handleConnectionToggle = async () => {
    const newConn = !connectionActive;
    setConnectionActive(newConn);
    if (!newConn) setMotorEnabled(false);
    try {
      await controlsApi.setMotor({ connectionActive: newConn });
    } catch (err) {
      console.error("Failed to update connection state:", err);
      setConnectionActive(!newConn);
    }
  };

  const speedColor = getSpeedColor(pendingSpeed);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-100 pb-5">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-black">Network Controls</h2>
          <p className="text-sm text-black/60 mt-1">
            Configure feeding schedules, toggle auxiliary motors, and manage node connections.
          </p>
        </div>

        {connectionActive ? (
          <div className="flex items-center gap-2 bg-emerald-50 text-emerald-800 border border-emerald-100 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span>Gateway: Connected</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 bg-rose-50 text-rose-800 border border-rose-100 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider">
            <span className="h-2 w-2 rounded-full bg-rose-500"></span>
            <span>Gateway: Offline</span>
          </div>
        )}
      </div>

      {/* Disconnection Warning */}
      {!connectionActive && (
        <div className="p-4 bg-brand-slate text-white rounded-xl border border-brand-forest/20 flex items-start gap-3 animate-pulse">
          <ShieldAlert className="w-5 h-5 text-brand-moss shrink-0 mt-0.5" />
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-brand-moss">CONSOLE LINK SEVERED</h4>
            <p className="text-xs text-white/80 mt-1 leading-relaxed">
              The control interface has been disconnected from the local pond node. All outgoing commands are blocked until the socket connection is restored.
            </p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16 text-black/40 text-sm">
          Loading controls...
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Card 1: Feeding Schedule */}
          <div className={`p-6 bg-white rounded-2xl border border-gray-100 shadow-sm space-y-6 text-black transition-opacity duration-300 ${
            !connectionActive ? "opacity-50 pointer-events-none select-none" : ""
          }`}>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <h3 className="font-bold text-lg tracking-tight text-black flex items-center gap-2">
                  <Clock className="w-5 h-5 text-brand-forest" />
                  Feeding Schedule Manager
                </h3>
                <p className="text-xs text-black/60">Program multiple automatic food dispensing times</p>
              </div>
              <div className="flex items-center gap-2">
                {saving && <RefreshCw className="w-4 h-4 animate-spin text-brand-forest" />}
                <span className="text-xs font-bold text-brand-forest bg-brand-sage/10 border border-brand-sage/20 px-2.5 py-1 rounded-full">
                  {feedingTimes.length} Scheduled
                </span>
              </div>
            </div>

            <form onSubmit={handleAddTime} className="flex gap-2">
              <input
                type="time"
                value={newTime}
                onChange={(e) => setNewTime(e.target.value)}
                className="flex-1 px-3 py-2.5 rounded-xl border border-brand-slate/20 focus:border-brand-forest focus:outline-none text-sm text-black bg-white"
                disabled={!connectionActive}
              />
              <button
                type="submit"
                className="px-4 py-2.5 bg-brand-forest hover:bg-brand-sage text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow-md transition-all duration-300 flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!connectionActive || !newTime}
              >
                <Plus className="w-4 h-4" />
                <span>Add Event</span>
              </button>
            </form>

            <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
              {feedingTimes.length === 0 ? (
                <div className="text-center py-8 border border-dashed border-gray-200 rounded-xl text-black/50 text-xs">
                  No feeding times programmed. The auto-feeder is currently idle.
                </div>
              ) : (
                feedingTimes.map((time, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3.5 bg-gray-50 border border-gray-200/50 rounded-xl hover:border-brand-forest/20 transition-all duration-300"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-brand-forest/15 flex items-center justify-center text-brand-forest font-bold text-xs">
                        {index + 1}
                      </div>
                      <span className="text-sm font-bold text-black">{time}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveTime(time)}
                      className="p-1.5 rounded-lg text-black hover:text-rose-600 hover:bg-rose-50 border border-transparent transition-colors cursor-pointer"
                      title="Delete Time"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-6">

            {/* Card 2: Motor */}
            <div className={`p-6 bg-brand-slate text-white rounded-2xl border border-brand-forest/20 shadow-lg space-y-5 transition-all duration-300 ${
              !connectionActive ? "opacity-50 pointer-events-none select-none" : ""
            }`}>
              {/* Header */}
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <span className="text-[10px] uppercase tracking-widest text-brand-moss font-semibold">
                    Aerator System
                  </span>
                  <h3 className="text-lg font-bold text-white">Oxygen Dissolving Motor</h3>
                  <p className="text-xs text-white/75 leading-relaxed max-w-sm">
                    Enable aeration paddle wheels to dissolve atmospheric oxygen into pond water.
                  </p>
                </div>

                {/* Spinning Fan */}
                <div
                  className={`p-3.5 rounded-2xl bg-brand-forest/40 border border-brand-sage/20 transition-all duration-500 ${
                    motorEnabled && connectionActive ? "animate-spin-slow" : ""
                  }`}
                  style={{ borderColor: motorEnabled ? speedColor + "40" : undefined }}
                >
                  <Power className="w-6 h-6 text-white" />
                </div>
              </div>

              {/* ── Speed Slider ── */}
              <div className="space-y-3 pt-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-brand-moss uppercase tracking-wider flex items-center gap-1.5">
                    <Gauge className="w-3.5 h-3.5" />
                    Aeration Speed
                  </span>
                  <span
                    className="text-sm font-extrabold tabular-nums transition-colors duration-300"
                    style={{ color: speedColor }}
                  >
                    {pendingSpeed}%
                  </span>
                </div>

                {/* Track + thumb */}
                <div className="relative">
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={1}
                    value={pendingSpeed}
                    onChange={handleSpeedChange}
                    disabled={!connectionActive}
                    className="w-full h-2 rounded-full appearance-none cursor-pointer disabled:cursor-not-allowed"
                    style={{
                      background: `linear-gradient(to right, ${speedColor} 0%, ${speedColor} ${pendingSpeed}%, rgba(255,255,255,0.15) ${pendingSpeed}%, rgba(255,255,255,0.15) 100%)`,
                    }}
                  />
                  {/* Speed labels */}
                  <div className="flex justify-between text-[9px] text-white/40 font-medium mt-1 px-0.5">
                    <span>0%</span>
                    <span>25%</span>
                    <span>50%</span>
                    <span>75%</span>
                    <span>100%</span>
                  </div>
                </div>

                {/* Speed preset buttons */}
                <div className="flex gap-2 pt-1">
                  {[25, 50, 75, 100].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      disabled={!connectionActive}
                      onClick={() => {
                        setPendingSpeed(preset);
                        setMotorSpeed(preset);
                        controlsApi.setMotor({ speed: preset }).catch(console.error);
                      }}
                      className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer disabled:cursor-not-allowed ${
                        pendingSpeed === preset
                          ? "bg-white/20 text-white border border-white/30"
                          : "bg-white/5 text-white/50 border border-white/10 hover:bg-white/10 hover:text-white"
                      }`}
                    >
                      {preset}%
                    </button>
                  ))}
                </div>
              </div>

              {/* Toggle */}
              <div className="flex items-center justify-between pt-2 border-t border-brand-forest/10">
                <span className="text-xs font-semibold text-brand-moss uppercase tracking-wider">
                  Motor: <strong className="text-white">{motorEnabled ? "RUNNING" : "STOPPED"}</strong>
                  {motorEnabled && (
                    <span className="ml-2 text-white/60">@ {motorSpeed}%</span>
                  )}
                </span>
                <button
                  onClick={handleMotorToggle}
                  disabled={!connectionActive}
                  className={`px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-300 shadow-md cursor-pointer disabled:opacity-50 ${
                    motorEnabled
                      ? "bg-brand-forest hover:bg-brand-sage text-white"
                      : "bg-brand-sage hover:bg-brand-moss text-white"
                  }`}
                >
                  {motorEnabled ? "Disable Motor" : "Enable Motor"}
                </button>
              </div>
            </div>

            {/* Card 3: Connection Controller */}
            <div className="p-6 bg-white rounded-2xl border border-gray-100 shadow-sm space-y-4 text-black">
              <h3 className="font-bold text-lg tracking-tight text-black flex items-center gap-2">
                <Wifi className="w-5 h-5 text-brand-forest" />
                Link Controller
              </h3>
              <p className="text-xs text-black/60 leading-relaxed">
                Perform testing routines by severing console connection links. This triggers fail-safe emergency shutdowns in microcontroller nodes.
              </p>

              <div className="pt-2 flex justify-between items-center gap-3">
                <span className="text-xs font-bold text-black uppercase tracking-wider flex items-center gap-1.5">
                  {connectionActive ? (
                    <>
                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                      Sync Normal
                    </>
                  ) : (
                    <>
                      <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
                      Link Broken
                    </>
                  )}
                </span>

                {connectionActive ? (
                  <button
                    type="button"
                    onClick={handleConnectionToggle}
                    className="px-4 py-2.5 bg-brand-slate hover:bg-brand-forest text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all duration-300 shadow-md flex items-center gap-1.5 cursor-pointer"
                  >
                    <WifiOff className="w-4 h-4" />
                    <span>Kill Connection</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleConnectionToggle}
                    className="px-4 py-2.5 bg-brand-forest hover:bg-brand-sage text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all duration-300 shadow-md flex items-center gap-1.5 cursor-pointer"
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span>Reconnect Console</span>
                  </button>
                )}
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
