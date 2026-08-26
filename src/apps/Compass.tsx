import React, { useState, useEffect } from "react";
import { Compass as CompassIcon, Navigation, RotateCw, MapPin, ShieldCheck, Zap } from "lucide-react";

export default function Compass() {
  const [heading, setHeading] = useState<number>(42);
  const [pitch, setPitch] = useState<number>(1.2);
  const [roll, setRoll] = useState<number>(-0.8);
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [usingRealSensor, setUsingRealSensor] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number; alt: number }>({
    lat: 48.8566,
    lng: 2.3522,
    alt: 35,
  });

  // Sensor integration
  useEffect(() => {
    const handleOrientation = (e: DeviceOrientationEvent) => {
      if (e.alpha !== null) {
        setHeading(Math.round(360 - e.alpha));
        setUsingRealSensor(true);
      }
      if (e.beta !== null) setPitch(Math.round(e.beta));
      if (e.gamma !== null) setRoll(Math.round(e.gamma));
    };

    if (typeof window !== "undefined" && "DeviceOrientationEvent" in window) {
      window.addEventListener("deviceorientation", handleOrientation);
    }

    return () => {
      if (typeof window !== "undefined" && "DeviceOrientationEvent" in window) {
        window.removeEventListener("deviceorientation", handleOrientation);
      }
    };
  }, []);

  const calibrate = () => {
    setIsCalibrating(true);
    setTimeout(() => {
      setIsCalibrating(false);
    }, 1500);
  };

  const getCardinal = (deg: number) => {
    const directions = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSO", "SO", "OSO", "O", "ONO", "NO", "NNO"];
    const index = Math.round(deg / 22.5) % 16;
    return directions[index < 0 ? index + 16 : index];
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-100 select-none p-4 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
            <CompassIcon className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white tracking-wide">Boussole & Topographie</h2>
            <p className="text-[11px] text-slate-400">Cap magnétique haute précision</p>
          </div>
        </div>

        <button
          onClick={calibrate}
          disabled={isCalibrating}
          className="nx-btn nx-btn-secondary flex items-center gap-1.5 text-xs"
        >
          <RotateCw className={`w-3.5 h-3.5 ${isCalibrating ? "animate-spin text-cyan-400" : ""}`} />
          {isCalibrating ? "Calibrage..." : "Calibrer"}
        </button>
      </div>

      {/* Main Display */}
      <div className="flex-1 flex flex-col items-center justify-center my-4 relative min-h-[260px]">
        {/* Main Heading Text */}
        <div className="text-center mb-4">
          <div className="text-4xl font-extrabold text-white tracking-tight flex items-baseline justify-center gap-1 font-mono">
            <span>{Math.round(heading)}°</span>
            <span className="text-cyan-400 text-2xl font-bold">{getCardinal(heading)}</span>
          </div>
          <p className="text-xs text-slate-400 font-medium mt-0.5">
            {usingRealSensor ? "Capteur physique actif" : "Mode simulation capteur Nexus"}
          </p>
        </div>

        {/* Compass Dial Graphic */}
        <div className="relative w-56 h-56 rounded-full border-2 border-slate-800 bg-slate-900/40 flex items-center justify-center shadow-[0_0_50px_rgba(6,182,212,0.08)]">
          {/* North Red Pointer Top Arrow */}
          <div className="absolute top-1.5 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center">
            <Navigation className="w-4 h-4 text-rose-500 fill-rose-500" />
          </div>

          {/* Rotating Compass Ring */}
          <div
            className="absolute inset-2 rounded-full border border-slate-700/50 flex items-center justify-center transition-transform duration-300 ease-out"
            style={{ transform: `rotate(${-heading}deg)` }}
          >
            {/* Cardinal Markers */}
            <span className="absolute top-2 font-black text-rose-500 text-sm">N</span>
            <span className="absolute right-3 font-bold text-slate-300 text-xs">E</span>
            <span className="absolute bottom-2 font-bold text-slate-300 text-xs">S</span>
            <span className="absolute left-3 font-bold text-slate-300 text-xs">O</span>

            {/* Ticks */}
            {Array.from({ length: 24 }).map((_, i) => (
              <div
                key={i}
                className="absolute w-0.5 h-2 bg-slate-700"
                style={{
                  transform: `rotate(${i * 15}deg) translateY(-94px)`,
                }}
              />
            ))}
          </div>

          {/* Level Bubble Indicator in Center */}
          <div className="relative w-16 h-16 rounded-full border border-cyan-500/30 bg-cyan-950/20 flex items-center justify-center">
            <div className="absolute w-2 h-2 rounded-full border border-cyan-400/50" />
            <div
              className="w-3.5 h-3.5 rounded-full bg-cyan-400/80 shadow-[0_0_10px_#22d3ee] transition-transform duration-150"
              style={{
                transform: `translate(${roll * 1.5}px, ${pitch * 1.5}px)`,
              }}
            />
          </div>
        </div>
      </div>

      {/* Telemetry Footer Info */}
      <div className="grid grid-cols-3 gap-2 text-center text-xs">
        <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col items-center">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Inclinomètre</span>
          <span className="text-sm font-bold text-white mt-0.5 font-mono">{pitch}° / {roll}°</span>
        </div>

        <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col items-center">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Position GPS</span>
          <span className="text-xs font-bold text-cyan-300 mt-0.5 font-mono truncate max-w-full">
            {coords.lat.toFixed(2)}°N, {coords.lng.toFixed(2)}°E
          </span>
        </div>

        <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col items-center">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Altitude</span>
          <span className="text-sm font-bold text-emerald-400 mt-0.5 font-mono">{coords.alt} m</span>
        </div>
      </div>
    </div>
  );
}
