import { useEffect, useRef } from "react";
import { useTheme } from "../../hooks/useTheme";
import { useConfigStore } from "../../stores/settings";

type Star = {
  x: number;
  y: number;
  r: number;
  baseOpacity: number;
  twinkleSpeed: number;
  twinklePhase: number;
  driftX: number;
  driftY: number;
  tint: string;
};

const STAR_COUNT = 90;
const TINTS = ["255,255,255", "205,220,255", "225,232,255"];

function createStars(width: number, height: number): Star[] {
  const stars: Star[] = [];
  for (let i = 0; i < STAR_COUNT; i++) {
    stars.push({
      x: Math.random() * width,
      y: Math.random() * height,
      r: Math.random() * 1.2 + 0.3,
      baseOpacity: Math.random() * 0.4 + 0.18,
      twinkleSpeed: Math.random() * 0.01 + 0.003,
      twinklePhase: Math.random() * Math.PI * 2,
      driftX: (Math.random() - 0.5) * 0.02,
      driftY: (Math.random() - 0.5) * 0.01 + 0.004,
      tint: TINTS[Math.floor(Math.random() * TINTS.length)],
    });
  }
  return stars;
}

export function GalaxyBackground({ className = "" }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { current } = useTheme();
  const reduceMotion = useConfigStore((s) => s.reduceMotion);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = 0;
    let height = 0;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    let stars: Star[] = [];
    let frame = 0;
    let rafId = 0;

    function resize() {
      if (!canvas) return;
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      stars = createStars(width, height);
    }

    function drawStatic() {
      ctx!.clearRect(0, 0, width, height);
      for (const s of stars) {
        ctx!.beginPath();
        ctx!.fillStyle = `rgba(${s.tint}, ${s.baseOpacity})`;
        ctx!.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx!.fill();
      }
    }

    function tick() {
      frame++;
      ctx!.clearRect(0, 0, width, height);

      for (const s of stars) {
        s.x += s.driftX;
        s.y += s.driftY;
        if (s.x < -5) s.x = width + 5;
        if (s.x > width + 5) s.x = -5;
        if (s.y > height + 5) {
          s.y = -5;
          s.x = Math.random() * width;
        }

        const twinkle = Math.sin(frame * s.twinkleSpeed + s.twinklePhase) * 0.3 + 0.7;
        const opacity = Math.max(0, Math.min(1, s.baseOpacity * twinkle));

        ctx!.beginPath();
        ctx!.fillStyle = `rgba(${s.tint}, ${opacity})`;
        ctx!.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx!.fill();
      }

      rafId = requestAnimationFrame(tick);
    }

    resize();
    window.addEventListener("resize", resize);

    // Paint an initial frame synchronously so the canvas is never blank while
    // waiting for the first requestAnimationFrame callback (browsers/webviews
    // can defer rAF, e.g. while a window is unfocused or hidden).
    drawStatic();

    if (!reduceMotion) {
      rafId = requestAnimationFrame(tick);
    }

    return () => {
      window.removeEventListener("resize", resize);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [reduceMotion]);

  return (
    <div className={`fixed inset-0 overflow-hidden ${className}`}>
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 50% 25%, #140e28 0%, #0a0818 50%, #050509 100%)",
        }}
      />

      <div
        className="absolute rounded-full opacity-20"
        style={{
          width: 620,
          height: 620,
          top: "-18%",
          left: "-12%",
          filter: "blur(130px)",
          background: `radial-gradient(circle, ${current.accent} 0%, transparent 70%)`,
          animation: reduceMotion ? "none" : "galaxy-drift-a 60s ease-in-out infinite",
        }}
      />
      <div
        className="absolute rounded-full opacity-[0.12]"
        style={{
          width: 480,
          height: 480,
          bottom: "-14%",
          right: "-10%",
          filter: "blur(120px)",
          background: `radial-gradient(circle, ${current.accent} 0%, transparent 70%)`,
          animation: reduceMotion ? "none" : "galaxy-drift-b 72s ease-in-out infinite",
        }}
      />

      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

      <div
        className="absolute inset-0 opacity-[0.015]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        }}
      />

      <style>{`
        @keyframes galaxy-drift-a {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(4%, 5%) scale(1.05); }
        }
        @keyframes galaxy-drift-b {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(-5%, -4%) scale(1.06); }
        }
      `}</style>
    </div>
  );
}
