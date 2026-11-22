import { PackageOpen } from "lucide-react";
import { motion } from "framer-motion";
import { Config } from "../../../util/config";
import { useTheme } from "../../../hooks/useTheme";
import { themeAlpha } from "../../../util/color";

export function EmptyState() {
  const colors = useTheme();

  return (
    <div className="flex flex-col hide-scroll items-center justify-center h-full text-center px-4">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 20 }}
        className={`relative flex items-center justify-center w-20 h-20 rounded-2xl border ${colors.current.border} backdrop-blur-xl mb-6`}
        style={{
          boxShadow: `0 8px 32px -12px ${colors.current.accent}55`,
          backgroundColor: themeAlpha(colors.current.background.secondary, 0.6),
        }}
      >
        <PackageOpen
          size={32}
          strokeWidth={1.75}
          style={{ color: colors.current.accent }}
        />
      </motion.div>

      <h3 className="text-2xl font-black tracking-tight mb-3 bg-linear-to-r from-white to-zinc-400 bg-clip-text text-transparent">
        No Builds Yet
      </h3>

      <p className={`mb-8 max-w-md text-sm leading-relaxed ${colors.current.text.secondary}`}>
        We couldn't find any builds. Click the{" "}
        <span className={`font-bold ${colors.current.text.primary}`}>
          Import
        </span>{" "}
        button below to add your {Config.NAME} build and get started.
      </p>
    </div>
  );
}

export default EmptyState;
