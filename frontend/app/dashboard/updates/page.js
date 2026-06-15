"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Thermometer, Droplet, Calendar, RefreshCw, Info } from "lucide-react";
import { sensorsApi } from "../../../lib/api";
import { io } from "socket.io-client";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

// ─── Chart helpers ────────────────────────────────────────────────────────
const svgWidth = 440;
const svgHeight = 110;
const xOffset = 40;
const yOffset = 20;

function getCoordinates(data, minVal, maxVal) {
  if (data.length === 0) return [];
  if (data.length === 1) {
    return [{ x: xOffset + svgWidth / 2, y: yOffset + svgHeight / 2, ...data[0] }];
  }
  return data.map((item, index) => {
    const x = xOffset + (index / (data.length - 1)) * svgWidth;
    const range = maxVal - minVal || 1;
    const y = yOffset + svgHeight - ((item.value - minVal) / range) * svgHeight;
    return { x, y, ...item };
  });
}

function makePath(points) {
  return points.reduce(
    (path, p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `${path} L ${p.x} ${p.y}`),
    ""
  );
}

function makeAreaPath(points) {
  if (points.length === 0) return "";
  const linePath = makePath(points);
  const firstX = points[0].x;
  const lastX = points[points.length - 1].x;
  const bottomY = yOffset + svgHeight;
  return `${linePath} L ${lastX} ${bottomY} L ${firstX} ${bottomY} Z`;
}

function formatTime(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
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
            <stop offset="0%" stopColor={strokeColor} stopOpacity="0.25" />
            <stop offset="100%" stopColor={strokeColor} stopOpacity="0.00" />
          </linearGradient>
        </defs>

        {/* Gridlines */}
        <line x1={xOffset} y1={yOffset} x2={500 - 20} y2={yOffset} stroke="#f3f4f6" strokeWidth={1} />
        <line x1={xOffset} y1={yOffset + svgHeight / 2} x2={500 - 20} y2={yOffset + svgHeight / 2} stroke="#f3f4f6" strokeWidth={1} />
        <line x1={xOffset} y1={yOffset + svgHeight} x2={500 - 20} y2={yOffset + svgHeight} stroke="#e5e7eb" strokeWidth={1.5} />

        {points.length > 0 && (
          <>
            <path d={makeAreaPath(points)} fill={`url(#${gradientId})`} />
            <path d={makePath(points)} fill="none" stroke={strokeColor} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
          </>
        )}

        {/* Interactive Dots */}
        {points.map((p, i) => (
          <g key={i} className="cursor-pointer" onMouseEnter={() => setActiveIndex(i)} onMouseLeave={() => setActiveIndex(null)}>
            <circle
              cx={p.x}
              cy={p.y}
              r={activeIndex === i ? 6 : 4}
              fill={activeIndex === i ? "#9CB080" : strokeColor}
              stroke="#ffffff"
              strokeWidth={1.5}
              className="transition-all duration-150"
            />
          </g>
        ))}

        {/* X Axis Labels */}
        {points.map((p, i) => (
          <text key={i} x={p.x} y={yOffset + svgHeight + 18} textAnchor="middle" className="text-[9px] fill-black/60 font-medium">
            {formatTime(p.recordedAt).split(" ")[0]}
          </text>
        ))}

        {/* Y Axis Labels */}
        {yLabels.map((label, i) => (
          <text
            key={i}
            x={xOffset - 8}
            y={yOffset + (i / (yLabels.length - 1)) * svgHeight + 4}
            textAnchor="end"
            className="text-[9px] fill-black/60 font-semibold"
          >
            {label}
          </text>
        ))}
      </svg>

      {/* Tooltip */}
      {activeIndex !== null && points[activeIndex] && (
        <div
          className="absolute bg-brand-slate text-white text-xs px-3 py-2 rounded-xl shadow-lg border border-brand-forest/30 pointer-events-none z-20"
          style={{
            left: `${(points[activeIndex].x / 500) * 100}%`,
            top: `${(points[activeIndex].y / 150) * 100 - 35}%`,
            transform: "translateX(-50%)",
          }}
        >
          <div className="font-bold text-center">
            {data[activeIndex]?.value}{labelUnit}
          </div>
          <div className="text-[9px] text-brand-moss text-center mt-0.5">
            {formatTime(data[activeIndex]?.recordedAt)}
          </div>
        </div>
      )}

      {data.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center text-xs text-black/40">
          No data yet — waiting for sensor readings...
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────
export default function UpdatesPage() {
  const [tempData, setTempData] = useState([]);
  const [cloudData, setCloudData] = useState([]);
  const [latest, setLatest] = useState({ temperature: null, clarity: null });
  const [loading, setLoading] = useState(true);
  const socketRef = useRef(null);

  const fetchData = useCallback(async () => {
    try {
      const [tempReadings, cloudReadings, latestData] = await Promise.all([
        sensorsApi.readings("temperature", 12),
        sensorsApi.readings("clarity", 12),
        sensorsApi.latest(),
      ]);
      setTempData(tempReadings);
      setCloudData(cloudReadings);
      setLatest(latestData);
    } catch (err) {
      console.error("Failed to fetch sensor data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();

    // Connect Socket.IO for real-time updates (no credentials needed — public endpoint)
    const socket = io(API_URL);
    socketRef.current = socket;

    socket.on("sensor:update", (reading) => {
      // Update live card
      setLatest((prev) => ({
        ...prev,
        [reading.type]: { value: reading.value, unit: reading.unit, recordedAt: reading.recordedAt },
      }));

      // Append to graph data (keep last 12 points)
      if (reading.type === "temperature") {
        setTempData((prev) => [...prev.slice(-11), reading]);
      } else if (reading.type === "clarity") {
        setCloudData((prev) => [...prev.slice(-11), reading]);
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [fetchData]);

  // Compute min/max for chart scaling
  const tempValues = tempData.map((d) => d.value);
  const tempMin = tempValues.length ? Math.min(...tempValues) - 0.5 : 20;
  const tempMax = tempValues.length ? Math.max(...tempValues) + 0.5 : 30;

  const cloudValues = cloudData.map((d) => d.value);
  const cloudMin = cloudValues.length ? Math.min(...cloudValues) - 1 : 0;
  const cloudMax = cloudValues.length ? Math.max(...cloudValues) + 1 : 20;

  const tempStatus =
    latest.temperature?.value >= 20 && latest.temperature?.value <= 30 ? "Optimal" : "Warning";
  const clarityStatus = latest.clarity?.value >= 80 ? "Excellent" : latest.clarity?.value >= 60 ? "Acceptable" : "Poor";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-100 pb-5">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-black">Pond Sensor Updates</h2>
          <p className="text-sm text-black/60 mt-1">
            Real-time telemetry reports and historical trends for temperature and cloudiness.
          </p>
        </div>
        <button
          onClick={fetchData}
          className="flex items-center gap-2 px-4 py-2 bg-brand-slate hover:bg-brand-forest text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all duration-300 shadow-md hover:shadow-lg cursor-pointer"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          <span>Refresh Telemetry</span>
        </button>
      </div>

      {/* Live Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* Temperature Card */}
        <div className="bg-brand-slate text-white p-6 rounded-2xl border border-brand-forest/20 shadow-lg flex items-center justify-between transition-all duration-300 hover:shadow-xl hover:scale-[1.01]">
          <div className="space-y-2.5">
            <span className="text-xs uppercase tracking-widest text-brand-moss font-semibold">
              Live Sensor #1
            </span>
            <h3 className="text-lg font-bold text-white opacity-90">Water Temperature</h3>
            <div className="flex items-baseline gap-1.5 mt-2">
              <span className="text-4xl font-extrabold tracking-tight">
                {loading ? "—" : latest.temperature?.value?.toFixed(1) ?? "—"}
              </span>
              <span className="text-lg text-brand-moss font-bold">°C</span>
            </div>
            <div className="inline-flex items-center gap-1.5 bg-brand-forest/30 border border-brand-sage/20 px-3 py-1 rounded-full text-xs font-semibold text-brand-moss">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-moss animate-pulse"></span>
              Status: {latest.temperature ? tempStatus : "Awaiting data"}
            </div>
          </div>
          <div className="bg-brand-forest p-4 rounded-2xl border border-brand-sage/10">
            <Thermometer className="w-8 h-8 text-white" />
          </div>
        </div>

        {/* Clarity Card */}
        <div className="bg-brand-forest text-white p-6 rounded-2xl border border-brand-sage/20 shadow-lg flex items-center justify-between transition-all duration-300 hover:shadow-xl hover:scale-[1.01]">
          <div className="space-y-2.5">
            <span className="text-xs uppercase tracking-widest text-brand-moss font-semibold">
              Live Sensor #2
            </span>
            <h3 className="text-lg font-bold text-white opacity-90">Water Clarity</h3>
            <div className="flex items-baseline gap-1.5 mt-2">
              <span className="text-4xl font-extrabold tracking-tight">
                {loading ? "—" : latest.clarity?.value?.toFixed(1) ?? "—"}
              </span>
              <span className="text-lg text-brand-moss font-bold">%</span>
            </div>
            <div className="inline-flex items-center gap-1.5 bg-brand-slate/40 border border-brand-sage/10 px-3 py-1 rounded-full text-xs font-semibold text-brand-moss">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-moss animate-pulse"></span>
              Status: {latest.clarity ? clarityStatus : "Awaiting data"}
            </div>
          </div>
          <div className="bg-brand-slate p-4 rounded-2xl border border-brand-forest/20">
            <Droplet className="w-8 h-8 text-white" />
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Temperature Chart */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4 text-black">
          <div className="flex justify-between items-center">
            <div className="space-y-0.5">
              <h3 className="font-bold text-lg tracking-tight text-black">Water Temperature Trend</h3>
              <p className="text-xs text-black/60">Fluctuation history over the last readings</p>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-black/50 bg-gray-50 border border-gray-150 px-2.5 py-1 rounded-lg">
              <Calendar className="w-3.5 h-3.5" />
              <span>Live Chart</span>
            </div>
          </div>
          <SensorChart
            data={tempData}
            minVal={tempMin}
            maxVal={tempMax}
            gradientId="tempGradient"
            strokeColor="#2B5748"
            labelUnit="°C"
            yLabels={[`${tempMax.toFixed(0)}°`, `${((tempMin + tempMax) / 2).toFixed(0)}°`, `${tempMin.toFixed(0)}°`]}
          />
        </div>

        {/* Cloudiness Chart */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4 text-black">
          <div className="flex justify-between items-center">
            <div className="space-y-0.5">
              <h3 className="font-bold text-lg tracking-tight text-black">Water Cloudiness Trend</h3>
              <p className="text-xs text-black/60">Turbidity (NTU index) over last readings</p>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-black/50 bg-gray-50 border border-gray-150 px-2.5 py-1 rounded-lg">
              <Calendar className="w-3.5 h-3.5" />
              <span>Live Chart</span>
            </div>
          </div>
          <SensorChart
            data={cloudData}
            minVal={cloudMin}
            maxVal={cloudMax}
            gradientId="cloudGradient"
            strokeColor="#273338"
            labelUnit="%"
            yLabels={[`${cloudMax.toFixed(0)}%`, `${((cloudMin + cloudMax) / 2).toFixed(0)}%`, `${cloudMin.toFixed(0)}%`]}
          />
        </div>
      </div>

      {/* Info Banner */}
      <div className="p-4 rounded-xl border border-gray-200 bg-white flex items-start gap-3 text-black max-w-none">
        <Info className="w-5 h-5 text-brand-forest mt-0.5 shrink-0" />
        <div className="space-y-0.5">
          <h4 className="text-xs font-bold uppercase tracking-wider">Analysis Notice</h4>
          <p className="text-xs text-black/75 leading-relaxed">
            Water turbidity (cloudiness) drops below 10% show active settlement of particulate suspended elements. Maintaining a filtration flow velocity between 60%-80% helps sustain excellent water clarity metrics.
          </p>
        </div>
      </div>
    </div>
  );
}
