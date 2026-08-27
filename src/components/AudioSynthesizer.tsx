"use client";

import React, { useEffect, useRef, useState } from "react";
import { Volume2, VolumeX, Radio, Activity } from "lucide-react";

interface FrequencyPreset {
  freq: number;
  label: string;
  desc: string;
}

const FREQUENCY_PRESETS: FrequencyPreset[] = [
  { freq: 174, label: "174 Hz", desc: "Security & Peace" },
  { freq: 396, label: "396 Hz", desc: "Fear Liberation" },
  { freq: 432, label: "432 Hz", desc: "Universal Harmony" },
  { freq: 528, label: "528 Hz", desc: "Transformation" },
  { freq: 639, label: "639 Hz", desc: "Relationships" },
  { freq: 852, label: "852 Hz", desc: "Intuition" }
];

export default function AudioSynthesizer() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.2);
  const [selectedFreq, setSelectedFreq] = useState(432);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  
  // Audio context refs
  const audioCtxRef = useRef<AudioContext | null>(null);
  const mainGainRef = useRef<GainNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const osc1Ref = useRef<OscillatorNode | null>(null);
  const osc2Ref = useRef<OscillatorNode | null>(null);
  const subOscRef = useRef<OscillatorNode | null>(null);
  
  const animationFrameRef = useRef<number | null>(null);

  const initAudio = () => {
    if (audioCtxRef.current) return;

    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    const ctx = new AudioContextClass();
    audioCtxRef.current = ctx;

    const analyser = ctx.createAnalyser();
    analyser.fftSize = 512;
    analyserRef.current = analyser;

    const mainGain = ctx.createGain();
    mainGain.gain.setValueAtTime(volume, ctx.currentTime);
    mainGainRef.current = mainGain;

    mainGain.connect(analyser);
    analyser.connect(ctx.destination);

    setupOscillators(selectedFreq);
  };

  const setupOscillators = (frequency: number) => {
    const ctx = audioCtxRef.current;
    const mainGain = mainGainRef.current;
    if (!ctx || !mainGain) return;

    stopOscillators();

    // Fundamental oscillator (sine)
    const osc1 = ctx.createOscillator();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(frequency, ctx.currentTime);
    
    // Detuned oscillator (+1.5Hz) for binaural harmony
    const osc2 = ctx.createOscillator();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(frequency + 1.5, ctx.currentTime);

    // Deep sub layer (triangle, freq / 4)
    const subOsc = ctx.createOscillator();
    subOsc.type = "triangle";
    subOsc.frequency.setValueAtTime(frequency / 4, ctx.currentTime);

    const osc1Gain = ctx.createGain();
    osc1Gain.gain.setValueAtTime(0.4, ctx.currentTime);

    const osc2Gain = ctx.createGain();
    osc2Gain.gain.setValueAtTime(0.4, ctx.currentTime);

    const subGain = ctx.createGain();
    subGain.gain.setValueAtTime(0.25, ctx.currentTime);

    osc1.connect(osc1Gain);
    osc1Gain.connect(mainGain);

    osc2.connect(osc2Gain);
    osc2Gain.connect(mainGain);

    subOsc.connect(subGain);
    subGain.connect(mainGain);

    osc1.start();
    osc2.start();
    subOsc.start();

    osc1Ref.current = osc1;
    osc2Ref.current = osc2;
    subOscRef.current = subOsc;
  };

  const stopOscillators = () => {
    if (osc1Ref.current) {
      try { osc1Ref.current.stop(); } catch (e) {}
      osc1Ref.current.disconnect();
      osc1Ref.current = null;
    }
    if (osc2Ref.current) {
      try { osc2Ref.current.stop(); } catch (e) {}
      osc2Ref.current.disconnect();
      osc2Ref.current = null;
    }
    if (subOscRef.current) {
      try { subOscRef.current.stop(); } catch (e) {}
      subOscRef.current.disconnect();
      subOscRef.current = null;
    }
  };

  const toggleAudio = async () => {
    initAudio();
    const ctx = audioCtxRef.current;
    if (!ctx) return;

    if (isPlaying) {
      if (mainGainRef.current) {
        mainGainRef.current.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.15);
      }
      setTimeout(() => {
        if (ctx.state !== "closed") {
          ctx.suspend();
        }
        setIsPlaying(false);
      }, 150);
    } else {
      if (ctx.state === "suspended") {
        await ctx.resume();
      }
      setupOscillators(selectedFreq);
      if (mainGainRef.current) {
        mainGainRef.current.gain.setValueAtTime(0, ctx.currentTime);
        mainGainRef.current.gain.linearRampToValueAtTime(volume, ctx.currentTime + 0.3);
      }
      setIsPlaying(true);
    }
  };

  useEffect(() => {
    if (mainGainRef.current && audioCtxRef.current) {
      mainGainRef.current.gain.setValueAtTime(volume, audioCtxRef.current.currentTime);
    }
  }, [volume]);

  const handleFreqChange = (freq: number) => {
    setSelectedFreq(freq);
    if (isPlaying && audioCtxRef.current) {
      setupOscillators(freq);
    }
  };

  // Oscilloscope logic
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const draw = () => {
      const width = rect.width;
      const height = rect.height;

      ctx.fillStyle = "rgba(3, 7, 18, 0.25)";
      ctx.fillRect(0, 0, width, height);

      let dataArray = new Uint8Array(128);
      const analyser = analyserRef.current;
      
      if (isPlaying && analyser) {
        dataArray = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteTimeDomainData(dataArray);
      } else {
        // Ambient idle movement
        for (let i = 0; i < 128; i++) {
          dataArray[i] = 128 + Math.sin(i * 0.12 + Date.now() * 0.004) * 1.5;
        }
      }

      ctx.lineWidth = 2.0;
      const gradient = ctx.createLinearGradient(0, 0, width, 0);
      gradient.addColorStop(0, "#06b6d4");
      gradient.addColorStop(0.5, "#3b82f6");
      gradient.addColorStop(1, "#d946ef");
      
      ctx.strokeStyle = gradient;
      ctx.beginPath();

      const sliceWidth = width / dataArray.length;
      let x = 0;

      for (let i = 0; i < dataArray.length; i++) {
        const v = dataArray[i] / 128.0;
        const y = (v * height) / 2;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
        x += sliceWidth;
      }

      ctx.lineTo(width, height / 2);
      ctx.shadowBlur = 6;
      ctx.shadowColor = "rgba(6, 182, 212, 0.35)";
      ctx.stroke();
      ctx.shadowBlur = 0;

      animationFrameRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying]);

  useEffect(() => {
    return () => {
      stopOscillators();
      if (audioCtxRef.current) {
        audioCtxRef.current.close();
      }
    };
  }, []);

  return (
    <div className="glass-panel rounded-2xl p-5 w-full max-w-sm flex flex-col gap-4 border-cyber-cyan/15 shadow-lg relative overflow-hidden">
      
      {/* Header */}
      <div className="flex flex-col gap-2.5 border-b border-cyber-cyan/10 pb-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-semibold text-gray-200">
            <Radio className={`w-4.5 h-4.5 ${isPlaying ? "text-cyber-cyan animate-pulse" : "text-cyber-cyan/40"}`} />
            <span className="font-mono uppercase tracking-wider text-cyber-cyan">Ambient Soundscape</span>
          </div>
          <div className={`flex items-center gap-1 font-mono text-[10px] px-2 py-0.5 rounded border ${
            isPlaying 
              ? "text-cyber-green bg-cyber-green/5 border-cyber-green/20" 
              : "text-cyber-purple bg-cyber-purple/5 border-cyber-purple/20"
          }`}>
            <Activity className="w-3.5 h-3.5" />
            <span>{isPlaying ? "ACTIVE" : "MUTED"}</span>
          </div>
        </div>
        <p className="text-[10px] text-gray-400 font-sans leading-normal bg-cyber-cyan/5 p-2 rounded-lg border border-cyber-cyan/10">
          🎵 <strong>Binaural Wave Generator:</strong> Plays Solfeggio soundwaves to enhance memory recall, cognitive focus, and quiet reflection.
        </p>
      </div>

      {/* Oscilloscope */}
      <div className="relative h-14 bg-cyber-bg/85 rounded-xl border border-cyber-cyan/10 overflow-hidden">
        <canvas ref={canvasRef} className="w-full h-full block" />
        <div className="absolute bottom-1 right-2.5 font-mono text-[9px] text-cyber-cyan/40 tracking-wider">
          OSCILLOSCOPE METER
        </div>
      </div>

      {/* Frequencies */}
      <div className="flex flex-col gap-2">
        <span className="font-mono text-[10px] text-gray-400 uppercase tracking-widest font-bold">Select Frequency Preset</span>
        <div className="grid grid-cols-3 gap-1.5">
          {FREQUENCY_PRESETS.map((preset) => (
            <button
              key={preset.freq}
              onClick={() => handleFreqChange(preset.freq)}
              title={preset.desc}
              className={`py-2 rounded-lg font-mono text-[10px] transition-all border font-semibold cursor-pointer ${
                selectedFreq === preset.freq
                  ? "bg-cyber-cyan/20 border-cyber-cyan text-cyber-cyan shadow-[0_0_8px_rgba(6,182,212,0.15)] scale-[1.02]"
                  : "bg-cyber-bg/50 border-cyber-cyan/5 text-gray-400 hover:border-cyber-cyan/25 hover:text-gray-200"
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>
        <div className="font-mono text-[10px] text-cyber-cyan bg-cyber-cyan/5 px-2.5 py-1.5 rounded-lg border border-cyber-cyan/10 flex items-center justify-between">
          <span>Preset Benefit:</span>
          <span className="font-semibold tracking-wide text-gray-200">{FREQUENCY_PRESETS.find(p => p.freq === selectedFreq)?.desc}</span>
        </div>
      </div>

      {/* Player controls */}
      <div className="flex items-center gap-4 pt-1.5">
        <button
          onClick={toggleAudio}
          className={`flex items-center justify-center p-3 rounded-xl border transition-all cursor-pointer ${
            isPlaying
              ? "bg-cyber-purple/20 border-cyber-purple text-cyber-purple hover:bg-cyber-purple/30 shadow-[0_0_8px_rgba(217,70,239,0.2)]"
              : "bg-cyber-cyan/20 border-cyber-cyan text-cyber-cyan hover:bg-cyber-cyan/30 shadow-[0_0_8px_rgba(6,182,212,0.2)]"
          }`}
        >
          {isPlaying ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
        </button>

        <div className="flex-1 flex items-center gap-2.5">
          <span className="text-xs text-gray-400 font-mono">VOL</span>
          <input
            type="range"
            min="0"
            max="0.4"
            step="0.01"
            value={volume}
            onChange={(e) => setVolume(parseFloat(e.target.value))}
            className="flex-1 h-1.5 bg-cyber-cyan/15 rounded-lg appearance-none cursor-pointer accent-cyber-cyan hover:accent-cyber-purple transition-all"
          />
          <span className="font-mono text-[10px] text-cyber-cyan w-8 text-right font-bold">
            {Math.round(volume * 250)}%
          </span>
        </div>
      </div>

    </div>
  );
}
