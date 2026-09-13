'use client';

import { useEffect, useRef } from 'react';

/** CSS + canvas tech grid / particle field for the digital store hero. No video required. */
export function TechHeroBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let frame = 0;
    let raf = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const nodes: { x: number; y: number; vx: number; vy: number }[] = [];

    const resize = () => {
      const { width, height } = canvas.getBoundingClientRect();
      canvas.width = Math.max(1, Math.floor(width * dpr));
      canvas.height = Math.max(1, Math.floor(height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const count = Math.floor((width * height) / 14000);
      nodes.length = 0;
      for (let i = 0; i < count; i++) {
        nodes.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * 0.35,
          vy: (Math.random() - 0.5) * 0.35,
        });
      }
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const draw = () => {
      const { width, height } = canvas.getBoundingClientRect();
      ctx.clearRect(0, 0, width, height);

      // soft orange glow pulses
      const pulse = 0.35 + Math.sin(frame * 0.02) * 0.08;
      const g = ctx.createRadialGradient(
        width * 0.75,
        height * 0.35,
        0,
        width * 0.75,
        height * 0.35,
        Math.max(width, height) * 0.55,
      );
      g.addColorStop(0, `rgba(255, 106, 0, ${pulse})`);
      g.addColorStop(1, 'rgba(255, 106, 0, 0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, width, height);

      // grid
      ctx.strokeStyle = 'rgba(255, 106, 0, 0.08)';
      ctx.lineWidth = 1;
      const step = 36;
      const offset = (frame * 0.15) % step;
      for (let x = -step + offset; x < width + step; x += step) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = -step + offset * 0.6; y < height + step; y += step) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // nodes + links
      for (const n of nodes) {
        n.x += n.vx;
        n.y += n.vy;
        if (n.x < 0 || n.x > width) n.vx *= -1;
        if (n.y < 0 || n.y > height) n.vy *= -1;
      }

      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i];
          const b = nodes[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const dist = Math.hypot(dx, dy);
          if (dist < 120) {
            ctx.strokeStyle = `rgba(255, 106, 0, ${0.18 * (1 - dist / 120)})`;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }

      for (const n of nodes) {
        ctx.fillStyle = 'rgba(255, 106, 0, 0.85)';
        ctx.beginPath();
        ctx.arc(n.x, n.y, 1.6, 0, Math.PI * 2);
        ctx.fill();
      }

      // scanning bar
      const scanY = ((frame * 1.2) % (height + 40)) - 20;
      const scan = ctx.createLinearGradient(0, scanY - 20, 0, scanY + 20);
      scan.addColorStop(0, 'rgba(255, 106, 0, 0)');
      scan.addColorStop(0.5, 'rgba(255, 106, 0, 0.12)');
      scan.addColorStop(1, 'rgba(255, 106, 0, 0)');
      ctx.fillStyle = scan;
      ctx.fillRect(0, scanY - 20, width, 40);

      frame += 1;
      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <div className="absolute inset-0 bg-neutral-950" />
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
      <div className="absolute inset-0 bg-gradient-to-r from-neutral-950/90 via-neutral-950/55 to-neutral-950/30" />
    </div>
  );
}
