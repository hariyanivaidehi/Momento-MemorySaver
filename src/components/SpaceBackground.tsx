"use client";

import React, { useEffect, useRef } from "react";

interface Star {
  x: number;
  y: number;
  size: number;
  speed: number;
  alpha: number;
  twinkle: number;
}

export default function SpaceBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let stars: Star[] = [];
    const starCount = 90;

    // Handle Resize
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      initStars();
    };

    // Initialize Stars
    const initStars = () => {
      stars = [];
      for (let i = 0; i < starCount; i++) {
        stars.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          size: Math.random() * 1.5 + 0.5,
          speed: Math.random() * 0.15 + 0.05,
          alpha: Math.random(),
          twinkle: Math.random() * 0.02 + 0.005
        });
      }
    };

    window.addEventListener("resize", resizeCanvas);
    resizeCanvas();

    let rotationAngle = 0;

    // Render loop
    const render = () => {
      ctx.fillStyle = "rgba(2, 5, 15, 0.15)"; // slight fade trail
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw faint cybernetic background HUD grids
      ctx.strokeStyle = "rgba(6, 182, 212, 0.02)";
      ctx.lineWidth = 1;
      
      // Grid lines
      const gridSize = 80;
      for (let x = 0; x < canvas.width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      for (let y = 0; y < canvas.height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }

      // Draw drifting stars
      stars.forEach((star) => {
        star.y += star.speed;
        star.alpha += star.twinkle;

        // Twinkle bounce
        if (star.alpha > 1 || star.alpha < 0.2) {
          star.twinkle = -star.twinkle;
        }

        // Loop screen
        if (star.y > canvas.height) {
          star.y = 0;
          star.x = Math.random() * canvas.width;
        }

        ctx.fillStyle = `rgba(6, 182, 212, ${star.alpha * 0.35})`; // cyan glow tint
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fill();
        
        // Occasional bright cross star
        if (star.size > 1.8) {
          ctx.strokeStyle = `rgba(255, 255, 255, ${star.alpha * 0.2})`;
          ctx.beginPath();
          ctx.moveTo(star.x - star.size * 2, star.y);
          ctx.lineTo(star.x + star.size * 2, star.y);
          ctx.moveTo(star.x, star.y - star.size * 2);
          ctx.lineTo(star.x, star.y + star.size * 2);
          ctx.stroke();
        }
      });

      // Draw faint rotating target rings/calibrations in corners
      rotationAngle += 0.002;
      ctx.lineWidth = 0.8;

      // Bottom Right HUD Scope
      const hudX = canvas.width - 150;
      const hudY = canvas.height - 150;
      ctx.strokeStyle = "rgba(6, 182, 212, 0.05)";
      
      // Target scope rings
      ctx.beginPath();
      ctx.arc(hudX, hudY, 100, 0, Math.PI * 2);
      ctx.arc(hudX, hudY, 50, 0, Math.PI * 2);
      ctx.stroke();

      // Rotating dashed ring
      ctx.strokeStyle = "rgba(217, 70, 239, 0.04)"; // fuchsia tint
      ctx.setLineDash([4, 12]);
      ctx.beginPath();
      ctx.arc(hudX, hudY, 80, rotationAngle, rotationAngle + Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]); // Reset

      // Target lines
      ctx.strokeStyle = "rgba(6, 182, 212, 0.03)";
      ctx.beginPath();
      ctx.moveTo(hudX - 110, hudY); ctx.lineTo(hudX + 110, hudY);
      ctx.moveTo(hudX, hudY - 110); ctx.lineTo(hudX, hudY + 110);
      ctx.stroke();

      // Top Left HUD Scope
      const hudX2 = 120;
      const hudY2 = 250;
      ctx.strokeStyle = "rgba(6, 182, 212, 0.04)";
      ctx.beginPath();
      ctx.arc(hudX2, hudY2, 60, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = "rgba(6, 182, 212, 0.03)";
      ctx.setLineDash([20, 10]);
      ctx.beginPath();
      ctx.arc(hudX2, hudY2, 45, -rotationAngle * 1.5, -rotationAngle * 1.5 + Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-screen h-screen pointer-events-none block z-[-10]"
      style={{ background: "#02040d" }}
    />
  );
}
