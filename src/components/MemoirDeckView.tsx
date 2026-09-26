"use client";

import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import {
  Sparkles,
  CheckCircle,
  Info,
  Bookmark,
  HelpCircle,
  Search,
  Folder,
  FolderOpen,
  Plus,
  Trash2,
  Mic,
  MicOff,
  Square,
  Play,
  Pause,
  Image as ImageIcon,
  FileText,
  Video as VideoIcon,
  ChevronDown,
  ChevronRight,
  Maximize2,
  Minimize2,
  Layers,
  Move,
  X,
  ExternalLink,
  Volume2,
  Calendar,
  Compass,
  PenTool,
  AlertCircle
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export interface Attachment {
  type: "image" | "video" | "audio" | "file";
  name: string;
  url: string;
  size?: string;
}

export interface MemoryNode {
  _id?: string;
  id?: string;
  title: string;
  content: string;
  emotion: "nostalgic" | "existential" | "joyful" | "melancholic" | "serene";
  tags: string[];
  wing?: string;
  room?: string;
  pointer?: string;
  mainTopic?: string;
  subtopic?: string;
  attachments?: Attachment[];
  voiceNote?: string;
  timestamp?: string | Date;
}

interface MemoirDeckViewProps {
  memories?: MemoryNode[];
  initialView?: "explorer" | "create";
  onAddMemory: (memory: {
    title: string;
    content: string;
    emotion: "nostalgic" | "existential" | "joyful" | "melancholic" | "serene";
    tags: string[];
    wing: string;
    pointer: string;
    mainTopic?: string;
    subtopic?: string;
    attachments?: Attachment[];
    voiceNote?: string;
  }) => Promise<void>;
  onDeleteMemory?: (id: string) => Promise<void>;
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

const DEFAULT_MAIN_TOPICS = [
  "School & Education",
  "Family & Childhood",
  "Friendships & Bonds",
  "Career & Achievements",
  "Travel & Adventures",
  "Personal Milestones"
];

const EMOTIONS = [
  { key: "serene", label: "Serene", color: "text-cyan-400 border-cyan-500/20", bg: "bg-cyan-500" },
  { key: "nostalgic", label: "Nostalgic", color: "text-indigo-400 border-indigo-500/20", bg: "bg-indigo-500" },
  { key: "existential", label: "Existential", color: "text-fuchsia-400 border-fuchsia-500/20", bg: "bg-fuchsia-500" },
  { key: "joyful", label: "Joyful", color: "text-teal-400 border-teal-500/20", bg: "bg-teal-500" },
  { key: "melancholic", label: "Melancholic", color: "text-blue-400 border-blue-500/20", bg: "bg-blue-500" }
] as const;

export default function MemoirDeckView({ memories = [], initialView = "create", onAddMemory, onDeleteMemory }: MemoirDeckViewProps) {
  // Navigation tabs: 'create' (Input Memory Form) vs 'explorer' (Mind Map & Hierarchical Decks)
  // Default to 'create' so the user is directly presented with the input form!
  const [activeView, setActiveView] = useState<"explorer" | "create">(initialView || "create");

  useEffect(() => {
    if (initialView) {
      setActiveView(initialView);
    }
  }, [initialView]);

  const subtopicInputRef = useRef<HTMLInputElement | null>(null);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");

  // Topic expanded states in deck accordion
  const [expandedTopics, setExpandedTopics] = useState<Record<string, boolean>>({});

  // Selected memory modal preview
  const [selectedMemory, setSelectedMemory] = useState<MemoryNode | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // --- Form State ---
  const [promptIndex, setPromptIndex] = useState(0);
  const [mainTopic, setMainTopic] = useState("School & Education");
  const [customMainTopic, setCustomMainTopic] = useState("");
  const [subtopic, setSubtopic] = useState("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [emotion, setEmotion] = useState<"nostalgic" | "existential" | "joyful" | "melancholic" | "serene">("serene");
  const [tagsInput, setTagsInput] = useState("");
  const [wing, setWing] = useState<"PERSONAL" | "WORK" | "HOBBY" | "LEGACY">("PERSONAL");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [voiceNote, setVoiceNote] = useState<string>("");
  const [syncState, setSyncState] = useState<"idle" | "saving" | "complete">("idle");

  // --- Voice Recorder State ---
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Audio player for voice note preview
  const [isPlayingVoice, setIsPlayingVoice] = useState(false);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  // --- Mind Map Interactive Drag State ---
  const mindMapContainerRef = useRef<HTMLDivElement | null>(null);
  const [mindMapDimensions, setMindMapDimensions] = useState({ width: 900, height: 480 });
  const [draggedNode, setDraggedNode] = useState<{ id: string; isTopic: boolean } | null>(null);
  const dragStartRef = useRef<{ clientX: number; clientY: number }>({ clientX: 0, clientY: 0 });

  // Store layout coordinates for topics and subtopics:
  // topicPositions: { [topicName: string]: { x: number, y: number } }
  // subtopicPositions: { [memoryId: string]: { x: number, y: number } }
  const [topicPositions, setTopicPositions] = useState<Record<string, { x: number; y: number }>>({});
  const [subtopicPositions, setSubtopicPositions] = useState<Record<string, { x: number; y: number }>>({});

  // Synthesizer chirp sound
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

  // Group memories hierarchically by mainTopic
  const topicGroups = useMemo(() => {
    const groups: Record<string, MemoryNode[]> = {};
    memories.forEach((mem) => {
      const t = (mem.mainTopic && mem.mainTopic.trim()) || "General Memories";
      if (!groups[t]) groups[t] = [];
      groups[t].push(mem);
    });
    return groups;
  }, [memories]);

  // All known unique topic names
  const allTopicNames = useMemo(() => {
    const set = new Set<string>(DEFAULT_MAIN_TOPICS);
    Object.keys(topicGroups).forEach((t) => set.add(t));
    return Array.from(set);
  }, [topicGroups]);

  // Search match evaluator
  // Returns true if a memory matches the search query
  const checkMemoryMatch = useCallback((mem: MemoryNode, query: string): boolean => {
    if (!query.trim()) return false;
    const q = query.toLowerCase().trim();
    const t = (mem.mainTopic || "").toLowerCase();
    const st = (mem.subtopic || "").toLowerCase();
    const title = (mem.title || "").toLowerCase();
    const content = (mem.content || "").toLowerCase();
    const tags = (mem.tags || []).map((tag) => tag.toLowerCase());

    return (
      t.includes(q) ||
      st.includes(q) ||
      title.includes(q) ||
      content.includes(q) ||
      tags.some((tag) => tag.includes(q))
    );
  }, []);

  // Check if an entire topic or any of its subtopic memories match
  const checkTopicMatch = useCallback((topicName: string, query: string): boolean => {
    if (!query.trim()) return false;
    const q = query.toLowerCase().trim();
    if (topicName.toLowerCase().includes(q)) return true;
    const items = topicGroups[topicName] || [];
    return items.some((mem) => checkMemoryMatch(mem, query));
  }, [topicGroups, checkMemoryMatch]);

  // Initial layout calculation for Mind Map
  useEffect(() => {
    const container = mindMapContainerRef.current;
    const width = container ? container.clientWidth : 900;
    const height = 480;
    setMindMapDimensions({ width, height });

    const topics = Object.keys(topicGroups);
    if (topics.length === 0) return;

    const newTopicPos: Record<string, { x: number; y: number }> = {};
    const newSubPos: Record<string, { x: number; y: number }> = {};

    const centerX = width / 2;
    const centerY = height / 2;
    const topicRadius = Math.min(width, height) * 0.32;

    topics.forEach((topic, idx) => {
      const angle = (idx / topics.length) * Math.PI * 2;
      const tx = centerX + Math.cos(angle) * topicRadius;
      const ty = centerY + Math.sin(angle) * topicRadius * 0.75;
      newTopicPos[topic] = { x: tx, y: ty };

      const subItems = topicGroups[topic];
      const subRadius = 75;
      subItems.forEach((sub, sIdx) => {
        const id = sub._id || sub.id || `${topic}_${sIdx}`;
        const subAngle = angle + ((sIdx - (subItems.length - 1) / 2) * 0.5);
        newSubPos[id] = {
          x: tx + Math.cos(subAngle) * subRadius,
          y: ty + Math.sin(subAngle) * subRadius
        };
      });
    });

    setTopicPositions(newTopicPos);
    setSubtopicPositions(newSubPos);
  }, [topicGroups]);

  // --- Voice Recorder Handlers ---
  const startVoiceRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const recorder = new MediaRecorder(stream);

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          setVoiceNote(reader.result as string);
          playSynthChirp(523, 1.2, 0.1);
        };
        // Stop all mic tracks
        stream.getTracks().forEach((track) => track.stop());
      };

      recorder.start(100);
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setRecordingSeconds(0);
      playSynthChirp(440, 1.5, 0.08);

      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      alert("Microphone permission was denied or is unavailable on this device.");
    }
  };

  const stopVoiceRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
    }
  };

  const discardVoiceNote = () => {
    setVoiceNote("");
    setIsPlayingVoice(false);
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
    }
  };

  // --- File Upload Handlers ---
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, type: "image" | "video" | "file") => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      // Basic size safeguard for local privacy storage (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        alert(`File "${file.name}" is larger than 5MB. Please choose a smaller file.`);
        return;
      }

      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        const url = uploadEvent.target?.result as string;
        const sizeStr = `${(file.size / 1024).toFixed(1)} KB`;
        setAttachments((prev) => [...prev, { type, name: file.name, url, size: sizeStr }]);
        playSynthChirp(600, 1.2, 0.06);
      };
      reader.readAsDataURL(file);
    });

    e.target.value = "";
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
    playSynthChirp(280, 0.8, 0.05);
  };

  // --- Mind Map Topic Dragging: Dragging Main Topic Pulls Subtopics! ---
  const handlePointerDownTopic = (topic: string, e: React.PointerEvent) => {
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setDraggedNode({ id: topic, isTopic: true });
    dragStartRef.current = { clientX: e.clientX, clientY: e.clientY };
    playSynthChirp(587, 1.1, 0.04);
  };

  const handlePointerDownSubtopic = (subId: string, e: React.PointerEvent) => {
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setDraggedNode({ id: subId, isTopic: false });
    dragStartRef.current = { clientX: e.clientX, clientY: e.clientY };
    playSynthChirp(493, 1.1, 0.04);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!draggedNode) return;

    const dx = e.clientX - dragStartRef.current.clientX;
    const dy = e.clientY - dragStartRef.current.clientY;
    dragStartRef.current = { clientX: e.clientX, clientY: e.clientY };

    if (draggedNode.isTopic) {
      const topic = draggedNode.id;
      // 1. Move the Main Topic
      setTopicPositions((prev) => ({
        ...prev,
        [topic]: {
          x: (prev[topic]?.x || 0) + dx,
          y: (prev[topic]?.y || 0) + dy
        }
      }));

      // 2. Concurrently pull ALL connected subtopics along with the main topic!
      // ("e topic kheche ek side atle ana subtopic b ave")
      const subItems = topicGroups[topic] || [];
      setSubtopicPositions((prev) => {
        const next = { ...prev };
        subItems.forEach((sub, sIdx) => {
          const subId = sub._id || sub.id || `${topic}_${sIdx}`;
          if (next[subId]) {
            next[subId] = {
              x: next[subId].x + dx,
              y: next[subId].y + dy
            };
          }
        });
        return next;
      });
    } else {
      // Move only the specific subtopic node
      const subId = draggedNode.id;
      setSubtopicPositions((prev) => ({
        ...prev,
        [subId]: {
          x: (prev[subId]?.x || 0) + dx,
          y: (prev[subId]?.y || 0) + dy
        }
      }));
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (draggedNode) {
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch (err) {}
      setDraggedNode(null);
    }
  };

  // --- Submit Handler ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    const effectiveMainTopic = customMainTopic.trim() || mainTopic;
    const effectiveSubtopic = subtopic.trim() || title.trim();

    setSyncState("saving");
    playSynthChirp(330, 1.5, 0.1);

    setTimeout(async () => {
      const tags = tagsInput
        .split(",")
        .map((t) => t.trim().toLowerCase())
        .filter((t) => t.length > 0);

      const cleanTags = tags.map((t) => t.replace(/[^a-zA-Z0-9]/g, "")).join("~");
      const dateStr = new Date().toISOString().split("T")[0];
      const monthDay = dateStr.replace(/-/g, "").substring(4);
      const randomId = Math.floor(Math.random() * 1000).toString().padStart(3, "0");
      const pointer = `§ W-${wing}/T-${effectiveMainTopic.replace(/\s+/g, "_").slice(0, 8)}/R-${monthDay}/D-${randomId} @t ${cleanTags || "null"} @d ${dateStr} §`;

      await onAddMemory({
        title,
        content,
        emotion,
        tags,
        wing,
        pointer,
        mainTopic: effectiveMainTopic,
        subtopic: effectiveSubtopic,
        attachments,
        voiceNote
      });

      setSyncState("complete");

      setTimeout(() => {
        setTitle("");
        setContent("");
        setSubtopic("");
        setCustomMainTopic("");
        setTagsInput("");
        setAttachments([]);
        setVoiceNote("");
        setEmotion("serene");
        setSyncState("idle");
        setActiveView("explorer");
      }, 1000);
    }, 600);
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6 pb-12">
      {/* Top Header & Tab Switcher */}
      <div className="glass-panel border-cyber-cyan/15 rounded-2xl p-5 sm:p-6 relative overflow-hidden tech-panel shadow-2xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-cyber-cyan/10 pb-4">
          <div className="flex flex-col gap-1">
            <h2 className="text-xl font-bold text-cyber-cyan uppercase tracking-wider flex items-center gap-2.5 font-mono">
              <Layers className="w-6 h-6 text-cyber-cyan" />
              Hierarchical Memoir Decks
            </h2>
            <p className="text-xs text-gray-400">
              Input stories, topics, subtopics, media, and voice notes &bull; 100% private in local storage
            </p>
          </div>

          {/* Primary View Toggles: Input Form vs View/Explorer */}
          <div className="flex items-center gap-2 bg-cyber-bg/90 border border-cyber-cyan/30 p-1.5 rounded-xl shadow-inner w-full sm:w-auto">
            <button
              type="button"
              onClick={() => {
                setActiveView("create");
                playSynthChirp(523, 1.2, 0.05);
              }}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                activeView === "create"
                  ? "bg-gradient-to-r from-cyber-cyan to-cyber-purple text-white shadow-[0_0_15px_rgba(6,182,212,0.35)]"
                  : "text-gray-300 hover:text-white hover:bg-white/5"
              }`}
            >
              <Plus className="w-4 h-4 text-cyan-300" />
              <span>✍️ Enter Memory (Input Form)</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveView("explorer");
                playSynthChirp(440, 1.2, 0.05);
              }}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                activeView === "explorer"
                  ? "bg-cyber-cyan/25 text-cyber-cyan border border-cyber-cyan shadow-[0_0_15px_rgba(6,182,212,0.25)]"
                  : "text-gray-300 hover:text-white hover:bg-white/5"
              }`}
            >
              <Compass className="w-4 h-4 text-cyber-cyan" />
              <span>🗺️ See All Memories &amp; Map ({memories.length})</span>
            </button>
          </div>
        </div>

        {/* Live Search Bar ONLY in Explorer/Viewing Mode */}
        {activeView === "explorer" && (
          <div className="mt-4 flex flex-col sm:flex-row items-center gap-3">
            <div className="relative w-full">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-cyber-cyan/60" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search topics (e.g., 'School', 'Farewell', 'Sports Day', 'Family')..."
                className="w-full pl-10 pr-10 py-2.5 bg-cyber-bg/80 border border-cyber-cyan/25 focus:border-cyber-cyan rounded-xl text-sm text-gray-200 placeholder:text-gray-500 font-sans focus:outline-none transition-all shadow-inner"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {searchQuery.trim() && (
              <div className="flex items-center gap-2 shrink-0 text-xs font-mono">
                <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-emerald-500/50 bg-emerald-950/40 text-emerald-400 font-semibold shadow-[0_0_10px_rgba(16,185,129,0.3)]">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  Green = Related Topic
                </span>
                <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-500/40 bg-red-950/30 text-red-400 font-semibold shadow-[0_0_10px_rgba(239,68,68,0.2)]">
                  <span className="w-2 h-2 rounded-full bg-red-500"></span>
                  Red = Unrelated
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* VIEW 1: EXPLORER & MIND MAP */}
      {activeView === "explorer" && (
        <div className="space-y-6">
          {/* Quick CTA to Enter Memory */}
          <div className="bg-gradient-to-r from-cyber-cyan/15 via-cyber-purple/15 to-cyber-cyan/15 border border-cyber-cyan/35 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-[0_0_20px_rgba(6,182,212,0.15)]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-cyber-cyan/20 border border-cyber-cyan/40 flex items-center justify-center shrink-0">
                <PenTool className="w-5 h-5 text-cyber-cyan" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white font-mono uppercase tracking-wide">
                  Ready to enter a new memory?
                </h4>
                <p className="text-xs text-gray-300 font-sans">
                  Write down your school, family, or personal moments with subtopics, photos, PDF files, and voice notes.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setActiveView("create");
                playSynthChirp(523, 1.2, 0.05);
              }}
              className="w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-cyber-cyan to-cyber-purple text-white font-mono text-xs font-bold rounded-xl shadow-lg hover:shadow-cyber-cyan/30 transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" />
              + Open Memory Input Form
            </button>
          </div>
          {/* Interactive Topic Dragging Mind Map Canvas */}
          <div className="glass-panel border-cyber-cyan/15 rounded-2xl p-5 relative overflow-hidden tech-panel shadow-2xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-cyber-cyan/10 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Move className="w-4 h-4 text-cyber-cyan" />
                <h3 className="font-mono text-sm font-bold text-cyber-cyan uppercase tracking-wider">
                  Neural Topic Mind Map
                </h3>
                <span className="text-[10px] font-mono text-gray-400 bg-cyber-cyan/5 px-2 py-0.5 rounded border border-cyber-cyan/10">
                  Drag Main Topic to pull all its subtopics
                </span>
              </div>
              <div className="text-[11px] font-mono text-gray-400 flex items-center gap-2">
                <span>{Object.keys(topicGroups).length} Main Topics</span>
                <span>&bull;</span>
                <span>{memories.length} Subtopic Records</span>
              </div>
            </div>

            {/* SVG Interactive Canvas */}
            <div
              ref={mindMapContainerRef}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              className="relative w-full h-[460px] bg-cyber-bg/90 rounded-xl border border-cyber-cyan/15 overflow-hidden select-none cursor-crosshair"
              style={{
                backgroundImage:
                  "radial-gradient(circle at 1px 1px, rgba(6, 182, 212, 0.08) 1px, transparent 0)",
                backgroundSize: "28px 28px"
              }}
            >
              {/* Instructions watermark */}
              <div className="absolute top-3 left-4 pointer-events-none text-[10px] font-mono text-gray-500/70">
                &bull; Click and drag any Main Topic hub &rarr; its Subtopic nodes follow smoothly
                <br />
                &bull; Click any Subtopic node to open full memory details &amp; media
              </div>

              <svg className="w-full h-full absolute inset-0 pointer-events-none">
                {/* Connection lines from Topic hubs to Subtopics */}
                {Object.entries(topicGroups).map(([topic, subItems]) => {
                  const tPos = topicPositions[topic];
                  if (!tPos) return null;

                  const hasQuery = Boolean(searchQuery.trim());
                  const topicMatches = checkTopicMatch(topic, searchQuery);

                  return subItems.map((sub, sIdx) => {
                    const subId = sub._id || sub.id || `${topic}_${sIdx}`;
                    const sPos = subtopicPositions[subId];
                    if (!sPos) return null;

                    const subMatches = checkMemoryMatch(sub, searchQuery);

                    let strokeColor = "rgba(6, 182, 212, 0.35)";
                    let strokeWidth = 1.5;

                    if (hasQuery) {
                      if (topicMatches || subMatches) {
                        strokeColor = "#10b981"; // Emerald Green
                        strokeWidth = 2.5;
                      } else {
                        strokeColor = "rgba(239, 68, 68, 0.25)"; // Crimson Red
                        strokeWidth = 1;
                      }
                    }

                    return (
                      <g key={`line_${subId}`}>
                        <line
                          x1={tPos.x}
                          y1={tPos.y}
                          x2={sPos.x}
                          y2={sPos.y}
                          stroke={strokeColor}
                          strokeWidth={strokeWidth}
                          strokeDasharray={hasQuery && (topicMatches || subMatches) ? "none" : "3,3"}
                        />
                      </g>
                    );
                  });
                })}
              </svg>

              {/* Topic Hub Nodes */}
              {Object.entries(topicGroups).map(([topic, subItems]) => {
                const pos = topicPositions[topic];
                if (!pos) return null;

                const hasQuery = Boolean(searchQuery.trim());
                const isMatch = checkTopicMatch(topic, searchQuery);

                let borderColor = "border-cyber-cyan/50";
                let bgColor = "bg-cyber-cyan/10";
                let textColor = "text-cyber-cyan";
                let glowEffect = "shadow-[0_0_15px_rgba(6,182,212,0.15)]";

                if (hasQuery) {
                  if (isMatch) {
                    borderColor = "border-emerald-400";
                    bgColor = "bg-emerald-950/80";
                    textColor = "text-emerald-300";
                    glowEffect = "shadow-[0_0_25px_rgba(16,185,129,0.6)]";
                  } else {
                    borderColor = "border-red-500/40";
                    bgColor = "bg-red-950/40";
                    textColor = "text-red-400/70";
                    glowEffect = "shadow-[0_0_10px_rgba(239,68,68,0.2)]";
                  }
                }

                return (
                  <div
                    key={`hub_${topic}`}
                    onPointerDown={(e) => handlePointerDownTopic(topic, e)}
                    style={{
                      transform: `translate(${pos.x - 70}px, ${pos.y - 28}px)`,
                      touchAction: "none"
                    }}
                    className={`absolute z-10 w-36 py-2 px-3 rounded-xl border ${borderColor} ${bgColor} ${glowEffect} cursor-grab active:cursor-grabbing backdrop-blur-md flex flex-col items-center justify-center text-center transition-shadow`}
                  >
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <FolderOpen className={`w-3.5 h-3.5 ${textColor}`} />
                      <span className={`text-[11px] font-mono font-bold uppercase truncate max-w-[100px] ${textColor}`}>
                        {topic}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-[9px] font-mono text-gray-400">
                        {subItems.length} subtopics
                      </span>
                      {hasQuery && isMatch && (
                        <span className="text-[8px] font-mono text-emerald-400 font-bold px-1 bg-emerald-500/20 rounded">
                          MATCH
                        </span>
                      )}
                      {hasQuery && !isMatch && (
                        <span className="text-[8px] font-mono text-red-400 font-bold px-1 bg-red-500/20 rounded">
                          UNRELATED
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Subtopic Branch Nodes */}
              {Object.entries(topicGroups).map(([topic, subItems]) => {
                return subItems.map((sub, sIdx) => {
                  const subId = sub._id || sub.id || `${topic}_${sIdx}`;
                  const pos = subtopicPositions[subId];
                  if (!pos) return null;

                  const hasQuery = Boolean(searchQuery.trim());
                  const isMatch = checkMemoryMatch(sub, searchQuery);

                  let borderColor = "border-cyber-purple/40";
                  let bgColor = "bg-cyber-bg/90";
                  let textColor = "text-gray-200";
                  let glowEffect = "shadow-md";

                  if (hasQuery) {
                    if (isMatch) {
                      borderColor = "border-emerald-400";
                      bgColor = "bg-emerald-950/90";
                      textColor = "text-emerald-200";
                      glowEffect = "shadow-[0_0_20px_rgba(16,185,129,0.5)]";
                    } else {
                      borderColor = "border-red-500/30";
                      bgColor = "bg-red-950/30";
                      textColor = "text-red-400/60";
                      glowEffect = "shadow-none";
                    }
                  }

                  const emotionObj = EMOTIONS.find((e) => e.key === sub.emotion);

                  return (
                    <div
                      key={`sub_${subId}`}
                      onPointerDown={(e) => handlePointerDownSubtopic(subId, e)}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedMemory(sub);
                        playSynthChirp(700, 1.2, 0.05);
                      }}
                      style={{
                        transform: `translate(${pos.x - 55}px, ${pos.y - 18}px)`,
                        touchAction: "none"
                      }}
                      className={`absolute z-20 w-28 py-1.5 px-2 rounded-lg border ${borderColor} ${bgColor} ${glowEffect} cursor-pointer active:cursor-grabbing backdrop-blur-md flex items-center justify-between gap-1 transition-shadow hover:scale-105`}
                      title={`${sub.subtopic || sub.title} (Click to open details)`}
                    >
                      <div className="flex items-center gap-1 min-w-0">
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${emotionObj?.bg || "bg-cyan-400"}`} />
                        <span className={`text-[10px] font-sans font-medium truncate ${textColor}`}>
                          {sub.subtopic || sub.title}
                        </span>
                      </div>

                      {/* Media badge indicators */}
                      <div className="flex items-center gap-0.5 shrink-0 text-[9px] text-gray-400">
                        {sub.voiceNote && <Volume2 className="w-2.5 h-2.5 text-cyber-cyan" />}
                        {sub.attachments && sub.attachments.length > 0 && (
                          <ImageIcon className="w-2.5 h-2.5 text-cyber-purple" />
                        )}
                      </div>
                    </div>
                  );
                });
              })}
            </div>
          </div>

          {/* Hierarchical Topic Decks Accordion Cards */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-gray-200 font-mono uppercase tracking-wider flex items-center gap-2">
                <Bookmark className="w-4 h-4 text-cyber-cyan" />
                Topic Decks &amp; Branch Records
              </h3>
              <button
                onClick={() => {
                  setActiveView("create");
                  playSynthChirp(523, 1.2, 0.05);
                }}
                className="text-xs font-mono text-cyber-cyan hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Record to Deck
              </button>
            </div>

            {Object.keys(topicGroups).length === 0 ? (
              <div className="glass-panel border-cyber-cyan/15 rounded-2xl p-10 text-center flex flex-col items-center gap-3">
                <Folder className="w-12 h-12 text-cyber-cyan/40" />
                <h4 className="text-base font-bold text-gray-200 font-mono">No Memory Decks Yet</h4>
                <p className="text-xs text-gray-400 max-w-md leading-relaxed">
                  Create your first hierarchical topic (like "My School", "College", or "Family") and attach subtopic notes, images, PDFs, or live voice recordings!
                </p>
                <button
                  onClick={() => setActiveView("create")}
                  className="mt-2 px-5 py-2.5 bg-gradient-to-r from-cyber-cyan to-cyber-purple text-white font-mono text-xs font-bold rounded-xl shadow-lg hover:shadow-cyber-cyan/25 transition-all cursor-pointer"
                >
                  + Create First Memory Deck
                </button>
              </div>
            ) : (
              Object.entries(topicGroups).map(([topic, subItems]) => {
                const hasQuery = Boolean(searchQuery.trim());
                const isTopicMatch = checkTopicMatch(topic, searchQuery);
                const isExpanded = expandedTopics[topic] !== false; // expanded by default

                // Card border & background colors based on search query
                let cardBorder = "border-cyber-cyan/20";
                let cardBg = "bg-cyber-bg/75";
                let badgeText = "";
                let badgeClass = "";

                if (hasQuery) {
                  if (isTopicMatch) {
                    cardBorder = "border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.35)]";
                    cardBg = "bg-emerald-950/30";
                    badgeText = "✓ MATCHED TOPIC";
                    badgeClass = "bg-emerald-500/20 text-emerald-300 border border-emerald-500/50";
                  } else {
                    cardBorder = "border-red-500/40 shadow-[0_0_12px_rgba(239,68,68,0.15)]";
                    cardBg = "bg-red-950/15 opacity-70";
                    badgeText = "✗ UNRELATED";
                    badgeClass = "bg-red-500/20 text-red-400 border border-red-500/40";
                  }
                }

                return (
                  <div
                    key={topic}
                    className={`rounded-2xl border ${cardBorder} ${cardBg} transition-all duration-300 overflow-hidden backdrop-blur-md`}
                  >
                    {/* Topic Accordion Header */}
                    <div
                      onClick={() =>
                        setExpandedTopics((prev) => ({
                          ...prev,
                          [topic]: !isExpanded
                        }))
                      }
                      className="p-4 sm:p-5 flex items-center justify-between cursor-pointer hover:bg-white/[0.02] select-none border-b border-white/5"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-cyber-cyan/10 border border-cyber-cyan/30 flex items-center justify-center shrink-0">
                          <Folder className="w-5 h-5 text-cyber-cyan" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-base font-bold text-gray-100 font-mono tracking-wide">
                              {topic}
                            </h4>
                            {badgeText && (
                              <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${badgeClass}`}>
                                {badgeText}
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-gray-400 font-sans">
                            {subItems.length} record{subItems.length === 1 ? "" : "s"} &bull; Click to {isExpanded ? "collapse" : "expand"}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setMainTopic(topic);
                            setCustomMainTopic(topic);
                            setActiveView("create");
                            playSynthChirp(523, 1.2, 0.05);
                            setTimeout(() => subtopicInputRef.current?.focus(), 150);
                          }}
                          className="px-3 py-1.5 text-xs font-mono bg-cyber-cyan/20 hover:bg-cyber-cyan/30 border border-cyber-cyan text-cyber-cyan rounded-lg transition-all flex items-center gap-1.5 cursor-pointer font-bold shadow-[0_0_10px_rgba(6,182,212,0.2)]"
                        >
                          <Plus className="w-3.5 h-3.5 text-cyber-cyan" />
                          <span>+ Add Memory / Subtopic</span>
                        </button>
                        {isExpanded ? (
                          <ChevronDown className="w-5 h-5 text-gray-400" />
                        ) : (
                          <ChevronRight className="w-5 h-5 text-gray-400" />
                        )}
                      </div>
                    </div>

                    {/* Subtopic Records Grid */}
                    {isExpanded && (
                      <div className="p-4 sm:p-5">
                        {subItems.length === 0 ? (
                          <div className="p-6 text-center flex flex-col items-center justify-center gap-2.5 bg-cyber-bg/40 rounded-xl border border-dashed border-cyber-cyan/20">
                            <span className="text-xs font-mono text-gray-300">
                              No records saved under "{topic}" yet.
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setMainTopic(topic);
                                setCustomMainTopic(topic);
                                setActiveView("create");
                                playSynthChirp(523, 1.2, 0.05);
                                setTimeout(() => subtopicInputRef.current?.focus(), 150);
                              }}
                              className="px-4 py-2 text-xs font-mono font-bold bg-gradient-to-r from-cyber-cyan to-cyber-purple text-white rounded-xl shadow-lg hover:shadow-cyber-cyan/25 transition-all flex items-center gap-1.5 cursor-pointer"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              + Input First Memory in {topic}
                            </button>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {subItems.map((sub, sIdx) => {
                              const hasQuerySub = Boolean(searchQuery.trim());
                              const isSubMatch = checkMemoryMatch(sub, searchQuery);

                              let subBorder = "border-cyber-cyan/15";
                              let subBg = "bg-cyber-bg/60";

                              if (hasQuerySub) {
                                if (isSubMatch) {
                                  subBorder = "border-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.3)]";
                                  subBg = "bg-emerald-950/40";
                                } else {
                                  subBorder = "border-red-500/30";
                                  subBg = "bg-red-950/20 opacity-60";
                                }
                              }

                              const emotionObj = EMOTIONS.find((e) => e.key === sub.emotion);

                              return (
                                <div
                                  key={sub._id || sub.id || sIdx}
                                  onClick={() => {
                                    setSelectedMemory(sub);
                                    playSynthChirp(650, 1.2, 0.04);
                                  }}
                                  className={`rounded-xl border ${subBorder} ${subBg} p-4 flex flex-col justify-between gap-3 hover:border-cyber-cyan/40 transition-all cursor-pointer group`}
                                >
                                  <div className="space-y-2">
                                    <div className="flex items-center justify-between gap-2">
                                      <span className="text-xs font-mono font-bold text-cyber-purple bg-cyber-purple/10 px-2 py-0.5 rounded border border-cyber-purple/20 truncate">
                                        Subtopic: {sub.subtopic || sub.title}
                                      </span>
                                      <span className={`text-[10px] font-sans px-2 py-0.5 rounded border ${emotionObj?.color || "text-cyan-400 border-cyan-500/20"}`}>
                                        {sub.emotion}
                                      </span>
                                    </div>

                                    <h5 className="text-sm font-bold text-gray-200 group-hover:text-cyber-cyan transition-colors font-sans">
                                      {sub.title}
                                    </h5>

                                    <p className="text-xs text-gray-400 line-clamp-3 leading-relaxed font-sans">
                                      {sub.content}
                                    </p>
                                  </div>

                                  {/* Media & Tags Footer */}
                                  <div className="space-y-2 pt-2 border-t border-white/5">
                                    {/* Media previews */}
                                    <div className="flex flex-wrap items-center gap-1.5">
                                      {sub.voiceNote && (
                                        <span className="flex items-center gap-1 text-[10px] font-mono text-cyan-300 bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-500/30">
                                          <Volume2 className="w-3 h-3" /> Voice Note
                                        </span>
                                      )}
                                      {sub.attachments &&
                                        sub.attachments.map((att, aIdx) => (
                                          <span
                                            key={aIdx}
                                            className="flex items-center gap-1 text-[10px] font-mono text-purple-300 bg-purple-950/40 px-2 py-0.5 rounded border border-purple-500/30 truncate max-w-[140px]"
                                          >
                                            {att.type === "image" && <ImageIcon className="w-3 h-3" />}
                                            {att.type === "video" && <VideoIcon className="w-3 h-3" />}
                                            {att.type === "file" && <FileText className="w-3 h-3" />}
                                            {att.name}
                                          </span>
                                        ))}
                                    </div>

                                    <div className="flex items-center justify-between text-[10px] font-mono text-gray-500 pt-1">
                                      <span>{sub.pointer?.split(" ")[1] || "DECK RECORD"}</span>
                                      {onDeleteMemory && (
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            onDeleteMemory(sub._id || sub.id || "");
                                          }}
                                          className="text-red-400/60 hover:text-red-300 transition-colors p-1"
                                          title="Delete record"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* VIEW 2: CREATE RECORD FORM */}
      {activeView === "create" && (
        <div className="glass-panel border-cyber-cyan/15 rounded-2xl p-5 sm:p-6 md:p-8 relative overflow-hidden tech-panel shadow-2xl">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-cyber-cyan/15 pb-4 mb-5 gap-2">
            <div>
              <h3 className="text-lg font-bold text-white font-mono uppercase tracking-wider flex items-center gap-2">
                <PenTool className="w-5 h-5 text-cyber-cyan" />
                Record &amp; Input Memory
              </h3>
              <p className="text-xs text-gray-400 font-sans">
                Fill in your topic, subtopic, story notes, photos, and voice note directly below:
              </p>
            </div>
            <button
              type="button"
              onClick={() => setActiveView("explorer")}
              className="text-xs font-mono text-cyber-cyan hover:text-white flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-cyber-cyan/25 hover:border-cyber-cyan bg-cyber-cyan/10 transition-all cursor-pointer self-start sm:self-auto"
            >
              <Compass className="w-3.5 h-3.5" />
              <span>🗺️ See Mind Map &amp; Records ({memories.length})</span>
            </button>
          </div>

          {/* Calibrator Prompt (Compact Inspiration Bar) */}
          <div className="bg-cyber-bg/75 border border-cyber-cyan/15 px-4 py-2.5 rounded-xl flex items-center justify-between gap-3 text-xs tech-panel mb-5">
            <div className="flex items-center gap-2 min-w-0">
              <HelpCircle className="w-4 h-4 text-cyber-cyan shrink-0" />
              <span className="font-mono text-[10px] text-cyber-cyan uppercase font-bold tracking-wider shrink-0">
                Inspiration #{promptIndex + 1}:
              </span>
              <span className="text-gray-300 font-sans italic truncate">
                "{EXISTENTIAL_PROMPTS[promptIndex]}"
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                playSynthChirp(440, 1.2, 0.05);
                setPromptIndex((prev) => (prev + 1) % EXISTENTIAL_PROMPTS.length);
              }}
              className="text-[11px] font-mono text-cyber-cyan hover:text-white bg-cyber-cyan/10 border border-cyber-cyan/20 px-2.5 py-1 rounded-lg shrink-0 cursor-pointer"
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
                    <span className="font-mono text-sm font-bold text-cyber-cyan tracking-wider">
                      SAVING MEMORY TO HIERARCHICAL DECK...
                    </span>
                    <span className="text-xs text-gray-400">
                      Encrypting into local private storage
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <CheckCircle className="w-16 h-16 text-emerald-400 animate-bounce" />
                  <div className="flex flex-col gap-1">
                    <h3 className="text-base font-bold text-emerald-400 uppercase tracking-wider font-mono">
                      Memory Node Saved Successfully
                    </h3>
                    <p className="text-xs text-gray-400 max-w-xs leading-normal">
                      Organized under Main Topic "{customMainTopic.trim() || mainTopic}" &gt; "{subtopic || title}".
                    </p>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {/* 1. Main Topic Selector & Custom Input */}
            <div className="flex flex-col gap-2 bg-cyber-bg/40 p-4 rounded-xl border border-cyber-cyan/10">
              <label className="text-xs text-gray-300 font-mono uppercase tracking-wider font-semibold flex items-center gap-1.5">
                <Folder className="w-3.5 h-3.5 text-cyber-cyan" />
                <span>1. Select or Create Main Topic</span>
              </label>

              {/* Quick Topic Chips */}
              <div className="flex flex-wrap gap-2">
                {allTopicNames.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => {
                      setMainTopic(t);
                      setCustomMainTopic("");
                      playSynthChirp(440, 1.1, 0.04);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all cursor-pointer ${
                      mainTopic === t && !customMainTopic
                        ? "bg-cyber-cyan/20 border border-cyber-cyan text-cyber-cyan font-bold shadow-[0_0_10px_rgba(6,182,212,0.2)]"
                        : "bg-cyber-bg/80 border border-white/5 text-gray-400 hover:text-gray-200 hover:border-cyber-cyan/20"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>

              {/* Or type custom topic */}
              <div className="mt-1">
                <input
                  type="text"
                  value={customMainTopic}
                  onChange={(e) => setCustomMainTopic(e.target.value)}
                  placeholder="Or enter a new custom Main Topic (e.g., 'My School', 'College Memories', 'Family Tree')..."
                  className="w-full bg-cyber-bg/70 border border-cyber-cyan/15 rounded-lg px-3.5 py-2 text-xs text-gray-200 focus:outline-none focus:border-cyber-cyan transition-all placeholder:text-gray-600 font-sans"
                />
              </div>
            </div>

            {/* 2. Subtopic Input */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-gray-300 font-mono uppercase tracking-wider font-semibold flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-cyber-purple" />
                <span>2. Branch / Subtopic Name (e.g. 10th Farewell Party, Sports Day)</span>
              </label>
              <input
                ref={subtopicInputRef}
                type="text"
                required
                value={subtopic}
                onChange={(e) => setSubtopic(e.target.value)}
                placeholder="E.g., Sports Day 2022, 10th Farewell Party, Science Exhibition..."
                className="bg-cyber-bg/70 border border-cyber-cyan/20 focus:border-cyber-purple rounded-lg px-4 py-2.5 text-sm text-gray-200 focus:outline-none transition-all placeholder:text-gray-500 font-sans"
              />
            </div>

            {/* 3. Memory Title */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-gray-400 font-mono uppercase tracking-wider font-semibold">
                Memory Title
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="E.g., Winning the 100m sprint race medal..."
                className="bg-cyber-bg/70 border border-cyber-cyan/15 rounded-lg px-4 py-2.5 text-sm text-gray-200 focus:outline-none focus:border-cyber-cyan transition-all placeholder:text-gray-600 font-sans"
              />
            </div>

            {/* 4. Memory Notes / Content */}
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between items-center">
                <label className="text-xs text-gray-400 font-mono uppercase tracking-wider font-semibold">
                  Memory Content &amp; Notes
                </label>
                <span className="font-mono text-xs text-gray-500">
                  Word Count: {content.split(/\s+/).filter(Boolean).length}
                </span>
              </div>
              <textarea
                required
                rows={4}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Record your thoughts, memories, lessons, or stories in detail..."
                className="bg-cyber-bg/70 border border-cyber-cyan/15 rounded-lg p-4 text-sm text-gray-200 focus:outline-none focus:border-cyber-cyan transition-all placeholder:text-gray-600 font-sans leading-relaxed resize-none"
              />
            </div>

            {/* 5. Live In-Browser Voice Note Recorder */}
            <div className="p-4 rounded-xl border border-cyber-cyan/20 bg-cyber-bg/50 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono uppercase text-cyber-cyan font-semibold flex items-center gap-1.5">
                  <Mic className="w-4 h-4" />
                  Voice Note Recording (In-Browser)
                </span>
                {isRecording && (
                  <span className="flex items-center gap-1.5 text-xs font-mono text-red-400 font-bold animate-pulse">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
                    REC {String(Math.floor(recordingSeconds / 60)).padStart(2, "0")}:
                    {String(recordingSeconds % 60).padStart(2, "0")}
                  </span>
                )}
              </div>

              {!voiceNote ? (
                <div className="flex items-center gap-3">
                  {!isRecording ? (
                    <button
                      type="button"
                      onClick={startVoiceRecording}
                      className="px-4 py-2 rounded-lg bg-red-500/20 border border-red-500/40 text-red-300 hover:bg-red-500/30 text-xs font-mono font-bold flex items-center gap-2 transition-all cursor-pointer"
                    >
                      <Mic className="w-4 h-4 text-red-400" />
                      Start Voice Recording
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={stopVoiceRecording}
                      className="px-4 py-2 rounded-lg bg-red-600 text-white text-xs font-mono font-bold flex items-center gap-2 transition-all cursor-pointer shadow-lg animate-pulse"
                    >
                      <Square className="w-4 h-4 fill-white" />
                      Stop &amp; Save Voice Note
                    </button>
                  )}
                  <span className="text-xs text-gray-400">
                    {isRecording ? "Speak now into your microphone..." : "Optional: Record audio reflection directly."}
                  </span>
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-3 p-3 rounded-lg bg-cyber-bg/80 border border-cyber-cyan/20">
                  <audio
                    ref={audioPlayerRef}
                    src={voiceNote}
                    onPlay={() => setIsPlayingVoice(true)}
                    onPause={() => setIsPlayingVoice(false)}
                    onEnded={() => setIsPlayingVoice(false)}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (audioPlayerRef.current) {
                        if (isPlayingVoice) {
                          audioPlayerRef.current.pause();
                        } else {
                          audioPlayerRef.current.play();
                        }
                      }
                    }}
                    className="w-8 h-8 rounded-full bg-cyber-cyan/20 border border-cyber-cyan text-cyber-cyan flex items-center justify-center hover:scale-105 transition-all cursor-pointer"
                  >
                    {isPlayingVoice ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                  </button>

                  <div className="flex flex-col">
                    <span className="text-xs font-mono text-cyber-cyan font-bold">
                      Voice Note Attached
                    </span>
                    <span className="text-[10px] text-gray-400 font-mono">
                      Ready to store securely in local vault
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={discardVoiceNote}
                    className="ml-auto text-xs font-mono text-red-400 hover:text-red-300 flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Discard
                  </button>
                </div>
              )}
            </div>

            {/* 6. Media & Document Uploaders (Image, PDF, Video) */}
            <div className="p-4 rounded-xl border border-cyber-purple/20 bg-cyber-bg/50 flex flex-col gap-3">
              <span className="text-xs font-mono uppercase text-cyber-purple font-semibold flex items-center gap-1.5">
                <FileText className="w-4 h-4" />
                Upload Attachments (Images, PDF, Video)
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {/* Image Upload Button */}
                <label className="flex items-center justify-center gap-2 p-2.5 rounded-lg border border-cyber-cyan/20 bg-cyber-bg/70 hover:border-cyber-cyan/50 text-xs font-mono text-gray-300 cursor-pointer transition-all">
                  <ImageIcon className="w-4 h-4 text-cyber-cyan" />
                  <span>+ Add Image</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => handleFileUpload(e, "image")}
                    className="hidden"
                  />
                </label>

                {/* PDF/Document Upload Button */}
                <label className="flex items-center justify-center gap-2 p-2.5 rounded-lg border border-cyber-purple/20 bg-cyber-bg/70 hover:border-cyber-purple/50 text-xs font-mono text-gray-300 cursor-pointer transition-all">
                  <FileText className="w-4 h-4 text-cyber-purple" />
                  <span>+ Add PDF / Doc</span>
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,.txt"
                    multiple
                    onChange={(e) => handleFileUpload(e, "file")}
                    className="hidden"
                  />
                </label>

                {/* Video Upload Button */}
                <label className="flex items-center justify-center gap-2 p-2.5 rounded-lg border border-teal-500/20 bg-cyber-bg/70 hover:border-teal-500/50 text-xs font-mono text-gray-300 cursor-pointer transition-all">
                  <VideoIcon className="w-4 h-4 text-teal-400" />
                  <span>+ Add Video Clip</span>
                  <input
                    type="file"
                    accept="video/*"
                    onChange={(e) => handleFileUpload(e, "video")}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Attachment Preview Chips */}
              {attachments.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 pt-2">
                  {attachments.map((att, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-2 rounded-lg bg-cyber-bg/90 border border-cyber-cyan/20 gap-2"
                    >
                      <div className="flex items-center gap-2 truncate">
                        {att.type === "image" && (
                          <img
                            src={att.url}
                            alt="preview"
                            className="w-8 h-8 rounded object-cover border border-white/10"
                          />
                        )}
                        {att.type === "file" && <FileText className="w-5 h-5 text-cyber-purple shrink-0" />}
                        {att.type === "video" && <VideoIcon className="w-5 h-5 text-teal-400 shrink-0" />}
                        <div className="truncate">
                          <p className="text-xs text-gray-200 truncate font-sans">{att.name}</p>
                          <p className="text-[10px] text-gray-500 font-mono">{att.size || att.type}</p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeAttachment(index)}
                        className="text-red-400 hover:text-red-300 p-1 shrink-0 cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 7. Palace Wing & Emotion Selectors */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Wing */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-gray-400 font-mono uppercase tracking-wider font-semibold">
                  Palace Wing
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(["PERSONAL", "WORK", "HOBBY", "LEGACY"] as const).map((w) => (
                    <button
                      type="button"
                      key={w}
                      onClick={() => setWing(w)}
                      className={`py-2 px-2 rounded-lg border text-xs cursor-pointer transition-all select-none font-mono ${
                        wing === w
                          ? "bg-cyber-purple/20 border-cyber-purple text-cyber-purple font-bold"
                          : "bg-cyber-bg/40 border-cyber-cyan/10 text-gray-400 hover:text-gray-200"
                      }`}
                    >
                      {w}
                    </button>
                  ))}
                </div>
              </div>

              {/* Emotion */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-gray-400 font-mono uppercase tracking-wider font-semibold">
                  Resonant Emotion
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {EMOTIONS.map((em) => (
                    <button
                      type="button"
                      key={em.key}
                      onClick={() => setEmotion(em.key as any)}
                      className={`py-2 px-1.5 rounded-lg border text-xs cursor-pointer transition-all select-none font-sans truncate ${
                        emotion === em.key
                          ? "bg-cyber-cyan/20 border-cyber-cyan text-cyber-cyan font-bold"
                          : "bg-cyber-bg/40 border-cyber-cyan/10 text-gray-400 hover:text-gray-200"
                      }`}
                    >
                      {em.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 8. Tags */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-gray-400 font-mono uppercase tracking-wider font-semibold">
                Tags (comma separated)
              </label>
              <input
                type="text"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="E.g., school, sports, farewell, teachers, friends"
                className="bg-cyber-bg/70 border border-cyber-cyan/15 rounded-lg px-4 py-2 text-sm text-gray-200 focus:outline-none focus:border-cyber-cyan transition-all placeholder:text-gray-600 font-mono"
              />
            </div>

            {/* Submit */}
            <button
              type="submit"
              className="mt-3 w-full font-mono text-sm font-bold bg-gradient-to-r from-cyber-cyan to-cyber-purple border border-cyber-cyan/40 hover:border-cyber-cyan text-white py-3.5 rounded-xl hover:shadow-[0_0_20px_rgba(6,182,212,0.3)] transition-all uppercase tracking-wider cursor-pointer"
            >
              Save Memory Record to Deck
            </button>
          </form>
        </div>
      )}

      {/* Memory Details Modal */}
      {selectedMemory && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-panel border-cyber-cyan/30 rounded-2xl p-6 max-w-2xl w-full max-h-[85vh] overflow-y-auto space-y-4 shadow-2xl relative">
            <div className="flex items-start justify-between border-b border-cyber-cyan/15 pb-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-mono font-bold text-cyber-cyan bg-cyber-cyan/10 px-2.5 py-0.5 rounded border border-cyber-cyan/20">
                    Topic: {selectedMemory.mainTopic || "General"}
                  </span>
                  <span className="text-xs font-mono font-bold text-cyber-purple bg-cyber-purple/10 px-2.5 py-0.5 rounded border border-cyber-purple/20">
                    Subtopic: {selectedMemory.subtopic || selectedMemory.title}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-gray-100 font-sans">
                  {selectedMemory.title}
                </h3>
              </div>

              <button
                onClick={() => setSelectedMemory(null)}
                className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/5 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content text */}
            <div className="bg-cyber-bg/80 border border-cyber-cyan/10 rounded-xl p-4 text-sm text-gray-300 leading-relaxed font-sans whitespace-pre-wrap">
              {selectedMemory.content}
            </div>

            {/* Voice Note Player in Modal */}
            {selectedMemory.voiceNote && (
              <div className="p-3 rounded-xl border border-cyan-500/30 bg-cyan-950/20 flex flex-col gap-2">
                <span className="text-xs font-mono text-cyan-300 font-bold flex items-center gap-1.5">
                  <Volume2 className="w-4 h-4" /> Voice Recording
                </span>
                <audio controls src={selectedMemory.voiceNote} className="w-full h-10" />
              </div>
            )}

            {/* Attachments Section in Modal */}
            {selectedMemory.attachments && selectedMemory.attachments.length > 0 && (
              <div className="space-y-3">
                <span className="text-xs font-mono uppercase text-gray-400 font-semibold">
                  Attachments &amp; Files
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {selectedMemory.attachments.map((att, aIdx) => (
                    <div
                      key={aIdx}
                      className="p-3 rounded-xl border border-cyber-cyan/15 bg-cyber-bg/60 flex flex-col gap-2"
                    >
                      {att.type === "image" && (
                        <div
                          onClick={() => setPreviewImage(att.url)}
                          className="cursor-pointer group relative overflow-hidden rounded-lg aspect-video bg-black/40"
                        >
                          <img
                            src={att.url}
                            alt={att.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                          <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs font-mono transition-opacity">
                            Click to expand
                          </div>
                        </div>
                      )}

                      {att.type === "video" && (
                        <video controls src={att.url} className="w-full rounded-lg max-h-48 bg-black" />
                      )}

                      {att.type === "file" && (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 truncate">
                            <FileText className="w-6 h-6 text-cyber-purple shrink-0" />
                            <span className="text-xs text-gray-200 truncate font-sans">{att.name}</span>
                          </div>
                          <a
                            href={att.url}
                            download={att.name}
                            className="px-2.5 py-1 text-[11px] font-mono bg-cyber-purple/20 text-cyber-purple border border-cyber-purple/40 rounded hover:bg-cyber-purple/30 transition-all shrink-0"
                          >
                            Download
                          </a>
                        </div>
                      )}

                      <span className="text-[10px] text-gray-400 font-mono truncate">{att.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tags & Meta */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-white/5 text-xs">
              <div className="flex flex-wrap gap-1.5">
                {selectedMemory.tags?.map((tag, tIdx) => (
                  <span
                    key={tIdx}
                    className="font-mono text-[10px] bg-cyber-cyan/5 border border-cyber-cyan/20 text-cyber-cyan px-2 py-0.5 rounded font-semibold"
                  >
                    #{tag}
                  </span>
                ))}
              </div>

              {onDeleteMemory && (
                <button
                  type="button"
                  onClick={() => {
                    onDeleteMemory(selectedMemory._id || selectedMemory.id || "");
                    setSelectedMemory(null);
                  }}
                  className="text-red-400 hover:text-red-300 font-mono text-xs flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Delete Record
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Image Lightbox Full View Modal */}
      {previewImage && (
        <div
          onClick={() => setPreviewImage(null)}
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 cursor-zoom-out"
        >
          <img
            src={previewImage}
            alt="Preview"
            className="max-w-full max-h-[90vh] rounded-xl object-contain shadow-2xl border border-white/20"
          />
        </div>
      )}
    </div>
  );
}
