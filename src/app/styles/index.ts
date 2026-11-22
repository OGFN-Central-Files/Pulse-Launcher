import { Theme } from "../../vite-env";

export const themes: Record<string, Theme> = {
  midnight: {
    background: {
      primary: "bg-[#0a0e27]",
      secondary: "bg-[#141b3d]",
    },
    text: {
      primary: "text-slate-50",
      secondary: "text-slate-400",
    },
    button: {
      base: "bg-[#1e2749]",
      hover: "hover:bg-[#2a3558]",
      active: "bg-[#2a3558]",
    },
    border: "border-[#2d3a5f]",
    gradient: {
      from: "#0a0e27",
      to: "#1a1f3a",
    },
    accent: "#5b7cfa",
  },

  obsidian: {
    background: {
      primary: "bg-[#0d0d0d]",
      secondary: "bg-[#1a1a1a]",
    },
    text: {
      primary: "text-zinc-100",
      secondary: "text-zinc-500",
    },
    button: {
      base: "bg-[#262626]",
      hover: "hover:bg-[#333333]",
      active: "bg-[#333333]",
    },
    border: "border-[#404040]",
    gradient: {
      from: "#0d0d0d",
      to: "#171717",
    },
    accent: "#60a5fa",
  },

  ocean: {
    background: {
      primary: "bg-[#041c2c]",
      secondary: "bg-[#0a2f47]",
    },
    text: {
      primary: "text-cyan-50",
      secondary: "text-cyan-400/60",
    },
    button: {
      base: "bg-[#0d3a54]",
      hover: "hover:bg-[#114d6b]",
      active: "bg-[#114d6b]",
    },
    border: "border-[#1a5575]",
    gradient: {
      from: "#041c2c",
      to: "#082938",
    },
    accent: "#22d3ee",
  },

  sakura: {
    background: {
      primary: "bg-[#1a0d1f]",
      secondary: "bg-[#2d1b33]",
    },
    text: {
      primary: "text-pink-50",
      secondary: "text-pink-300/70",
    },
    button: {
      base: "bg-[#3d2547]",
      hover: "hover:bg-[#4d3357]",
      active: "bg-[#4d3357]",
    },
    border: "border-[#5d4367]",
    gradient: {
      from: "#1a0d1f",
      to: "#2a1533",
    },
    accent: "#f472b6",
  },

  nebula: {
    background: {
      primary: "bg-[#150a2e]",
      secondary: "bg-[#22154a]",
    },
    text: {
      primary: "text-purple-50",
      secondary: "text-purple-300/60",
    },
    button: {
      base: "bg-[#2d1f5c]",
      hover: "hover:bg-[#3a2a6e]",
      active: "bg-[#3a2a6e]",
    },
    border: "border-[#4a3880]",
    gradient: {
      from: "#150a2e",
      to: "#1f1240",
    },
    accent: "#a78bfa",
  },

  galaxy: {
    background: {
      primary: "bg-[#0c0a1f]",
      secondary: "bg-[#1a1538]",
    },
    text: {
      primary: "text-indigo-50",
      secondary: "text-indigo-300/60",
    },
    button: {
      base: "bg-[#251f4a]",
      hover: "hover:bg-[#32285c]",
      active: "bg-[#32285c]",
    },
    border: "border-[#3d3370]",
    gradient: {
      from: "#0c0a1f",
      to: "#16122e",
    },
    accent: "#818cf8",
  },

  aurora: {
    background: {
      primary: "bg-[#0a1f1c]",
      secondary: "bg-[#0f2e2a]",
    },
    text: {
      primary: "text-emerald-50",
      secondary: "text-emerald-300/60",
    },
    button: {
      base: "bg-[#143d37]",
      hover: "hover:bg-[#1a4f47]",
      active: "bg-[#1a4f47]",
    },
    border: "border-[#256156]",
    gradient: {
      from: "#0a1f1c",
      to: "#0d2824",
    },
    accent: "#34d399",
  },

  ember: {
    background: {
      primary: "bg-[#1f0f0a]",
      secondary: "bg-[#2d1710]",
    },
    text: {
      primary: "text-orange-50",
      secondary: "text-orange-300/60",
    },
    button: {
      base: "bg-[#3d2115]",
      hover: "hover:bg-[#4d2b1a]",
      active: "bg-[#4d2b1a]",
    },
    border: "border-[#5d3820]",
    gradient: {
      from: "#1f0f0a",
      to: "#28140d",
    },
    accent: "#fb923c",
  },

  forest: {
    background: {
      primary: "bg-[#0a1f0f]",
      secondary: "bg-[#0f2e18]",
    },
    text: {
      primary: "text-green-50",
      secondary: "text-green-300/60",
    },
    button: {
      base: "bg-[#143d22]",
      hover: "hover:bg-[#1a4f2c]",
      active: "bg-[#1a4f2c]",
    },
    border: "border-[#256136]",
    gradient: {
      from: "#0a1f0f",
      to: "#0d2814",
    },
    accent: "#4ade80",
  },

  twilight: {
    background: {
      primary: "bg-[#1a0f2e]",
      secondary: "bg-[#281747]",
    },
    text: {
      primary: "text-violet-50",
      secondary: "text-violet-300/60",
    },
    button: {
      base: "bg-[#35215c]",
      hover: "hover:bg-[#432b70]",
      active: "bg-[#432b70]",
    },
    border: "border-[#523685]",
    gradient: {
      from: "#1a0f2e",
      to: "#221340",
    },
    accent: "#c084fc",
  },

  crimson: {
    background: {
      primary: "bg-[#1f0a0f]",
      secondary: "bg-[#2d0f18]",
    },
    text: {
      primary: "text-red-50",
      secondary: "text-red-300/60",
    },
    button: {
      base: "bg-[#3d1522]",
      hover: "hover:bg-[#4d1b2c]",
      active: "bg-[#4d1b2c]",
    },
    border: "border-[#5d2236]",
    gradient: {
      from: "#1f0a0f",
      to: "#280d14",
    },
    accent: "#f87171",
  },

  amethyst: {
    background: {
      primary: "bg-[#1a0d2e]",
      secondary: "bg-[#2a1547]",
    },
    text: {
      primary: "text-purple-50",
      secondary: "text-purple-300/60",
    },
    button: {
      base: "bg-[#3a1f5c]",
      hover: "hover:bg-[#4a2970]",
      active: "bg-[#4a2970]",
    },
    border: "border-[#5a3685]",
    gradient: {
      from: "#1a0d2e",
      to: "#241240",
    },
    accent: "#d8b4fe",
  },

  noir: {
    background: {
      primary: "bg-[#0f0f12]",
      secondary: "bg-[#18181c]",
    },
    text: {
      primary: "text-slate-50",
      secondary: "text-slate-400/70",
    },
    button: {
      base: "bg-[#222228]",
      hover: "hover:bg-[#2c2c34]",
      active: "bg-[#2c2c34]",
    },
    border: "border-[#35353f]",
    gradient: {
      from: "#0f0f12",
      to: "#151518",
    },
    accent: "#93c5fd",
  },

  pulse: {
    background: {
      primary: "bg-[#080a16]",
      secondary: "bg-[#111531]",
    },
    text: {
      primary: "text-sky-50",
      secondary: "text-sky-300/60",
    },
    button: {
      base: "bg-[#182047]",
      hover: "hover:bg-[#222c5e]",
      active: "bg-[#222c5e]",
    },
    border: "border-[#2a3570]",
    gradient: {
      from: "#080a16",
      to: "#131a3a",
    },
    accent: "#38bdf8",
  },

  gold: {
    background: {
      primary: "bg-[#16120a]",
      secondary: "bg-[#241d0f]",
    },
    text: {
      primary: "text-amber-50",
      secondary: "text-amber-300/60",
    },
    button: {
      base: "bg-[#332811]",
      hover: "hover:bg-[#443419]",
      active: "bg-[#443419]",
    },
    border: "border-[#554223]",
    gradient: {
      from: "#16120a",
      to: "#241d0f",
    },
    accent: "#f5c542",
  },

  ice: {
    background: {
      primary: "bg-[#0a141f]",
      secondary: "bg-[#0f2033]",
    },
    text: {
      primary: "text-sky-50",
      secondary: "text-sky-200/60",
    },
    button: {
      base: "bg-[#152c44]",
      hover: "hover:bg-[#1c3a57]",
      active: "bg-[#1c3a57]",
    },
    border: "border-[#274a6b]",
    gradient: {
      from: "#0a141f",
      to: "#0f2033",
    },
    accent: "#7dd3fc",
  },

  matrix: {
    background: {
      primary: "bg-[#07120b]",
      secondary: "bg-[#0b1f12]",
    },
    text: {
      primary: "text-green-50",
      secondary: "text-green-400/60",
    },
    button: {
      base: "bg-[#0f2c1a]",
      hover: "hover:bg-[#153a22]",
      active: "bg-[#153a22]",
    },
    border: "border-[#1f5030]",
    gradient: {
      from: "#07120b",
      to: "#0b1f12",
    },
    accent: "#22c55e",
  },

  sunset: {
    background: {
      primary: "bg-[#1a0b16]",
      secondary: "bg-[#2a1020]",
    },
    text: {
      primary: "text-rose-50",
      secondary: "text-rose-300/60",
    },
    button: {
      base: "bg-[#3d182e]",
      hover: "hover:bg-[#4f2039]",
      active: "bg-[#4f2039]",
    },
    border: "border-[#63294a]",
    gradient: {
      from: "#1a0b16",
      to: "#2a1020",
    },
    accent: "#fb7185",
  },
};
