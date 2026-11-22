import {
  ButtonHTMLAttributes,
  CSSProperties,
  ReactNode,
  useState,
} from "react";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { useTheme } from "../../../hooks/useTheme";
import { hexToRgba, themeAlpha } from "../../../util/color";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

interface ButtonProps
  extends Omit<
    ButtonHTMLAttributes<HTMLButtonElement>,
    "onDrag" | "onDragStart" | "onDragEnd" | "onAnimationStart"
  > {
  variant?: Variant;
  size?: Size;
  icon?: ReactNode;
  loading?: boolean;
  fullWidth?: boolean;
}

const sizeClasses: Record<Size, string> = {
  sm: "text-xs px-3 py-1.5",
  md: "text-sm px-5 py-2.5",
  lg: "text-base px-6 py-3.5",
};

const gapClasses: Record<Size, string> = {
  sm: "gap-1.5",
  md: "gap-2",
  lg: "gap-2.5",
};

const iconSize: Record<Size, number> = { sm: 14, md: 16, lg: 20 };

export function Button({
  variant = "primary",
  size = "md",
  icon,
  loading = false,
  fullWidth = false,
  disabled,
  className = "",
  children,
  ...props
}: ButtonProps) {
  const { current } = useTheme();
  const [hovered, setHovered] = useState(false);
  const isDisabled = Boolean(disabled) || loading;
  const active = hovered && !isDisabled;
  const accent = current.accent;

  let variantClasses = "";
  let style: CSSProperties = {};

  switch (variant) {
    case "primary":
      variantClasses = "text-white";
      style = {
        backgroundColor: active ? hexToRgba(accent, 0.92) : accent,
      };
      break;
    case "secondary":
      variantClasses = `${current.text.primary} border ${current.border} backdrop-blur-xl`;
      style = {
        backgroundColor: themeAlpha(current.background.secondary, active ? 0.7 : 0.5),
      };
      break;
    case "ghost":
      variantClasses = `border border-transparent ${active ? current.text.primary : current.text.secondary}`;
      style = {
        backgroundColor: active ? "rgba(255,255,255,0.06)" : "transparent",
      };
      break;
    case "danger":
      variantClasses = "text-white";
      style = {
        backgroundColor: active ? "#ef4444" : "#dc2626",
      };
      break;
  }

  return (
    <motion.button
      whileHover={isDisabled ? undefined : { scale: 1.02 }}
      whileTap={isDisabled ? undefined : { scale: 0.97 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      disabled={isDisabled}
      style={style}
      className={`relative inline-flex items-center justify-center overflow-hidden rounded-xl font-semibold tracking-tight cursor-pointer transition-[background-color,color] duration-200 disabled:opacity-50 disabled:cursor-not-allowed select-none ${sizeClasses[size]} ${fullWidth ? "w-full" : ""} ${variantClasses} ${className}`}
      {...props}
    >
      <span className={`relative z-10 inline-flex items-center ${gapClasses[size]}`}>
        {loading ? (
          <Loader2 size={iconSize[size]} className="animate-spin" />
        ) : (
          icon
        )}
        {children}
      </span>
    </motion.button>
  );
}
