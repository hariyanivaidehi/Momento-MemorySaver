"use client";

import React, { useState, useEffect, useRef } from "react";
import { Cpu, Activity, ShieldCheck, RefreshCw, Volume2, VolumeX, Eye, AlertTriangle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface RoboAssistantProps {
  onDefrag: () => void;
  isDefragging: boolean;
  scanlinesEnabled: boolean;
  setScanlinesEnabled: (enabled: boolean) => void;
}

export default function RoboAssistant({
  onDefrag,
  isDefragging,
  scanlinesEnabled,
  setScanlinesEnabled
}: RoboAssistantProps) {
  const [coreTemp, setCoreTemp] = useState(37.4);
  const [syncRate, setSyncRate] = useState(98.4);
  const [coolantFlow, setCoolantFlow] = useState(85);
  const [logs, setLogs] = useState<string[]>([
    "M.E.M.E.N.T.O. Core v3.04 initialized.",
    "Neural synapse channels: STABLE",
    "Offline memory vault: ACTIVE",
    "Voice synthesis engine: CALIBRATED"
  ]);

  // Audio Context Ref
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Mouse tracking for robotic eye vector
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const eyeRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (!eyeRef.current) return;
      const rect = eyeRef.current.getBoundingClientRect();
      const eyeCenterX = rect.left + rect.width / 2;
      const eyeCenterY = rect.top + rect.height / 2;
      
      const dx = e.clientX - eyeCenterX;
      const dy = e.clientY - eyeCenterY;
      const angle = Math.atan2(dy, dx);
      
      // Limit eye motion to 8px radius
      const dist = Math.min(8, Math.sqrt(dx * dx + dy * dy) * 0.05);
      
      setMousePos({
        x: Math.cos(angle) * dist,
        y: Math.sin(angle) * dist
      });
    };

    window.addEventListener("mousemove", handleGlobalMouseMove);
    return () => window.removeEventListener("mousemove", handleGlobalMouseMove);
  }, []);

  // Periodic Telemetry Updates
  useEffect(() => {
    const timer = setInterval(() => {
      setCoreTemp((prev) => {
        const change = (Math.random() - 0.5) * 0.4;
        const next = prev + change;
        return parseFloat(Math.min(Math.max(36.0, next), 41.5).toFixed(1));
      });

      setSyncRate((prev) => {
        const change = (Math.random() - 0.5) * 0.2;
        const next = prev + change;
        return parseFloat(Math.min(Math.max(95.0, next), 100.0).toFixed(1));
      });

      setCoolantFlow((prev) => {
        const change = Math.floor((Math.random() - 0.5) * 4);
        const next = prev + change;
        return Math.min(Math.max(75, next), 95);
      });

      // Occasional log output
      if (Math.random() > 0.8) {
        const randomLogs = [
          "OPTIMIZATION: Re-indexing local cache nodes.",
          "TELEMETRY: Background quantum fluctuations measured.",
          "DIAGNOSTICS: Memory coherence rate is within nominal range.",
          "SYSTEM: Scanning temporal capsules for decryption schedules.",
          "ALERT: Temperature sensor reading optimal.",
          "INTERFACE: Sound wave generators primed."
        ];
        const log = randomLogs[Math.floor(Math.random() * randomLogs.length)];
        setLogs((prev) => [log, ...prev.slice(0, 3)]);
      }
    }, 3000);

    return () => clearInterval(timer);
  }, []);

  // Robot voice announcer
  const robotSpeak = (text: string) => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      const voices = window.speechSynthesis.getVoices();
      const robotVoice = voices.find(v => v.lang.startsWith("en") && (v.name.includes("David") || v.name.includes("Zira") || v.name.includes("Google"))) || voices[0];
      if (robotVoice) utterance.voice = robotVoice;
      utterance.pitch = 0.65;
      utterance.rate = 1.05;
      utterance.volume = 0.85;
      window.speechSynthesis.speak(utterance);
    }
  };

  // Play custom synthesized sweep
  const playSweep = (startFreq: number, endFreq: number, duration: number, type: OscillatorType = "sine") => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = audioCtxRef.current || new AudioContextClass();
      if (!audioCtxRef.current) audioCtxRef.current = ctx;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(startFreq, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(endFreq, ctx.currentTime + duration);

      gain.gain.setValueAtTime(0.04, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch (e) {}
  };

  const handleDefragClick = () => {
    if (isDefragging) return;
    playSweep(150, 880, 1.2, "sawtooth");
    setLogs((prev) => ["OPERATION: DEFRAGMENTATION INITIALIZED...", ...prev.slice(0, 3)]);
    robotSpeak("Defragmentation sequence initialized. Re-aligning memory vectors.");
    onDefrag();
  };

  const handleTestDiagnostics = () => {
    playSweep(880, 220, 0.4, "triangle");
    setLogs((prev) => ["DIAGNOSTICS: Core self-test initiated.", "STATUS: All processors nominal.", ...prev.slice(0, 2)]);
    robotSpeak("Self diagnostics online. Memory matrices operational.");
  };

  return (
    <div className="glass-panel border-cyber-cyan/15 rounded-2xl p-5 w-full flex flex-col gap-4 relative overflow-hidden tech-panel shadow-2xl">
      <div className="absolute top-0 right-0 p-2 font-mono text-[8px] text-cyber-cyan/40">
        SYS_UNIT: MEMENTO-304
      </div>

      {/* Header */}
      <div className="flex flex-col gap-1 border-b border-cyber-cyan/10 pb-3">
        <div className="flex items-center gap-2">
          <Cpu className="w-5 h-5 text-cyber-cyan animate-pulse" />
          <div className="flex flex-col">
            <span className="font-mono text-xs font-bold text-cyber-cyan tracking-wider uppercase">
              M.E.M.E.N.T.O. Core Diagnostics
            </span>
            <span className="font-mono text-[8px] text-gray-500">NEURAL LINK INTELLIGENCE</span>
          </div>
        </div>
        <p className="text-[10px] text-gray-400 font-sans leading-normal mt-1.5 bg-cyber-cyan/5 p-2.5 rounded-lg border border-cyber-cyan/10">
          🤖 <strong>Cognitive Assistant:</strong> Matches, indexes, and defragments your local memory nodes. Click the eye center to run self diagnostics.
        </p>
      </div>

      {/* Interactive Robotic Companion Eye */}
      <div className="flex flex-col items-center justify-center py-4 bg-cyber-bg/50 border border-cyber-cyan/5 rounded-xl relative overflow-hidden">
        
        {/* Radar grids behind eye */}
        <div className="absolute w-36 h-36 border border-cyber-cyan/5 rounded-full animate-ping pointer-events-none opacity-40"></div>
        <div className="absolute w-24 h-24 border border-dashed border-cyber-cyan/10 rounded-full animate-rotate-slow pointer-events-none"></div>
        <div className="absolute w-28 h-28 border border-dashed border-cyber-purple/10 rounded-full animate-rotate-reverse-slow pointer-events-none"></div>

        {/* Animated Robotic Eye SVG */}
        <svg
          ref={eyeRef}
          width="100"
          height="100"
          viewBox="0 0 100 100"
          className="relative z-10 cursor-pointer"
          onClick={handleTestDiagnostics}
        >
          {/* Outer Chrome Frame */}
          <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(6, 182, 212, 0.2)" strokeWidth="3" />
          
          {/* Rotating Bracket Ticks */}
          <circle 
            cx="50" 
            cy="50" 
            r="38" 
            fill="none" 
            stroke="var(--color-cyber-purple)" 
            strokeWidth="2" 
            strokeDasharray="6, 18" 
            className="animate-rotate-slow"
          />

          <circle 
            cx="50" 
            cy="50" 
            r="34" 
            fill="none" 
            stroke="var(--color-cyber-cyan)" 
            strokeWidth="1.5" 
            strokeDasharray="14, 6" 
            className="animate-rotate-reverse-slow"
          />

          {/* Shutter Blades */}
          <circle cx="50" cy="50" r="28" fill="rgba(4, 10, 24, 0.85)" stroke="rgba(6, 182, 212, 0.4)" strokeWidth="1" />

          {/* Robotic Pupil Group (Tracks cursor offset) */}
          <g transform={`translate(${mousePos.x}, ${mousePos.y})`}>
            {/* Outer Iris */}
            <circle cx="50" cy="50" r="16" fill="rgba(6, 182, 212, 0.15)" stroke="var(--color-cyber-cyan)" strokeWidth="1.5" />
            
            {/* Pupil Center Orb */}
            <circle 
              cx="50" 
              cy="50" 
              r="8" 
              fill={isDefragging ? "var(--color-cyber-purple)" : "var(--color-cyber-cyan)"} 
              className={isDefragging ? "animate-pulse" : ""}
            />
            
            {/* Holographic Lens Flare Glare */}
            <circle cx="47" cy="47" r="2.5" fill="#ffffff" opacity="0.8" />
            <circle cx="44" cy="52" r="1.2" fill="#ffffff" opacity="0.5" />
          </g>

          {/* Scanning Target Crosshair */}
          <line x1="50" y1="5" x2="50" y2="15" stroke="rgba(6, 182, 212, 0.4)" strokeWidth="1" />
          <line x1="50" y1="85" x2="50" y2="95" stroke="rgba(6, 182, 212, 0.4)" strokeWidth="1" />
          <line x1="5" y1="50" x2="15" y2="50" stroke="rgba(6, 182, 212, 0.4)" strokeWidth="1" />
          <line x1="85" y1="50" x2="95" y2="50" stroke="rgba(6, 182, 212, 0.4)" strokeWidth="1" />
        </svg>

        {/* Live Assistant Tag */}
        <span className="font-mono text-[9px] text-cyber-cyan mt-3 tracking-widest font-semibold animate-pulse uppercase">
          {isDefragging ? "RE-VECTORING NEURAL MAP" : "M.E.M.E.N.T.O. ONLINE"}
        </span>
      </div>

      {/* Telemetry Metrics Readouts */}
      <div className="grid grid-cols-2 gap-3 text-xs font-mono">
        {/* Core Temp */}
        <div className="bg-cyber-bg/40 border border-cyber-cyan/10 rounded-xl p-2.5 flex flex-col relative overflow-hidden">
          <span className="text-gray-500 text-[8px] uppercase tracking-wider">Core Temperature</span>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className={`text-sm font-bold ${coreTemp > 40 ? "text-red-400 animate-pulse" : "text-gray-200"}`}>
              {coreTemp}°C
            </span>
            {coreTemp > 40 && <AlertTriangle className="w-3.5 h-3.5 text-red-400 animate-bounce" />}
          </div>
          {/* Progress bar visual */}
          <div className="w-full bg-cyber-cyan/5 h-1 rounded-full mt-1.5 overflow-hidden">
            <div 
              className={`h-full transition-all duration-300 ${coreTemp > 40 ? "bg-red-400" : "bg-cyber-cyan"}`}
              style={{ width: `${(coreTemp / 60) * 100}%` }}
            ></div>
          </div>
        </div>

        {/* Coherence Rate */}
        <div className="bg-cyber-bg/40 border border-cyber-cyan/10 rounded-xl p-2.5 flex flex-col relative overflow-hidden">
          <span className="text-gray-500 text-[8px] uppercase tracking-wider">Sync Coherence</span>
          <span className="text-sm font-bold text-cyber-purple mt-0.5">{syncRate}%</span>
          {/* Progress bar visual */}
          <div className="w-full bg-cyber-purple/5 h-1 rounded-full mt-1.5 overflow-hidden">
            <div 
              className="h-full bg-cyber-purple transition-all duration-300"
              style={{ width: `${syncRate}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Control Actions Panel */}
      <div className="flex flex-col gap-2">
        <span className="font-mono text-[9px] text-gray-500 uppercase tracking-widest font-bold">Systems Override</span>
        
        {/* Defrag button */}
        <button
          onClick={handleDefragClick}
          disabled={isDefragging}
          className={`w-full py-2.5 font-mono text-xs font-bold border rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer select-none ${
            isDefragging
              ? "bg-cyber-purple/10 border-cyber-purple text-cyber-purple animate-pulse cursor-not-allowed"
              : "bg-cyber-cyan/10 border-cyber-cyan/25 hover:border-cyber-cyan text-cyber-cyan hover:bg-cyber-cyan/20 hover:shadow-[0_0_8px_rgba(6,182,212,0.15)]"
          }`}
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isDefragging ? "animate-spin" : ""}`} />
          {isDefragging ? "DEFRAGMENTING..." : "DEFRAG NEURAL CORE"}
        </button>

        {/* Diagnostics & Scanline Toggle grid */}
        <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
          <button
            onClick={handleTestDiagnostics}
            className="py-2 bg-cyber-bg/40 border border-cyber-cyan/10 rounded-xl text-center text-gray-400 hover:text-cyber-cyan hover:border-cyber-cyan/30 transition-all cursor-pointer font-bold"
          >
            SYS TEST
          </button>
          
          <button
            onClick={() => {
              playSweep(600, 750, 0.1);
              setScanlinesEnabled(!scanlinesEnabled);
            }}
            className={`py-2 border rounded-xl text-center transition-all cursor-pointer font-bold ${
              scanlinesEnabled
                ? "bg-cyber-purple/10 border-cyber-purple text-cyber-purple"
                : "bg-cyber-bg/40 border-cyber-cyan/10 text-gray-400 hover:text-gray-200"
            }`}
          >
            CRT: {scanlinesEnabled ? "ON" : "OFF"}
          </button>
        </div>
      </div>

      {/* Real-time Assistant Console Log */}
      <div className="bg-cyber-bg/85 border border-cyber-cyan/10 rounded-xl p-3 text-left font-mono text-[9px] text-gray-400 h-20 overflow-y-auto flex flex-col gap-1 shadow-inner relative">
        <div className="absolute bottom-1 right-2 font-mono text-[7px] text-cyber-cyan/30">
          LOG TELEMETRY
        </div>
        <AnimatePresence>
          {logs.map((log, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="flex gap-1.5 leading-normal"
            >
              <span className="text-cyber-cyan select-none">&gt;&gt;</span>
              <span className="break-all">{log}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
