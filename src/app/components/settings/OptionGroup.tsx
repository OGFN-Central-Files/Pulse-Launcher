"use client";

import { useTheme } from "../../../hooks/useTheme";
import { themeAlpha } from "../../../util/color";

interface OptionGroupProps {
  title: string;
  description?: string;
  children: React.ReactNode;
}

export function OptionGroup({
  title,
  description,
  children,
}: OptionGroupProps) {
  const colors = useTheme();

  return (
    <div
      className={`relative rounded-2xl p-6 border ${colors.current.border} backdrop-blur-xl`}
      style={{
        backgroundColor: themeAlpha(colors.current.background.secondary, 0.6),
      }}
    >
      <div className="mb-5">
        <h3
          className={`text-xs font-semibold uppercase tracking-wider ${colors.current.text.primary}`}
        >
          {title}
        </h3>
        {description && (
          <p className={`mt-1.5 text-xs ${colors.current.text.secondary}`}>
            {description}
          </p>
        )}
        <div
          className="mt-4 h-px w-full"
          style={{
            background: `linear-gradient(90deg, ${colors.current.accent}33, transparent)`,
          }}
        />
      </div>

      <div className="flex flex-col gap-5">{children}</div>
    </div>
  );
}
