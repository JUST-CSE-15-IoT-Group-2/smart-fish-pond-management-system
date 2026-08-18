"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Thermometer,
  FlaskConical,
  CloudFog,
  CloudRain,
  Calendar,
  RefreshCw,
  Info,
  Droplets,
} from "lucide-react";
import { sensorsApi, settingsApi, notificationsApi } from "../../../lib/api";

const API_URL = typeof window !== 'undefined'
  ? `http://${window.location.hostname}:5000`
  : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000');

// ─── Chart helpers ─────────────────────────────────────────────────────────
const svgWidth  = 440;
const svgHeight = 110;
const xOffset   = 40;
const yOffset   = 20;

function getCoordinates(data, minVal, maxVal) {
  if (data.length === 0) return [];
  if (data.length === 1)
    return [{ x: xOffset + svgWidth / 2, y: yOffset + svgHeight / 2, ...data[0] }];
  return data.map((item, index) => {
    const x     = xOffset + (index / (data.length - 1)) * svgWidth;
    const range = maxVal - minVal || 1;
    const y     = yOffset + svgHeight - ((item.value - minVal) / range) * svgHeight;
    return { x, y, ...item };
  });
}

function makePath(pts) {
  return pts.reduce((p, pt, i) => (i === 0 ? `M ${pt.x} ${pt.y}` : `${p} L ${pt.x} ${pt.y}`), "");
}

function makeAreaPath(pts) {
  if (!pts.length) return "";
  return `${makePath(pts)} L ${pts[pts.length - 1].x} ${yOffset + svgHeight} L ${pts[0].x} ${yOffset + svgHeight} Z`;
}

function formatTime(dateStr) {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

// ─── Chart Component ───────────────────────────────────────────────────────
function SensorChart({ data, minVal, maxVal, gradientId, strokeColor, labelUnit, yLabels }) {
  const [activeIndex, setActiveIndex] = useState(null);
  const points = getCoordinates(data, minVal, maxVal);

  return (
    <div className="relative pt-2">
      <svg viewBox="0 0 500 150" className="w-full h-auto overflow-visible">
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor={strokeColor} stopOpacity="0.25" />
            <stop offset="100%" stopColor={strokeColor} stopOpacity="0.00" />
          </linearGradient>
        </defs>
        <line x1={xOffset} y1={yOffset}                    x2={500 - 20} y2={yOffset}                    stroke="#f3f4f6" strokeWidth={1} />
        <line x1={xOffset} y1={yOffset + svgHeight / 2}    x2={500 - 20} y2={yOffset + svgHeight / 2}    stroke="#f3f4f6" strokeWidth={1} />
        <line x1={xOffset} y1={yOffset + svgHeight}        x2={500 - 20} y2={yOffset + svgHeight}        stroke="#e5e7eb" strokeWidth={1.5} />

        {points.length > 0 && (
          <>
            <path d={makeAreaPath(points)} fill={`url(#${gradientId})`} />
            <path d={makePath(points)} fill="none" stroke={strokeColor} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
            {points.map((pt, i) => (
              <circle
                key={i}
                cx={pt.x} cy={pt.y} r={activeIndex === i ? 5 : 3}
                fill={strokeColor} stroke="white" strokeWidth={2}
                style={{ cursor: "pointer" }}
                onMouseEnter={() => setActiveIndex(i)}
                onMouseLeave={() => setActiveIndex(null)}
              />
            ))}
            {activeIndex !== null && points[activeIndex] && (
              <g>
                <rect
                  x={Math.min(points[activeIndex].x - 28, 430)}
                  y={points[activeIndex].y - 34}
                  width={64} height={26} rx={6}
                  fill="rgba(0,0,0,0.75)"
                />
                <text
                  x={Math.min(points[activeIndex].x, 462)}
                  y={points[activeIndex].y - 17}
                  textAnchor="middle"
                  fill="white" fontSize="10" fontWeight="bold"
                >
                  {Number(points[activeIndex].value).toFixed(2)}{labelUnit}
                </text>
                <text
                  x={Math.min(points[activeIndex].x, 462)}
                  y={points[activeIndex].y - 7}
                  textAnchor="middle"
                  fill="rgba(255,255,255,0.7)" fontSize="8"
                >
                  {formatTime(points[activeIndex].recordedAt)}
                </text>
              </g>
            )}
          </>
        )}

        {yLabels?.map((label, i) => (
          <text key={i} x={xOffset - 6} y={yOffset + (i / 2) * svgHeight + 4}
            textAnchor="end" fill="#9ca3af" fontSize="9" fontWeight="600">
            {label}
          </text>
        ))}
      </svg>

      {data.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center text-xs text-black/40">
          No data yet — waiting for sensor readings...
        </div>
      )}
    </div>
  );
}

// ─── Live Card Component ───────────────────────────────────────────────────
function LiveCard({ label, title, value, unit, statusText, bgClass, iconBgClass, icon: Icon, loading }) {
  return (
    <div className={`${bgClass} text-white p-6 rounded-2xl shadow-lg flex items-center justify-between transition-all duration-300 hover:shadow-xl hover:scale-[1.01]`}>
      <div className="space-y-2.5">
        <span className="text-xs uppercase tracking-widest text-brand-moss font-semibold">{label}</span>
        <h3 className="text-lg font-bold text-white opacity-90">{title}</h3>
        <div className="flex items-baseline gap-1.5 mt-2">
          <span className="text-4xl font-extrabold tracking-tight">{loading ? "—" : value ?? "—"}</span>
          <span className="text-lg text-brand-moss font-bold">{unit}</span>
        </div>
        <div className="inline-flex items-center gap-1.5 bg-black/20 border border-white/10 px-3 py-1 rounded-full text-xs font-semibold text-brand-moss">
          <span className="w-1.5 h-1.5 rounded-full bg-brand-moss animate-pulse" />
          Status: {statusText}
        </div>
      </div>
      <div className={`${iconBgClass} p-4 rounded-2xl border border-white/10`}>
        <Icon className="w-8 h-8 text-white" />
      </div>
    </div>
  );
}

// ─── Rain Status Card ──────────────────────────────────────────────────────
function RainCard({ value, loading, threshold = 40, autoOxygen = true }) {
  const wetness   = value ?? null;
  const isRaining = wetness != null && wetness > 5;
  const isTriggered = wetness != null && wetness >= threshold;
  
  let rainStatus = "Awaiting data";
  if (wetness != null) {
    if (wetness < 5) {
      rainStatus = "DRY (Standby)";
    } else if (wetness < threshold) {
      rainStatus = `Light Rain (${wetness.toFixed(0)}% < ${threshold}% Limit)`;
    } else {
      rainStatus = autoOxygen 
        ? `Heavy Rain (${wetness.toFixed(0)}% ≥ ${threshold}%) · O₂ Pump ON` 
        : `Heavy Rain (${wetness.toFixed(0)}% ≥ ${threshold}%) · Alert`;
    }
  }

  const bgColor = isTriggered
    ? "bg-[#0b2447] border-blue-500/50"
    : isRaining 
    ? "bg-[#0c2340] border-[#1a4a7a]/40" 
    : "bg-[#1a2e1a] border-brand-forest/30";

  return (
    <div className={`${bgColor} border text-white p-6 rounded-2xl shadow-lg flex items-center justify-between transition-all duration-300 hover:shadow-xl`}>
      <div className="space-y-2.5">
        <div className="flex items-center gap-2">
          <span className="text-xs uppercase tracking-widest text-brand-moss font-semibold">Live Sensor #4</span>
          {isTriggered && autoOxygen && (
            <span className="text-[10px] bg-blue-500 text-white font-bold px-2 py-0.5 rounded-full uppercase tracking-wider animate-pulse">
              O₂ Motor Auto-Running
            </span>
          )}
        </div>
        <h3 className="text-lg font-bold text-white opacity-90">Raindrop / Moisture</h3>
        <div className="flex items-baseline gap-1.5 mt-2">
          <span className="text-4xl font-extrabold tracking-tight">{loading ? "—" : wetness?.toFixed(1) ?? "—"}</span>
          <span className="text-lg text-brand-moss font-bold">%</span>
        </div>
        <div className="inline-flex items-center gap-1.5 bg-black/20 border border-white/10 px-3 py-1 rounded-full text-xs font-semibold text-brand-moss">
          <span className={`w-1.5 h-1.5 rounded-full ${isTriggered ? "bg-blue-400 animate-ping" : isRaining ? "bg-cyan-400 animate-pulse" : "bg-brand-moss animate-pulse"}`} />
          {rainStatus}
        </div>
      </div>
      <div className={`${isTriggered ? "bg-blue-600 shadow-lg shadow-blue-500/30" : isRaining ? "bg-blue-800" : "bg-brand-forest"} p-4 rounded-2xl border border-white/10`}>
        <CloudRain className={`w-8 h-8 text-white ${isTriggered ? "animate-bounce" : ""}`} />
      </div>
    </div>
  );
}

// ─── Turbidity Status Card (analog sensor — NTU scale) ─────────────────────
function TurbidityCard({ value, loading, threshold = 60 }) {
  let statusText = "Awaiting data";
  let isTurbid = false;
  if (value != null) {
    if (value < 20.0) {
      statusText = "CLEAR";
    } else if (value < threshold) {
      statusText = `MODERATE (< ${threshold} NTU)`;
    } else {
      statusText = `TURBID (≥ ${threshold} NTU · ALARM)`;
      isTurbid = true;
    }
  }

  return (
    <div className={`${isTurbid ? "bg-[#3d1a24] border-rose-500/50" : "bg-[#1e3a5f] border-[#2a5298]/30"} text-white p-6 rounded-2xl shadow-lg flex items-center justify-between transition-all duration-300 hover:shadow-xl hover:scale-[1.01]`}>
      <div className="space-y-2.5">
        <div className="flex items-center gap-2">
          <span className="text-xs uppercase tracking-widest text-brand-moss font-semibold">Live Sensor #2</span>
          {isTurbid && (
            <span className="text-[10px] bg-rose-500 text-white font-bold px-2 py-0.5 rounded-full uppercase tracking-wider animate-pulse">
              Clarity Alarm
            </span>
          )}
        </div>
        <h3 className="text-lg font-bold text-white opacity-90">Water Turbidity</h3>
        <div className="flex items-baseline gap-1.5 mt-2">
          <span className="text-4xl font-extrabold tracking-tight">
            {loading ? "—" : value != null ? value.toFixed(1) : "—"}
          </span>
          <span className="text-lg text-brand-moss font-bold">NTU</span>
        </div>
        <div className="inline-flex items-center gap-1.5 bg-black/20 border border-white/10 px-3 py-1 rounded-full text-xs font-semibold text-brand-moss">
          <span className={`w-1.5 h-1.5 rounded-full ${isTurbid ? "bg-red-500 animate-pulse" : "bg-brand-moss animate-pulse"}`} />
          Status: {statusText}
        </div>
      </div>
      <div className={`${isTurbid ? "bg-rose-700 shadow-lg shadow-rose-600/30" : "bg-[#2a5298]"} p-4 rounded-2xl border border-white/10`}>
        <CloudFog className={`w-8 h-8 text-white ${isTurbid ? "animate-pulse" : ""}`} />
      </div>
    </div>
  );
}

// ─── Chart Card ───────────────────────────────────────────────────────────
function ChartCard({ title, subtitle, chartProps }) {
  return (
    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4 text-black">
      <div className="flex justify-between items-center">
        <div className="space-y-0.5">
          <h3 className="font-bold text-lg tracking-tight text-black">{title}</h3>
          <p className="text-xs text-black/60">{subtitle}</p>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-black/50 bg-gray-50 border border-gray-200 px-2.5 py-1 rounded-lg">
          <Calendar className="w-3.5 h-3.5" /><span>Live Chart</span>
        </div>
      </div>
      <SensorChart {...chartProps} />
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────
export default function UpdatesPage() {
  const [tempData,  setTempData]  = useState([]);
  const [phData,    setPhData]    = useState([]);
  const [rainData,  setRainData]  = useState([]);
  const [latest, setLatest] = useState({
    temperature: null,
    turbidity:   null,
    ph:          null,
    rain:        null,
  });
  const [settings, setSettings] = useState({
    tempMin: 20,
    tempMax: 28,
    phMin: 6.5,
    phMax: 8.5,
    turbidityMax: 60,
    rainThreshold: 40,
    autoOxygenOnRain: true,
  });
  const [loading, setLoading] = useState(true);
  const [showNotificationBanner, setShowNotificationBanner] = useState(false);
  const [insecureContextWarning, setInsecureContextWarning] = useState(false);
  const socketRef = useRef(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      if (!window.isSecureContext) {
        setInsecureContextWarning(true);
      } else if (
        "serviceWorker" in navigator &&
        "PushManager" in window &&
        Notification.permission === "default"
      ) {
        setShowNotificationBanner(true);
      }
    }
  }, []);

  const handleRequestPermission = async () => {
    try {
      const permission = await Notification.requestPermission();
      setShowNotificationBanner(false);
      if (permission === "granted") {
        const registration = await navigator.serviceWorker.ready;
        const { publicKey } = await notificationsApi.getVapidKey();
        if (publicKey) {
          const padding = "=".repeat((4 - (publicKey.length % 4)) % 4);
          const base64 = (publicKey + padding).replace(/\-/g, "+").replace(/_/g, "/");
          const rawData = window.atob(base64);
          const outputArray = new Uint8Array(rawData.length);
          for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
          }
          const subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: outputArray,
          });
          await notificationsApi.subscribe(subscription);
          console.log("[PWA] Web Push subscription registered.");
        }
      }
    } catch (err) {
      console.error("[PWA] Failed to enable notifications:", err);
    }
  };

  const fetchData = useCallback(async () => {
    try {
      const [tempReadings, phReadings, rainReadings, latestData, settingsData] = await Promise.all([
        sensorsApi.readings("temperature", 12),
        sensorsApi.readings("ph", 12),
        sensorsApi.readings("rain", 12),
        sensorsApi.latest(),
        settingsApi.get().catch(() => null),
      ]);

      // Adjust pH to show less 4 on frontend
      const adjustedPhReadings = phReadings.map((r) => ({
        ...r,
        value: Number((r.value - 4).toFixed(2)),
      }));

      const adjustedLatest = {
        ...latestData,
        ph: latestData.ph
          ? { ...latestData.ph, value: Number((latestData.ph.value - 4).toFixed(2)) }
          : null,
      };

      setTempData(tempReadings);
      setPhData(adjustedPhReadings);
      setRainData(rainReadings);
      setLatest(adjustedLatest);
      if (settingsData) {
        setSettings(settingsData);
      }
    } catch (err) {
      console.error("Failed to fetch sensor data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();

    let socket;
    import("socket.io-client").then(({ io }) => {
      socket = io(API_URL);
      socketRef.current = socket;

      socket.on("sensor:update", (reading) => {
        // Adjust pH to show less 4 on frontend
        const adjustedValue = reading.type === "ph"
          ? Number((reading.value - 4).toFixed(2))
          : reading.value;

        setLatest((prev) => ({
          ...prev,
          [reading.type]: { value: adjustedValue, unit: reading.unit, recordedAt: reading.recordedAt },
        }));

        if (reading.type === "temperature") setTempData((p) => [...p.slice(-11), reading]);
        if (reading.type === "ph")          setPhData((p)   => [...p.slice(-11), { ...reading, value: adjustedValue }]);
        if (reading.type === "rain")        setRainData((p) => [...p.slice(-11), reading]);
      });
    });

    return () => { if (socket) socket.disconnect(); };
  }, [fetchData]);

  // ── Derived values ──
  const tempValues = tempData.map((d) => d.value);
  const tempMin    = tempValues.length ? Math.min(...tempValues) - 0.5 : 20;
  const tempMax    = tempValues.length ? Math.max(...tempValues) + 0.5 : 30;
  const tempStatus = latest.temperature?.value >= settings.tempMin && latest.temperature?.value <= settings.tempMax ? "Optimal" : "Warning";

  const phValues = phData.map((d) => d.value);
  const phMin    = phValues.length ? Math.min(...phValues) - 0.5 : 2;
  const phMax    = phValues.length ? Math.max(...phValues) + 0.5 : 9;
  const phVal    = latest.ph?.value;
  const phStatus = phVal == null ? "Awaiting data" : phVal >= settings.phMin && phVal <= settings.phMax ? "Optimal" : phVal < settings.phMin ? "Too Acidic" : "Too Alkaline";

  const rainValues = rainData.map((d) => d.value);
  const rainMin    = 0;
  const rainMax    = 100;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-100 pb-5">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-black">Pond Sensor Updates</h2>
          <p className="text-sm text-black/60 mt-1">
            Real-time telemetry: temperature, turbidity, pH, and rain detection.
          </p>
        </div>
        <button
          id="refresh-telemetry-btn"
          onClick={fetchData}
          className="flex items-center gap-2 px-4 py-2 bg-brand-slate hover:bg-brand-forest text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all duration-300 shadow-md hover:shadow-lg cursor-pointer"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          <span>Refresh Telemetry</span>
        </button>
      </div>

      {/* Insecure Context Warning */}
      {insecureContextWarning && (
        <div className="p-4 bg-amber-50 border border-amber-200 text-amber-900 rounded-2xl flex items-start gap-3 shadow-sm animate-pulse">
          <span className="text-lg">⚠️</span>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-amber-800">Insecure Connection Context</h4>
            <p className="text-xs text-amber-900/80 mt-0.5 leading-relaxed">
              You are accessing the app over HTTP. Mobile browsers disable service workers and push notifications on insecure networks. For testing, please access via <strong>http://localhost:3000</strong> or setup HTTPS.
            </p>
          </div>
        </div>
      )}

      {/* Push Notification Opt-in Prompt */}
      {showNotificationBanner && (
        <div className="p-4 bg-brand-forest/10 border border-brand-forest/20 text-black rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
          <div className="flex items-start gap-3">
            <span className="text-lg">🔔</span>
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-brand-forest">Pond Alarm Alerts</h4>
              <p className="text-xs text-black/80 mt-0.5 leading-relaxed">
                Enable push notifications to receive immediate alerts on your device when water temperature, pH, or rain thresholds are breached.
              </p>
            </div>
          </div>
          <button
            onClick={handleRequestPermission}
            className="self-start sm:self-center px-4 py-2 bg-brand-forest hover:bg-brand-sage text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow transition-colors cursor-pointer shrink-0"
          >
            Enable Alerts
          </button>
        </div>
      )}

      {/* Live Cards — Row 1 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <LiveCard
          label="Live Sensor #1"
          title="Water Temperature"
          value={latest.temperature?.value?.toFixed(1)}
          unit="°C"
          statusText={latest.temperature ? tempStatus : "Awaiting data"}
          bgClass="bg-brand-slate border border-brand-forest/20"
          iconBgClass="bg-brand-forest"
          icon={Thermometer}
          loading={loading}
        />
        <TurbidityCard
          value={latest.turbidity?.value}
          loading={loading}
          threshold={settings.turbidityMax ?? 60}
        />
      </div>

      {/* Live Cards — Row 2 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <LiveCard
          label="Live Sensor #3"
          title="Water pH Level"
          value={phVal?.toFixed(2)}
          unit="pH"
          statusText={phStatus}
          bgClass="bg-[#2d1b4e] border border-[#6b3fa0]/30"
          iconBgClass="bg-[#6b3fa0]"
          icon={FlaskConical}
          loading={loading}
        />
        <RainCard
          value={latest.rain?.value}
          loading={loading}
          threshold={settings.rainThreshold ?? 40}
          autoOxygen={settings.autoOxygenOnRain ?? true}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        <ChartCard
          title="Water Temperature Trend"
          subtitle="°C readings over last 12 data points"
          chartProps={{
            data: tempData, minVal: tempMin, maxVal: tempMax,
            gradientId: "tempGradient", strokeColor: "#2B5748", labelUnit: "°C",
            yLabels: [`${tempMax.toFixed(0)}°`, `${((tempMin + tempMax) / 2).toFixed(0)}°`, `${tempMin.toFixed(0)}°`],
          }}
        />

        <ChartCard
          title="Water pH Trend"
          subtitle="Optimal range: 6.5 – 8.5"
          chartProps={{
            data: phData, minVal: phMin, maxVal: phMax,
            gradientId: "phGradient", strokeColor: "#6b3fa0", labelUnit: " pH",
            yLabels: [`${phMax.toFixed(1)}`, `${((phMin + phMax) / 2).toFixed(1)}`, `${phMin.toFixed(1)}`],
          }}
        />

        <ChartCard
          title="Rain / Wetness Trend"
          subtitle={`Auto-activates oxygen motor at ≥ ${settings.rainThreshold ?? 40}%`}
          chartProps={{
            data: rainData, minVal: rainMin, maxVal: rainMax,
            gradientId: "rainGradient", strokeColor: "#3b82f6", labelUnit: "%",
            yLabels: ["100%", "50%", "0%"],
          }}
        />

        {/* Reference guide */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-5 text-black flex flex-col justify-center">
          <div>
            <h4 className="font-bold text-sm uppercase tracking-wider text-black/70 mb-3">pH Reference</h4>
            <div className="space-y-2">
              {[
                { range: `< ${settings.phMin}`,      label: "Too Acidic",               color: "#ef4444" },
                { range: `${settings.phMin} – ${settings.phMax}`,  label: "Optimal for Fish",          color: "#22c55e" },
                { range: `> ${settings.phMax}`,      label: "Too Alkaline",              color: "#8b5cf6" },
              ].map((r) => (
                <div key={r.range} className="flex items-center gap-3 text-xs text-black/70">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: r.color }} />
                  <span className="font-semibold w-28">{r.range}</span>
                  <span>{r.label}</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h4 className="font-bold text-sm uppercase tracking-wider text-black/70 mb-3">Weather Oxygen Automation</h4>
            <p className="text-xs text-black/60 leading-relaxed">
              When rain intensity meets or exceeds <strong>{settings.rainThreshold ?? 40}%</strong>, the system activates the oxygen dissolving pump to maintain dissolved oxygen levels during heavy weather.
            </p>
          </div>
        </div>
      </div>

      {/* Info Banner */}
      <div className="p-4 rounded-xl border border-gray-200 bg-white flex items-start gap-3 text-black">
        <Info className="w-5 h-5 text-brand-forest mt-0.5 shrink-0" />
        <div className="space-y-0.5">
          <h4 className="text-xs font-bold uppercase tracking-wider">Analysis Notice</h4>
          <p className="text-xs text-black/75 leading-relaxed">
            Optimal conditions: temperature {settings.tempMin}–{settings.tempMax} °C · pH {settings.phMin}–{settings.phMax} · turbidity &lt; {settings.turbidityMax ?? 60} NTU · rain &lt; {settings.rainThreshold ?? 40}% (triggers oxygen pump).
            All sensors stream live via WebSocket — values update automatically.
          </p>
        </div>
      </div>
    </div>
  );
}
