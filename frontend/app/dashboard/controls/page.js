"use client";

import { useState, useEffect, useRef } from "react";
import {
  Trash2, Plus, Power, ShieldAlert, Wifi, WifiOff,
  RefreshCw, Clock, Hand, CalendarClock, Timer, MapPin, CloudRain,
  Thermometer, Droplets, Wind, Mountain,
} from "lucide-react";
import { controlsApi, settingsApi } from "../../../lib/api";

const API_URL = typeof window !== 'undefined'
  ? `http://${window.location.hostname}:5000`
  : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000');


export default function ControlsPage() {
  // ── Oxygen motor ──
  const [connectionActive, setConnectionActive] = useState(true);
  const [motorEnabled, setMotorEnabled]         = useState(false);
  const [motorAutoMode, setMotorAutoMode]       = useState(false);

  // ── Feeding ──
  const [feedingTimes, setFeedingTimes]         = useState([]);
  const [durationMinutes, setDurationMinutes]   = useState(1);
  const [pendingDuration, setPendingDuration]   = useState(1);
  const [manualMode, setManualMode]             = useState(false);
  const [manualActive, setManualActive]         = useState(false);
  const [newTime, setNewTime]                   = useState("");

  // ── UI ──
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);

  // ── Location/Map ──
  const [latitude, setLatitude]                 = useState(52.52);
  const [longitude, setLongitude]               = useState(13.41);
  const [savingLocation, setSavingLocation]     = useState(false);
  const [mapLoaded, setMapLoaded]               = useState(false);

  const [weatherTemp, setWeatherTemp]           = useState(null);
  const [weatherHumidity, setWeatherHumidity]   = useState(null);
  const [weatherWindSpeed, setWeatherWindSpeed] = useState(null);
  const [weatherRain, setWeatherRain]           = useState(null);
  const [weatherCode, setWeatherCode]           = useState(null);
  const [weatherStatus, setWeatherStatus]       = useState(null);
  const [weatherTime, setWeatherTime]           = useState(null);
  const [weatherElevation, setWeatherElevation] = useState(null);

  const mapRef = useRef(null);
  const markerRef = useRef(null);

  const socketRef       = useRef(null);
  const durationDebounce = useRef(null);

  // ── Load initial data ────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        // Load motor (public) and feeding (auth-required) independently
        // so a 401 on feeding doesn't block the whole page
        const [feedingResult, motorData, settingsResult] = await Promise.allSettled([
          controlsApi.getFeeding(),
          controlsApi.getMotor(),
          settingsApi.get(),
        ]);

        if (feedingResult.status === 'fulfilled') {
          const feedingData = feedingResult.value;
          setFeedingTimes(feedingData.times || []);
          setDurationMinutes(feedingData.durationMinutes ?? 1);
          setPendingDuration(feedingData.durationMinutes ?? 1);
          setManualMode(feedingData.manualMode ?? false);
          setManualActive(feedingData.manualActive ?? false);
        } else {
          console.warn("Feeding data not available (auth may be required):", feedingResult.reason?.message);
        }

        if (motorData.status === 'fulfilled') {
          const motor = motorData.value;
          setMotorEnabled(motor.enabled);
          setConnectionActive(motor.connectionActive);
          setMotorAutoMode(motor.autoMode ?? false);
        }

        if (settingsResult.status === 'fulfilled') {
          const s = settingsResult.value;
          const lat = s.latitude ?? 52.52;
          const lon = s.longitude ?? 13.41;
          setLatitude(lat);
          setLongitude(lon);
          setWeatherTemp(s.weatherTemp);
          setWeatherHumidity(s.weatherHumidity);
          setWeatherWindSpeed(s.weatherWindSpeed);
          setWeatherRain(s.weatherRain);
          setWeatherCode(s.weatherCode);
          setWeatherStatus(s.weatherStatus);
          setWeatherTime(s.weatherTime);
          setWeatherElevation(s.weatherElevation);
          
          // If map is already initialized, update it
          if (mapRef.current) {
            mapRef.current.setView([lat, lon], 11);
          }
          if (markerRef.current) {
            markerRef.current.setLatLng([lat, lon]);
          }
        }
      } catch (err) {
        console.error("Failed to load controls:", err);
      } finally {
        setLoading(false);
      }
    };
    load();

    // Socket.IO for real-time updates
    let socket;
    import("socket.io-client").then(({ io }) => {
      socket = io(API_URL);
      socketRef.current = socket;

      socket.on("motor:update", ({ enabled, connectionActive: conn, autoMode }) => {
        setMotorEnabled(enabled);
        setConnectionActive(conn);
        if (autoMode !== undefined) setMotorAutoMode(autoMode);
      });

      socket.on("feeding:update", ({ times, durationMinutes: dur, manualMode: mm, manualActive: ma }) => {
        if (times)        setFeedingTimes(times);
        if (dur != null)  { setDurationMinutes(dur); setPendingDuration(dur); }
        if (mm != null)   setManualMode(mm);
        if (ma != null)   setManualActive(ma);
      });

      socket.on("weather:update", (data) => {
        setWeatherTemp(data.weatherTemp);
        setWeatherHumidity(data.weatherHumidity);
        setWeatherWindSpeed(data.weatherWindSpeed);
        setWeatherRain(data.weatherRain);
        setWeatherCode(data.weatherCode);
        setWeatherStatus(data.weatherStatus);
        setWeatherTime(data.weatherTime);
        setWeatherElevation(data.weatherElevation);
      });
    });

    return () => { if (socket) socket.disconnect(); };
  }, []);

  // ── Load Leaflet dynamically ─────────────────────────────────────
  useEffect(() => {
    if (typeof window === "undefined") return;

    if (window.L) {
      setMapLoaded(true);
      return;
    }

    // Inject Leaflet JS (CSS is imported globally in globals.css)
    const script = document.createElement("script");
    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.async = true;
    script.id = "leaflet-js";
    script.onload = () => {
      setMapLoaded(true);
    };
    document.body.appendChild(script);

    return () => {
      const existingScript = document.getElementById("leaflet-js");
      if (existingScript) document.body.removeChild(existingScript);
    };
  }, []);

  // ── Initialize Map ────────────────────────────────────────────────
  useEffect(() => {
    if (!mapLoaded || typeof window === "undefined" || !window.L) return;

    const L = window.L;

    if (mapRef.current) return;

    const container = document.getElementById("pond-location-map");
    if (!container) return;

    const map = L.map(container).setView([latitude, longitude], 11);
    mapRef.current = map;

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '© OpenStreetMap'
    }).addTo(map);

    delete L.Icon.Default.prototype._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    });

    const marker = L.marker([latitude, longitude], {
      draggable: true
    }).addTo(map);

    markerRef.current = marker;

    const handleUpdate = async (pos) => {
      setLatitude(pos.lat);
      setLongitude(pos.lng);
      setSavingLocation(true);
      try {
        await settingsApi.save({
          latitude: Number(pos.lat),
          longitude: Number(pos.lng),
        });
      } catch (err) {
        console.error("Failed to save location:", err);
      } finally {
        setSavingLocation(false);
      }
    };

    marker.on("dragend", () => {
      handleUpdate(marker.getLatLng());
    });

    map.on("click", (e) => {
      marker.setLatLng(e.latlng);
      handleUpdate(e.latlng);
    });

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [mapLoaded]);

  // ── Feeding schedule handlers ────────────────────────────────────
  const handleAddTime = async (e) => {
    e.preventDefault();
    if (!newTime) return;
    const [hours, minutes] = newTime.split(":");
    const hourNum = parseInt(hours);
    const ampm = hourNum >= 12 ? "PM" : "AM";
    const formattedHour = hourNum % 12 || 12;
    const timeString = `${String(formattedHour).padStart(2, "0")}:${minutes} ${ampm}`;
    if (feedingTimes.includes(timeString)) { setNewTime(""); return; }
    const updated = [...feedingTimes, timeString].sort();
    setFeedingTimes(updated);
    setNewTime("");
    setSaving(true);
    try { await controlsApi.setFeeding(updated); }
    catch (err) { console.error(err); }
    finally { setSaving(false); }
  };

  const handleRemoveTime = async (t) => {
    const updated = feedingTimes.filter((x) => x !== t);
    setFeedingTimes(updated);
    setSaving(true);
    try { await controlsApi.setFeeding(updated); }
    catch (err) { console.error(err); }
    finally { setSaving(false); }
  };

  // Duration — debounced save
  const handleDurationChange = (e) => {
    const val = Math.max(1, Math.min(60, Number(e.target.value)));
    setPendingDuration(val);
    clearTimeout(durationDebounce.current);
    durationDebounce.current = setTimeout(async () => {
      setDurationMinutes(val);
      try { await controlsApi.setFeedingDuration(val); }
      catch (err) { console.error(err); }
    }, 500);
  };

  // Manual mode toggle
  const handleManualModeToggle = async () => {
    const next = !manualMode;
    setManualMode(next);
    if (!next) setManualActive(false);
    try { await controlsApi.setManualMode(next); }
    catch (err) { console.error(err); setManualMode(!next); }
  };

  // Manual feeder on/off
  const handleManualActiveToggle = async () => {
    const next = !manualActive;
    setManualActive(next);
    try { await controlsApi.setManualActive(next); }
    catch (err) { console.error(err); setManualActive(!next); }
  };

  // ── Oxygen motor handlers ────────────────────────────────────────
  const handleMotorToggle = async () => {
    const next = !motorEnabled;
    setMotorEnabled(next);
    try { await controlsApi.setMotor({ enabled: next, speed: next ? 100 : 0 }); }
    catch (err) { console.error(err); setMotorEnabled(!next); }
  };

  const handleMotorAutoModeToggle = async () => {
    const next = !motorAutoMode;
    setMotorAutoMode(next);
    try { await controlsApi.setMotor({ autoMode: next }); }
    catch (err) { console.error(err); setMotorAutoMode(!next); }
  };

  const handleConnectionToggle = async () => {
    const next = !connectionActive;
    setConnectionActive(next);
    if (!next) setMotorEnabled(false);
    try { await controlsApi.setMotor({ connectionActive: next }); }
    catch (err) { console.error(err); setConnectionActive(!next); }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-100 pb-5">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-black">Network Controls</h2>
          <p className="text-sm text-black/60 mt-1">
            Configure feeding schedules, toggle motors, and manage node connections.
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
              The control interface has been disconnected from the local pond node. All outgoing commands are blocked.
            </p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16 text-black/40 text-sm">Loading controls...</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* ── Card 1: Feeding Schedule ── */}
          <div className={`p-6 bg-white rounded-2xl border border-gray-100 shadow-sm space-y-5 text-black transition-opacity duration-300 ${!connectionActive ? "opacity-50 pointer-events-none select-none" : ""}`}>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <h3 className="font-bold text-lg tracking-tight text-black flex items-center gap-2">
                  <Clock className="w-5 h-5 text-brand-forest" />
                  Feeding Motors — GPIO 23 & 25
                </h3>
                <p className="text-xs text-black/60">Auto-dispenser schedule + manual override</p>
              </div>
              {saving && <RefreshCw className="w-4 h-4 animate-spin text-brand-forest" />}
            </div>

            {/* Mode Toggle */}
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-200/60">
              <div className="flex items-center gap-2.5 text-sm font-semibold text-black">
                {manualMode
                  ? <><Hand className="w-4 h-4 text-amber-500" /> Manual Mode</>
                  : <><CalendarClock className="w-4 h-4 text-brand-forest" /> Scheduled Mode</>
                }
              </div>
              <button
                type="button"
                onClick={handleManualModeToggle}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-300 focus:outline-none cursor-pointer ${manualMode ? "bg-amber-400" : "bg-brand-forest"}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-300 ${manualMode ? "translate-x-6" : "translate-x-1"}`} />
              </button>
            </div>

            {/* Manual Mode Controls */}
            {manualMode ? (
              <div className="space-y-3">
                <p className="text-xs text-black/60 leading-relaxed">
                  Scheduled feeding is suspended. Use the button below to manually control the feeder motor.
                </p>
                <button
                  type="button"
                  onClick={handleManualActiveToggle}
                  className={`w-full py-3 rounded-xl text-sm font-bold uppercase tracking-wider transition-all duration-300 shadow-md flex items-center justify-center gap-2 cursor-pointer ${
                    manualActive
                      ? "bg-rose-500 hover:bg-rose-600 text-white"
                      : "bg-brand-forest hover:bg-brand-sage text-white"
                  }`}
                >
                  <Power className="w-4 h-4" />
                  {manualActive ? "Turn OFF Feeder" : "Turn ON Feeder"}
                </button>
                {manualActive && (
                  <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 px-3 py-2 rounded-lg">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse shrink-0" />
                    Feeder motor is currently running
                  </div>
                )}
              </div>
            ) : (
              <>
                {/* Duration Setting */}
                <div className="space-y-2">
                  <label className="flex items-center gap-1.5 text-xs font-bold text-black uppercase tracking-wider">
                    <Timer className="w-3.5 h-3.5 text-brand-forest" />
                    Run Duration per Feeding
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      min={1}
                      max={60}
                      value={pendingDuration}
                      onChange={handleDurationChange}
                      className="w-20 px-3 py-2 rounded-xl border border-brand-slate/20 focus:border-brand-forest focus:outline-none text-sm text-black bg-white text-center font-bold"
                    />
                    <span className="text-sm text-black/60 font-medium">minutes per feeding event</span>
                  </div>
                </div>

                {/* Time Schedule */}
                <form onSubmit={handleAddTime} className="flex gap-2">
                  <input
                    type="time"
                    value={newTime}
                    onChange={(e) => setNewTime(e.target.value)}
                    className="flex-1 px-3 py-2.5 rounded-xl border border-brand-slate/20 focus:border-brand-forest focus:outline-none text-sm text-black bg-white"
                  />
                  <button
                    type="submit"
                    disabled={!newTime}
                    className="px-4 py-2.5 bg-brand-forest hover:bg-brand-sage text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow-md transition-all duration-300 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <Plus className="w-4 h-4" />
                    Add Time
                  </button>
                </form>

                <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
                  {feedingTimes.length === 0 ? (
                    <div className="text-center py-6 border border-dashed border-gray-200 rounded-xl text-black/50 text-xs">
                      No feeding times programmed. Auto-feeder is idle.
                    </div>
                  ) : (
                    feedingTimes.map((time, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200/50 rounded-xl hover:border-brand-forest/20 transition-all">
                        <div className="flex items-center gap-3">
                          <div className="w-7 h-7 rounded-lg bg-brand-forest/15 flex items-center justify-center text-brand-forest font-bold text-xs">{index + 1}</div>
                          <span className="text-sm font-bold text-black">{time}</span>
                          <span className="text-xs text-black/40">→ {durationMinutes} min</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveTime(time)}
                          className="p-1.5 rounded-lg text-black hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </>
            )}
          </div>

          {/* Right Column */}
          <div className="space-y-6">

            {/* ── Card 2: Oxygen Dissolving Motor ── */}
            <div className={`p-6 bg-brand-slate text-white rounded-2xl border border-brand-forest/20 shadow-lg space-y-5 transition-all duration-300 ${!connectionActive ? "opacity-50 pointer-events-none select-none" : ""}`}>
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <span className="text-[10px] uppercase tracking-widest text-brand-moss font-semibold">Aerator System — GPIO 26</span>
                  <h3 className="text-lg font-bold text-white">Oxygen Dissolving Motor</h3>
                  <p className="text-xs text-white/75 leading-relaxed max-w-sm">
                    Enable aeration paddle wheels to dissolve atmospheric oxygen into pond water.
                  </p>
                </div>
                <div className={`p-3.5 rounded-2xl bg-brand-forest/40 border border-brand-sage/20 transition-all duration-500 ${motorEnabled && connectionActive ? "animate-spin-slow" : ""}`} style={{ borderColor: motorEnabled ? "rgba(156, 176, 128, 0.4)" : undefined }}>
                  <Power className="w-6 h-6 text-white" />
                </div>
              </div>

              {/* Mode Toggle */}
              <div className="flex items-center justify-between p-3 bg-brand-forest/25 rounded-xl border border-brand-sage/20">
                <div className="flex items-center gap-2.5 text-sm font-semibold text-white">
                  {motorAutoMode
                    ? <><CloudRain className="w-4 h-4 text-emerald-400" /> Weather Control</>
                    : <><Hand className="w-4 h-4 text-amber-400" /> Direct Control</>
                  }
                </div>
                <button
                  type="button"
                  onClick={handleMotorAutoModeToggle}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-300 focus:outline-none cursor-pointer ${motorAutoMode ? "bg-emerald-500" : "bg-brand-sage"}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-300 ${motorAutoMode ? "translate-x-6" : "translate-x-1"}`} />
                </button>
              </div>

              {motorAutoMode ? (
                <div className="space-y-3">
                  <p className="text-xs text-white/85 leading-relaxed">
                    Direct manual control is suspended. The motor is automatically triggered when rain is detected at the pond coordinates.
                  </p>
                  <div className="flex items-center gap-2 text-xs text-emerald-300 bg-brand-forest/35 border border-brand-sage/35 px-3 py-2 rounded-lg">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                    Weather tracking: {motorEnabled ? "Motor is RUNNING" : "Motor is STOPPED"}
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between pt-2 border-t border-brand-forest/10">
                  <span className="text-xs font-semibold text-brand-moss uppercase tracking-wider">
                    Motor: <strong className="text-white">{motorEnabled ? "RUNNING" : "STOPPED"}</strong>
                  </span>
                  <button
                    onClick={handleMotorToggle}
                    disabled={!connectionActive}
                    className={`px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-300 shadow-md cursor-pointer disabled:opacity-50 ${motorEnabled ? "bg-brand-forest hover:bg-brand-sage text-white" : "bg-brand-sage hover:bg-brand-moss text-white"}`}
                  >
                    {motorEnabled ? "Disable Motor" : "Enable Motor"}
                  </button>
                </div>
              )}
            </div>

            {/* ── Card: Pond Location Map ── */}
            <div className="p-6 bg-white rounded-2xl border border-gray-100 shadow-sm space-y-4 text-black">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <h3 className="font-bold text-lg tracking-tight text-black flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-brand-forest" />
                    Pond Location Map
                  </h3>
                  <p className="text-xs text-black/60 leading-relaxed max-w-sm">
                    Select the coordinates of your pond. The system checks weather at this location every 30 minutes.
                  </p>
                </div>
                {savingLocation && <RefreshCw className="w-4 h-4 animate-spin text-brand-forest" />}
              </div>

              <div className="flex gap-4 text-xs font-semibold">
                <div className="px-3 py-1.5 bg-gray-50 border border-gray-200/60 rounded-xl">
                  Lat: <span className="font-bold text-brand-forest">{latitude.toFixed(4)}</span>
                </div>
                <div className="px-3 py-1.5 bg-gray-50 border border-gray-200/60 rounded-xl">
                  Lon: <span className="font-bold text-brand-forest">{longitude.toFixed(4)}</span>
                </div>
              </div>

              {/* Weather Data Display Panel */}
              <div className="bg-gray-50 border border-gray-200/60 rounded-xl p-4 space-y-3.5">
                <div className="flex items-center justify-between border-b border-gray-200/60 pb-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-black/50">Current Weather Scan</span>
                  {weatherTime && (
                    <span className="text-[10px] text-black/40 font-medium">
                      Last Checked: {new Date(weatherTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-semibold text-black">
                  <div className="flex items-center gap-2">
                    <Thermometer className="w-4 h-4 text-orange-500 shrink-0" />
                    <div className="space-y-0.5">
                      <div className="text-[10px] uppercase text-black/40 tracking-wider">Temp</div>
                      <div>{weatherTemp !== null && weatherTemp !== undefined ? `${weatherTemp}°C` : "N/A"}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Droplets className="w-4 h-4 text-blue-500 shrink-0" />
                    <div className="space-y-0.5">
                      <div className="text-[10px] uppercase text-black/40 tracking-wider">Humidity</div>
                      <div>{weatherHumidity !== null && weatherHumidity !== undefined ? `${weatherHumidity}%` : "N/A"}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Wind className="w-4 h-4 text-teal-500 shrink-0" />
                    <div className="space-y-0.5">
                      <div className="text-[10px] uppercase text-black/40 tracking-wider">Wind</div>
                      <div>{weatherWindSpeed !== null && weatherWindSpeed !== undefined ? `${weatherWindSpeed} km/h` : "N/A"}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Mountain className="w-4 h-4 text-amber-600 shrink-0" />
                    <div className="space-y-0.5">
                      <div className="text-[10px] uppercase text-black/40 tracking-wider">Elevation</div>
                      <div>{weatherElevation !== null && weatherElevation !== undefined ? `${weatherElevation}m` : "N/A"}</div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 pt-2 border-t border-gray-200/40 text-xs font-bold">
                  <div className="flex items-center gap-1.5 text-black">
                    <CloudRain className="w-4 h-4 text-brand-forest shrink-0" />
                    <span>Observation: <strong className="text-brand-forest font-extrabold">{weatherStatus || "N/A"}</strong></span>
                  </div>
                  <div className="text-[11px] text-black/60 font-semibold bg-brand-forest/10 px-2.5 py-1 rounded-lg self-start sm:self-auto">
                    Precipitation: {weatherRain !== null && weatherRain !== undefined ? `${weatherRain} mm` : "0 mm"}
                  </div>
                </div>
              </div>

              <div 
                id="pond-location-map" 
                className="rounded-xl overflow-hidden border border-gray-200 shadow-inner relative z-0"
                style={{ height: "220px", width: "100%" }}
              />
            </div>

            {/* ── Card 3: Link Controller ── */}
            <div className="p-6 bg-white rounded-2xl border border-gray-100 shadow-sm space-y-4 text-black">
              <h3 className="font-bold text-lg tracking-tight text-black flex items-center gap-2">
                <Wifi className="w-5 h-5 text-brand-forest" /> Link Controller
              </h3>
              <p className="text-xs text-black/60 leading-relaxed">
                Sever or restore the console connection link. Disconnecting triggers fail-safe shutdowns on all actuators.
              </p>
              <div className="pt-2 flex justify-between items-center gap-3">
                <span className="text-xs font-bold text-black uppercase tracking-wider flex items-center gap-1.5">
                  {connectionActive ? (
                    <><span className="w-2 h-2 rounded-full bg-emerald-500" />Sync Normal</>
                  ) : (
                    <><span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />Link Broken</>
                  )}
                </span>
                {connectionActive ? (
                  <button type="button" onClick={handleConnectionToggle}
                    className="px-4 py-2.5 bg-brand-slate hover:bg-brand-forest text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all duration-300 shadow-md flex items-center gap-1.5 cursor-pointer">
                    <WifiOff className="w-4 h-4" /> Kill Connection
                  </button>
                ) : (
                  <button type="button" onClick={handleConnectionToggle}
                    className="px-4 py-2.5 bg-brand-forest hover:bg-brand-sage text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all duration-300 shadow-md flex items-center gap-1.5 cursor-pointer">
                    <RefreshCw className="w-4 h-4" /> Reconnect Console
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
