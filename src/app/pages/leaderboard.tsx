import { CSSProperties, useEffect, useRef, useState } from "react";
import { useTheme } from "../../hooks/useTheme";
import { themeAlpha } from "../../util/color";
import { useUserStore } from "../../stores/user";
import { Zap } from "lucide-react";
import { motion } from "framer-motion";
import { api, HypeLeaderboardEntry } from "../../lib/api";

const DIVISION_NAMES: Record<number, string> = {
  1: "Open I",
  2: "Open II",
  3: "Open III",
  4: "Open IV",
  5: "Contender I",
  6: "Contender II",
  7: "Contender III",
  8: "Champion I",
  9: "Champion II",
  10: "Champion III",
};

const divisionName = (n: number) => DIVISION_NAMES[n] ?? `Division ${n}`;

export function Leaderboard() {
  const colors = useTheme();
  const myName = useUserStore((s) => s.displayName);

  const [entries, setEntries] = useState<HypeLeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const res = await api.getHypeLeaderboard(100);
      if (cancelled) return;
      if (res.success && res.data?.leaderboard) {
        setEntries(res.data.leaderboard);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="h-full overflow-hidden px-8 pt-8">
        <div className="h-9 w-56 rounded-lg bg-white/5 animate-pulse mb-3" />
        <div className="h-4 w-72 rounded-lg bg-white/5 animate-pulse mb-6" />
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className={`h-14 rounded-xl border ${colors.current.border} backdrop-blur-xl animate-pulse`}
              style={{ backgroundColor: themeAlpha(colors.current.background.secondary, 0.4) }}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.2, damping: 30, stiffness: 330 }}
      className="relative h-full overflow-hidden"
    >
      <div className="h-full flex flex-col">
        <div className="flex-shrink-0 px-8 pt-8 relative">
          <div
            className="pointer-events-none absolute -top-24 -right-24 w-80 h-80 rounded-full blur-3xl opacity-20"
            style={{ background: colors.current.accent }}
          />
          <div className="relative">
            <h1 className="text-3xl md:text-4xl font-black mb-2 tracking-tight bg-linear-to-r from-white to-zinc-400 bg-clip-text text-transparent">
              Arena Leaderboard
            </h1>
            <p className={`text-sm font-medium mb-6 ${colors.current.text.secondary}`}>
              The top players ranked by Arena Hype.
            </p>
          </div>
        </div>

        <div
          className="flex-1 min-h-0 px-8 pb-8 overflow-y-auto overflow-x-hidden"
          ref={containerRef}
        >
          {entries.length === 0 ? (
            <div
              className={`flex flex-col items-center justify-center gap-3 rounded-2xl border ${colors.current.border} backdrop-blur-xl py-20`}
              style={{ backgroundColor: themeAlpha(colors.current.background.secondary, 0.4) }}
            >
              <Zap size={28} style={{ color: colors.current.accent }} />
              <p className={`text-sm ${colors.current.text.secondary}`}>
                No hype recorded yet — jump into Arena to get on the board.
              </p>
            </div>
          ) : (
            <>
              <div
                className={`flex items-center justify-between rounded-xl border ${colors.current.border} backdrop-blur-xl px-5 py-3 mb-3 sticky top-0 z-10`}
                style={{ backgroundColor: themeAlpha(colors.current.background.secondary, 0.6) }}
              >
                <span className={`text-xs font-bold uppercase tracking-wider ${colors.current.text.secondary}`}>
                  Player
                </span>
                <span className={`text-xs font-bold uppercase tracking-wider ${colors.current.text.secondary}`}>
                  Hype
                </span>
              </div>

              <div className="space-y-2">
                {entries.map((entry, index) => {
                  const rank = index + 1;
                  const isUser =
                    !!myName &&
                    entry.username.toLowerCase() === myName.toLowerCase();
                  const isHovered = index === hoveredRow;

                  const rankBadgeClass =
                    rank === 1
                      ? "bg-yellow-400/20 text-yellow-300"
                      : rank === 2
                        ? "bg-slate-300/20 text-slate-200"
                        : rank === 3
                          ? "bg-orange-400/20 text-orange-300"
                          : `${colors.current.background.secondary} ${colors.current.text.secondary}`;

                  const rowStyle: CSSProperties = isUser
                    ? {
                        borderColor: `${colors.current.accent}80`,
                        backgroundColor: `${colors.current.accent}14`,
                        boxShadow: `0 0 0 1px ${colors.current.accent}40, 0 8px 20px -8px ${colors.current.accent}55`,
                      }
                    : {
                        backgroundColor: isHovered
                          ? themeAlpha(colors.current.background.secondary, 0.8)
                          : themeAlpha(colors.current.background.secondary, 0.4),
                      };

                  return (
                    <motion.div
                      key={`${entry.username}-${index}`}
                      data-index={index}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2, delay: Math.min(index, 20) * 0.02 }}
                      onMouseEnter={() => setHoveredRow(index)}
                      onMouseLeave={() => setHoveredRow(null)}
                      style={rowStyle}
                      className={`flex items-center justify-between rounded-xl border ${colors.current.border} px-5 py-3 cursor-default transition-colors duration-150`}
                    >
                      <div className="flex items-center gap-4 min-w-0">
                        <span
                          className={`flex items-center justify-center w-7 h-7 rounded-lg text-xs font-bold shrink-0 ${rankBadgeClass}`}
                        >
                          {rank}
                        </span>

                        {entry.discordAvatar ? (
                          <img
                            src={entry.discordAvatar}
                            className="w-8 h-8 rounded-full shrink-0 object-cover border border-white/10"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = "none";
                            }}
                          />
                        ) : (
                          <div
                            className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-xs font-bold"
                            style={{
                              backgroundColor: `${colors.current.accent}22`,
                              color: colors.current.accent,
                            }}
                          >
                            {entry.username.charAt(0).toUpperCase()}
                          </div>
                        )}

                        <div className="min-w-0">
                          <p className={`font-semibold truncate ${colors.current.text.primary}`}>
                            {entry.username}
                          </p>
                          <p className={`text-xs truncate ${colors.current.text.secondary}`}>
                            {divisionName(entry.division)}
                          </p>
                        </div>
                      </div>

                      <span
                        className="font-bold flex items-center gap-1.5 shrink-0"
                        style={{ color: colors.current.accent }}
                      >
                        <Zap size={16} strokeWidth={2.5} />
                        {entry.hype.toLocaleString()}
                      </span>
                    </motion.div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
}
