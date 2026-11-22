import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Users } from "lucide-react";

import { useTheme } from "../../hooks/useTheme";
import { themeAlpha, hexToRgba } from "../../util/color";
import { api, GameServerEntry } from "../../lib/api";

const STALE_MS = 45_000;
const POLL_MS = 5_000;

const OK = "#34d399";
const WARN = "#f59e0b";
const BUSY = "#38bdf8";
const OFF = "#7c8598";
const BAD = "#f87171";

type Resolved = { label: string; color: string; live: boolean; pulse: boolean };

function resolveStatus(s: GameServerEntry): Resolved {
  if (Date.now() - s.lastSeen > STALE_MS) {
    return { label: "Offline", color: OFF, live: false, pulse: false };
  }
  switch ((s.status || "").toLowerCase()) {
    case "starting":
      return { label: "Booting", color: WARN, live: true, pulse: true };
    case "available":
      return { label: "Joinable", color: OK, live: true, pulse: true };
    case "in_game":
      return { label: "In Game", color: BUSY, live: true, pulse: false };
    case "ended":
      return { label: "Restarting", color: WARN, live: true, pulse: true };
    default:
      return { label: s.status || "Unknown", color: OFF, live: true, pulse: false };
  }
}

function regionLabel(r: string): string {
  const s = (r || "").toUpperCase();
  if (s.startsWith("NA")) return "NA";
  if (s.startsWith("EU")) return "EU";
  return s || "??";
}

const REGION_FULL: Record<string, string> = {
  EU: "Europe",
  NA: "North America",
};

function prettyPlaylist(pl: string): string {
  const s = (pl || "").trim();
  if (!s || s.toLowerCase() === "any") return "All modes";
  const m = /playlist_default(\w+)/i.exec(s);
  if (m) return m[1].charAt(0).toUpperCase() + m[1].slice(1).toLowerCase();
  return s;
}

export function ServerStatus() {
  const colors = useTheme();
  const accent = colors.current.accent;
  const border = colors.current.border;
  const textPrimary = colors.current.text.primary;
  const textSecondary = colors.current.text.secondary;

  const [servers, setServers] = useState<GameServerEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const res = await api.getServerList();
      if (cancelled) return;
      if (res.success && res.data?.servers) setServers(res.data.servers);
      setLoading(false);
    };
    load();
    const id = setInterval(load, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  const { live, totalPlayers, regions, system } = useMemo(() => {
    const now = Date.now();
    const liveServers = servers.filter((s) => now - s.lastSeen <= STALE_MS);
    const staleCount = servers.length - liveServers.length;
    const players = liveServers.reduce((n, s) => n + (s.playerCount || 0), 0);

    // Group by region, EU/NA first.
    const groups = new Map<string, GameServerEntry[]>();
    for (const s of servers) {
      const key = regionLabel(s.region);
      (groups.get(key) ?? groups.set(key, []).get(key)!).push(s);
    }
    const rank: Record<string, number> = { EU: 0, NA: 1 };
    const statusRank: Record<string, number> = { available: 0, starting: 1, ended: 2, in_game: 3 };
    const grouped = [...groups.entries()]
      .sort((a, b) => (rank[a[0]] ?? 9) - (rank[b[0]] ?? 9) || a[0].localeCompare(b[0]))
      .map(([region, list]) => ({
        region,
        list: list.sort(
          (a, b) =>
            (statusRank[(a.status || "").toLowerCase()] ?? 9) -
              (statusRank[(b.status || "").toLowerCase()] ?? 9) ||
            a.name.localeCompare(b.name),
        ),
      }));

    let sys: { label: string; color: string };
    if (servers.length === 0 || liveServers.length === 0) {
      sys = { label: "All Servers Offline", color: BAD };
    } else if (staleCount > 0) {
      sys = { label: "Partial Outage", color: WARN };
    } else {
      sys = { label: "All Systems Operational", color: OK };
    }

    return { live: liveServers.length, totalPlayers: players, regions: grouped, system: sys };
  }, [servers]);

  return (
    <motion.div
      initial={{ y: 16, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.2 }}
      className="relative h-full w-full overflow-y-auto overflow-x-hidden"
    >
      <div
        className="pointer-events-none absolute -top-28 -right-28 w-96 h-96 rounded-full blur-3xl opacity-[0.1]"
        style={{ background: accent }}
      />

      <div className="relative px-6 md:px-8 py-8 max-w-3xl mx-auto">
        {/* header */}
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h1 className={`text-[26px] leading-none font-bold tracking-tight ${textPrimary}`}>
              Server Status
            </h1>
            <p className={`mt-2 text-[13px] ${textSecondary}`}>
              Real-time status of every Pulse server.
            </p>
          </div>
          <span
            className="mt-1 flex items-center gap-2 rounded-full px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em]"
            style={{ backgroundColor: hexToRgba(OK, 0.12), color: OK }}
          >
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: OK }} />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5" style={{ background: OK }} />
            </span>
            Live
          </span>
        </div>

        {/* overall system banner */}
        <div
          className={`relative rounded-2xl border ${border} overflow-hidden mb-6`}
          style={{ backgroundColor: themeAlpha(colors.current.background.secondary, 0.5) }}
        >
          <div className="absolute left-0 top-0 bottom-0 w-1" style={{ background: loading ? OFF : system.color }} />
          <div className="flex items-center justify-between gap-4 px-5 py-4 pl-6">
            <div className="flex items-center gap-3 min-w-0">
              <span
                className="h-2.5 w-2.5 rounded-full shrink-0"
                style={{ background: loading ? OFF : system.color, boxShadow: `0 0 12px ${hexToRgba(loading ? OFF : system.color, 0.8)}` }}
              />
              <span className={`text-[15px] font-semibold tracking-tight ${textPrimary}`}>
                {loading ? "Checking servers…" : system.label}
              </span>
            </div>
            {!loading && (
              <div className={`hidden sm:flex items-center gap-5 text-[12px] ${textSecondary}`}>
                <span><span className={`font-bold tabular-nums ${textPrimary}`}>{live}</span> online</span>
                <span className="opacity-30">·</span>
                <span><span className={`font-bold tabular-nums ${textPrimary}`}>{totalPlayers}</span> in game</span>
              </div>
            )}
          </div>
        </div>

        {loading ? (
          <div className="space-y-2.5">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className={`h-16 rounded-xl border ${border} animate-pulse`}
                style={{ backgroundColor: themeAlpha(colors.current.background.secondary, 0.35) }}
              />
            ))}
          </div>
        ) : servers.length === 0 ? (
          <div
            className={`rounded-2xl border ${border} py-16 text-center`}
            style={{ backgroundColor: themeAlpha(colors.current.background.secondary, 0.35) }}
          >
            <p className={`text-[13px] ${textSecondary}`}>
              No servers are online right now. This page updates on its own — they'll
              appear the moment they come up.
            </p>
          </div>
        ) : (
          <div className="space-y-7">
            {regions.map(({ region, list }) => (
              <section key={region}>
                <div className="flex items-center gap-2 mb-2.5 px-1">
                  <h2 className={`text-[11px] font-bold uppercase tracking-[0.16em] ${textSecondary}`}>
                    {REGION_FULL[region] ?? region}
                  </h2>
                  <span className={`text-[11px] tabular-nums ${textSecondary} opacity-60`}>
                    {region}
                  </span>
                  <div className="flex-1 h-px" style={{ backgroundColor: hexToRgba("#ffffff", 0.06) }} />
                </div>

                <div
                  className={`rounded-2xl border ${border} overflow-hidden`}
                  style={{ backgroundColor: themeAlpha(colors.current.background.secondary, 0.4) }}
                >
                  {list.map((s, i) => {
                    const st = resolveStatus(s);
                    const max = s.maxPlayers && s.maxPlayers > 0 ? s.maxPlayers : 100;
                    const count = st.label === "Offline" ? 0 : s.playerCount || 0;
                    const pct = Math.max(0, Math.min(100, (count / max) * 100));
                    return (
                      <div
                        key={s.serverId}
                        className="flex items-center gap-4 px-5 py-3.5"
                        style={i > 0 ? { borderTop: `1px solid ${hexToRgba("#ffffff", 0.05)}` } : undefined}
                      >
                        {/* status dot */}
                        <span className="relative flex h-2.5 w-2.5 shrink-0">
                          {st.pulse && (
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: st.color }} />
                          )}
                          <span className="relative inline-flex rounded-full h-2.5 w-2.5" style={{ background: st.color }} />
                        </span>

                        {/* name + mode */}
                        <div className="min-w-0 flex-1">
                          <p className={`text-[14px] font-semibold leading-tight truncate ${textPrimary}`}>
                            {s.name}
                          </p>
                          <p className={`text-[12px] leading-tight truncate ${textSecondary}`}>
                            {prettyPlaylist(s.playlist)}
                          </p>
                        </div>

                        {/* capacity (fixed width → aligned across rows) */}
                        <div className="hidden md:flex flex-col gap-1.5 w-36 shrink-0">
                          <div className="flex items-center justify-between">
                            <span className={`text-[11px] uppercase tracking-wider ${textSecondary} opacity-70`}>
                              Players
                            </span>
                            <span className={`text-[12px] font-semibold tabular-nums flex items-center gap-1 ${textPrimary}`}>
                              <Users size={11} className="opacity-60" />
                              {count}
                              <span className="opacity-40">/{max}</span>
                            </span>
                          </div>
                          <div
                            className="h-1.5 rounded-full overflow-hidden"
                            style={{ backgroundColor: hexToRgba("#ffffff", 0.08) }}
                          >
                            <motion.div
                              className="h-full rounded-full"
                              style={{ background: st.color }}
                              initial={false}
                              animate={{ width: `${pct}%` }}
                              transition={{ duration: 0.5 }}
                            />
                          </div>
                        </div>

                        {/* status label (fixed width → aligned) */}
                        <div className="w-[86px] shrink-0 text-right">
                          <span
                            className="inline-block text-[11px] font-bold uppercase tracking-wider"
                            style={{ color: st.color }}
                          >
                            {st.label}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
