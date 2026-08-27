"use client";

import React, { useState, useEffect, useRef } from "react";
import { Send, Terminal, ShieldAlert, Cpu, Sparkles, Activity } from "lucide-react";
import { CanvasMemory } from "./ConstellationCanvas";
import { motion, AnimatePresence } from "framer-motion";

interface Message {
  id: string;
  sender: "user" | "ai" | "system";
  text: string;
  telemetry?: {
    congruence: string;
    synapseId: string;
    resonance: string;
    concepts: string[];
    isOffline: boolean;
  };
}

interface ConsciousnessMirrorViewProps {
  memories: CanvasMemory[];
}

const STOP_WORDS = new Set([
  "the", "is", "a", "of", "to", "and", "in", "it", "you", "that", "he", "was", "for", "on", "are", "as", 
  "with", "his", "they", "i", "my", "me", "how", "what", "where", "who", "when", "why", "about", "your"
]);

export default function ConsciousnessMirrorView({ memories }: ConsciousnessMirrorViewProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "system-1",
      sender: "system",
      text: "Consciousness Core Ready: Chatbot index loaded with local memories. Ask queries to explore matches."
    }
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [activeTelemetry, setActiveTelemetry] = useState({
    congruence: "100.0%",
    synapseId: "SYS-INIT",
    resonance: "CALIBRATED / SERENE",
    concepts: ["consciousness", "system"],
    isOffline: true
  });

  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const [voiceEnabled, setVoiceEnabled] = useState(false); // default to muted
  const voiceEnabledRef = useRef(voiceEnabled);

  useEffect(() => {
    voiceEnabledRef.current = voiceEnabled;
  }, [voiceEnabled]);

  const speakText = (text: string) => {
    if (!voiceEnabledRef.current) return;
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      const cleanText = text.replace(/\[.*?\]/g, "").trim();
      const utterance = new SpeechSynthesisUtterance(cleanText);
      const voices = window.speechSynthesis.getVoices();
      const selectedVoice = voices.find(v => v.lang.startsWith("en") && (v.name.includes("David") || v.name.includes("Google") || v.name.includes("Natural"))) || 
                            voices.find(v => v.lang.startsWith("en")) || 
                            voices[0];
                            
      if (selectedVoice) {
        utterance.voice = selectedVoice;
      }
      utterance.pitch = 0.9;
      utterance.rate = 1.0;
      utterance.volume = 0.9;
      window.speechSynthesis.speak(utterance);
    }
  };

  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const playSynthBeep = (freq: number, duration: number, isSweep = false) => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioContextClass();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      if (isSweep) {
        osc.frequency.exponentialRampToValueAtTime(freq / 2, ctx.currentTime + duration);
      }
      gain.gain.setValueAtTime(0.04, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch (e) {}
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userQuery = input.trim();
    setInput("");
    playSynthBeep(600, 0.08);

    const userMessage: Message = {
      id: "user-" + Date.now(),
      sender: "user",
      text: userQuery
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsTyping(true);

    // Client-side simulator logic (Zero latency, fully offline!)
    setTimeout(() => {
      setIsTyping(false);
      playSynthBeep(440, 0.18, true);

      if (memories.length === 0) {
        const emptyText = "There are no memories saved in your local vault yet. Please go to the Memoir Deck and write down some of your stories or thoughts, so you can explore and reflect on them here.";
        const telemetryEmpty = {
          congruence: "0.0%",
          synapseId: "N/A",
          resonance: "VOID",
          concepts: [],
          isOffline: true
        };
        setMessages((prev) => [
          ...prev,
          {
            id: "ai-" + Date.now(),
            sender: "ai",
            text: emptyText,
            telemetry: telemetryEmpty
          }
        ]);
        setActiveTelemetry(telemetryEmpty);
        speakText(emptyText);
        return;
      }

      // Keyword scanning
      const queryWords = userQuery
        .toLowerCase()
        .replace(/[^\w\s]/g, "")
        .split(/\s+/)
        .filter(w => w.length > 2 && !STOP_WORDS.has(w));

      let bestMem = memories[0];
      let bestScore = 0;

      memories.forEach(mem => {
        let score = 0;
        const titleLower = mem.title.toLowerCase();
        const contentLower = mem.content.toLowerCase();
        const tagsLower = mem.tags.map(t => t.toLowerCase());

        queryWords.forEach(word => {
          if (titleLower.includes(word)) {
            score += 8;
          }
          tagsLower.forEach(tag => {
            if (tag.includes(word)) {
              score += 4;
            }
          });
          if (contentLower.includes(word)) {
            const occurrences = (contentLower.match(new RegExp(word, "g")) || []).length;
            score += occurrences * 2;
          }
        });

        if (score > bestScore) {
          bestScore = score;
          bestMem = mem;
        }
      });

      const congruence = Math.min(65 + bestScore * 5, 99.8).toFixed(1);
      
      const pales = [
        `Reflecting on that... You recorded a memory titled "${bestMem.title}". In your story, you wrote: "${bestMem.content}". You noted feeling a deep sense of ${bestMem.emotion} during that moment, especially in relation to ${bestMem.tags.length > 0 ? bestMem.tags.join(" and ") : "your journey"}.`,
        `You recorded a memory about "${bestMem.title}". In the story, you wrote: "${bestMem.content}". You described it as a very ${bestMem.emotion} moment, closely tied to ${bestMem.tags.length > 0 ? bestMem.tags.join(" and ") : "your experiences"}.`,
        `This matches your entry "${bestMem.title}", where you recorded: "${bestMem.content}". Your notes suggest it brought back a ${bestMem.emotion} feeling connected to ${bestMem.tags.length > 0 ? bestMem.tags.join(" and ") : "your thoughts"}.`
      ];

      const responseText = bestScore > 0 
        ? pales[Math.floor(Math.random() * pales.length)]
        : `Searching your local vault did not yield a direct tag/keyword match. However, looking at your entry "${bestMem.title}", you wrote: "${bestMem.content}". Your record reflects a sense of ${bestMem.emotion}.`;

      const responseTelemetry = {
        congruence: `${congruence}%`,
        synapseId: bestMem.id || "local-node",
        resonance: bestMem.emotion.toUpperCase(),
        concepts: bestMem.tags,
        isOffline: true
      };

      setMessages((prev) => [
        ...prev,
        {
          id: "ai-" + Date.now(),
          sender: "ai",
          text: responseText,
          telemetry: responseTelemetry
        }
      ]);
      
      setActiveTelemetry(responseTelemetry);
      speakText(responseText);

    }, 550);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 w-full h-[520px] md:h-[600px]">
      
      {/* Chat screen (Left 3 cols) */}
      <div className="glass-panel border-cyber-cyan/15 rounded-2xl lg:col-span-3 flex flex-col relative overflow-hidden bg-cyber-bg/40">
        
        {/* Terminal Header */}
        <div className="px-5 py-3 border-b border-cyber-cyan/10 bg-cyber-card flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-cyber-cyan animate-pulse" />
            <span className="font-mono text-xs font-bold text-cyber-cyan uppercase tracking-widest">
              Consciousness Chat Mirror
            </span>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                setVoiceEnabled(!voiceEnabled);
                if (typeof window !== "undefined" && window.speechSynthesis) {
                  window.speechSynthesis.cancel();
                }
                playSynthBeep(500, 0.05);
              }}
              className={`text-xs px-3 py-1 rounded-xl border transition-all cursor-pointer font-semibold ${
                voiceEnabled
                  ? "bg-cyber-cyan/15 border-cyber-cyan/35 text-cyber-cyan hover:bg-cyber-cyan/25"
                  : "bg-gray-950/20 border-gray-800 text-gray-500 hover:text-gray-400"
              }`}
            >
              Voice: {voiceEnabled ? "ON" : "OFF"}
            </button>
            <span className="font-mono text-xs text-gray-500 hidden sm:inline">LOCAL DATABASE INDEX</span>
          </div>
        </div>

        {/* Messages Feed */}
        <div className="flex-1 p-5 overflow-y-auto flex flex-col gap-4 text-sm text-gray-300">
          
          {messages.map((msg) => (
            <div 
              key={msg.id} 
              className={`p-4 rounded-xl border leading-relaxed ${
                msg.sender === "user"
                  ? "bg-cyber-cyan/5 border-cyber-cyan/20 text-cyber-cyan/95 max-w-[85%] self-end"
                  : msg.sender === "ai"
                  ? "bg-cyber-purple/5 border-cyber-purple/20 text-gray-200 max-w-[85%] self-start"
                  : "bg-cyber-bg/90 border-cyber-cyan/10 text-gray-500 text-center w-full max-w-full font-mono text-xs"
              }`}
            >
              {msg.sender === "user" && (
                <div className="text-[10px] text-cyber-cyan/60 font-semibold mb-1 uppercase tracking-wider font-mono">
                  You
                </div>
              )}
              {msg.sender === "ai" && (
                <div className="text-[10px] text-cyber-purple font-semibold mb-1 uppercase tracking-wider flex items-center justify-between font-mono">
                  <span>Memento AI Matcher</span>
                  <span className="text-[9px] text-gray-500">
                    Match Score: {msg.telemetry?.congruence} (Local)
                  </span>
                </div>
              )}

              <p className="font-sans whitespace-pre-wrap">{msg.text}</p>
            </div>
          ))}

          {/* Typing indicator */}
          {isTyping && (
            <div className="p-4 rounded-xl border bg-cyber-purple/5 border-cyber-purple/20 text-cyber-purple max-w-[80%] self-start flex items-center gap-2">
              <span className="w-2 h-2 bg-cyber-purple rounded-full animate-bounce"></span>
              <span className="w-2 h-2 bg-cyber-purple rounded-full animate-bounce [animation-delay:0.2s]"></span>
              <span className="w-2 h-2 bg-cyber-purple rounded-full animate-bounce [animation-delay:0.4s]"></span>
              <span className="text-[10px] font-semibold uppercase tracking-wider animate-pulse ml-1 font-mono">
                Matching memories...
              </span>
            </div>
          )}

          <div ref={chatEndRef}></div>
        </div>

        {/* Input box */}
        <form onSubmit={handleSubmit} className="p-4 border-t border-cyber-cyan/10 bg-cyber-card flex items-center gap-2">
          <input
            type="text"
            required
            value={input}
            disabled={isTyping}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask Memento about your memories... (e.g. Where did you spend childhood summers?)"
            className="flex-1 bg-cyber-bg/80 border border-cyber-cyan/15 rounded-xl px-4 py-3 text-sm text-gray-200 focus:outline-none focus:border-cyber-cyan transition-all placeholder:text-gray-600 font-sans"
          />
          <button
            type="submit"
            disabled={isTyping}
            className="bg-cyber-cyan/20 border border-cyber-cyan/35 text-cyber-cyan p-3 rounded-xl hover:bg-cyber-cyan/30 hover:border-cyber-cyan hover:shadow-[0_0_10px_rgba(6,182,212,0.2)] transition-all cursor-pointer"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>

      </div>

      {/* Telemetry Output HUD (Right 1 col) */}
      <div className="glass-panel border-cyber-cyan/15 rounded-2xl p-5 flex flex-col gap-4 relative overflow-hidden bg-cyber-bg/30">
        <div className="absolute top-0 left-0 w-full h-[1px] bg-cyber-cyan/10"></div>

        <div className="flex flex-col gap-1 border-b border-cyber-cyan/10 pb-3">
          <h3 className="text-sm font-bold text-cyber-cyan uppercase tracking-wider flex items-center gap-1 font-mono">
            <Terminal className="w-4 h-4" />
            Matching Info
          </h3>
          <p className="text-xs text-gray-400 font-sans">
            Local memory match details
          </p>
        </div>

        {/* Telemetry Blocks */}
        <div className="flex-1 flex flex-col gap-4 font-mono text-[11px] uppercase tracking-wide">
          
          {/* Match Score */}
          <div className="bg-cyber-bg/60 border border-cyber-cyan/10 rounded-xl p-3 flex flex-col gap-1">
            <span className="text-gray-400 text-[10px]">Match Strength</span>
            <span className="text-base font-black text-cyber-cyan glow-text-cyan">{activeTelemetry.congruence}</span>
          </div>

          {/* Resonance */}
          <div className="bg-cyber-bg/60 border border-cyber-cyan/10 rounded-xl p-3 flex flex-col gap-1">
            <span className="text-gray-400 text-[10px]">Emotional Accent</span>
            <span className="text-xs font-bold text-cyber-purple glow-text-purple">{activeTelemetry.resonance}</span>
          </div>

          {/* Synapse ID */}
          <div className="bg-cyber-bg/60 border border-cyber-cyan/10 rounded-xl p-3 flex flex-col gap-1">
            <span className="text-gray-400 text-[10px]">Matched Node ID</span>
            <span className="text-gray-300 font-semibold text-[10px] break-all">{activeTelemetry.synapseId}</span>
          </div>

          {/* Matched Concepts */}
          <div className="bg-cyber-bg/60 border border-cyber-cyan/10 rounded-xl p-3 flex flex-col gap-1 flex-1">
            <span className="text-gray-400 mb-1 text-[10px]">Linked Keywords</span>
            <div className="flex flex-wrap gap-1">
              {activeTelemetry.concepts.length === 0 ? (
                <span className="text-gray-600 italic">No tags matching</span>
              ) : (
                activeTelemetry.concepts.map((concept, i) => (
                  <span key={i} className="bg-cyber-cyan/5 border border-cyber-cyan/20 text-cyber-cyan px-2 py-0.5 rounded text-[9px] font-semibold font-mono">
                    #{concept}
                  </span>
                ))
              )}
            </div>
          </div>

          {/* Database Sync Status */}
          <div className="flex items-center gap-1.5 text-[10px] text-gray-500 border-t border-cyber-cyan/10 pt-2 font-semibold font-sans">
            <span className="w-2 h-2 rounded-full bg-cyber-green animate-pulse"></span>
            <span>STORAGE: 100% OFFLINE</span>
          </div>

        </div>

      </div>

    </div>
  );
}
