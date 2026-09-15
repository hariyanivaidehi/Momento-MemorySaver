"use client";

import React, { useEffect, useRef, useState } from "react";
import { Maximize2, Minimize2, ZoomIn, Info } from "lucide-react";

export interface CanvasMemory {
  _id?: string;
  id?: string; // fallback for local storage
  title: string;
  content: string;
  emotion: "nostalgic" | "existential" | "joyful" | "melancholic" | "serene";
  tags: string[];
  x: number;
  y: number;
  wing?: string;
  room?: string;
  pointer?: string;
  mainTopic?: string;
  subtopic?: string;
  attachments?: Array<{
    type: "image" | "video" | "audio" | "file";
    name: string;
    url: string;
    size?: string;
  }>;
  voiceNote?: string;
}

interface ConstellationCanvasProps {
  memories: CanvasMemory[];
  onSelectMemory: (memory: CanvasMemory) => void;
  isDefragging?: boolean;
}

interface Particle {
  memory: CanvasMemory;
  x: number;
  y: number;
  baseX: number;
  baseY: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  shadowColor: string;
  pulseTimer: number;
  pulseSpeed: number;
}

const EMOTION_STYLES = {
  nostalgic: { color: "#818cf8", shadow: "rgba(129, 140, 248, 0.8)" },
  existential: { color: "#d946ef", shadow: "rgba(217, 70, 239, 0.8)" },
  joyful: { color: "#14b8a6", shadow: "rgba(20, 184, 166, 0.8)" },
  melancholic: { color: "#3b82f6", shadow: "rgba(59, 130, 246, 0.8)" },
  serene: { color: "#06b6d4", shadow: "rgba(6, 182, 212, 0.8)" }
};

export default function ConstellationCanvas({ memories, onSelectMemory, isDefragging = false }: ConstellationCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const mouseRef = useRef({ x: -1000, y: -1000, radius: 160 });
  const hoveredParticleRef = useRef<Particle | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const isDefraggingRef = useRef(isDefragging);
  useEffect(() => {
    isDefraggingRef.current = isDefragging;
  }, [isDefragging]);

  const wasDefragging = useRef(false);
  useEffect(() => {
    if (wasDefragging.current && !isDefragging) {
      // Defrag finished: Blast particles out with high kinetic energy
      particlesRef.current.forEach((p) => {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 8 + 6;
        p.vx = Math.cos(angle) * speed;
        p.vy = Math.sin(angle) * speed;
      });
      playSynthPing(220, 3.5, 0.45, 0.08); // explosion sound
    }
    wasDefragging.current = isDefragging;
  }, [isDefragging]);

  // Play synthesized audio feedback
  const playSynthPing = (freq: number, sweep: number, duration: number, vol = 0.05) => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioContextClass();
      
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      // Sweeps frequency up or down
      osc.frequency.exponentialRampToValueAtTime(freq * sweep, ctx.currentTime + duration);
      
      gainNode.gain.setValueAtTime(vol, ctx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + duration);
      
      osc.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch (e) {
      // AudioContext failed to load or autoplay block
    }
  };

  // Set up particles on memory change
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const width = canvas.width;
    const height = canvas.height;

    particlesRef.current = memories.map((mem) => {
      // Get style based on emotion
      const style = EMOTION_STYLES[mem.emotion] || EMOTION_STYLES.serene;
      
      // Map coordinate system.
      // If coordinates are between 0 and 1000, scale them to canvas size.
      // Otherwise, pick a random position inside.
      let baseX = (mem.x / 1000) * width;
      let baseY = (mem.y / 1000) * height;

      if (isNaN(baseX) || baseX <= 0 || baseX >= width) {
        baseX = Math.random() * (width - 150) + 75;
      }
      if (isNaN(baseY) || baseY <= 0 || baseY >= height) {
        baseY = Math.random() * (height - 150) + 75;
      }

      return {
        memory: mem,
        x: baseX,
        y: baseY,
        baseX,
        baseY,
        vx: (Math.random() - 0.5) * 0.15,
        vy: (Math.random() - 0.5) * 0.15,
        radius: Math.random() * 2.5 + 2,
        color: style.color,
        shadowColor: style.shadow,
        pulseTimer: Math.random() * Math.PI,
        pulseSpeed: 0.02 + Math.random() * 0.03
      };
    });
  }, [memories]);

  // Main Canvas Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Resize canvas
    const handleResize = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
      
      // Re-map particle base positions to updated dimension metrics
      particlesRef.current.forEach(p => {
        p.baseX = (p.memory.x / 1000) * rect.width;
        p.baseY = (p.memory.y / 1000) * rect.height;
        // Anchor actual positions to base positions if initial setup
        if (p.x === 0 || p.x > rect.width) p.x = p.baseX;
        if (p.y === 0 || p.y > rect.height) p.y = p.baseY;
      });
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    let laserY = 0; // Persistent laser sweep line

    const draw = () => {
      const rect = canvas.getBoundingClientRect();
      const width = rect.width;
      const height = rect.height;

      // Increment laser sweep
      laserY += 2;
      if (laserY > height) {
        laserY = 0;
      }

      // Clear canvas with deep transparent blue gradient backdrop
      ctx.clearRect(0, 0, width, height);

      // Mouse tracking checks
      const mouse = mouseRef.current;
      let activeHoverParticle: Particle | null = null;
      let minHoverDist = Infinity;

      // Draw Laser Sweep Line (FUI robotic scanner)
      ctx.strokeStyle = "rgba(6, 182, 212, 0.2)";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(0, laserY);
      ctx.lineTo(width, laserY);
      ctx.stroke();

      // Laser glow accent gradient
      const laserGrad = ctx.createLinearGradient(0, laserY - 12, 0, laserY + 12);
      laserGrad.addColorStop(0, "rgba(6, 182, 212, 0)");
      laserGrad.addColorStop(0.5, "rgba(6, 182, 212, 0.05)");
      laserGrad.addColorStop(1, "rgba(6, 182, 212, 0)");
      ctx.fillStyle = laserGrad;
      ctx.fillRect(0, laserY - 12, width, 24);

      // 1. Physics update & drawing particles
      particlesRef.current.forEach((p) => {
        // Slow float drift using trigonometric sine paths
        p.pulseTimer += p.pulseSpeed;
        const driftX = Math.sin(p.pulseTimer) * 0.2;
        const driftY = Math.cos(p.pulseTimer) * 0.2;
        
        p.x += p.vx + driftX;
        p.y += p.vy + driftY;

        // Constraint checking boundaries
        if (p.x < 10 || p.x > width - 10) p.vx *= -1;
        if (p.y < 10 || p.y > height - 10) p.vy *= -1;

        // Apply physics based on defragging state
        if (isDefraggingRef.current) {
          const centerX = width / 2;
          const centerY = height / 2;
          const dx = centerX - p.x;
          const dy = centerY - p.y;
          const distToCenter = Math.sqrt(dx * dx + dy * dy);

          if (distToCenter > 15) {
            // Spiral inward towards the center
            const angle = Math.atan2(dy, dx) + 0.12;
            const nextDist = distToCenter * 0.94;
            p.x = centerX - Math.cos(angle) * nextDist;
            p.y = centerY - Math.sin(angle) * nextDist;
          } else {
            // Align in a dense local central cluster
            const idx = particlesRef.current.indexOf(p);
            const cols = Math.ceil(Math.sqrt(particlesRef.current.length));
            const col = idx % cols;
            const row = Math.floor(idx / cols);
            const spacing = 18;
            
            const gridX = centerX + (col - (cols - 1) / 2) * spacing;
            const gridY = centerY + (row - (Math.ceil(particlesRef.current.length / cols) - 1) / 2) * spacing;
            
            p.x += (gridX - p.x) * 0.15;
            p.y += (gridY - p.y) * 0.15;
          }
        } else {
          // Gravitational interaction with mouse
          const dx = mouse.x - p.x;
          const dy = mouse.y - p.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < mouse.radius) {
            const force = (mouse.radius - distance) / mouse.radius;
            // Attract nodes slightly towards cursor
            p.x += (dx / distance) * force * 1.5;
            p.y += (dy / distance) * force * 1.5;
          } else {
            // Slow spring-back to original base coordinates
            const bx = p.baseX - p.x;
            const by = p.baseY - p.y;
            p.x += bx * 0.03;
            p.y += by * 0.03;
          }
        }

        // Check if mouse is hovering over this particle (within 16px hover zone)
        const dx = mouse.x - p.x;
        const dy = mouse.y - p.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance < 16 && distance < minHoverDist) {
          minHoverDist = distance;
          activeHoverParticle = p;
        }

        // Render particle
        const sizeMultiplier = activeHoverParticle === p ? 2 : 1;
        const currentRadius = p.radius * (1 + Math.sin(p.pulseTimer) * 0.15) * sizeMultiplier;
        
        ctx.beginPath();
        ctx.arc(p.x, p.y, currentRadius, 0, Math.PI * 2);
        
        // Glow shadows
        const isLaserNear = Math.abs(p.y - laserY) < 10;
        ctx.shadowBlur = activeHoverParticle === p ? 20 : (isLaserNear ? 18 : 8);
        ctx.shadowColor = p.shadowColor;
        ctx.fillStyle = isLaserNear ? "#ffffff" : p.color;
        ctx.fill();

        // Node center core highlight
        if (activeHoverParticle === p || isLaserNear) {
          ctx.beginPath();
          ctx.arc(p.x, p.y, currentRadius * 0.4, 0, Math.PI * 2);
          ctx.fillStyle = "#ffffff";
          ctx.fill();
        }

        // Target HUD ring when laser passes
        if (isLaserNear && !isDefraggingRef.current) {
          ctx.beginPath();
          ctx.arc(p.x, p.y, currentRadius * 2.5, 0, Math.PI * 2);
          ctx.strokeStyle = p.color;
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }

        ctx.shadowBlur = 0; // Reset shadow
      });

      // 2. Draw connecting web lines
      for (let i = 0; i < particlesRef.current.length; i++) {
        const p1 = particlesRef.current[i];
        for (let j = i + 1; j < particlesRef.current.length; j++) {
          const p2 = particlesRef.current[j];
          const dx = p1.x - p2.x;
          const dy = p1.y - p2.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          // Connect stars within 160px range (spatial proximity)
          if (distance < 160) {
            ctx.lineWidth = 0.55;
            const alpha = (160 - distance) / 160 * 0.25;
            ctx.strokeStyle = `rgba(6, 182, 212, ${alpha})`;
            
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
          }

          // Connect stars that share tags (semantic connection)
          const sharedTags = p1.memory.tags.filter(t => p2.memory.tags.includes(t));
          if (sharedTags.length > 0) {
            ctx.lineWidth = 0.75;
            // Glowing purple lines for semantic mapping
            ctx.strokeStyle = "rgba(219, 70, 239, 0.22)";
            ctx.setLineDash([3, 3]);
            
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
            ctx.setLineDash([]); // Reset dash pattern
          }

          // Connect stars that belong to the same Main Topic (hierarchical cluster)
          if (p1.memory.mainTopic && p2.memory.mainTopic && p1.memory.mainTopic === p2.memory.mainTopic && p1.memory.mainTopic !== "General") {
            ctx.lineWidth = 1.2;
            ctx.strokeStyle = "rgba(16, 185, 129, 0.35)"; // Emerald neural pathway
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
          }
        }
      }

      // 3. Render Hover Details overlay
      if (activeHoverParticle) {
        const p = activeHoverParticle as Particle;
        
        // If this is a new hover event, play a high-pitched sci-fi chime ping
        if (hoveredParticleRef.current !== p) {
          hoveredParticleRef.current = p;
          playSynthPing(800, 1.2, 0.08, 0.03); // tiny soft chirp
        }

        // Draw selection targeting cursor halo
        ctx.strokeStyle = "rgba(6, 182, 212, 0.4)";
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius * 4.5, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]); // Reset dash

        // Draw popout telemetry board containing title, emotion, pointer, and tags
        ctx.fillStyle = "rgba(10, 15, 30, 0.9)";
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 1;
        
        const pointerStr = p.memory.pointer || `§ W-${p.memory.wing || "GENERAL"}/D-${(p.memory._id || p.memory.id || "").slice(-3)} §`;
        const boxWidth = Math.max(160, Math.max(ctx.measureText(p.memory.title.toUpperCase()).width, ctx.measureText(pointerStr).width) + 20);
        const boxHeight = 52;
        const boxX = p.x + 15;
        const boxY = p.y - 20;

        // Drawing tech glass container
        ctx.beginPath();
        ctx.roundRect(boxX, boxY, boxWidth, boxHeight, 6);
        ctx.fill();
        ctx.stroke();

        // Print memory title
        ctx.font = "bold 9px 'Orbitron', monospace";
        ctx.fillStyle = "#ffffff";
        ctx.fillText(p.memory.title.toUpperCase(), boxX + 8, boxY + 14);

        // Print emotion metadata tags
        ctx.font = "8px 'Space Grotesk', sans-serif";
        ctx.fillStyle = p.color;
        ctx.fillText(p.memory.emotion.toUpperCase(), boxX + 8, boxY + 25);

        // Print symbolic AAAK pointer
        ctx.font = "8px 'Orbitron', monospace";
        ctx.fillStyle = "rgba(255, 255, 255, 0.55)";
        ctx.fillText(pointerStr, boxX + 8, boxY + 36);

        // Print tags
        ctx.font = "8px 'Space Grotesk', sans-serif";
        ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
        ctx.fillText(p.memory.tags.slice(0, 2).map(t => `#${t}`).join(" "), boxX + 8, boxY + 45);
      } else {
        hoveredParticleRef.current = null;
      }

      // Draw cursor attraction ring visualizer if inside container
      if (mouse.x > 0 && mouse.x < width && mouse.y > 0 && mouse.y < height) {
        ctx.strokeStyle = "rgba(6, 182, 212, 0.08)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(mouse.x, mouse.y, 25, 0, Math.PI * 2);
        ctx.stroke();
      }

      animationFrameRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener("resize", handleResize);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [memories]);

  // Track Mouse Movements
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    mouseRef.current.x = e.clientX - rect.left;
    mouseRef.current.y = e.clientY - rect.top;
  };

  const handleMouseLeave = () => {
    mouseRef.current.x = -1000;
    mouseRef.current.y = -1000;
  };

  // Click handler
  const handleCanvasClick = () => {
    if (hoveredParticleRef.current) {
      // Play a beautiful, futuristic chime cascade
      playSynthPing(528, 1.5, 0.22, 0.07);
      setTimeout(() => {
        playSynthPing(792, 1.2, 0.15, 0.04);
      }, 50);
      
      onSelectMemory(hoveredParticleRef.current.memory);
    }
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    
    if (!isFullscreen) {
      if (containerRef.current.requestFullscreen) {
        containerRef.current.requestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
    setIsFullscreen(!isFullscreen);
  };

  // Handle ESC key leaving full screen
  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFsChange);
    return () => document.removeEventListener("fullscreenchange", handleFsChange);
  }, []);

  return (
    <div 
      ref={containerRef}
      className={`glass-panel border-cyber-cyan/20 rounded-2xl relative overflow-hidden flex flex-col bg-cyber-bg/40 ${
        isFullscreen ? "w-screen h-screen rounded-none z-50 fixed inset-0" : "w-full h-[520px] md:h-[600px]"
      }`}
    >
      {/* HUD Telemetry HUD Header */}
      <div className="flex items-center justify-between border-b border-cyber-cyan/10 px-4 py-2.5 bg-cyber-card z-10 select-none">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 bg-cyber-cyan rounded-full animate-ping"></span>
          <span className="font-mono text-xs font-bold tracking-widest text-cyber-cyan uppercase">
            Interactive Constellation Grid
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className="font-mono text-[9px] text-cyber-purple bg-cyber-purple/5 border border-cyber-purple/20 px-2 py-0.5 rounded flex items-center gap-1">
            <ZoomIn className="w-3 h-3" />
            <span>NODES DETECTED: {memories.length}</span>
          </div>
          <button 
            onClick={toggleFullscreen}
            className="text-gray-400 hover:text-cyber-cyan transition-colors"
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen Canvas"}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 relative cursor-crosshair overflow-hidden">
        <canvas
          ref={canvasRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          onClick={handleCanvasClick}
          className="w-full h-full block bg-gradient-to-b from-[#02050f] via-[#040817] to-[#010208]"
        />

        {/* Floating guidance overlay */}
        {memories.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 bg-cyber-bg/70 backdrop-blur-md pointer-events-none">
            <Info className="w-8 h-8 text-cyber-cyan/50 mb-3 animate-pulse" />
            <span className="font-mono text-xs text-cyber-cyan uppercase tracking-wider mb-1">
              Synaptic Grid Offline
            </span>
            <p className="text-xs text-gray-400 max-w-xs font-sans">
              No memories detected in database. Write your first entry in the Memoir Deck to seed the constellation canvas with stars.
            </p>
          </div>
        )}
      </div>

      {/* Footer telemetry */}
      <div className="px-4 py-2 border-t border-cyber-cyan/10 bg-cyber-card flex items-center justify-between text-[9px] font-mono text-gray-500 select-none z-10">
        <span>GRID: SOL-3 SYSTEM</span>
        <span>RESOLUTION: DYNAMIC</span>
        <span>HOVER NODE TO ACCESS MEMORY DATA</span>
      </div>
    </div>
  );
}
