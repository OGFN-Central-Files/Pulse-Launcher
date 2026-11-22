"use client";
import { useEffect, useRef, useState } from "react";
import { open } from "@tauri-apps/plugin-shell";
import { Config } from "../../util/config";
import { useUserStore } from "../../stores/user";
import { api, BACKEND_BASE_URL, ENDPOINTS } from "../../lib/api";
import { showToast } from "../components/toaster";
import { useTheme } from "../../hooks/useTheme";
import { themeAlpha } from "../../util/color";

type Status = "idle" | "waiting" | "timeout";

const POLL_INTERVAL_MS = 1500;
const TIMEOUT_MS = 5 * 60 * 1000;

function DiscordIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.317 4.37a19.79 19.79 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.056 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128c.126-.094.252-.192.372-.291a.074.074 0 0 1 .078-.01c3.927 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .079.009c.12.099.246.198.373.292a.077.077 0 0 1-.006.128 12.3 12.3 0 0 1-1.873.891.076.076 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.078.078 0 0 0 .084.029 19.84 19.84 0 0 0 6.002-3.03.077.077 0 0 0 .032-.055c.5-5.177-.838-9.673-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.419 0 1.334-.956 2.419-2.157 2.419zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.419 0 1.334-.946 2.419-2.157 2.419z" />
    </svg>
  );
}

export function Auth() {
  const profile = useUserStore();
  const colors = useTheme();
  const [status, setStatus] = useState<Status>("idle");
  const [hovered, setHovered] = useState(false);

  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const stateRef = useRef<string>("");

  function stopPolling() {
    if (pollTimer.current) {
      clearInterval(pollTimer.current);
      pollTimer.current = null;
    }
  }

  useEffect(() => stopPolling, []);

  async function handleDiscordLogin() {
    stopPolling();
    setStatus("waiting");

    const state = crypto.randomUUID();
    stateRef.current = state;

    try {
      await open(`${BACKEND_BASE_URL}${ENDPOINTS.DISCORD_AUTH}?state=${state}`);
    } catch (err) {
      console.error("Failed to open Discord login:", err);
      showToast.error("Couldn't open your browser. Please try again.");
      setStatus("idle");
      return;
    }

    const startedAt = Date.now();

    pollTimer.current = setInterval(async () => {
      if (stateRef.current !== state) return;

      if (Date.now() - startedAt > TIMEOUT_MS) {
        stopPolling();
        setStatus("timeout");
        return;
      }

      const res = await api.getDiscordSession(state);
      if (!res.success || !res.data) return;

      if (res.data.status === "ok" && res.data.access_token && res.data.account_id) {
        stopPolling();
        profile.login({
          accountId: res.data.account_id,
          accessToken: res.data.access_token,
          displayName: res.data.displayName || "Player",
          email: null,
          password: null,
        });
        window.location.reload();
      }
    }, POLL_INTERVAL_MS);
  }

  function cancelLogin() {
    stopPolling();
    stateRef.current = "";
    setStatus("idle");
  }

  return (
    <div className="relative w-screen h-screen overflow-hidden">
      <div className="relative z-10 h-full flex items-center justify-center px-6">
        <div
          className="w-full max-w-md rounded-3xl border border-white/10 backdrop-blur-2xl p-10 shadow-2xl"
          style={{
            backgroundColor: themeAlpha(colors.current.background.secondary, 0.5),
            boxShadow: `0 0 0 1px ${colors.current.accent}22, 0 30px 80px -20px rgba(0,0,0,0.6)`,
          }}
        >
          <div className="flex flex-col items-center mb-8 text-center">
            <img
              src="/icon.png"
              className="h-14 w-14 rounded-2xl mb-4 shadow-lg"
              draggable={false}
            />
            <h1 className="text-2xl font-bold text-white mb-1">
              Welcome to {Config.NAME}
            </h1>
            <p className="text-zinc-400 text-sm">
              Sign in with Discord to continue
            </p>
          </div>

          <button
            onClick={status === "idle" || status === "timeout" ? handleDiscordLogin : undefined}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            disabled={status === "waiting"}
            className="w-full flex items-center justify-center gap-3 rounded-xl py-3.5 font-semibold text-white transition-all duration-200 cursor-pointer disabled:cursor-not-allowed"
            style={{
              backgroundColor: hovered && status !== "waiting" ? "#4752c4" : "#5865f2",
              boxShadow:
                status === "waiting"
                  ? "none"
                  : "0 8px 24px -6px rgba(88,101,242,0.55)",
              opacity: status === "waiting" ? 0.75 : 1,
            }}
          >
            {status === "waiting" ? (
              <>
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                <span>Waiting for Discord…</span>
              </>
            ) : status === "timeout" ? (
              <>
                <DiscordIcon />
                <span>Try again</span>
              </>
            ) : (
              <>
                <DiscordIcon />
                <span>Continue with Discord</span>
              </>
            )}
          </button>

          {status === "waiting" && (
            <div className="mt-4 text-center">
              <p className="text-xs text-zinc-500 mb-2">
                Finish signing in in the browser window that just opened.
              </p>
              <button
                onClick={cancelLogin}
                className="text-xs text-zinc-500 hover:text-white transition-colors cursor-pointer underline underline-offset-2"
              >
                Cancel
              </button>
            </div>
          )}

          {status === "timeout" && (
            <p className="mt-4 text-center text-xs text-amber-400/80">
              That took too long — the sign-in link expired. Try again.
            </p>
          )}
        </div>
      </div>

      <div
        className="absolute bottom-0 left-0 right-0 h-1 opacity-30"
        style={{
          background: `linear-gradient(90deg, transparent, ${colors.current.accent}, transparent)`,
        }}
      />
    </div>
  );
}
