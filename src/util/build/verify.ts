"use client";

import { invoke } from "@tauri-apps/api/core";
import { useLibraryStore } from "../../stores/library";
import { Build } from "../../vite-env";
import { showToast } from "../../app/components/toaster";
import { getManagedFilesConfig, fetchPaksToApply } from "./filesConfig";
import { Config } from "../config";

// Repairs a build in place: wipes every file the launcher itself manages
// (redirect DLL, Arc loader, configured custom paks/DLLs) and re-applies them
// fresh, going through the exact same setup path as a normal launch.
export const verifyFiles = async (buildPath: string): Promise<boolean> => {
  const lib = useLibraryStore.getState();
  const build: Build | undefined = lib.entries.get(buildPath);

  if (!build) {
    showToast.error(`No build found at path: ${buildPath}`);
    return false;
  }

  try {
    const normalizedPath = buildPath.replace("/", "\\");
    const fn = `${normalizedPath}\\FortniteGame\\Binaries\\Win64\\FortniteClient-Win64-Shipping.exe`;

    const {
      redirectLink,
      useCustomPaks,
      customPaksLinks,
      injectExtraDlls,
      extraDllLinks,
    } = getManagedFilesConfig();

    const paksManifest = await fetchPaksToApply();

    // Host:port (no scheme) — the Rust side fetches the Arc client id from
    // {backend}/api/launcher/arc, same as the launch path.
    const backendUrl = Config.BACKEND_URL.replace("http://", "").replace(
      "https://",
      "",
    );

    await invoke("verify_build_files", {
      filePath: fn,
      redirectLink,
      backend: backendUrl,
      useCustomPaks,
      customPaksLinks,
      injectExtraDlls,
      extraDllLinks,
      paksManifest,
    });

    return true;
  } catch (err) {
    console.error(err);
    showToast.error("Failed to verify build files. See console for details.");
    return false;
  }
};
