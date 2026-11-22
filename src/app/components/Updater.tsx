import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { getVersion } from "@tauri-apps/api/app";
import { listen } from "@tauri-apps/api/event";
import { motion } from "framer-motion";

import { api } from "../../lib/api";
import { useTheme } from "../../hooks/useTheme";
import { hexToRgba, themeAlpha } from "../../util/color";

const isTauri =
  typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

// Returns true if `remote` is a newer semver (x.y.z) than `local`.
function isNewer(remote: string, local: string): boolean {
  const r = remote.split(".").map((n) => parseInt(n, 10) || 0);
  const l = local.split(".").map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < 3; i++) {
    const a = r[i] ?? 0;
    const b = l[i] ?? 0;
    if (a !== b) return a > b;
  }
  return false;
}

type Progress = { progress: number; downloadedMB?: number; totalMB?: number };

export function Updater() {
  const colors = useTheme();
  const accent = colors.current.accent;

  const [updating, setUpdating] = useState(false);
  const [version, setVersion] = useState("");
  const [progress, setProgress] = useState<Progress>({ progress: 0 });

  useEffect(() => {
    if (!isTauri) return;

    let unlisten: (() => void) | undefined;
    let cancelled = false;

    (async () => {
      try {
        const res = await api.getLauncherVersion();
        if (cancelled || !res.success || !res.data?.version || !res.data.url) return;

        const local = await getVersion();
        if (!isNewer(res.data.version, local)) return;

        // A newer build is available — apply it.
        setVersion(res.data.version);
        setUpdating(true);

        unlisten = await listen<Progress>("update-progress", (e) => {
          setProgress(e.payload);
        });

        // This resolves by exiting the app once the installer is launched.
        await invoke("download_and_install_update", {
          url: res.data.url,
          size: res.data.size ?? 0,
        });
      } catch (err) {
        // Never block launch on a failed update check.
        console.error("Update check failed:", err);
        if (!cancelled) setUpdating(false);
      }
    })();

    return () => {
      cancelled = true;
      unlisten?.();
    };
  }, []);

  if (!updating) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-6"
      style={{ backgroundColor: themeAlpha(colors.current.background.primary, 0.92) }}
    >
      <motion.div
        initial={{ scale: 0.94, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className={`relative w-full max-w-sm rounded-2xl border ${colors.current.border} backdrop-blur-2xl p-8 text-center`}
        style={{
          backgroundColor: themeAlpha(colors.current.background.secondary, 0.6),
          boxShadow: `0 0 0 1px ${hexToRgba(accent, 0.15)}, 0 30px 80px -20px rgba(0,0,0,0.7)`,
        }}
      >
        <div
          className="pointer-events-none absolute -top-16 left-1/2 -translate-x-1/2 w-52 h-52 rounded-full blur-3xl opacity-30"
          style={{ background: accent }}
        />

        <img
          src="/icon.png"
          className="relative w-16 h-16 mx-auto mb-5 rounded-2xl"
          draggable={false}
        />

        <h2 className={`relative text-xl font-black tracking-tight ${colors.current.text.primary}`}>
          Updating Pulse
        </h2>
        <p className={`relative text-sm mt-1 mb-6 ${colors.current.text.secondary}`}>
          Installing version {version}. The launcher will restart automatically.
        </p>

        <div className={`relative w-full ${colors.current.background.primary} rounded-full h-2 overflow-hidden`}>
          <motion.div
            className="h-full rounded-full"
            style={{ background: `linear-gradient(90deg, ${accent} 0%, ${accent}cc 100%)` }}
            initial={{ width: 0 }}
            animate={{ width: `${progress.progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>

        <div className={`relative mt-3 flex justify-between text-xs ${colors.current.text.secondary}`}>
          <span>{progress.progress}%</span>
          {progress.totalMB != null && progress.totalMB > 0 && (
            <span>
              {(progress.downloadedMB ?? 0).toLocaleString()} /{" "}
              {progress.totalMB.toLocaleString()} MB
            </span>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
