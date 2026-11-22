"use client";

import { motion } from "framer-motion";
import { Sparkles, CalendarClock } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { useShopItems } from "../../hooks/useShopItems";
import { FeaturedRow } from "../components/shop/FeaturedRow";
import { DailyGrid } from "../components/shop/DailyGrid";
import { useProfileStore } from "../../stores/profile";
import { useTheme } from "../../hooks/useTheme";
import { themeAlpha } from "../../util/color";

import { useEffect, useState } from "react";

export function Shop() {
  const auth = useAuth.user();
  const { featured, daily, loading, expiration } = useShopItems();

  const colors = useTheme();

  const [timeLeft, setTimeLeft] = useState("∞");

  useEffect(() => {
    if (!expiration) return;

    const end = new Date(expiration).getTime();

    // Backend uses a year-9999 sentinel ("never expires") for the curated shop.
    // Don't render a bogus multi-millennia countdown — show "always available".
    const ROTATION_CAP_MS = 365 * 86400 * 1000; // > 1 year => treat as no rotation

    const tick = () => {
      const now = Date.now();
      const diff = end - now;

      if (Number.isNaN(diff) || diff > ROTATION_CAP_MS) {
        setTimeLeft("∞");
        return;
      }

      if (diff <= 0) {
        setTimeLeft("00:00:00");
        return;
      }

      const totalSeconds = Math.floor(diff / 1000);
      const days = Math.floor(totalSeconds / 86400);
      const hours = Math.floor((totalSeconds % 86400) / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;

      if (days > 0) {
        setTimeLeft(`${days}d ${hours.toString().padStart(2, "0")}h`);
        return;
      }

      setTimeLeft(
        `${hours.toString().padStart(2, "0")}:${minutes
          .toString()
          .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`,
      );
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [expiration]);

  const vbucks =
    useProfileStore(
      (s) =>
        s.profiles?.common_core?.items?.["Currency:MtxPurchased"]?.quantity,
    ) ?? 0;

  if (!auth.isValidSession()) return null;

  if (loading) {
    return (
      <div className="min-h-full min-w-full p-4 flex items-center justify-center">
        <div
          className="h-8 w-8 rounded-full border-2 animate-spin"
          style={{
            borderColor: `${colors.current.accent}33`,
            borderTopColor: colors.current.accent,
          }}
        />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{
        type: "spring",
        damping: 30,
        stiffness: 330,
        duration: 0.2,
      }}
      className="relative min-h-screen px-8 py-8 overflow-hidden"
    >
      <div
        className="pointer-events-none absolute -top-40 -right-40 w-96 h-96 rounded-full blur-3xl opacity-20"
        style={{ background: colors.current.accent }}
      />

      <div className="relative z-10 flex items-end justify-between flex-wrap gap-4 mb-10">
        <div>
          <h1 className="text-3xl md:text-4xl font-black tracking-tight bg-linear-to-r from-white to-zinc-400 bg-clip-text text-transparent">
            Item Shop
          </h1>
          <p className={`text-sm font-medium mt-1 ${colors.current.text.secondary}`}>
            View the latest cosmetics in the Item Shop!
          </p>
        </div>

        <div
          className={`flex items-center gap-3 rounded-2xl border ${colors.current.border} backdrop-blur-xl px-4 py-2.5`}
          style={{
            backgroundColor: themeAlpha(colors.current.background.secondary, 0.6),
            boxShadow: `0 8px 24px -8px ${colors.current.accent}55`,
          }}
        >
          <div className={`flex items-center gap-2 font-bold ${colors.current.text.primary}`}>
            <img
              src="https://image.fnbr.co/price/icon_vbucks_50x.png"
              className="w-4.5 h-4.5"
              draggable={false}
            />
            {vbucks}
          </div>

          <div className="h-5 w-px bg-white/10" />

          <div className={`flex items-center gap-2 text-sm ${colors.current.text.secondary}`}>
            <motion.div
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
            >
              <motion.svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 6, ease: "linear" }}
                style={{ color: colors.current.accent }}
              >
                <circle
                  cx="12"
                  cy="12"
                  r="9"
                  stroke="currentColor"
                  strokeWidth="2"
                />
                <path
                  d="M12 7V12L15 14"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </motion.svg>
            </motion.div>

            <span>{timeLeft}</span>
          </div>
        </div>
      </div>

      <div className="relative z-10 flex flex-col xl:flex-row gap-8">
        <section>
          <h2 className={`flex items-center gap-2 text-xl font-bold mb-4 ${colors.current.text.primary}`}>
            <Sparkles size={18} style={{ color: colors.current.accent }} strokeWidth={2} />
            Featured
          </h2>
          <FeaturedRow items={featured} />
        </section>

        <section>
          <h2 className={`flex items-center gap-2 text-xl font-bold mb-4 ${colors.current.text.primary}`}>
            <CalendarClock size={18} style={{ color: colors.current.accent }} strokeWidth={2} />
            Daily
          </h2>
          <DailyGrid items={daily} />
        </section>
      </div>
    </motion.div>
  );
}
