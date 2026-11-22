import { Config } from "../config";
import { api } from "../../lib/api";
import { useConfigStore } from "../../stores/settings";

export type PakEntry = { name: string; url: string; size: number };

// Launcher-managed files that do NOT come from the server pak manifest: the
// redirect DLL and any extra injected DLLs. Shared by launch.ts and verify.ts so
// both agree on what the launcher owns.
export function getManagedFilesConfig() {
  return {
    redirectLink: Config.LAUNCH_OPTIONS.REDIRECT_DOWNLOAD || "",
    useCustomPaks: false,
    customPaksLinks: [] as string[],
    injectExtraDlls: Config.LAUNCH_OPTIONS.DOWNLOAD_EXTRA_DLLS || false,
    extraDllLinks: Config.LAUNCH_OPTIONS.DLL_LINKS || [],
  };
}

function filterPaks(paks: unknown): PakEntry[] {
  if (!Array.isArray(paks)) return [];
  return paks.filter(
    (p): p is PakEntry =>
      !!p && typeof p.name === "string" && typeof p.url === "string",
  );
}

// Required game paks, fetched from the backend so they can be updated monthly
// without a new launcher build. Missing/wrong-size files are (re)downloaded for
// everyone; the download itself can't be canceled (game files).
export async function fetchPaksManifest(): Promise<PakEntry[]> {
  const res = await api.getPaks();
  return res.success && res.data ? filterPaks(res.data.paks) : [];
}

// Optional "Mobile Builds" paks — same server-hosted mechanism, but only pulled
// when the player enables the toggle in Settings.
export async function fetchMobilePaksManifest(): Promise<PakEntry[]> {
  const res = await api.getMobilePaks();
  return res.success && res.data ? filterPaks(res.data.paks) : [];
}

// The full set of paks to (re)download this launch: always the required paks,
// plus the Mobile Builds paks when that toggle is on. Merged by name (required
// wins) so both launch and verify agree on the same list.
export async function fetchPaksToApply(): Promise<PakEntry[]> {
  const { mobileBuilds } = useConfigStore.getState();
  const required = await fetchPaksManifest();
  if (!mobileBuilds) return required;

  const mobile = await fetchMobilePaksManifest();
  const byName = new Map<string, PakEntry>();
  for (const p of required) byName.set(p.name, p);
  for (const p of mobile) if (!byName.has(p.name)) byName.set(p.name, p);
  return [...byName.values()];
}
