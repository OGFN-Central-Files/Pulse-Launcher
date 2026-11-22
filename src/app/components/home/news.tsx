import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

import { useTheme } from "../../../hooks/useTheme";
import { api, LauncherNewsItem } from "../../../lib/api";
import { hexToRgba, themeAlpha } from "../../../util/color";

// Shipped-in fallback shown if the backend news endpoint is unreachable. Kept in
// sync with the server's news.json so the home page looks the same either way.
const DEFAULT_NEWS: LauncherNewsItem[] = [
  {
    type: "gameserver",
    title: "Season X Gameserver",
    message: [
      "- Fixed getting stuck on the loading screen when joining a match.",
      "- Matches wait for enough players before the bus flies — no more 1–2 player lobbies.",
      "- Taking an enemy's wall works now — it's decided by ping, so the faster player wins the wall.",
      "- Arena hype pop-ups show correctly for elims and placement (no more \"reach top 0\").",
      "- Cleaner, faster return to the lobby after every match.",
    ].join("\n"),
    image: "/news-gameserver.webp",
  },
  {
    type: "backend",
    title: "Backend & Servers",
    message: [
      "- NA-East server is live — North American players get their own region and queue, no more high-ping EU.",
      "- A second EU server was added — faster queues at peak, running at 15 players.",
      "- EU and NA queues are fully separated — you always land on your region's server.",
      "- Shop refreshed with series bundles and every Season 1–10 cosmetic, dances included.",
      "- The lobby background now shows the real Season X theme.",
    ].join("\n"),
    image: "/news-backend.webp",
  },
  {
    type: "arena",
    title: "Arena Hype",
    message: [
      "- Full Arena Hype system — leagues, divisions, and bus fare.",
      "- Earn points for both eliminations and placement.",
      "- Climb the new in-launcher Arena leaderboard and see where you rank.",
    ].join("\n"),
    image: "/news-arena.jpg",
  },
];

function badgeStyle(
  type: string,
  accent: string,
): { label: string; bg: string; fg: string } {
  switch (type) {
    case "gameserver":
      return { label: "GAMESERVER", bg: "rgba(52,211,153,0.16)", fg: "#34d399" };
    case "backend":
      return { label: "BACKEND", bg: "rgba(56,189,248,0.16)", fg: "#38bdf8" };
    case "arena":
      return { label: "ARENA", bg: hexToRgba(accent, 0.18), fg: accent };
    case "fixed":
      return { label: "FIXED", bg: "rgba(52,211,153,0.16)", fg: "#34d399" };
    case "info":
      return { label: "INFO", bg: "rgba(148,163,184,0.16)", fg: "#cbd5e1" };
    case "new":
    default:
      return { label: "NEW", bg: hexToRgba(accent, 0.18), fg: accent };
  }
}

// Renders the body: lines beginning with "- " become bullet rows, everything
// else is a paragraph. Lets the news carry proper multi-line changelogs.
function NewsBody({ message, secondary }: { message: string; secondary: string }) {
  const lines = message.split("\n").map((l) => l.trim()).filter(Boolean);
  const bullets = lines.filter((l) => l.startsWith("- "));
  const paras = lines.filter((l) => !l.startsWith("- "));

  return (
    <div className="space-y-2">
      {paras.map((p, i) => (
        <p key={`p-${i}`} className={`text-sm leading-relaxed ${secondary}`}>
          {p}
        </p>
      ))}
      {bullets.length > 0 && (
        <ul className="space-y-1.5">
          {bullets.map((b, i) => (
            <li key={`b-${i}`} className={`text-sm leading-snug flex gap-2 ${secondary}`}>
              <span className="mt-[7px] h-1 w-1 rounded-full bg-current shrink-0 opacity-70" />
              <span>{b.replace(/^-\s+/, "")}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function News() {
  const colors = useTheme();
  const accent = colors.current.accent;

  const [news, setNews] = useState<LauncherNewsItem[]>([]);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await api.getNews();
      if (cancelled) return;
      if (res.success && res.data?.news?.length) {
        setNews(res.data.news);
      } else {
        setNews(DEFAULT_NEWS);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const items = news.length ? news : DEFAULT_NEWS;

  useEffect(() => {
    if (items.length <= 1) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % items.length), 7000);
    return () => clearInterval(id);
  }, [items.length]);

  const current = items[Math.min(index, items.length - 1)];
  const badge = useMemo(() => badgeStyle(current.type, accent), [current.type, accent]);

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className={`text-sm font-bold uppercase tracking-widest ${colors.current.text.secondary}`}>
          What's New
        </h2>
        {items.length > 1 && (
          <div className="flex gap-1.5">
            {items.map((_, i) => (
              <button
                key={i}
                onClick={() => setIndex(i)}
                className="h-1.5 rounded-full transition-all duration-300 cursor-pointer"
                style={{
                  width: i === index ? 22 : 6,
                  backgroundColor: i === index ? accent : "rgba(255,255,255,0.25)",
                }}
                aria-label={`News ${i + 1}`}
              />
            ))}
          </div>
        )}
      </div>

      <div
        className={`relative rounded-2xl border ${colors.current.border} backdrop-blur-2xl overflow-hidden`}
        style={{
          backgroundColor: themeAlpha(colors.current.background.secondary, 0.4),
          boxShadow: `0 18px 50px -22px rgba(0,0,0,0.7), 0 0 0 1px ${hexToRgba(accent, 0.08)}`,
        }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.4 }}
            className="flex flex-col md:flex-row min-h-[300px]"
          >
            {/* Image side */}
            <div className="relative md:w-[42%] h-40 md:h-auto shrink-0 bg-black/40">
              {current.image ? (
                <img
                  src={current.image}
                  className="absolute inset-0 w-full h-full object-cover"
                  onError={(e) => {
                    (e.currentTarget.style.display = "none");
                  }}
                />
              ) : null}
              {/* fade the image into the content panel */}
              <div
                className="absolute inset-0"
                style={{
                  background: `linear-gradient(90deg, transparent 55%, ${themeAlpha(colors.current.background.secondary, 0.4)} 100%)`,
                }}
              />
              <div
                className="absolute inset-0 md:hidden"
                style={{
                  background: `linear-gradient(180deg, transparent 40%, ${themeAlpha(colors.current.background.secondary, 0.4)} 100%)`,
                }}
              />
            </div>

            {/* Content side */}
            <div className="relative flex-1 min-w-0 p-6 flex flex-col justify-center">
              <div
                className="pointer-events-none absolute -top-16 -right-10 w-56 h-56 rounded-full blur-3xl opacity-20"
                style={{ background: accent }}
              />
              <span
                className="relative inline-flex items-center w-max text-[10px] font-bold tracking-widest uppercase px-2.5 py-1 rounded-full mb-3"
                style={{ backgroundColor: badge.bg, color: badge.fg }}
              >
                {badge.label}
              </span>

              <h3 className={`relative text-2xl font-black tracking-tight mb-3 ${colors.current.text.primary}`}>
                {current.title}
              </h3>

              <div className="relative">
                <NewsBody message={current.message} secondary={colors.current.text.secondary} />
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
