"use client";

import React from "react";
import { BrainCircuit, Timer, Trash2, Calendar, Sparkles, Tag, Eye, Folder, FolderOpen, ChevronRight, ChevronDown, Layers, List } from "lucide-react";
import { CanvasMemory } from "./ConstellationCanvas";
import { motion } from "framer-motion";

interface DashboardViewProps {
  memories: CanvasMemory[];
  lettersCount: number;
  onDeleteMemory: (id: string) => void;
  onNavigateToTab: (tab: string) => void;
  onSelectMemory: (memory: CanvasMemory) => void;
}

export default function DashboardView({
  memories,
  lettersCount,
  onDeleteMemory,
  onNavigateToTab,
  onSelectMemory
}: DashboardViewProps) {
  const [selectedWing, setSelectedWing] = React.useState<string>("ALL");
  const [viewMode, setViewMode] = React.useState<"flat" | "tree">("flat");
  const [expandedNodes, setExpandedNodes] = React.useState<Record<string, boolean>>({
    "wing-PERSONAL": true // expand personal by default
  });

  const toggleNodeExpand = (nodeKey: string) => {
    setExpandedNodes(prev => ({
      ...prev,
      [nodeKey]: !prev[nodeKey]
    }));
  };

  // Group memories into Wings -> Rooms -> Drawers
  const treeData = React.useMemo(() => {
    const wings: Record<string, Record<string, CanvasMemory[]>> = {
      PERSONAL: {},
      WORK: {},
      HOBBY: {},
      LEGACY: {}
    };

    memories.forEach((mem) => {
      const w = (mem.wing || "PERSONAL").toUpperCase();
      const r = mem.room || "GENERAL";
      
      if (!wings[w]) {
        wings[w] = {};
      }
      if (!wings[w][r]) {
        wings[w][r] = [];
      }
      wings[w][r].push(mem);
    });

    return wings;
  }, [memories]);

  const filteredMemories = React.useMemo(() => {
    if (selectedWing === "ALL") return memories;
    return memories.filter(m => (m.wing || "PERSONAL").toUpperCase() === selectedWing);
  }, [memories, selectedWing]);
  
  // Calculate emotional distributions
  const emotionStats = {
    nostalgic: 0,
    existential: 0,
    joyful: 0,
    melancholic: 0,
    serene: 0
  };

  memories.forEach((m) => {
    if (emotionStats[m.emotion] !== undefined) {
      emotionStats[m.emotion]++;
    }
  });

  const totalMem = memories.length || 1;
  const emotionPercentages = {
    nostalgic: Math.round((emotionStats.nostalgic / totalMem) * 100),
    existential: Math.round((emotionStats.existential / totalMem) * 100),
    joyful: Math.round((emotionStats.joyful / totalMem) * 100),
    melancholic: Math.round((emotionStats.melancholic / totalMem) * 100),
    serene: Math.round((emotionStats.serene / totalMem) * 100)
  };

  const EMOTION_LABELS = {
    serene: { label: "Serenity Index", color: "bg-cyan-500", text: "text-cyan-400", border: "border-cyan-500/30" },
    nostalgic: { label: "Nostalgia Cluster", color: "bg-indigo-500", text: "text-indigo-400", border: "border-indigo-500/30" },
    existential: { label: "Existential Core", color: "bg-fuchsia-500", text: "text-fuchsia-400", border: "border-fuchsia-500/30" },
    joyful: { label: "Elation Synapse", color: "bg-teal-500", text: "text-teal-400", border: "border-teal-500/30" },
    melancholic: { label: "Melancholy Drift", color: "bg-blue-500", text: "text-blue-400", border: "border-blue-500/30" }
  };

  return (
    <div className="flex flex-col gap-8 w-full animate-fade-in py-2">
      
      {/* Overview Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        
        {/* Memory count Card */}
        <motion.div 
          whileHover={{ y: -4, scale: 1.01 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className="glass-panel border-cyber-cyan/15 rounded-2xl p-6 flex items-center justify-between shadow-lg relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 w-[4px] h-full bg-cyber-cyan"></div>
          <div className="flex flex-col gap-1.5">
            <span className="font-mono text-xs text-gray-400 tracking-wider uppercase font-semibold">Total Memory Nodes</span>
            <span className="text-3xl font-extrabold text-cyber-cyan glow-text-cyan">{memories.length}</span>
            <span className="text-xs text-gray-500 font-sans">Stored securely in browser cache</span>
          </div>
          <BrainCircuit className="w-10 h-10 text-cyber-cyan/20" />
        </motion.div>

        {/* Temporal Vault Card */}
        <motion.div 
          whileHover={{ y: -4, scale: 1.01 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className="glass-panel border-cyber-purple/15 rounded-2xl p-6 flex items-center justify-between shadow-lg relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 w-[4px] h-full bg-cyber-purple"></div>
          <div className="flex flex-col gap-1.5">
            <span className="font-mono text-xs text-gray-400 tracking-wider uppercase font-semibold">Temporal Capsules</span>
            <span className="text-3xl font-extrabold text-cyber-purple glow-text-purple">{lettersCount}</span>
            <span className="text-xs text-gray-500 font-sans">Scheduled local time unlocks</span>
          </div>
          <Timer className="w-10 h-10 text-cyber-purple/20" />
        </motion.div>

        {/* Local Sync Status Card */}
        <motion.div 
          whileHover={{ y: -4, scale: 1.01 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className="glass-panel border-cyber-teal/15 rounded-2xl p-6 flex items-center justify-between shadow-lg relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 w-[4px] h-full bg-cyber-teal"></div>
          <div className="flex flex-col gap-1.5">
            <span className="font-mono text-xs text-gray-400 tracking-wider uppercase font-semibold">Environment Mode</span>
            <span className="text-xl font-extrabold text-cyber-teal glow-text-teal">LOCAL-FIRST</span>
            <span className="text-xs text-gray-500 font-sans">Zero external servers or cookies</span>
          </div>
          <Sparkles className="w-10 h-10 text-cyber-teal/20" />
        </motion.div>

      </div>

      {/* Main Analysis Panel & Recent Nodes Split */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        
        {/* Left Side: Cognitive Emotional Profile */}
        <motion.div 
          whileHover={{ y: -2 }}
          className="glass-panel border-cyber-cyan/15 rounded-2xl p-6 lg:col-span-2 flex flex-col gap-5 relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 w-full h-[1px] bg-cyber-cyan/10"></div>
          
          <div className="flex flex-col gap-1 border-b border-cyber-cyan/10 pb-3">
            <h2 className="text-sm font-bold text-cyber-cyan uppercase tracking-wider font-mono">
              Emotional Resonance Profile
            </h2>
            <p className="text-xs text-gray-400 font-sans">
              Emotional distribution of your local memories
            </p>
          </div>

          <div className="flex flex-col gap-4.5 pt-1">
            {Object.entries(EMOTION_LABELS).map(([key, style]) => {
              const pct = emotionPercentages[key as keyof typeof emotionPercentages] || 0;
              return (
                <div key={key} className="flex flex-col gap-1.5">
                  <div className="flex justify-between text-xs tracking-wide">
                    <span className="text-gray-300 font-semibold">{style.label}</span>
                    <span className={`${style.text} font-bold`}>{pct}%</span>
                  </div>
                  {/* Progress bar */}
                  <div className="w-full bg-cyber-bg/70 h-2.5 rounded-full border border-cyber-cyan/10 overflow-hidden relative">
                    <div 
                      className={`h-full ${style.color} rounded-full transition-all duration-500`}
                      style={{ width: `${memories.length === 0 ? 0 : pct}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>

          {memories.length === 0 && (
            <div className="flex-1 flex items-center justify-center text-center p-6 min-h-[160px]">
              <span className="text-xs text-gray-500 uppercase tracking-widest font-mono">
                No logs compiled. Profile empty.
              </span>
            </div>
          )}
        </motion.div>

        {/* Right Side: Stored Memory Logbook */}
        <motion.div 
          whileHover={{ y: -2 }}
          className="glass-panel border-cyber-cyan/15 rounded-2xl p-6 lg:col-span-3 flex flex-col gap-5 relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 w-full h-[1px] bg-cyber-cyan/10"></div>
          
          <div className="flex items-center justify-between border-b border-cyber-cyan/10 pb-3 flex-wrap gap-2">
            <div className="flex flex-col gap-1">
              <h2 className="text-sm font-bold text-cyber-cyan uppercase tracking-wider font-mono">
                Local Memory Index
              </h2>
              <p className="text-xs text-gray-400 font-sans">
                Review and manage your local journal entries
              </p>
            </div>

            <div className="flex items-center gap-3">
              {/* Flat/Tree View Toggle */}
              <div className="flex items-center bg-cyber-bg/80 border border-cyber-cyan/15 p-0.5 rounded-lg">
                <button
                  onClick={() => setViewMode("flat")}
                  className={`px-2.5 py-1 rounded font-mono text-[9px] font-bold tracking-wider transition-all flex items-center gap-1 cursor-pointer ${
                    viewMode === "flat"
                      ? "bg-cyber-cyan/15 text-cyber-cyan border border-cyber-cyan/20"
                      : "text-gray-500 hover:text-gray-300 border border-transparent"
                  }`}
                  title="Index List"
                >
                  <List className="w-3 h-3" />
                  INDEX
                </button>
                <button
                  onClick={() => setViewMode("tree")}
                  className={`px-2.5 py-1 rounded font-mono text-[9px] font-bold tracking-wider transition-all flex items-center gap-1 cursor-pointer ${
                    viewMode === "tree"
                      ? "bg-cyber-purple/15 text-cyber-purple border border-cyber-purple/20"
                      : "text-gray-500 hover:text-gray-300 border border-transparent"
                  }`}
                  title="Memory Palace Hierarchy"
                >
                  <Layers className="w-3 h-3" />
                  PALACE
                </button>
              </div>

              <button 
                onClick={() => onNavigateToTab("editor")}
                className="text-xs bg-cyber-cyan/15 border border-cyber-cyan/35 text-cyber-cyan px-3 py-1.5 rounded-xl hover:bg-cyber-cyan/25 transition-all font-semibold font-sans cursor-pointer"
              >
                + Add
              </button>
            </div>
          </div>

          {/* Wing filters (Flat mode only) */}
          {viewMode === "flat" && memories.length > 0 && (
            <div className="flex items-center gap-1 flex-wrap border-b border-cyber-cyan/5 pb-2">
              {(["ALL", "PERSONAL", "WORK", "HOBBY", "LEGACY"] as const).map((w) => (
                <button
                  key={w}
                  onClick={() => setSelectedWing(w)}
                  className={`px-2.5 py-1 rounded-lg border font-mono text-[9px] transition-all cursor-pointer font-bold ${
                    selectedWing === w
                      ? "bg-cyber-cyan/15 border-cyber-cyan text-cyber-cyan"
                      : "bg-cyber-bg/30 border-cyber-cyan/5 text-gray-500 hover:text-gray-300"
                  }`}
                >
                  {w}
                </button>
              ))}
            </div>
          )}

          {/* Memory List/Tree Container */}
          <div className="flex flex-col gap-3 max-h-[380px] overflow-y-auto pr-1">
            {memories.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center py-20 gap-3">
                <BrainCircuit className="w-12 h-12 text-cyber-cyan/20" />
                <span className="text-sm font-semibold text-gray-300">
                  Your Vault is Empty
                </span>
                <p className="text-xs text-gray-500 max-w-sm leading-relaxed">
                  Go to the Memoir Deck to write down your thoughts, legacy items, and details. They will be plotted onto your Constellation Map locally.
                </p>
              </div>
            ) : viewMode === "flat" ? (
              filteredMemories.map((mem) => {
                const style = EMOTION_LABELS[mem.emotion] || EMOTION_LABELS.serene;
                const id = mem._id || mem.id || "";
                return (
                  <motion.div 
                    layout
                    key={id}
                    className="glass-panel border-cyber-cyan/10 bg-cyber-bg/40 rounded-xl p-4 flex items-center justify-between hover:border-cyber-cyan/25 transition-all hover:bg-cyber-bg/85 group"
                  >
                    <div className="flex flex-col gap-2 flex-1 pr-4">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="text-sm font-bold text-gray-200 group-hover:text-cyber-cyan transition-colors">
                          {mem.title}
                        </span>
                        <span className={`text-[10px] border ${style.border} ${style.text} px-2 py-0.5 rounded font-semibold bg-cyber-bg/80 uppercase tracking-wide`}>
                          {mem.emotion}
                        </span>
                      </div>
                      
                      <p className="text-xs text-gray-400 line-clamp-1 leading-normal font-sans">
                        {mem.content}
                      </p>

                      <div className="flex items-center gap-4 font-mono text-[9px] text-gray-500 flex-wrap">
                        <span className="flex items-center gap-1 text-cyber-cyan/85 bg-cyber-cyan/5 px-2 py-0.5 rounded border border-cyber-cyan/10">
                          {mem.pointer || `§ W-${mem.wing || "PERSONAL"}/D-${id.slice(-3)} §`}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-cyber-cyan/60" />
                          LOCAL NODE
                        </span>
                        
                        {mem.tags.length > 0 && (
                          <span className="flex items-center gap-1">
                            <Tag className="w-3.5 h-3.5 text-cyber-purple/60" />
                            {mem.tags.slice(0, 3).map(t => `#${t}`).join(" ")}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onSelectMemory(mem)}
                        className="p-2.5 rounded-lg bg-cyber-cyan/5 border border-cyber-cyan/10 text-gray-400 hover:text-cyber-cyan hover:border-cyber-cyan/30 hover:bg-cyber-cyan/15 transition-all cursor-pointer"
                        title="Focus on Map"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onDeleteMemory(id)}
                        className="p-2.5 rounded-lg bg-red-950/10 border border-red-950/20 text-gray-500 hover:text-red-400 hover:border-red-500/40 hover:bg-red-500/15 transition-all cursor-pointer"
                        title="Erase Node"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </motion.div>
                );
              })
            ) : (
              /* Palace Tree view mode */
              <div className="flex flex-col gap-2 font-mono text-xs">
                {Object.entries(treeData).map(([wingName, rooms]) => {
                  const wingKey = `wing-${wingName}`;
                  const isWingExpanded = !!expandedNodes[wingKey];
                  const roomsEntries = Object.entries(rooms);
                  const totalDrawers = roomsEntries.reduce((sum, [_, nodes]) => sum + nodes.length, 0);

                  return (
                    <div key={wingName} className="border border-cyber-cyan/10 rounded-xl overflow-hidden bg-cyber-bg/25">
                      {/* Wing Header */}
                      <button
                        onClick={() => toggleNodeExpand(wingKey)}
                        className="w-full flex items-center justify-between p-3 bg-cyber-card/60 hover:bg-cyber-cyan/5 transition-all text-left cursor-pointer border-b border-cyber-cyan/5"
                      >
                        <div className="flex items-center gap-2">
                          {isWingExpanded ? <ChevronDown className="w-3.5 h-3.5 text-cyber-purple" /> : <ChevronRight className="w-3.5 h-3.5 text-cyber-cyan" />}
                          {isWingExpanded ? <FolderOpen className="w-3.5 h-3.5 text-cyber-purple" /> : <Folder className="w-3.5 h-3.5 text-cyber-cyan" />}
                          <span className="font-bold text-gray-200 uppercase tracking-wide">{wingName} WING</span>
                        </div>
                        <span className="text-[9px] text-gray-500 bg-cyber-cyan/5 px-2 py-0.5 rounded border border-cyber-cyan/10">
                          {totalDrawers} DRAWERS
                        </span>
                      </button>

                      {/* Rooms inside Wing */}
                      {isWingExpanded && (
                        <div className="pl-4 pr-3 py-2 flex flex-col gap-2 bg-cyber-bg/40">
                          {roomsEntries.length === 0 ? (
                            <div className="py-2 pl-4 text-gray-500 italic text-[10px] font-sans">
                              Wing is empty. Add entries from the Memoir Deck.
                            </div>
                          ) : (
                            roomsEntries.map(([roomName, nodes]) => {
                              const roomKey = `room-${wingName}-${roomName}`;
                              const isRoomExpanded = !!expandedNodes[roomKey];

                              return (
                                <div key={roomName} className="flex flex-col gap-1 border-l border-cyber-cyan/10 pl-3">
                                  {/* Room Header */}
                                  <button
                                    onClick={() => toggleNodeExpand(roomKey)}
                                    className="flex items-center justify-between py-1.5 text-left hover:text-cyber-cyan transition-colors cursor-pointer"
                                  >
                                    <div className="flex items-center gap-1.5 text-gray-300">
                                      {isRoomExpanded ? <ChevronDown className="w-3 h-3 text-cyber-cyan" /> : <ChevronRight className="w-3 h-3 text-gray-400" />}
                                      <span className="font-semibold text-[11px]">Room {roomName}</span>
                                    </div>
                                    <span className="text-[9px] text-cyber-cyan/70">
                                      ({nodes.length})
                                    </span>
                                  </button>

                                  {/* Drawers (Memories) inside Room */}
                                  {isRoomExpanded && (
                                    <div className="pl-3 py-1 flex flex-col gap-1.5">
                                      {nodes.map((mem) => {
                                        const id = mem._id || mem.id || "";
                                        const style = EMOTION_LABELS[mem.emotion] || EMOTION_LABELS.serene;
                                        return (
                                          <div
                                            key={id}
                                            className="glass-panel border-cyber-cyan/5 hover:border-cyber-cyan/15 bg-cyber-bg/20 rounded-lg p-2.5 flex items-center justify-between hover:bg-cyber-bg/60 transition-all group"
                                          >
                                            <div className="flex flex-col gap-1 flex-1 pr-3">
                                              <div className="flex items-center gap-2 flex-wrap">
                                                <span className="font-bold text-gray-200 group-hover:text-cyber-cyan transition-colors font-sans text-xs">
                                                  {mem.title}
                                                </span>
                                                <span className={`text-[8px] border ${style.border} ${style.text} px-1 rounded font-semibold bg-cyber-bg/95 uppercase`}>
                                                  {mem.emotion}
                                                </span>
                                              </div>
                                              <div className="text-[9px] text-cyber-cyan/60 font-mono tracking-wide">
                                                {mem.pointer || `§ W-${wingName}/D-${id.slice(-3)} §`}
                                              </div>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                              <button
                                                onClick={() => onSelectMemory(mem)}
                                                className="p-1.5 rounded bg-cyber-cyan/5 border border-cyber-cyan/15 text-gray-400 hover:text-cyber-cyan hover:bg-cyber-cyan/15 cursor-pointer"
                                                title="View on Map"
                                              >
                                                <Eye className="w-3.5 h-3.5" />
                                              </button>
                                              <button
                                                onClick={() => onDeleteMemory(id)}
                                                className="p-1.5 rounded bg-red-950/10 border border-red-950/20 text-gray-500 hover:text-red-400 hover:bg-red-500/15 cursor-pointer"
                                                title="Erase"
                                              >
                                                <Trash2 className="w-3.5 h-3.5" />
                                              </button>
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>
                              );
                            })
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </motion.div>

      </div>

    </div>
  );
}
