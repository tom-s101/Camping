"use client";

import { useEffect, useRef } from "react";

type Particle = {
  x: number;
  y: number;
  r: number;
  baseAlpha: number;
  phase: number;
  speed: number;
  drift: number;
};

export default function SparkleBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let width = 0;
    let height = 0;
    let particles: Particle[] = [];
    let frameId = 0;

    function makeParticles(count: number) {
      return Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        r: Math.random() * 1.1 + 0.3,
        baseAlpha: Math.random() * 0.6 + 0.2,
        phase: Math.random() * Math.PI * 2,
        speed: Math.random() * 0.015 + 0.005,
        drift: (Math.random() - 0.5) * 0.15,
      }));
    }

    function resize() {
      const rect = canvas!.getBoundingClientRect();
      width = canvas!.width = rect.width;
      height = canvas!.height = rect.height;
      particles = makeParticles(Math.floor((width * height) / 3500));
    }

    function renderFrame(t: number) {
      ctx!.clearRect(0, 0, width, height);
      for (const p of particles) {
        const twinkle = prefersReducedMotion ? 1 : (Math.sin(t * p.speed + p.phase) + 1) / 2;
        const alpha = p.baseAlpha * twinkle;
        ctx!.beginPath();
        ctx!.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx!.fillStyle = `rgba(255,255,255,${alpha.toFixed(3)})`;
        ctx!.fill();

        if (!prefersReducedMotion) {
          p.y += p.drift * 0.3;
          if (p.y < 0) p.y = height;
          if (p.y > height) p.y = 0;
        }
      }
    }

    function loop(t: number) {
      renderFrame(t);
      frameId = requestAnimationFrame(loop);
    }

    resize();
    window.addEventListener("resize", resize);

    if (prefersReducedMotion) {
      renderFrame(0);
    } else {
      frameId = requestAnimationFrame(loop);
    }

    return () => {
      window.removeEventListener("resize", resize);
      if (frameId) cancelAnimationFrame(frameId);
    };
  }, []);

  return <canvas ref={canvasRef} aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full" />;
}
