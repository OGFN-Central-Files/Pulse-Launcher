import { X, Minus, Maximize2, Minimize2 } from "lucide-react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useEffect, useState } from "react";
import { useTheme } from "../../hooks/useTheme";
import { Config } from "../../util/config";
import { themeAlpha, hexToRgba } from "../../util/color";

const isTauri =
  typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
const appWindow = isTauri ? getCurrentWindow() : null;

type HoverTarget = "min" | "max" | "close" | null;

export function Frame() {
  const [hovered, setHovered] = useState<HoverTarget>(null);
  const [isMaximized, setIsMaximized] = useState(false);
  const colors = useTheme();

  useEffect(() => {
    if (!appWindow) return;

    let unlisten: (() => void) | undefined;

    appWindow
      .isMaximized()
      .then(setIsMaximized)
      .catch(() => {});

    appWindow
      .onResized(() => {
        appWindow!
          .isMaximized()
          .then(setIsMaximized)
          .catch(() => {});
      })
      .then((f) => {
        unlisten = f;
      })
      .catch(() => {});

    return () => unlisten?.();
  }, []);

  const handleMinimize = () => appWindow?.minimize();
  const handleMaximize = () => appWindow?.toggleMaximize();
  const handleClose = () => appWindow?.close();

  const iconTone = (target: HoverTarget) =>
    hovered === target ? colors.current.text.primary : colors.current.text.secondary;

  return (
    <div
      data-tauri-drag-region
      style={{ backgroundColor: themeAlpha(colors.current.background.primary, 0.8) }}
      className={`fixed top-0 left-0 right-0 h-12 backdrop-blur-xl border-b ${colors.current.border} flex items-center justify-between px-3 z-50 select-none`}
    >
      <div className="flex items-center gap-2.5">
        <img src="/icon.png" className="h-7 w-7 rounded-xl shadow-sm" draggable={false} />
        <span
          className={`text-sm font-bold tracking-wide ${colors.current.text.primary}`}
        >
          {Config.NAME}
        </span>
        <span
          className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md leading-none"
          style={{
            backgroundColor: hexToRgba(colors.current.accent, 0.16),
            color: colors.current.accent,
          }}
        >
          v{Config.VERSION}
        </span>
      </div>

      <div className="flex items-center gap-1.5">
        <button
          onClick={handleMinimize}
          onMouseEnter={() => setHovered("min")}
          onMouseLeave={() => setHovered(null)}
          className="w-8 h-8 flex items-center justify-center rounded-full cursor-pointer transition-all duration-150"
          style={{
            backgroundColor: hovered === "min" ? hexToRgba(colors.current.accent, 0.16) : "transparent",
          }}
          aria-label="Minimize"
        >
          <Minus size={15} className={`transition-colors duration-150 ${iconTone("min")}`} strokeWidth={2.25} />
        </button>

        <button
          onClick={handleMaximize}
          onMouseEnter={() => setHovered("max")}
          onMouseLeave={() => setHovered(null)}
          className="w-8 h-8 flex items-center justify-center rounded-full cursor-pointer transition-all duration-150"
          style={{
            backgroundColor: hovered === "max" ? hexToRgba(colors.current.accent, 0.16) : "transparent",
          }}
          aria-label={isMaximized ? "Restore" : "Maximize"}
        >
          {isMaximized ? (
            <Minimize2 size={13} className={`transition-colors duration-150 ${iconTone("max")}`} strokeWidth={2.25} />
          ) : (
            <Maximize2 size={13} className={`transition-colors duration-150 ${iconTone("max")}`} strokeWidth={2.25} />
          )}
        </button>

        <button
          onClick={handleClose}
          onMouseEnter={() => setHovered("close")}
          onMouseLeave={() => setHovered(null)}
          className="w-8 h-8 flex items-center justify-center rounded-full cursor-pointer transition-all duration-150"
          style={{
            backgroundColor: hovered === "close" ? "#ef4444" : "transparent",
            boxShadow: hovered === "close" ? "0 0 16px -2px rgba(239,68,68,0.7)" : undefined,
          }}
          aria-label="Close"
        >
          <X
            size={15}
            className={`transition-colors duration-150 ${
              hovered === "close" ? "text-white" : colors.current.text.secondary
            }`}
            strokeWidth={2.25}
          />
        </button>
      </div>

      <div
        className="absolute bottom-0 left-0 right-0 h-px"
        style={{
          background: `linear-gradient(90deg, transparent, ${colors.current.accent}66, transparent)`,
        }}
      />
    </div>
  );
}
