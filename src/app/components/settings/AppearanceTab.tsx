"use client";

import { themes } from "../../styles";
import { OptionGroup } from "./OptionGroup";
import { useConfigStore } from "../../../stores/settings";
import { useTheme } from "../../../hooks/useTheme";
import { hexToRgba } from "../../../util/color";
import { Check } from "lucide-react";
import { motion } from "framer-motion";

const themeKeys = Object.keys(themes);

export function AppearanceTab() {
  const config = useConfigStore();
  const colors = useTheme();

  return (
    <div className="flex flex-col gap-5">
      <OptionGroup
        title="Theme"
        description="Pick a color scheme — it applies instantly."
      >
        {/* Swatch grid: clicking applies the theme immediately. Replaces the old
            dropdown, whose absolute menu was being clipped by the scroll container
            (which is why themes couldn't be selected). */}
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
          {themeKeys.map((key) => {
            const t = themes[key];
            const active = config.theme === key;
            return (
              <button
                key={key}
                onClick={() => config.setTheme(key)}
                className="group relative rounded-xl overflow-hidden border cursor-pointer transition-transform duration-150 hover:-translate-y-0.5"
                style={{
                  borderColor: active ? t.accent : "rgba(255,255,255,0.10)",
                  boxShadow: active
                    ? `0 0 0 1px ${t.accent}, 0 8px 22px -8px ${hexToRgba(t.accent, 0.7)}`
                    : undefined,
                }}
                aria-label={key}
                title={key}
              >
                {/* color preview */}
                <div
                  className="h-12 w-full relative"
                  style={{
                    background: `linear-gradient(135deg, ${t.gradient.from} 0%, ${t.gradient.to} 100%)`,
                  }}
                >
                  <span
                    className="absolute bottom-1.5 left-1.5 h-3.5 w-3.5 rounded-full"
                    style={{
                      background: t.accent,
                      boxShadow: `0 0 10px ${hexToRgba(t.accent, 0.8)}`,
                    }}
                  />
                  {active && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute top-1.5 right-1.5 h-4 w-4 rounded-full flex items-center justify-center"
                      style={{ background: t.accent }}
                    >
                      <Check size={11} strokeWidth={3} className="text-black/80" />
                    </motion.span>
                  )}
                </div>
                {/* name */}
                <div
                  className="px-2 py-1.5 text-[11px] font-semibold capitalize truncate text-left"
                  style={{
                    color: active ? colors.current.text.primary : undefined,
                    backgroundColor: hexToRgba(t.gradient.to, 1),
                  }}
                >
                  <span className={active ? "" : colors.current.text.secondary}>
                    {key}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </OptionGroup>
    </div>
  );
}
