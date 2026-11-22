"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "../../../hooks/useTheme";
import { themeAlpha } from "../../../util/color";

interface DropdownOptionProps {
  label: string;
  description?: string;
  options: { value: string; label: string }[];
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
}

export function DropdownOption({
  label,
  description,
  options,
  value,
  defaultValue,
  onChange,
}: DropdownOptionProps) {
  const colors = useTheme();
  const [internalValue, setInternalValue] = useState(
    defaultValue ?? options[0]?.value,
  );
  const [open, setOpen] = useState(false);
  const [triggerHovered, setTriggerHovered] = useState(false);
  const [hoveredOption, setHoveredOption] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  const selected = value ?? internalValue;

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedLabel = options.find((o) => o.value === selected)?.label ?? "";

  function handleSelect(next: string) {
    setInternalValue(next);
    onChange?.(next);
    setOpen(false);
  }

  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex-1 min-w-0">
        <p className={`text-sm ${colors.current.text.primary}`}>{label}</p>
        {description && (
          <p className={`mt-0.5 text-xs ${colors.current.text.secondary}`}>
            {description}
          </p>
        )}
      </div>

      <div ref={ref} className="relative">
        <button
          onClick={() => setOpen(!open)}
          onMouseEnter={() => setTriggerHovered(true)}
          onMouseLeave={() => setTriggerHovered(false)}
          className={`flex items-center gap-2 rounded-2xl px-3.5 py-2 text-sm border cursor-pointer transition-colors duration-150
            ${colors.current.border}
            ${colors.current.background.secondary}
            ${colors.current.text.primary}
          `}
          style={{
            boxShadow:
              open || triggerHovered
                ? `0 0 0 1px ${colors.current.accent}55, 0 4px 16px -6px ${colors.current.accent}66`
                : undefined,
          }}
        >
          <span className="capitalize">{selectedLabel}</span>
          <ChevronDown
            size={14}
            className={`transition-transform duration-200 ${
              open ? "rotate-180" : ""
            }`}
          />
        </button>

        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, y: -6, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.97 }}
              transition={{ duration: 0.15 }}
              className={`absolute right-0 top-full z-50 mt-2 min-w-[160px] rounded-2xl p-1.5 border origin-top-right shadow-xl
                ${colors.current.border}
                backdrop-blur-xl
              `}
              style={{
                backgroundColor: themeAlpha(colors.current.background.secondary, 0.95),
              }}
            >
              {options.map((option) => {
                const isActive = selected === option.value;
                const isHovered = hoveredOption === option.value;

                return (
                  <button
                    key={option.value}
                    onClick={() => handleSelect(option.value)}
                    onMouseEnter={() => setHoveredOption(option.value)}
                    onMouseLeave={() => setHoveredOption(null)}
                    className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm capitalize transition-colors duration-150 cursor-pointer
                      ${
                        isActive
                          ? colors.current.text.primary
                          : colors.current.text.secondary
                      }
                    `}
                    style={{
                      backgroundColor: isHovered
                        ? `${colors.current.accent}1a`
                        : undefined,
                    }}
                  >
                    {option.label}
                    {isActive && (
                      <Check
                        className="ml-2 h-3.5 w-3.5"
                        style={{ color: colors.current.accent }}
                      />
                    )}
                  </button>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
