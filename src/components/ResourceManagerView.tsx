"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Cpu,
  RefreshCw,
  Zap,
  Trash2,
  Settings,
  ShieldAlert,
  Battery,
  BatteryCharging,
  List,
  Terminal,
  Sliders,
  Check,
  Plus,
  X,
  Shield,
  Activity,
  Maximize2
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface SystemStats {
  ram: {
    totalMb: number;
    availableMb: number;
    usedMb: number;
    usedPercent: number;
  };
  swap: {
    totalMb: number;
    usedMb: number;
    usedPercent: number;
  };
  cpu: {
    loadPercent: number;
    cores: number;
    model: string;
  };
  battery: {
    hasBattery: boolean;
    chargePercent: number;
    isCharging: boolean;
    powerSaverActive: boolean;
  };
}

interface ProcessInfo {
  pid: number;
  name: string;
  memoryMb: number;
  cpuPercent: number;
  type: "Application" | "Background Service";
  status: "Active" | "Hibernated";
  isSystem: boolean;
  isWhitelisted: boolean;
}

interface ResourceConfig {
  autoCleanEnabled: boolean;
  autoCleanThreshold: number;
  alertsEnabled: boolean;
  alertCpuThreshold: number;
  alertRamThreshold: number;
  scheduleInterval: "off" | "1h" | "2h" | "6h" | "startup";
  whitelist: string[];
  powerSaverIntegration: boolean;
}

interface RecoveryLog {
  id: string;
  timestamp: string;
  type: "boost" | "auto" | "temp_clean";
  ramFreedMb: number;
  diskFreedMb: number;
  appsAffected: string[];
  details: string;
}

interface ResourceManagerViewProps {
  playSynthSFX: (type: "click" | "hover" | "success" | "alert") => void;
}

export default function ResourceManagerView({ playSynthSFX }: ResourceManagerViewProps) {
  // Stats and list data
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [processes, setProcesses] = useState<ProcessInfo[]>([]);
  const [config, setConfig] = useState<ResourceConfig | null>(null);
  const [logs, setLogs] = useState<RecoveryLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [isCleaning, setIsCleaning] = useState(false);
  const [isBoosting, setIsBoosting] = useState(false);

  // Performance history arrays for charts (max 30 items)
  const [cpuHistory, setCpuHistory] = useState<number[]>(Array(30).fill(0));
  const [ramHistory, setRamHistory] = useState<number[]>(Array(30).fill(0));

  // Filters & Whitelist Edit state
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<"all" | "apps" | "services">("all");
  const [customWhitelistItem, setCustomWhitelistItem] = useState("");
  const [activeSettingTab, setActiveSettingTab] = useState<"auto" | "whitelist">("auto");
  const [notification, setNotification] = useState<{ message: string; type: "success" | "warning" | "info" } | null>(null);

  // Prevention of auto-clean loops
  const lastBoostTimeRef = useRef<number>(0);

  // Fetch stats and processes
  const fetchStatsAndLogs = async (isFirstLoad = false) => {
    try {
      const response = await fetch("/api/resources/stats");
      const data = await response.json();
      if (data.success) {
        setStats(data.stats);
        setConfig(data.config);
        setLogs(data.logs);

        // Update charts history
        setCpuHistory(prev => [...prev.slice(1), data.stats.cpu.loadPercent]);
        setRamHistory(prev => [...prev.slice(1), data.stats.ram.usedPercent]);

        // Smart Automations check: Threshold-based auto cleanup
        if (
          data.config.autoCleanEnabled &&
          data.stats.ram.usedPercent >= (data.stats.battery.powerSaverActive && data.config.powerSaverIntegration 
            ? Math.max(data.config.autoCleanThreshold - 10, 50) 
            : data.config.autoCleanThreshold)
        ) {
          const now = Date.now();
          // Throttle auto-boosts to once every 60 seconds to avoid cascading execution
          if (now - lastBoostTimeRef.current > 60000) {
            lastBoostTimeRef.current = now;
            triggerAutoBoost();
          }
        }

        // Custom alerts check
        if (data.config.alertsEnabled) {
          if (data.stats.cpu.loadPercent >= data.config.alertCpuThreshold) {
            triggerAlertNotification(`CRITICAL: CPU Load at ${data.stats.cpu.loadPercent}%!`);
          } else if (data.stats.ram.usedPercent >= data.config.alertRamThreshold) {
            triggerAlertNotification(`WARNING: RAM Usage at ${data.stats.ram.usedPercent}%!`);
          }
        }
      }
    } catch (e) {
      console.error("Error polling system stats:", e);
    } finally {
      if (isFirstLoad) setLoading(false);
    }
  };

  const fetchProcessesOnly = async () => {
    try {
      const response = await fetch("/api/resources/processes");
      const data = await response.json();
      if (data.success) {
        setProcesses(data.processes);
      }
    } catch (e) {
      console.error("Error polling processes:", e);
    }
  };

  // Continuous loop for real-time telemetry (every 2.5 seconds)
  useEffect(() => {
    fetchStatsAndLogs(true);
    fetchProcessesOnly();

    const statsInterval = setInterval(() => {
      fetchStatsAndLogs();
    }, 2500);

    const procInterval = setInterval(() => {
      fetchProcessesOnly();
    }, 5000); // processes updated slightly slower to minimize CPU overhead

    return () => {
      clearInterval(statsInterval);
      clearInterval(procInterval);
    };
  }, []);

  // Show status popup
  const showToast = (message: string, type: "success" | "warning" | "info" = "info") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  // Trigger alert sound & flash warning
  const triggerAlertNotification = (msg: string) => {
    playSynthSFX("alert");
    showToast(msg, "warning");
  };

  // One-Click Memory Boost (Quick Clean)
  const triggerBoost = async () => {
    if (isBoosting) return;
    playSynthSFX("click");
    setIsBoosting(true);
    showToast("Initializing memory purge & cache sweeps...", "info");

    try {
      const response = await fetch("/api/resources/clean", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "boost" })
      });
      const data = await response.json();
      if (data.success) {
        playSynthSFX("success");
        showToast(
          `Memory sweep complete! Reclaimed ${data.ramFreedMb} MB RAM. Terminated ${data.appsTerminated.length} background instances.`,
          "success"
        );
        fetchStatsAndLogs();
        fetchProcessesOnly();
      }
    } catch (e) {
      showToast("Boost routine encountered a synaptic error.", "warning");
    } finally {
      setIsBoosting(false);
    }
  };

  // Auto clean execution (internally triggered)
  const triggerAutoBoost = async () => {
    try {
      const response = await fetch("/api/resources/clean", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "boost" })
      });
      const data = await response.json();
      if (data.success) {
        playSynthSFX("success");
        showToast(
          `[AUTO-CLEAN] Threshold exceeded. Swept ${data.ramFreedMb} MB RAM.`,
          "success"
        );
        fetchStatsAndLogs();
        fetchProcessesOnly();
      }
    } catch (e) {
      console.error("Auto boost failed:", e);
    }
  };

  // Safe Disk cache clean
  const triggerTempClean = async () => {
    if (isCleaning) return;
    playSynthSFX("click");
    setIsCleaning(true);
    showToast("Scanning filesystems and removing temporary logs...", "info");

    try {
      const response = await fetch("/api/resources/clean", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "tempClean" })
      });
      const data = await response.json();
      if (data.success) {
        playSynthSFX("success");
        showToast(data.details, "success");
        fetchStatsAndLogs();
      }
    } catch (e) {
      showToast("Clean routine failed to access temp directories.", "warning");
    } finally {
      setIsCleaning(false);
    }
  };

  // Terminate selected process
  const killProcess = async (pid: number, name: string) => {
    if (!confirm(`Are you sure you want to terminate "${name}" (PID: ${pid})?`)) return;
    playSynthSFX("click");
    try {
      const response = await fetch("/api/resources/processes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "kill", pid })
      });
      const data = await response.json();
      if (data.success) {
        showToast(`Process ${name} (PID: ${pid}) terminated successfully.`, "success");
        setProcesses(prev => prev.filter(p => p.pid !== pid));
        fetchStatsAndLogs();
      } else {
        showToast(data.error || "Failed to terminate process.", "warning");
      }
    } catch (e) {
      showToast("Process termination API call failed.", "warning");
    }
  };

  // Toggle App Hibernation (Priority Class Idle vs Normal)
  const toggleHibernate = async (pid: number, name: string, isHibernated: boolean) => {
    playSynthSFX("click");
    try {
      const response = await fetch("/api/resources/processes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "hibernate", pid, value: !isHibernated })
      });
      const data = await response.json();
      if (data.success) {
        showToast(
          isHibernated 
            ? `Woke up process "${name}". Restored normal CPU priority.`
            : `Hibernated process "${name}". Drop CPU priority to Idle.`,
          "success"
        );
        setProcesses(prev =>
          prev.map(p => (p.pid === pid ? { ...p, status: isHibernated ? "Active" : "Hibernated" } : p))
        );
      } else {
        showToast(data.error || "Priority alteration failed.", "warning");
      }
    } catch (e) {
      showToast("Priority shift command failed.", "warning");
    }
  };

  // Save Configuration values to Backend
  const saveConfigValues = async (updatedConfig: Partial<ResourceConfig>) => {
    if (!config) return;
    try {
      const response = await fetch("/api/resources/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedConfig)
      });
      const data = await response.json();
      if (data.success) {
        setConfig(data.config);
      }
    } catch (e) {
      showToast("Failed to sync configurations to local JSON.", "warning");
    }
  };

  // Whitelist modification helpers
  const addToWhitelist = () => {
    if (!config || !customWhitelistItem.trim()) return;
    playSynthSFX("click");
    const item = customWhitelistItem.trim().toLowerCase();
    if (config.whitelist.includes(item)) {
      showToast(`"${item}" is already whitelisted.`, "info");
      return;
    }
    const updated = [...config.whitelist, item];
    saveConfigValues({ whitelist: updated });
    setCustomWhitelistItem("");
    showToast(`Added "${item}" to exclusions.`, "success");
    fetchProcessesOnly();
  };

  const removeFromWhitelist = (item: string) => {
    if (!config) return;
    playSynthSFX("click");
    const updated = config.whitelist.filter(w => w !== item);
    saveConfigValues({ whitelist: updated });
    showToast(`Removed "${item}" from exclusions.`, "success");
    fetchProcessesOnly();
  };

  // Filter processes list based on searches & buttons
  const filteredProcesses = useMemo(() => {
    return processes.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.pid.toString().includes(searchQuery);
      const matchesFilter =
        activeFilter === "all" ||
        (activeFilter === "apps" && p.type === "Application") ||
        (activeFilter === "services" && p.type === "Background Service");
      return matchesSearch && matchesFilter;
    });
  }, [processes, searchQuery, activeFilter]);

  // Compute SVG graph paths
  const getSvgPath = (historyData: number[]) => {
    if (historyData.length < 2) return "";
    const width = 450;
    const height = 130;
    const points = historyData.map((val, idx) => {
      const x = (idx / (historyData.length - 1)) * width;
      const y = height - (val / 100) * height;
      return `${x},${y}`;
    });
    return points.join(" ");
  };

  const getSvgAreaPath = (historyData: number[]) => {
    if (historyData.length < 2) return "";
    const width = 450;
    const height = 130;
    const path = getSvgPath(historyData);
    return `M 0,${height} L ${path} L ${width},${height} Z`;
  };

  if (loading || !stats || !config) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-24 gap-3">
        <RefreshCw className="w-10 h-10 text-cyber-cyan animate-spin" />
        <span className="font-mono text-xs text-cyber-cyan uppercase tracking-widest animate-pulse">
          Interfacing Host Telemetry Hub...
        </span>
      </div>
    );
  }

  // Calculate dynamic battery thresholds
  const batterySavingActive = stats.battery.powerSaverActive && config.powerSaverIntegration;
  const effectiveAutoCleanThreshold = batterySavingActive
    ? Math.max(config.autoCleanThreshold - 10, 50)
    : config.autoCleanThreshold;

  return (
    <div className="flex flex-col gap-6 w-full animate-fade-in py-1">
      {/* Alert Header Notification */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-24 right-6 z-50 px-5 py-3.5 rounded-xl border font-mono text-xs flex items-center gap-3 backdrop-blur-lg shadow-[0_8px_32px_rgba(0,0,0,0.5)] ${
              notification.type === "warning"
                ? "bg-red-950/80 border-red-500/50 text-red-300 shadow-[0_0_15px_rgba(239,68,68,0.2)]"
                : notification.type === "success"
                ? "bg-emerald-950/80 border-emerald-500/50 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.2)]"
                : "bg-[#09152b]/95 border-cyber-cyan/50 text-cyber-cyan shadow-[0_0_15px_rgba(6,182,212,0.2)]"
            }`}
          >
            <ShieldAlert className={`w-4 h-4 ${notification.type === "warning" ? "animate-bounce" : ""}`} />
            <span>{notification.message}</span>
            <button onClick={() => setNotification(null)} className="text-gray-400 hover:text-white ml-2 cursor-pointer">
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Overview Metric Panel Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* CPU Load Metric */}
        <div className="glass-panel border-cyber-cyan/15 rounded-xl p-4.5 flex flex-col gap-2 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-[2px] bg-cyber-cyan"></div>
          <div className="flex justify-between items-center text-xs font-mono text-gray-400">
            <span className="flex items-center gap-1.5 uppercase font-bold tracking-wider">
              <Cpu className="w-4 h-4 text-cyber-cyan" /> CPU Load
            </span>
            <span className="text-[10px] text-gray-500">{stats.cpu.cores} CORES</span>
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-3xl font-extrabold text-white glow-text-cyan">{stats.cpu.loadPercent}%</span>
            <span className="text-[9px] text-gray-500 font-mono tracking-tighter truncate max-w-[130px]" title={stats.cpu.model}>
              {stats.cpu.model.split("@")[0]}
            </span>
          </div>
          <div className="w-full bg-cyber-bg/70 h-1.5 rounded-full border border-cyber-cyan/10 overflow-hidden mt-1">
            <div
              className="h-full bg-cyber-cyan transition-all duration-300"
              style={{ width: `${stats.cpu.loadPercent}%` }}
            ></div>
          </div>
        </div>

        {/* RAM Consumption Metric */}
        <div className="glass-panel border-cyber-purple/15 rounded-xl p-4.5 flex flex-col gap-2 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-[2px] bg-cyber-purple"></div>
          <div className="flex justify-between items-center text-xs font-mono text-gray-400">
            <span className="flex items-center gap-1.5 uppercase font-bold tracking-wider">
              <Activity className="w-4 h-4 text-cyber-purple" /> System RAM
            </span>
            <span className="text-[10px] text-gray-500">{stats.ram.totalMb} MB</span>
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-3xl font-extrabold text-white glow-text-purple">{stats.ram.usedPercent}%</span>
            <span className="text-[10px] text-gray-400">
              {stats.ram.usedMb} / {stats.ram.totalMb} MB
            </span>
          </div>
          <div className="w-full bg-cyber-bg/70 h-1.5 rounded-full border border-cyber-purple/10 overflow-hidden mt-1">
            <div
              className={`h-full transition-all duration-300 ${
                stats.ram.usedPercent >= effectiveAutoCleanThreshold ? "bg-red-500 animate-pulse" : "bg-cyber-purple"
              }`}
              style={{ width: `${stats.ram.usedPercent}%` }}
            ></div>
          </div>
        </div>

        {/* Swap File/Virtual RAM Metric */}
        <div className="glass-panel border-cyber-teal/15 rounded-xl p-4.5 flex flex-col gap-2 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-[2px] bg-cyber-teal"></div>
          <div className="flex justify-between items-center text-xs font-mono text-gray-400">
            <span className="flex items-center gap-1.5 uppercase font-bold tracking-wider">
              <Sliders className="w-4 h-4 text-cyber-teal" /> Virtual Swap
            </span>
            <span className="text-[10px] text-gray-500">{stats.swap.totalMb} MB</span>
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-3xl font-extrabold text-white glow-text-teal">{stats.swap.usedPercent}%</span>
            <span className="text-[10px] text-gray-400">
              {stats.swap.usedMb} / {stats.swap.totalMb} MB
            </span>
          </div>
          <div className="w-full bg-cyber-bg/70 h-1.5 rounded-full border border-cyber-teal/10 overflow-hidden mt-1">
            <div
              className="h-full bg-cyber-teal transition-all duration-300"
              style={{ width: `${stats.swap.usedPercent}%` }}
            ></div>
          </div>
        </div>

        {/* Battery & Laptop Power saver Integration */}
        <div className="glass-panel border-cyber-green/15 rounded-xl p-4.5 flex flex-col gap-2 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-[2px] bg-cyber-green"></div>
          <div className="flex justify-between items-center text-xs font-mono text-gray-400">
            <span className="flex items-center gap-1.5 uppercase font-bold tracking-wider">
              {stats.battery.isCharging ? (
                <BatteryCharging className="w-4 h-4 text-cyber-green animate-pulse" />
              ) : (
                <Battery className="w-4 h-4 text-cyber-green" />
              )}
              Laptop Power
            </span>
            <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
              stats.battery.hasBattery 
                ? stats.battery.powerSaverActive 
                  ? "bg-yellow-500/10 border border-yellow-500/30 text-yellow-500"
                  : "bg-cyber-green/10 border border-cyber-green/30 text-cyber-green"
                : "bg-gray-500/10 border border-gray-500/30 text-gray-500"
            }`}>
              {stats.battery.hasBattery 
                ? stats.battery.powerSaverActive 
                  ? "SAVER ACTIVED" 
                  : "DISCHARGING" 
                : "AC STATION"}
            </span>
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-3xl font-extrabold text-white glow-text-teal">
              {stats.battery.hasBattery ? `${stats.battery.chargePercent}%` : "100%"}
            </span>
            <span className="text-[10px] text-gray-400">
              {stats.battery.hasBattery 
                ? stats.battery.isCharging 
                  ? "Charging source" 
                  : "Powering battery" 
                : "Continuous Line Power"}
            </span>
          </div>
          {stats.battery.hasBattery ? (
            <div className="w-full bg-cyber-bg/70 h-1.5 rounded-full border border-cyber-green/10 overflow-hidden mt-1">
              <div
                className="h-full bg-cyber-green transition-all duration-300"
                style={{ width: `${stats.battery.chargePercent}%` }}
              ></div>
            </div>
          ) : (
            <div className="text-[9px] font-sans text-gray-500 italic mt-2.5">
              Running direct AC mains. Safe thresholds fully engaged.
            </div>
          )}
        </div>
      </div>

      {/* Real-time CRT Oscilloscopes Charts & Quick Action Center */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Double Oscilloscope Graph */}
        <div className="glass-panel border-cyber-cyan/15 rounded-xl p-5 lg:col-span-3 flex flex-col gap-4 relative overflow-hidden bg-[#050b18]/90">
          {/* CRT scanlines grid detail */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%)] bg-[length:100%_4px] pointer-events-none opacity-30"></div>
          
          <div className="flex justify-between items-center border-b border-cyber-cyan/10 pb-2 z-10">
            <span className="font-mono text-xs text-cyber-cyan uppercase font-bold tracking-widest flex items-center gap-1.5">
              <Activity className="w-4 h-4 animate-pulse" /> Oscilloscope Telemetry Graph
            </span>
            <span className="font-mono text-[9px] text-gray-500 uppercase">CRT SWEEP RATE: 2.5s</span>
          </div>

          <div className="relative flex justify-center items-center h-[130px] border border-cyber-cyan/10 bg-[#020610] rounded-lg overflow-hidden">
            {/* Grid coordinates */}
            <div className="absolute inset-0 flex flex-col justify-between opacity-5">
              <div className="border-b border-cyber-cyan w-full"></div>
              <div className="border-b border-cyber-cyan w-full"></div>
              <div className="border-b border-cyber-cyan w-full"></div>
              <div className="border-b border-cyber-cyan w-full"></div>
            </div>
            <div className="absolute inset-0 flex justify-between opacity-5">
              <div className="border-r border-cyber-cyan h-full"></div>
              <div className="border-r border-cyber-cyan h-full"></div>
              <div className="border-r border-cyber-cyan h-full"></div>
              <div className="border-r border-cyber-cyan h-full"></div>
            </div>

            <svg viewBox="0 0 450 130" className="w-full h-full absolute overflow-visible">
              <defs>
                <linearGradient id="cpuGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#14b8a6" stopOpacity="0.25"/>
                  <stop offset="100%" stopColor="#14b8a6" stopOpacity="0"/>
                </linearGradient>
                <linearGradient id="ramGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#d946ef" stopOpacity="0.25"/>
                  <stop offset="100%" stopColor="#d946ef" stopOpacity="0"/>
                </linearGradient>
              </defs>
              {/* RAM Area Under the Curve */}
              <path d={getSvgAreaPath(ramHistory)} fill="url(#ramGrad)" className="transition-all duration-300" />
              {/* CPU Area Under the Curve */}
              <path d={getSvgAreaPath(cpuHistory)} fill="url(#cpuGrad)" className="transition-all duration-300" />

              {/* RAM Line */}
              <polyline
                fill="none"
                stroke="#d946ef"
                strokeWidth="2"
                points={getSvgPath(ramHistory)}
                className="transition-all duration-300"
              />
              {/* CPU Line */}
              <polyline
                fill="none"
                stroke="#14b8a6"
                strokeWidth="1.5"
                points={getSvgPath(cpuHistory)}
                className="transition-all duration-300"
              />
            </svg>

            {/* Float Labels */}
            <div className="absolute top-2 right-3 font-mono text-[9px] flex gap-3 text-xs z-10">
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-cyber-teal rounded-full"></span>
                <span className="text-cyber-teal">CPU: {stats.cpu.loadPercent}%</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-cyber-purple rounded-full"></span>
                <span className="text-cyber-purple">RAM: {stats.ram.usedPercent}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Center Widget */}
        <div className="glass-panel border-cyber-cyan/15 rounded-xl p-5 lg:col-span-2 flex flex-col gap-4.5 justify-between">
          <div className="flex flex-col gap-1 border-b border-cyber-cyan/10 pb-2">
            <span className="font-mono text-xs text-cyber-cyan uppercase font-bold tracking-widest">
              Manual Quick Optimizer
            </span>
            <p className="text-[10px] text-gray-500 font-sans leading-normal">
              Purge background garbage memory clusters or wipe cache files instantly.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            {/* Boost Button */}
            <button
              onClick={triggerBoost}
              disabled={isBoosting}
              className={`relative overflow-hidden font-mono text-xs font-bold uppercase tracking-wider py-4 rounded-xl border text-center transition-all cursor-pointer flex items-center justify-center gap-2 ${
                isBoosting
                  ? "bg-cyber-purple/10 border-cyber-purple/30 text-cyber-purple"
                  : "bg-cyber-purple/15 border-cyber-purple text-cyber-purple hover:bg-cyber-purple/25 hover:shadow-[0_0_15px_rgba(217,70,239,0.2)]"
              }`}
            >
              {isBoosting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  PURGING STANDBY RAM...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 fill-current animate-pulse" />
                  ONE-CLICK MEMORY BOOST
                </>
              )}
            </button>

            {/* Cache Temp Cleaning Button */}
            <button
              onClick={triggerTempClean}
              disabled={isCleaning}
              className={`relative overflow-hidden font-mono text-xs font-bold uppercase tracking-wider py-4 rounded-xl border text-center transition-all cursor-pointer flex items-center justify-center gap-2 ${
                isCleaning
                  ? "bg-cyber-teal/10 border-cyber-teal/30 text-cyber-teal"
                  : "bg-cyber-teal/15 border-cyber-teal text-cyber-teal hover:bg-cyber-teal/25 hover:shadow-[0_0_15px_rgba(20,184,166,0.2)]"
              }`}
            >
              {isCleaning ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  CLEANING CACHE LOGS...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  CLEAN CACHE & TEMP FILES
                </>
              )}
            </button>
          </div>

          <div className="flex justify-between items-center bg-[#070e1b] border border-cyber-cyan/10 p-2.5 rounded-lg text-[9px] font-mono">
            <span className="text-gray-500">STANDBY RECOVERY METHOD:</span>
            <span className="text-cyber-green uppercase font-bold">GC Standby Sweep</span>
          </div>
        </div>
      </div>

      {/* Task Manager and Smart Config Split */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        {/* Left Side: Active Process Manager (Built-in Task Manager) */}
        <div className="glass-panel border-cyber-cyan/15 rounded-xl p-5 xl:col-span-3 flex flex-col gap-4 bg-[#040813]/90 relative overflow-hidden">
          <div className="flex justify-between items-center border-b border-cyber-cyan/10 pb-3 flex-wrap gap-2">
            <div className="flex flex-col gap-0.5">
              <span className="font-mono text-xs text-cyber-cyan uppercase font-bold tracking-widest flex items-center gap-1">
                <List className="w-4 h-4" /> Active Process Manager
              </span>
              <p className="text-[10px] text-gray-500 font-sans">
                Active processes sorted by real memory footprint. Excludes essential systems.
              </p>
            </div>

            <div className="flex items-center gap-3">
              {/* Search input */}
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="bg-[#050b16] border border-cyber-cyan/20 px-2.5 py-1 text-xs text-gray-200 rounded-lg outline-none focus:border-cyber-cyan/50 max-w-[120px] font-mono"
              />

              {/* Filters */}
              <div className="flex bg-cyber-bg/80 border border-cyber-cyan/15 p-0.5 rounded-lg">
                {(["all", "apps", "services"] as const).map(f => (
                  <button
                    key={f}
                    onClick={() => {
                      playSynthSFX("click");
                      setActiveFilter(f);
                    }}
                    className={`px-2 py-0.5 rounded font-mono text-[9px] uppercase tracking-wider font-bold transition-all cursor-pointer ${
                      activeFilter === f
                        ? "bg-cyber-cyan/15 text-cyber-cyan border border-cyber-cyan/25"
                        : "text-gray-500 hover:text-gray-300"
                    }`}
                  >
                    {f === "all" ? "ALL" : f === "apps" ? "APPS" : "SVC"}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Process List scrollable window */}
          <div className="overflow-x-auto max-h-[360px] overflow-y-auto pr-1">
            <table className="w-full text-left font-mono text-xs border-collapse">
              <thead>
                <tr className="border-b border-cyber-cyan/10 text-gray-500 text-[10px] uppercase font-bold tracking-wider">
                  <th className="py-2.5 pl-2">Name</th>
                  <th className="py-2.5 text-center">PID</th>
                  <th className="py-2.5 text-right">RAM</th>
                  <th className="py-2.5 text-center">CPU</th>
                  <th className="py-2.5 text-center">Scope</th>
                  <th className="py-2.5 text-right pr-2">Control Options</th>
                </tr>
              </thead>
              <tbody>
                {filteredProcesses.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-gray-500 uppercase tracking-widest">
                      No matching processes identified
                    </td>
                  </tr>
                ) : (
                  filteredProcesses.map(p => {
                    const isHibernated = p.status === "Hibernated";
                    return (
                      <tr
                        key={p.pid}
                        className={`border-b border-cyber-cyan/5 hover:bg-cyber-cyan/5 transition-all group ${
                          p.isWhitelisted ? "opacity-75" : ""
                        }`}
                      >
                        {/* Name */}
                        <td className="py-2 pl-2 flex items-center gap-1.5 text-gray-200">
                          {p.isWhitelisted && <Shield className="w-3.5 h-3.5 text-cyber-cyan/70 flex-shrink-0" />}
                          <span className={`font-semibold ${p.isWhitelisted ? "text-cyber-cyan/90" : "text-white"}`}>
                            {p.name}
                          </span>
                        </td>

                        {/* PID */}
                        <td className="py-2 text-center text-gray-500 text-[11px]">{p.pid}</td>

                        {/* RAM Memory */}
                        <td className="py-2 text-right text-cyber-purple font-bold">{p.memoryMb} MB</td>

                        {/* CPU Load */}
                        <td className="py-2 text-center text-cyber-teal">
                          {p.cpuPercent > 0 ? `${p.cpuPercent}%` : "-"}
                        </td>

                        {/* Scope */}
                        <td className="py-2 text-center">
                          <span
                            className={`text-[8px] font-bold px-1.5 py-0.5 rounded font-mono ${
                              p.type === "Application"
                                ? "bg-cyan-500/10 border border-cyan-500/20 text-cyan-400"
                                : "bg-purple-500/10 border border-purple-500/20 text-purple-400"
                            }`}
                          >
                            {p.type === "Application" ? "APP" : "SVC"}
                          </span>
                        </td>

                        {/* Controls */}
                        <td className="py-2 text-right pr-2">
                          <div className="flex justify-end gap-1.5">
                            {p.isWhitelisted ? (
                              <span className="text-[8px] text-cyber-cyan bg-cyber-cyan/5 border border-cyber-cyan/25 px-2 py-1 rounded font-bold uppercase">
                                SYSTEM SECURED
                              </span>
                            ) : (
                              <>
                                {/* Hibernate button */}
                                <button
                                  onClick={() => toggleHibernate(p.pid, p.name, isHibernated)}
                                  className={`px-2 py-1 rounded text-[9px] font-bold tracking-tight uppercase transition-all cursor-pointer ${
                                    isHibernated
                                      ? "bg-[#0c2c1c] border border-green-500/50 text-green-400"
                                      : "bg-amber-950/20 border border-amber-500/30 text-amber-500 hover:bg-amber-950/40"
                                  }`}
                                  title={isHibernated ? "Wake app process up" : "Hibernate background cycles"}
                                >
                                  {isHibernated ? "AWAKE" : "HIBERNATE"}
                                </button>

                                {/* Kill button */}
                                <button
                                  onClick={() => killProcess(p.pid, p.name)}
                                  className="px-2 py-1 bg-red-950/20 border border-red-500/30 text-red-400 hover:bg-red-950/40 rounded text-[9px] font-bold tracking-tight uppercase transition-all cursor-pointer"
                                  title="Kill Process"
                                >
                                  KILL
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Side: Smart Features & Configuration */}
        <div className="glass-panel border-cyber-cyan/15 rounded-xl p-5 xl:col-span-2 flex flex-col gap-4 justify-between">
          <div className="flex flex-col gap-3">
            <div className="flex border-b border-cyber-cyan/10 pb-2">
              <button
                onClick={() => {
                  playSynthSFX("click");
                  setActiveSettingTab("auto");
                }}
                className={`flex-1 text-center pb-2 font-mono text-xs font-bold transition-all cursor-pointer border-b ${
                  activeSettingTab === "auto"
                    ? "text-cyber-cyan border-cyber-cyan"
                    : "text-gray-500 border-transparent hover:text-gray-300"
                }`}
              >
                AUTOMATIONS
              </button>
              <button
                onClick={() => {
                  playSynthSFX("click");
                  setActiveSettingTab("whitelist");
                }}
                className={`flex-1 text-center pb-2 font-mono text-xs font-bold transition-all cursor-pointer border-b ${
                  activeSettingTab === "whitelist"
                    ? "text-cyber-cyan border-cyber-cyan"
                    : "text-gray-500 border-transparent hover:text-gray-300"
                }`}
              >
                WHITELIST EXCLUSIONS
              </button>
            </div>

            {/* Automations Settings content */}
            {activeSettingTab === "auto" && (
              <div className="flex flex-col gap-4 py-1">
                {/* Auto cleanup toggle */}
                <div className="flex justify-between items-center">
                  <div className="flex flex-col gap-0.5">
                    <span className="font-mono text-xs text-white font-bold uppercase tracking-wider">
                      Auto-Cleanup Optimization
                    </span>
                    <span className="text-[9px] text-gray-500 font-sans leading-normal max-w-[200px]">
                      Runs a standby boost automatically when memory limits are crossed.
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      playSynthSFX("click");
                      saveConfigValues({ autoCleanEnabled: !config.autoCleanEnabled });
                    }}
                    className={`w-11 h-6 rounded-full p-0.5 transition-colors cursor-pointer border ${
                      config.autoCleanEnabled 
                        ? "bg-cyber-green/20 border-cyber-green" 
                        : "bg-gray-900 border-gray-700"
                    }`}
                  >
                    <div
                      className={`w-4.5 h-4.5 rounded-full transition-transform ${
                        config.autoCleanEnabled 
                          ? "bg-cyber-green translate-x-5" 
                          : "bg-gray-600 translate-x-0"
                      }`}
                    ></div>
                  </button>
                </div>

                {/* Slider for Auto cleanup threshold */}
                {config.autoCleanEnabled && (
                  <div className="flex flex-col gap-1.5 border border-cyber-cyan/5 bg-[#030712]/50 p-2.5 rounded-lg">
                    <div className="flex justify-between text-[11px] font-mono">
                      <span className="text-gray-400">TRIGGER RAM LIMIT:</span>
                      <span className="text-cyber-cyan font-bold">{config.autoCleanThreshold}%</span>
                    </div>
                    <input
                      type="range"
                      min="50"
                      max="95"
                      step="5"
                      value={config.autoCleanThreshold}
                      onChange={e => saveConfigValues({ autoCleanThreshold: parseInt(e.target.value, 10) })}
                      className="w-full accent-cyber-cyan cursor-pointer"
                    />
                    {batterySavingActive && (
                      <span className="text-[8px] text-yellow-500 font-mono italic">
                        * Battery Saver Mode active. Target adapted to {effectiveAutoCleanThreshold}%!
                      </span>
                    )}
                  </div>
                )}

                <div className="border-t border-cyber-cyan/5 my-1"></div>

                {/* Alerts Toggle */}
                <div className="flex justify-between items-center">
                  <div className="flex flex-col gap-0.5">
                    <span className="font-mono text-xs text-white font-bold uppercase tracking-wider">
                      Critical Alert Sirens
                    </span>
                    <span className="text-[9px] text-gray-500 font-sans leading-normal max-w-[200px]">
                      Triggers system synth sounds and visual indicators on overload.
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      playSynthSFX("click");
                      saveConfigValues({ alertsEnabled: !config.alertsEnabled });
                    }}
                    className={`w-11 h-6 rounded-full p-0.5 transition-colors cursor-pointer border ${
                      config.alertsEnabled 
                        ? "bg-cyber-green/20 border-cyber-green" 
                        : "bg-gray-900 border-gray-700"
                    }`}
                  >
                    <div
                      className={`w-4.5 h-4.5 rounded-full transition-transform ${
                        config.alertsEnabled 
                          ? "bg-cyber-green translate-x-5" 
                          : "bg-gray-600 translate-x-0"
                      }`}
                    ></div>
                  </button>
                </div>

                <div className="border-t border-cyber-cyan/5 my-1"></div>

                {/* Battery integration Toggle */}
                <div className="flex justify-between items-center">
                  <div className="flex flex-col gap-0.5">
                    <span className="font-mono text-xs text-white font-bold uppercase tracking-wider">
                      Battery Saver Integration
                    </span>
                    <span className="text-[9px] text-gray-500 font-sans leading-normal max-w-[200px]">
                      Decreases threshold targets by 10% when laptop is on battery power.
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      playSynthSFX("click");
                      saveConfigValues({ powerSaverIntegration: !config.powerSaverIntegration });
                    }}
                    className={`w-11 h-6 rounded-full p-0.5 transition-colors cursor-pointer border ${
                      config.powerSaverIntegration 
                        ? "bg-cyber-green/20 border-cyber-green" 
                        : "bg-gray-900 border-gray-700"
                    }`}
                  >
                    <div
                      className={`w-4.5 h-4.5 rounded-full transition-transform ${
                        config.powerSaverIntegration 
                          ? "bg-cyber-green translate-x-5" 
                          : "bg-gray-600 translate-x-0"
                      }`}
                    ></div>
                  </button>
                </div>

                <div className="border-t border-cyber-cyan/5 my-1"></div>

                {/* Scheduled Optimization selector */}
                <div className="flex justify-between items-center">
                  <div className="flex flex-col gap-0.5">
                    <span className="font-mono text-xs text-white font-bold uppercase tracking-wider">
                      Scheduled Sweep Sweeper
                    </span>
                    <span className="text-[9px] text-gray-500 font-sans leading-normal">
                      Set automated background optimization timers.
                    </span>
                  </div>
                  <select
                    value={config.scheduleInterval}
                    onChange={e => saveConfigValues({ scheduleInterval: e.target.value as any })}
                    className="bg-[#050b16] border border-cyber-cyan/20 px-2 py-1 text-xs text-gray-200 rounded outline-none focus:border-cyber-cyan/50 font-mono cursor-pointer"
                  >
                    <option value="off">Off (Manual)</option>
                    <option value="1h">Every 1 Hour</option>
                    <option value="2h">Every 2 Hours</option>
                    <option value="6h">Every 6 Hours</option>
                    <option value="startup">On startup</option>
                  </select>
                </div>
              </div>
            )}

            {/* Whitelist Settings content */}
            {activeSettingTab === "whitelist" && (
              <div className="flex flex-col gap-3 py-1">
                <span className="text-[10px] text-gray-500 font-sans leading-relaxed">
                  Whitelisted processes are hard protected. The One-Click Boost and Auto-Sweeper routines will never terminate them.
                </span>

                {/* List of current Whitelisted items */}
                <div className="bg-[#030712]/50 border border-cyber-cyan/5 rounded-lg p-2 max-h-[160px] overflow-y-auto flex flex-wrap gap-1.5">
                  {config.whitelist.map(w => (
                    <span
                      key={w}
                      className="font-mono text-[9px] bg-cyber-cyan/5 border border-cyber-cyan/20 text-cyber-cyan px-2 py-0.5 rounded-md flex items-center gap-1 font-semibold"
                    >
                      {w}
                      <button
                        onClick={() => removeFromWhitelist(w)}
                        className="text-gray-500 hover:text-red-400 cursor-pointer"
                        title="Remove Exclusion"
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </span>
                  ))}
                </div>

                {/* Add process input */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="process_name.exe..."
                    value={customWhitelistItem}
                    onChange={e => setCustomWhitelistItem(e.target.value)}
                    className="bg-[#050b16] border border-cyber-cyan/20 px-3 py-1.5 text-xs text-gray-200 rounded-lg outline-none focus:border-cyber-cyan/50 flex-1 font-mono"
                  />
                  <button
                    onClick={addToWhitelist}
                    className="px-3 bg-cyber-cyan/15 hover:bg-cyber-cyan/25 border border-cyber-cyan text-cyber-cyan rounded-lg text-xs font-bold font-mono transition-all cursor-pointer flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> ADD
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2 mt-4 pt-3 border-t border-cyber-cyan/10">
            <span className="font-mono text-[9px] text-gray-500 uppercase tracking-widest">
              SYSTEM DIAGNOSTIC INTEGRITY:
            </span>
            <div className="flex items-center gap-1.5 text-[10px] text-cyber-green font-mono">
              <Check className="w-3.5 h-3.5" />
              <span>KERNEL MODULE INTERFACED SUCCESSFULLY</span>
            </div>
          </div>
        </div>
      </div>

      {/* Terminal Log recovery console */}
      <div className="glass-panel border-cyber-cyan/15 rounded-xl p-5 flex flex-col gap-3.5 bg-[#03060f]/95 relative overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%)] bg-[length:100%_4px] pointer-events-none opacity-20"></div>

        <div className="flex justify-between items-center border-b border-cyber-cyan/10 pb-2.5 z-10">
          <span className="font-mono text-xs text-cyber-cyan uppercase font-bold tracking-widest flex items-center gap-2">
            <Terminal className="w-4 h-4" /> Optimizations Reclaimed Memory Log Console
          </span>
          <span className="font-mono text-[9px] text-gray-500 uppercase">
            LOG ENTRIES: {logs.length}
          </span>
        </div>

        <div className="bg-[#020409] border border-cyber-cyan/10 rounded-lg p-4 font-mono text-[11px] text-gray-400 max-h-[170px] overflow-y-auto leading-relaxed flex flex-col gap-2.5">
          {logs.length === 0 ? (
            <div className="text-gray-600 text-center py-6">
              Console idle. No memory sweeps logged.
            </div>
          ) : (
            logs.map(log => (
              <div key={log.id} className="border-l-2 border-cyber-purple/50 pl-3">
                <div className="flex justify-between text-[10px] text-gray-500 pb-0.5">
                  <span className="font-semibold text-cyber-cyan">
                    [{new Date(log.timestamp).toLocaleTimeString()}] SWEEP_EVENT: {log.type.toUpperCase()}
                  </span>
                  <span>ID: {log.id}</span>
                </div>
                <p className="text-gray-300">{log.details}</p>
                {log.appsAffected.length > 0 && (
                  <div className="text-[10px] text-gray-500 mt-0.5">
                    AFFECTED_TARGETS: {log.appsAffected.join(", ")}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
