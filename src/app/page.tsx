"use client";

import React, { useState, useEffect } from "react";
import { Brain, LayoutDashboard, Orbit, PenTool, MessageSquare, Vault, Cpu, Menu, X, ShieldAlert, ShieldCheck, User, Lock } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import BiometricLogin from "@/components/BiometricLogin";
import WebLockScreen from "@/components/WebLockScreen";
import SetupLockScreen from "@/components/SetupLockScreen";
import ConstellationCanvas, { CanvasMemory } from "@/components/ConstellationCanvas";
import DashboardView from "@/components/DashboardView";
import MemoirDeckView from "@/components/MemoirDeckView";
import ConsciousnessMirrorView from "@/components/ConsciousnessMirrorView";
import TemporalVaultView, { VaultLetter } from "@/components/TemporalVaultView";
import ProfileView from "@/components/ProfileView";
import RoboAssistant from "@/components/RoboAssistant";
import AudioSynthesizer from "@/components/AudioSynthesizer";
import ResourceManagerView from "@/components/ResourceManagerView";
import HologramGuide from "@/components/HologramGuide";

const getCleanProfilePicture = (url?: string) => {
  if (!url) return "";
  if (url.includes("dicebear.com/7.x/bottts") && !url.includes("scale=")) {
    return url.includes("?") ? `${url}&scale=85` : `${url}?scale=85`;
  }
  return url;
};

export default function Home() {
  const [currentUser, setCurrentUser] = useState<{ 
    username: string; 
    email: string;
    displayName: string;
    profilePicture: string;
    googleId?: string;
    hasPassword?: boolean;
    webLockPasscodeHash?: string;
  } | null>(null);
  const verified = currentUser !== null;
  const [isLocked, setIsLocked] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [dbConnected, setDbConnected] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isDefragging, setIsDefragging] = useState(false);
  const [scanlinesEnabled, setScanlinesEnabled] = useState(true);
  const [companionOpen, setCompanionOpen] = useState(true);
  const [soundscapeOpen, setSoundscapeOpen] = useState(false);
  const [hologramOpen, setHologramOpen] = useState(true);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [memories, setMemories] = useState<CanvasMemory[]>([]);
  const [letters, setLetters] = useState<VaultLetter[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedNode, setSelectedNode] = useState<CanvasMemory | null>(null);

  // Centralized Sound FX Engine using Web Audio API
  const playSynthSFX = React.useCallback((type: "click" | "hover" | "success" | "alert") => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioContextClass();
      const now = ctx.currentTime;
      
      if (type === "click") {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.setValueAtTime(580, now);
        osc.frequency.exponentialRampToValueAtTime(320, now + 0.08);
        gain.gain.setValueAtTime(0.025, now);
        gain.gain.linearRampToValueAtTime(0.0001, now + 0.08);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(now + 0.08);
      } else if (type === "hover") {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.setValueAtTime(950, now);
        osc.frequency.setValueAtTime(1150, now + 0.03);
        gain.gain.setValueAtTime(0.006, now);
        gain.gain.linearRampToValueAtTime(0.0001, now + 0.05);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(now + 0.05);
      } else if (type === "success") {
        [523.25, 659.25, 783.99].forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.frequency.setValueAtTime(freq, now + idx * 0.05);
          gain.gain.setValueAtTime(0.015, now + idx * 0.05);
          gain.gain.linearRampToValueAtTime(0.0001, now + idx * 0.05 + 0.22);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + idx * 0.05);
          osc.stop(now + idx * 0.05 + 0.22);
        });
      } else if (type === "alert") {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.setValueAtTime(180, now);
        osc.frequency.linearRampToValueAtTime(90, now + 0.25);
        gain.gain.setValueAtTime(0.03, now);
        gain.gain.linearRampToValueAtTime(0.0001, now + 0.25);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(now + 0.25);
      }
    } catch (e) {}
  }, []);

  const handleVerify = React.useCallback((session: { 
    username: string; 
    email: string;
    displayName: string;
    profilePicture: string;
    googleId?: string;
    hasPassword?: boolean;
    webLockPasscodeHash?: string;
  }) => {
    setCurrentUser(session);
    localStorage.setItem("memento_session", JSON.stringify(session));
        // Sync web lock passcode hash from session if it exists
    if (session.webLockPasscodeHash) {
      localStorage.setItem(`memento_lock_password_${session.username}`, session.webLockPasscodeHash);
      localStorage.removeItem(`memento_lock_disabled_${session.username}`);
    } else {
      localStorage.removeItem(`memento_lock_password_${session.username}`);
      localStorage.setItem(`memento_lock_disabled_${session.username}`, "true");
    }
    // On fresh login, do not prompt for lock screen immediately
    setIsLocked(false);
    localStorage.setItem(`memento_is_locked_${session.username}`, "false");
    
    playSynthSFX("success");
  }, [playSynthSFX]);

  const handleLockWeb = React.useCallback(() => {
    if (!currentUser) return;
    setIsLocked(true);
    localStorage.setItem(`memento_is_locked_${currentUser.username}`, "true");
    playSynthSFX("alert");
  }, [currentUser, playSynthSFX]);

  const handleUnlock = React.useCallback(() => {
    if (!currentUser) return;
    setIsLocked(false);
    localStorage.setItem(`memento_is_locked_${currentUser.username}`, "false");
    playSynthSFX("success");
  }, [currentUser, playSynthSFX]);

  const handleLogout = React.useCallback(() => {
    if (currentUser) {
      localStorage.removeItem(`memento_is_locked_${currentUser.username}`);
    }
    localStorage.removeItem("memento_session");
    setCurrentUser(null);
    setIsLocked(false);
    setShowSplash(true);
    playSynthSFX("alert");
  }, [currentUser, playSynthSFX]);

  const handleDefrag = React.useCallback(() => {
    if (isDefragging) return;
    setIsDefragging(true);
    setTimeout(() => {
      setIsDefragging(false);
      playSynthSFX("success");
    }, 4200);
  }, [isDefragging, playSynthSFX]);

  // Check live server database connection status
  useEffect(() => {
    fetch("/api/auth/db-status")
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setDbConnected(data.connected);
        }
      })
      .catch(err => console.error("Error checking database status:", err));
  }, [currentUser]);

  // Mount check and session persistence loader
  useEffect(() => {
    setMounted(true);

    // Sync User Accent Settings on mount immediately
    const cachedProfile = localStorage.getItem("memento_profile");
    if (cachedProfile) {
      try {
        const profile = JSON.parse(cachedProfile);
        document.documentElement.style.setProperty(
          "--color-cyber-cyan",
          profile.accent === "cyan" ? "#06b6d4" :
          profile.accent === "purple" ? "#d946ef" :
          profile.accent === "teal" ? "#14b8a6" :
          profile.accent === "green" ? "#22c55e" : "#f59e0b"
        );
      } catch (e) {}
    }

    const saved = localStorage.getItem("memento_session");
    if (saved) {
      try {
        const session = JSON.parse(saved);
        setCurrentUser(session);
                // Auto-lock site on reload/refresh if a passcode PIN is configured
        const isLockDisabled = localStorage.getItem(`memento_lock_disabled_${session.username}`) === "true";
        const hasPasscode = localStorage.getItem(`memento_lock_password_${session.username}`);
        if (!isLockDisabled && hasPasscode && hasPasscode !== "undefined" && hasPasscode !== "null") {
          setIsLocked(true);
          localStorage.setItem(`memento_is_locked_${session.username}`, "true");
        } else {
          setIsLocked(false);
          localStorage.setItem(`memento_is_locked_${session.username}`, "false");
        }
        // Fetch fresh user profile from database to sync webLockPasscodeHash
        fetch(`/api/auth/update-profile?username=${encodeURIComponent(session.username)}`)
          .then(res => {
            if (res.ok) return res.json();
            throw new Error("Failed to load profile updates");
          })
          .then(data => {
            if (data.success && data.user) {
              const freshSession = data.user;
              setCurrentUser(freshSession);
              localStorage.setItem("memento_session", JSON.stringify(freshSession));
              if (freshSession.webLockPasscodeHash) {
                localStorage.setItem(`memento_lock_password_${freshSession.username}`, freshSession.webLockPasscodeHash);
                localStorage.removeItem(`memento_lock_disabled_${freshSession.username}`);
              } else {
                localStorage.removeItem(`memento_lock_password_${freshSession.username}`);
              }
            }
          })
          .catch(err => console.warn("Failed to sync session from database:", err));
      } catch (e) {}
    }
  }, []);

  // Timer for quote splash screen
  useEffect(() => {
    if (!verified) {
      const timer = setTimeout(() => {
        setShowSplash(false);
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [verified]);

  // Fetch initial collections from Database, falling back to LocalStorage
  useEffect(() => {
    if (!mounted || !verified || !currentUser) return;

    const loadData = async () => {
      setLoading(true);
      
      // 1. Fetch Memories
      try {
        const memsRes = await fetch(`/api/memories?username=${currentUser.username}`);
        if (memsRes.ok) {
          const memsData = await memsRes.json();
          if (memsData.success) {
            setMemories(memsData.data);
            localStorage.setItem(`memento_memories_${currentUser.username}`, JSON.stringify(memsData.data));
          } else {
            throw new Error(memsData.error || "Failed API fetch");
          }
        } else {
          throw new Error("HTTP error " + memsRes.status);
        }
      } catch (e) {
        console.warn("Memories API offline, reading user local storage fallback:", e);
        const cachedMems = localStorage.getItem(`memento_memories_${currentUser.username}`);
        if (cachedMems) {
          try {
            setMemories(JSON.parse(cachedMems));
          } catch(err) {
            console.error("Failed to parse cached memories", err);
          }
        } else {
          setMemories([]);
        }
      }

      // 2. Fetch Vault Letters
      try {
        const lettersRes = await fetch(`/api/vault?username=${currentUser.username}`);
        if (lettersRes.ok) {
          const lettersData = await lettersRes.json();
          if (lettersData.success) {
            setLetters(lettersData.data);
            localStorage.setItem(`memento_letters_${currentUser.username}`, JSON.stringify(lettersData.data));
          } else {
            throw new Error(lettersData.error || "Failed API fetch");
          }
        } else {
          throw new Error("HTTP error " + lettersRes.status);
        }
      } catch (e) {
        console.warn("Vault Letters API offline, reading user local storage fallback:", e);
        const cachedLetters = localStorage.getItem(`memento_letters_${currentUser.username}`);
        if (cachedLetters) {
          try {
            setLetters(JSON.parse(cachedLetters));
          } catch(err) {
            console.error("Failed to parse cached letters", err);
          }
        } else {
          setLetters([]);
        }
      }


      setLoading(false);
    };

    loadData();
  }, [verified, mounted, currentUser]);

  // CRUD Handler - Memory Add
  const handleAddMemory = async (newMem: {
    title: string;
    content: string;
    emotion: "nostalgic" | "existential" | "joyful" | "melancholic" | "serene";
    tags: string[];
    wing: string;
    pointer: string;
  }) => {
    if (!currentUser) return;
    const x = Math.random() * 800 + 100;
    const y = Math.random() * 500 + 100;
    const now = new Date();
    const room = `${(now.getMonth() + 1).toString().padStart(2, "0")}-${now.getDate().toString().padStart(2, "0")}`;

    const payload = {
      ...newMem,
      x,
      y,
      room,
      username: currentUser.username
    };

    try {
      const res = await fetch("/api/memories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok && data.success) {
        const updated = [data.data, ...memories];
        setMemories(updated);
        localStorage.setItem(`memento_memories_${currentUser.username}`, JSON.stringify(updated));
        playSynthSFX("success");
        return;
      }
    } catch (err) {
      console.warn("POST memory API offline, fallback to user LocalStorage", err);
    }

    // LocalStorage Fallback
    const localNewNode: CanvasMemory = {
      ...payload,
      id: "node-" + Math.floor(Math.random() * 100000)
    };
    const updated = [localNewNode, ...memories];
    setMemories(updated);
    localStorage.setItem(`memento_memories_${currentUser.username}`, JSON.stringify(updated));
    playSynthSFX("success");
  };

  // CRUD Handler - Memory Delete
  const handleDeleteMemory = async (id: string) => {
    if (!currentUser) return;
    if (!confirm("Are you sure you want to delete this memory node?")) return;
    
    try {
      const res = await fetch(`/api/memories?id=${id}`, {
        method: "DELETE"
      });
      if (res.ok) {
        const filtered = memories.filter((m) => (m._id || m.id) !== id);
        setMemories(filtered);
        localStorage.setItem(`memento_memories_${currentUser.username}`, JSON.stringify(filtered));
        if (selectedNode && (selectedNode._id || selectedNode.id) === id) {
          setSelectedNode(null);
        }
        playSynthSFX("success");
        return;
      }
    } catch (err) {
      console.warn("DELETE memory API offline, fallback to user LocalStorage", err);
    }

    // LocalStorage Fallback
    const filtered = memories.filter((m) => (m._id || m.id) !== id);
    setMemories(filtered);
    localStorage.setItem(`memento_memories_${currentUser.username}`, JSON.stringify(filtered));
    if (selectedNode && (selectedNode._id || selectedNode.id) === id) {
      setSelectedNode(null);
    }
    playSynthSFX("success");
  };

  // CRUD Handler - Vault Letter Add
  const handleAddLetter = async (newLetter: {
    title: string;
    content: string;
    senderName: string;
    recipientName: string;
    recipientEmail: string;
    unlockDate: string;
    passcode?: string;
  }) => {
    if (!currentUser) return;
    const payload = {
      ...newLetter,
      username: currentUser.username
    };

    try {
      const res = await fetch("/api/vault", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok && data.success) {
        const updated = [data.data, ...letters];
        setLetters(updated);
        localStorage.setItem(`memento_letters_${currentUser.username}`, JSON.stringify(updated));
        playSynthSFX("success");
        return;
      }
    } catch (err) {
      console.warn("POST letter API offline, fallback to user LocalStorage", err);
    }

    // LocalStorage Fallback
    const localLetter: VaultLetter = {
      ...newLetter,
      id: "letter-" + Math.floor(Math.random() * 100000),
      status: newLetter.passcode ? "needs-passcode" : "locked",
      requiresPasscode: !!newLetter.passcode
    };
    const updated = [localLetter, ...letters];
    setLetters(updated);
    localStorage.setItem(`memento_letters_${currentUser.username}`, JSON.stringify(updated));
    playSynthSFX("success");
  };

  // CRUD Handler - Decrypt Vault Letter
  const handleDecryptLetter = async (id: string, passcodeStr: string): Promise<boolean> => {
    const target = letters.find((l) => (l._id || l.id) === id);
    if (target) {
      const isUnlocked = !target.passcode || target.passcode === passcodeStr;
      if (isUnlocked) {
        const updated = letters.map((l) => {
          if ((l._id || l.id) === id) {
            return { ...l, status: "unlocked" as const };
          }
          return l;
        });
        setLetters(updated);
        if (currentUser) {
          localStorage.setItem(`memento_letters_${currentUser.username}`, JSON.stringify(updated));
        }
        playSynthSFX("success");
        return true;
      }
    }
    return false;
  };

  const handleClearAllData = async () => {
    if (currentUser) {
      try {
        await fetch("/api/auth/reset-sandbox", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: currentUser.username })
        });
      } catch (e) {
        console.error("Failed to reset sandbox on server DB:", e);
      }
      localStorage.removeItem(`memento_memories_${currentUser.username}`);
      localStorage.removeItem(`memento_letters_${currentUser.username}`);
      localStorage.removeItem(`memento_lock_password_${currentUser.username}`);
      localStorage.removeItem(`memento_lock_use_fingerprint_${currentUser.username}`);
      localStorage.removeItem(`memento_lock_credential_id_${currentUser.username}`);
      localStorage.removeItem(`memento_lock_disabled_${currentUser.username}`);
      localStorage.removeItem(`memento_is_locked_${currentUser.username}`);
    }
    localStorage.removeItem("memento_profile");
    localStorage.removeItem("memento_session");
    setMemories([]);
    setLetters([]);
    setCurrentUser(null);
    setIsLocked(false);
  };

  const handleFocusMemoryNode = (node: CanvasMemory) => {
    setSelectedNode(node);
    setActiveTab("constellation");
  };

  if (!mounted) {
    return (
      <div suppressHydrationWarning className="min-h-screen flex flex-col bg-[#02050f] text-gray-400 justify-center items-center font-mono text-xs tracking-widest uppercase animate-pulse">
        Initializing local vault sandbox...
      </div>
    );
  }

  // 1. If not authenticated, render splash screen or login panel
  if (!verified) {
    return (
      <AnimatePresence mode="wait">
        {showSplash ? (
          <motion.div
            key="splash"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="min-h-screen w-full flex flex-col items-center justify-center p-6 bg-[#02050f] cyber-grid relative overflow-hidden select-none"
          >
            {/* Ambient Nebula Glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full nebula-glow-1 pointer-events-none opacity-40"></div>
            
            <div className="max-w-2xl text-center sm:text-left flex flex-col gap-6 relative z-10 font-sans px-4">
              {/* Header Quote */}
              <motion.h1 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.8 }}
                className="text-4xl sm:text-6xl font-extrabold text-white tracking-wide leading-tight"
              >
                Memory <span className="italic text-cyber-cyan glow-text-cyan font-normal font-sans">is</span> identity.
              </motion.h1>

              {/* Sub-text quote */}
              <motion.p 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.6, duration: 0.8 }}
                className="text-gray-400 text-sm sm:text-lg tracking-wide max-w-xl font-normal leading-relaxed"
              >
                Every conversation, every idea, every small decision...
                <br />
                held somewhere safe.
              </motion.p>

              {/* Welcome text */}
              <motion.div 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 1.0, duration: 0.8 }}
                className="text-xs sm:text-sm text-gray-500 uppercase tracking-widest font-mono mt-4 flex items-center justify-center sm:justify-start gap-1.5"
              >
                <span>Welcome to the future of memory:</span>
                <span className="text-cyber-cyan font-bold tracking-wider">Memento Core</span>
              </motion.div>
            </div>
            
            {/* Loading scan pulse */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: [0.1, 0.4, 0.1] }}
              transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
              className="absolute bottom-10 font-mono text-[9px] text-gray-600 uppercase tracking-widest"
            >
              INITIALIZING STORAGE SECTOR...
            </motion.div>
          </motion.div>
        ) : (
          <motion.div
            key="login"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="w-full h-full"
          >
            <BiometricLogin onVerify={handleVerify} />
          </motion.div>
        )}
      </AnimatePresence>
    );
  }

  // 2. If authenticated but active screen lock is triggered, render Lock Screen
  if (isLocked) {
    return (
      <WebLockScreen
        username={currentUser.username}
        onUnlock={handleUnlock}
        onLogout={handleLogout}
      />
    );
  }
  return (
    <div className="h-screen flex flex-col bg-[#02050f] text-gray-200 cyber-grid relative select-none overflow-hidden">      
      {/* Scanline CRT overlay */}
      {scanlinesEnabled && <div className="scanlines-overlay"></div>}
      
      {/* Background soft glows */}
      <div className="absolute top-0 right-1/4 w-[400px] h-[400px] rounded-full nebula-glow-2 pointer-events-none"></div>
      <div className="absolute bottom-10 left-10 w-[400px] h-[400px] rounded-full nebula-glow-1 pointer-events-none"></div>

      {/* Main Navigation Header */}
      <header className="border-b border-cyber-cyan/15 px-4 sm:px-6 py-3 flex flex-row justify-between items-center sticky top-0 z-50 bg-[#02050f] shadow-[0_4px_20px_rgba(0,0,0,0.5)]">
        
        {/* Brand */}
        <div className="flex items-center gap-3">
          <Brain className="w-6 h-6 sm:w-7 sm:h-7 text-cyber-cyan animate-pulse" />
          <div className="flex flex-col">
            <h1 className="font-display text-sm sm:text-lg font-extrabold tracking-wider text-white uppercase glow-text-cyan">
              Memento Core
            </h1>
            <span className="font-mono text-[8px] sm:text-[9px] text-gray-400 tracking-wider">
              CLOUD SYNC ARCHIVE
            </span>
          </div>
        </div>

        {/* Right side header tools */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Database indicator */}
          <div className={`hidden sm:flex items-center gap-2 px-2.5 py-1 sm:px-3.5 sm:py-1.5 rounded-lg border text-[10px] sm:text-xs font-mono transition-all ${
            dbConnected 
              ? "bg-cyber-teal/5 border-cyber-teal/30 text-cyber-teal shadow-[0_0_10px_rgba(20,184,166,0.1)]" 
              : "bg-amber-500/5 border-amber-500/30 text-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.05)]"
          }`}>
            {dbConnected ? (
              <>
                <ShieldCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-cyber-cyan" />
                <span className="font-semibold uppercase">Cloud Synced</span>
                <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-cyber-green animate-pulse"></span>
              </>
            ) : (
              <>
                <ShieldAlert className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-500" />
                <span className="font-semibold uppercase">Sandbox</span>
                <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-amber-500 animate-pulse"></span>
              </>
            )}
          </div>

          {/* User Profile Avatar button */}
          <button
            onClick={() => {
              playSynthSFX("click");
              setIsProfileOpen(true);
            }}
            className="flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-full border border-cyber-cyan/30 bg-cyber-bg hover:bg-cyber-cyan/15 hover:border-cyber-cyan transition-all overflow-hidden cursor-pointer hover:shadow-[0_0_10px_rgba(6,182,212,0.2)] flex-shrink-0"
            title="Manage Profile & Security"
          >
            {currentUser?.profilePicture ? (
              <img
                src={getCleanProfilePicture(currentUser.profilePicture)}
                alt="Profile"
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-xs font-bold text-cyber-cyan uppercase font-mono">
                {currentUser?.displayName ? currentUser.displayName.slice(0, 2) : currentUser?.username.slice(0, 2)}
              </span>
            )}
          </button>

          {/* Hamburger trigger */}
          <button
            onClick={() => { playSynthSFX("click"); setSidebarOpen(!sidebarOpen); }}
            className="p-1.5 sm:p-2 border border-cyber-cyan/30 text-cyber-cyan rounded-lg hover:bg-cyber-cyan/10 transition-all md:hidden cursor-pointer flex-shrink-0"
          >
            {sidebarOpen ? <X className="w-4 h-4 sm:w-5 sm:h-5" /> : <Menu className="w-4 h-4 sm:w-5 sm:h-5" />}
          </button>
        </div>

      </header>
      {/* Main Workspace Frame Split */}
      <div className="flex-1 flex flex-col md:flex-row relative overflow-hidden">        
        {/* Backdrop overlay for mobile drawer */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/60 z-[55] md:hidden backdrop-blur-sm transition-all"
            onClick={() => setSidebarOpen(false)}
          ></div>
        )}

        {/* Sidebar Nav */}
        <aside className={`fixed inset-y-0 left-0 z-[60] w-72 bg-[#02050f]/95 md:bg-cyber-bg/25 border-r border-cyber-cyan/15 flex flex-col p-5 gap-6 select-none h-full overflow-y-auto transform transition-transform duration-300 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } md:translate-x-0 md:relative md:w-[350px] md:h-full md:sticky md:top-0 md:border-b-0 md:border-r md:z-30`}>
          <div className="flex flex-col gap-2">
            <span className="font-mono text-[9px] text-gray-500 uppercase tracking-widest px-2 font-bold">Navigation Panels</span>
            <nav className="flex flex-col gap-1.5 text-sm font-sans font-semibold">
              
              {/* Dashboard btn */}
              <button
                onClick={() => { playSynthSFX("click"); setActiveTab("dashboard"); setSelectedNode(null); setSidebarOpen(false); }}
                onMouseEnter={() => playSynthSFX("hover")}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all text-left ${
                  activeTab === "dashboard"
                    ? "bg-cyber-cyan/15 border-cyber-cyan text-cyber-cyan shadow-[0_0_12px_rgba(6,182,212,0.1)] font-bold"
                    : "border-transparent text-gray-400 hover:text-gray-200 hover:bg-cyber-cyan/5"
                }`}
              >
                <LayoutDashboard className="w-5 h-5 flex-shrink-0" />
                <span>Deck Dashboard</span>
              </button>

              {/* Constellation Canvas btn */}
              <button
                onClick={() => { playSynthSFX("click"); setActiveTab("constellation"); setSidebarOpen(false); }}
                onMouseEnter={() => playSynthSFX("hover")}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all text-left ${
                  activeTab === "constellation"
                    ? "bg-cyber-cyan/15 border-cyber-cyan text-cyber-cyan shadow-[0_0_12px_rgba(6,182,212,0.1)] font-bold"
                    : "border-transparent text-gray-400 hover:text-gray-200 hover:bg-cyber-cyan/5"
                }`}
              >
                <Orbit className="w-5 h-5 flex-shrink-0" />
                <span>Constellation Map</span>
              </button>

              {/* Memoir Deck btn */}
              <button
                onClick={() => { playSynthSFX("click"); setActiveTab("editor"); setSelectedNode(null); setSidebarOpen(false); }}
                onMouseEnter={() => playSynthSFX("hover")}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all text-left ${
                  activeTab === "editor"
                    ? "bg-cyber-cyan/15 border-cyber-cyan text-cyber-cyan shadow-[0_0_12px_rgba(6,182,212,0.1)] font-bold"
                    : "border-transparent text-gray-400 hover:text-gray-200 hover:bg-cyber-cyan/5"
                }`}
              >
                <PenTool className="w-5 h-5 flex-shrink-0" />
                <span>Memoir Deck</span>
              </button>

              {/* Consciousness Mirror btn */}
              <button
                onClick={() => { playSynthSFX("click"); setActiveTab("mirror"); setSelectedNode(null); setSidebarOpen(false); }}
                onMouseEnter={() => playSynthSFX("hover")}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all text-left ${
                  activeTab === "mirror"
                    ? "bg-cyber-cyan/15 border-cyber-cyan text-cyber-cyan shadow-[0_0_12px_rgba(6,182,212,0.1)] font-bold"
                    : "border-transparent text-gray-400 hover:text-gray-200 hover:bg-cyber-cyan/5"
                }`}
              >
                <MessageSquare className="w-5 h-5 flex-shrink-0" />
                <span>The Mirror</span>
              </button>

              {/* Temporal Vault btn */}
              <button
                onClick={() => { playSynthSFX("click"); setActiveTab("vault"); setSelectedNode(null); setSidebarOpen(false); }}
                onMouseEnter={() => playSynthSFX("hover")}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all text-left ${
                  activeTab === "vault"
                    ? "bg-cyber-cyan/15 border-cyber-cyan text-cyber-cyan shadow-[0_0_12px_rgba(6,182,212,0.1)] font-bold"
                    : "border-transparent text-gray-400 hover:text-gray-200 hover:bg-cyber-cyan/5"
                }`}
              >
                <Vault className="w-5 h-5 flex-shrink-0" />
                <span>Temporal Vault</span>
              </button>

              {/* Resource Deck btn */}
              <button
                onClick={() => { playSynthSFX("click"); setActiveTab("resources"); setSelectedNode(null); setSidebarOpen(false); }}
                onMouseEnter={() => playSynthSFX("hover")}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all text-left ${
                  activeTab === "resources"
                    ? "bg-cyber-cyan/15 border-cyber-cyan text-cyber-cyan shadow-[0_0_12px_rgba(6,182,212,0.1)] font-bold"
                    : "border-transparent text-gray-400 hover:text-gray-200 hover:bg-cyber-cyan/5"
                }`}
              >
                <Cpu className="w-5 h-5 flex-shrink-0" />
                <span>Resource Deck</span>
              </button>

              {/* Hologram Guide btn */}
              <button
                onClick={() => { playSynthSFX("click"); setActiveTab("hologram"); setSelectedNode(null); setSidebarOpen(false); }}
                onMouseEnter={() => playSynthSFX("hover")}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all text-left ${
                  activeTab === "hologram"
                    ? "bg-cyber-cyan/15 border-cyber-cyan text-cyber-cyan shadow-[0_0_12px_rgba(6,182,212,0.1)] font-bold"
                    : "border-transparent text-gray-400 hover:text-gray-200 hover:bg-cyber-cyan/5"
                }`}
              >
                <MessageSquare className="w-5 h-5 flex-shrink-0 text-cyber-cyan" />
                <span>Hologram Guide</span>
              </button>


              {/* Lock Screen Button */}
              {localStorage.getItem(`memento_lock_password_${currentUser?.username}`) && (
                <button
                  onClick={handleLockWeb}
                  onMouseEnter={() => playSynthSFX("hover")}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl border border-transparent text-cyber-cyan hover:text-cyber-cyan hover:bg-cyber-cyan/10 transition-all text-left cursor-pointer font-sans font-semibold text-sm"
                >
                  <Lock className="w-5 h-5 flex-shrink-0 text-cyber-cyan" />
                  <span>Lock Screen Now</span>
                </button>
              )}

              {/* Log Out btn */}
              <button
                onClick={handleLogout}
                onMouseEnter={() => playSynthSFX("hover")}
                className="flex items-center gap-3 px-4 py-3 rounded-xl border border-transparent text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all text-left cursor-pointer font-sans font-semibold text-sm"
              >
                <ShieldAlert className="w-5 h-5 flex-shrink-0 text-red-400" />
                <span>Log Out Session</span>
              </button>

            </nav>
          </div>

          {/* Robo Telemetry and Ambient Music Widgets in Sidebar */}
          <div className="flex flex-col gap-4 mt-auto pt-4 border-t border-cyber-cyan/10">
            {/* Companion Accordion */}
            <div className="flex flex-col gap-2 bg-cyber-card/30 p-2.5 rounded-xl border border-cyber-cyan/5">
              <button 
                onClick={() => { playSynthSFX("click"); setCompanionOpen(!companionOpen); }}
                onMouseEnter={() => playSynthSFX("hover")}
                className="flex items-center justify-between w-full px-2 py-1.5 bg-cyber-bg/50 hover:bg-cyber-cyan/10 border border-cyber-cyan/20 rounded-lg text-cyber-cyan font-mono text-[9px] font-bold tracking-wider transition-all cursor-pointer"
              >
                <span>[ 🧠 COGNITIVE COMPANION ]</span>
                <span>{companionOpen ? "CLOSE" : "OPEN"}</span>
              </button>
              {companionOpen && (
                <RoboAssistant 
                  onDefrag={handleDefrag} 
                  isDefragging={isDefragging}
                  scanlinesEnabled={scanlinesEnabled}
                  setScanlinesEnabled={setScanlinesEnabled}
                />
              )}
            </div>

            {/* Soundscape Accordion */}
            <div className="flex flex-col gap-2 bg-cyber-card/30 p-2.5 rounded-xl border border-cyber-cyan/5">
              <button 
                onClick={() => { playSynthSFX("click"); setSoundscapeOpen(!soundscapeOpen); }}
                onMouseEnter={() => playSynthSFX("hover")}
                className="flex items-center justify-between w-full px-2 py-1.5 bg-cyber-bg/50 hover:bg-cyber-cyan/10 border border-cyber-cyan/20 rounded-lg text-cyber-cyan font-mono text-[9px] font-bold tracking-wider transition-all cursor-pointer"
              >
                <span>[ 🎵 NEURAL SOUNDSCAPE ]</span>
                <span>{soundscapeOpen ? "CLOSE" : "OPEN"}</span>
              </button>
              {soundscapeOpen && (
                <AudioSynthesizer />
              )}
            </div>
          </div>

        </aside>

        <main className="flex-1 p-6 md:p-10 flex flex-col gap-6 overflow-y-auto h-full">
          {loading ? (
            <div className="flex-1 flex flex-col items-center justify-center py-24 gap-3">
              <div className="w-12 h-12 border-2 border-dashed border-cyber-cyan rounded-full animate-spin"></div>
              <span className="font-mono text-sm text-cyber-cyan uppercase tracking-widest animate-pulse">
                Synchronizing Secure Database...
              </span>
            </div>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.25 }}
                className="w-full flex-1 flex flex-col"
              >
                {activeTab === "dashboard" && (
                  <DashboardView
                    memories={memories}
                    lettersCount={letters.length}
                    onDeleteMemory={handleDeleteMemory}
                    onNavigateToTab={setActiveTab}
                    onSelectMemory={handleFocusMemoryNode}
                  />
                )}

                {activeTab === "constellation" && (
                  <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 items-start">
                    
                    {/* Constellation Canvas */}
                    <div className={selectedNode ? "xl:col-span-3" : "xl:col-span-4"}>
                      <ConstellationCanvas
                        memories={memories}
                        onSelectMemory={setSelectedNode}
                        isDefragging={isDefragging}
                      />
                    </div>

                    {/* Floating selected node drawer */}
                    {selectedNode && (
                      <div className="glass-panel border-cyber-cyan/30 rounded-2xl p-6 flex flex-col gap-4 relative overflow-hidden animate-slide-in">
                        <div className="flex justify-between items-center border-b border-cyber-cyan/10 pb-3">
                          <span className="font-mono text-[10px] text-cyber-cyan uppercase font-bold tracking-widest">
                            Memory Node Data
                          </span>
                          <button
                            onClick={() => setSelectedNode(null)}
                            className="font-mono text-xs text-gray-500 hover:text-cyber-cyan cursor-pointer"
                          >
                            [Close]
                          </button>
                        </div>

                        <h3 className="font-display text-base font-bold text-gray-100 uppercase tracking-wide">
                          {selectedNode.title}
                        </h3>

                        <div className="font-mono text-xs flex flex-wrap gap-2 text-cyber-purple">
                          <span className="bg-cyber-purple/5 border border-cyber-purple/20 px-2 py-0.5 rounded uppercase font-semibold">
                            Resonance: {selectedNode.emotion}
                          </span>
                        </div>

                        <div className="bg-cyber-bg/75 border border-cyber-cyan/5 rounded-xl p-4 text-sm leading-relaxed text-gray-300 font-sans max-h-64 overflow-y-auto whitespace-pre-wrap">
                          {selectedNode.content}
                        </div>

                        <div className="flex flex-wrap gap-1.5">
                          {selectedNode.tags.map((tag, i) => (
                            <span key={i} className="font-mono text-xs bg-cyber-cyan/5 border border-cyber-cyan/15 text-cyber-cyan px-2 py-0.5 rounded font-semibold">
                              #{tag}
                            </span>
                          ))}
                        </div>

                        <button
                          onClick={() => handleDeleteMemory(selectedNode._id || selectedNode.id || "")}
                          className="mt-2 font-mono text-xs text-red-400 hover:text-red-300 border border-red-950/20 bg-red-950/5 hover:bg-red-950/15 py-3 rounded-lg text-center transition-all uppercase font-bold cursor-pointer"
                        >
                          Delete Node
                        </button>
                      </div>
                    )}

                  </div>
                )}

                {activeTab === "editor" && (
                  <MemoirDeckView onAddMemory={handleAddMemory} />
                )}

                {activeTab === "mirror" && (
                  <ConsciousnessMirrorView memories={memories} />
                )}

                {activeTab === "vault" && (
                  <TemporalVaultView
                    letters={letters}
                    onAddLetter={handleAddLetter}
                    onDecryptLetter={handleDecryptLetter}
                  />
                )}

                {activeTab === "resources" && (
                  <ResourceManagerView playSynthSFX={playSynthSFX} />
                )}

                {activeTab === "hologram" && (
                  <HologramGuide currentUser={currentUser} />
                )}

              </motion.div>
            </AnimatePresence>
          )}

        </main>

      </div>

      {/* Footer telemetry */}
      <footer className="glass-panel border-t border-cyber-cyan/15 px-6 py-3 text-[10px] font-mono text-gray-500 bg-cyber-card flex flex-col sm:flex-row justify-between items-center gap-2 select-none z-10">
        <span>MEMENTO ENCRYPTED SYNC ENVIRONMENT v2.50</span>
        <div className="flex gap-4">
          <span>DATA SECURITY: ACTIVE</span>
          <span>STORAGE MODE: SYNC-PREFFERED (DATABASE + SECURE CACHE)</span>
        </div>
      </footer>

      {/* Profile Settings Slide-over Drawer Overlay */}
      <AnimatePresence>
        {isProfileOpen && (
          <ProfileView
            currentUser={currentUser}
            memoriesCount={memories.length}
            lettersCount={letters.length}
            onClearAllData={handleClearAllData}
            onLockWeb={handleLockWeb}
            onClose={() => setIsProfileOpen(false)}
            onUpdateUser={(updatedUser) => {
              setCurrentUser(updatedUser);
              localStorage.setItem("memento_session", JSON.stringify(updatedUser));
            }}
          />
        )}
      </AnimatePresence>

    </div>
  );
}
