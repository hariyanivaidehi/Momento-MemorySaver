"use client";

import React, { useState } from "react";
import { Sparkles, CheckCircle, Info, Bookmark, HelpCircle } from "lucide-react";
import { motion } from "framer-motion";

interface MemoirDeckViewProps {
  onAddMemory: (memory: {
    title: string;
    content: string;
    emotion: "nostalgic" | "existential" | "joyful" | "melancholic" | "serene";
    tags: string[];
    wing: string;
    pointer: string;
  }) => Promise<void>;
}

const EXISTENTIAL_PROMPTS = [
  "What is your earliest childhood memory, and why does it stay with you?",
  "Describe a decision that felt minor at the time but changed the course of your life.",
  "If you could preserve only one message or advice for your future self, what would it be?",
  "Where is the place you feel most at peace? Describe what you see, hear, and feel there.",
  "What is a piece of wisdom passed down by your parents or grandparents that you hold dear?",
  "What does true happiness feel like to you? Describe a recent moment you felt it.",
  "Describe a dream or goal that you are currently working towards."
];

export default function MemoirDeckView({ onAddMemory }: MemoirDeckViewProps) {
  const [promptIndex, setPromptIndex] = useState(0);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [emotion, setEmotion] = useState<"nostalgic" | "existential" | "joyful" | "melancholic" | "serene">("serene");
  const [tagsInput, setTagsInput] = useState("");
  const [wing, setWing] = useState<"PERSONAL" | "WORK" | "HOBBY" | "LEGACY">("PERSONAL");
  
  const [syncState, setSyncState] = useState<"idle" | "saving" | "complete">("idle");

  const handleNextPrompt = () => {
    playSynthChirp(440, 1.2, 0.05);
    setPromptIndex((prev) => (prev + 1) % EXISTENTIAL_PROMPTS.length);
  };

  const playSynthChirp = (freq: number, sweep: number, duration: number) => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioContextClass();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(freq * sweep, ctx.currentTime + duration);
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
    if (!title.trim() || !content.trim()) return;

    setSyncState("saving");
    playSynthChirp(330, 1.5, 0.1);

    // Simple, clean save simulation (500ms)
    setTimeout(async () => {
      const tags = tagsInput
        .split(",")
        .map((t) => t.trim().toLowerCase())
        .filter((t) => t.length > 0);
        
      // Generate AAAK Pointer representation
      const cleanTags = tags.map(t => t.replace(/[^a-zA-Z0-9]/g, "")).join("~");
      const dateStr = new Date().toISOString().split("T")[0];
      const monthDay = dateStr.replace(/-/g, "").substring(4);
      const randomId = Math.floor(Math.random() * 1000).toString().padStart(3, "0");
      const pointer = `§ W-${wing}/R-${monthDay}/D-${randomId} @t ${cleanTags || "null"} @d ${dateStr} §`;

      await onAddMemory({ title, content, emotion, tags, wing, pointer });



      setSyncState("complete");
      
      setTimeout(() => {
        setTitle("");
        setContent("");
        setTagsInput("");
        setEmotion("serene");
        setSyncState("idle");
      }, 1000);
    }, 600);
  };

  const EMOTIONS = [
    { key: "serene", label: "Serene", color: "text-cyan-400 border-cyan-500/20" },
    { key: "nostalgic", label: "Nostalgic", color: "text-indigo-400 border-indigo-500/20" },
    { key: "existential", label: "Existential", color: "text-fuchsia-400 border-fuchsia-500/20" },
    { key: "joyful", label: "Joyful", color: "text-teal-400 border-teal-500/20" },
    { key: "melancholic", label: "Melancholic", color: "text-blue-400 border-blue-500/20" }
  ] as const;

  return (
    <div className="glass-panel border-cyber-cyan/15 rounded-2xl p-6 md:p-8 relative overflow-hidden w-full max-w-3xl mx-auto tech-panel shadow-2xl">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-cyber-cyan/10 pb-4 mb-6 gap-3">
        <div className="flex flex-col gap-1">
          <h2 className="text-base font-bold text-cyber-cyan uppercase tracking-wider flex items-center gap-2 font-mono">
            <Bookmark className="w-5 h-5" />
            Memoir Journal Deck
          </h2>
          <p className="text-xs text-gray-400">
            Write down memories and lessons to save them permanently in your local vault.
          </p>
        </div>
      </div>

      {/* Prompts Calibrator */}
      <div className="bg-cyber-bg/75 border border-cyber-cyan/15 p-5 rounded-2xl flex flex-col gap-2.5 relative overflow-hidden mb-6 tech-panel">
        <div className="absolute top-2 right-3 font-mono text-[9px] text-cyber-cyan/40">
          PROMPT CALIBRATOR #{promptIndex + 1}
        </div>
        <span className="font-mono text-xs text-cyber-cyan uppercase tracking-wider flex items-center gap-1 font-semibold">
          <HelpCircle className="w-4 h-4" />
          Need Inspiration?
        </span>
        <p className="text-sm text-gray-200 font-sans italic leading-relaxed">
          "{EXISTENTIAL_PROMPTS[promptIndex]}"
        </p>
        <button
          type="button"
          onClick={handleNextPrompt}
          className="text-xs text-cyber-cyan/85 hover:text-cyber-cyan font-semibold tracking-wide self-end mt-2 flex items-center gap-1 bg-cyber-cyan/5 border border-cyber-cyan/15 hover:border-cyber-cyan/35 px-3 py-1 rounded-xl transition-all cursor-pointer"
        >
          Next Question &gt;
        </button>
      </div>

      {/* Syncing Overlay */}
      {syncState !== "idle" && (
        <div className="absolute inset-0 bg-cyber-bg/95 backdrop-blur-sm z-30 flex flex-col items-center justify-center p-6 text-center gap-4 transition-all">
          {syncState === "saving" ? (
            <>
              <div className="w-14 h-14 rounded-full border-2 border-dashed border-cyber-cyan animate-spin"></div>
              <div className="flex flex-col gap-1">
                <span className="font-mono text-sm font-bold text-cyber-cyan tracking-wider">SECURELY SAVING MEMORY...</span>
                <span className="text-xs text-gray-400">Encrypting node into your local storage database</span>
              </div>
            </>
          ) : (
            <>
              <CheckCircle className="w-16 h-16 text-cyber-green animate-bounce" />
              <div className="flex flex-col gap-1">
                <h3 className="text-base font-bold text-cyber-green uppercase tracking-wider font-mono">
                  Memory Saved Successfully
                </h3>
                <p className="text-xs text-gray-400 max-w-xs leading-normal">
                  Your memory has been compiled and saved locally. It will now show up on your constellation map.
                </p>
              </div>
            </>
          )}
        </div>
      )}

      {/* Editor Form */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        
        {/* Title */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-gray-400 font-mono uppercase tracking-wider font-semibold">Memory Title</label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="E.g., Childhood summer at the lakehouse..."
            className="bg-cyber-bg/70 border border-cyber-cyan/15 rounded-lg px-4 py-2.5 text-sm text-gray-200 focus:outline-none focus:border-cyber-cyan transition-all placeholder:text-gray-600 font-sans"
          />
        </div>

        {/* Memory Palace Wing Selector */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-gray-400 font-mono uppercase tracking-wider font-semibold flex items-center gap-1">
            <span>Select Palace Wing</span>
            <span title="Categorizes this memory node into a specific domain of your Memory Palace.">
              <Info className="w-3.5 h-3.5 text-gray-500 cursor-help" />
            </span>
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {(["PERSONAL", "WORK", "HOBBY", "LEGACY"] as const).map((w) => (
              <button
                type="button"
                key={w}
                onClick={() => setWing(w)}
                className={`flex items-center justify-center py-2.5 px-2 rounded-xl border text-xs cursor-pointer transition-all select-none font-mono ${
                  wing === w
                    ? "bg-cyber-purple/20 border-cyber-purple text-cyber-purple shadow-[0_0_8px_rgba(217,70,239,0.1)] font-bold scale-[1.02]"
                    : "bg-cyber-bg/40 border-cyber-cyan/10 text-gray-400 hover:border-cyber-cyan/25 hover:text-gray-200"
                }`}
              >
                {w}
              </button>
            ))}
          </div>
        </div>

        {/* Emotion Selectors */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-gray-400 font-mono uppercase tracking-wider font-semibold flex items-center gap-1">
            <span>Select Resonant Emotion</span>
            <span title="Controls the color representing this node in your constellation.">
              <Info className="w-3.5 h-3.5 text-gray-500 cursor-help" />
            </span>
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
            {EMOTIONS.map((em) => (
              <label
                key={em.key}
                className={`flex items-center justify-center py-2.5 px-2 rounded-xl border text-xs cursor-pointer transition-all select-none font-sans ${
                  emotion === em.key
                    ? "bg-cyber-cyan/20 border-cyber-cyan text-cyber-cyan shadow-[0_0_8px_rgba(6,182,212,0.1)] font-bold scale-[1.02]"
                    : "bg-cyber-bg/40 border-cyber-cyan/10 text-gray-400 hover:border-cyber-cyan/25 hover:text-gray-200"
                }`}
              >
                <input
                  type="radio"
                  name="emotion"
                  value={em.key}
                  checked={emotion === em.key}
                  onChange={() => setEmotion(em.key as any)}
                  className="sr-only"
                />
                {em.label}
              </label>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between items-center">
            <label className="text-xs text-gray-400 font-mono uppercase tracking-wider font-semibold">Memory Content</label>
            <span className="font-mono text-xs text-gray-500">
              Word Count: {content.split(/\s+/).filter(Boolean).length}
            </span>
          </div>
          <textarea
            required
            rows={5}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Record your thoughts, lessons, stories or reflections in detail..."
            className="bg-cyber-bg/70 border border-cyber-cyan/15 rounded-lg p-4 text-sm text-gray-200 focus:outline-none focus:border-cyber-cyan transition-all placeholder:text-gray-600 font-sans leading-relaxed resize-none"
          />
        </div>

        {/* Tags */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-gray-400 font-mono uppercase tracking-wider font-semibold">Tags (comma separated)</label>
          <input
            type="text"
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
            placeholder="E.g., childhood, nature, travel, lesson"
            className="bg-cyber-bg/70 border border-cyber-cyan/15 rounded-lg px-4 py-2.5 text-sm text-gray-200 focus:outline-none focus:border-cyber-cyan transition-all placeholder:text-gray-600 font-mono"
          />
        </div>

        {/* Submit */}
        <button
          type="submit"
          className="mt-2 w-full font-mono text-sm font-bold bg-gradient-to-r from-cyber-cyan to-cyber-purple border border-cyber-cyan/40 hover:border-cyber-cyan text-white py-3 rounded-lg hover:shadow-[0_0_20px_rgba(6,182,212,0.25)] transition-all uppercase tracking-wider cursor-pointer"
        >
          Save Memory Node
        </button>

      </form>
    </div>
  );
}
