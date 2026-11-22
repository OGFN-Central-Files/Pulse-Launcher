"use client";

import { invoke } from "@tauri-apps/api/core";
import { sendNotification } from "@tauri-apps/plugin-notification";

import { Window } from "@tauri-apps/api/window";
import { useLibraryStore } from "../../stores/library";
import { useConfigStore } from "../../stores/settings";
import { Build } from "../../vite-env";
import { Config } from "../config";
import { useUserStore } from "../../stores/user";
import { showToast } from "../../app/components/toaster";
import { api } from "../../lib/api";
import { getManagedFilesConfig, fetchPaksToApply } from "./filesConfig";

const window = new Window("Main");

// Arc auth is now the "Exchange code" credential type: Arc reads the one-time
// exchange code from the game's -AUTH_PASSWORD launcher arg and verifies it
// against the backend Verification URL (POST /api/coral/arc/verify), which
// returns { subject, displayName }. There is NO client-minted session token
// anymore — the old arc-services CreateAuthSession/-t flow was the "session"
// credential type and stopped working once the Client ID switched to exchange
// code, which is why the launcher was aborting with "Failed to start Arc".

export const start = async (
  buildPath: string,
  isValidSession: () => boolean,
): Promise<boolean> => {
  const lib = useLibraryStore.getState();
  const { minimizeOnLaunch, editOnRelease, disablePreEdits, resetOnRelease } =
    useConfigStore.getState();
  const { accountId, accessToken } = useUserStore.getState();

  const build: Build | undefined = lib.entries.get(buildPath);

  if (!build) {
    showToast.error(`No build found at path: ${buildPath}`);
    return false;
  }

  if (!isValidSession()) {
    showToast.error(`User is not authenticated.`);
    return false;
  }

  if (!accountId) {
    showToast.error("Missing account ID. Please sign in again.");
    return false;
  }

  try {
    const normalizedPath = buildPath.replace("/", "\\");
    const fn = `${normalizedPath}\\FortniteGame\\Binaries\\Win64\\FortniteClient-Win64-Shipping.exe`;

    const fileExists = await invoke<boolean>("check_file_exists", {
      path: fn,
    });

    if (!fileExists) {
      console.warn(
        `[Invalid Build] Executable missing for version ${build.version}`,
      );
      return false;
    }

    const extraDllOptions: Record<string, string>[] = [];
    const {
      redirectLink,
      useCustomPaks,
      customPaksLinks,
      injectExtraDlls,
      extraDllLinks,
    } = getManagedFilesConfig();

    // Server-driven paks: the required set for everyone, plus the optional
    // "Mobile Builds" set when the player enabled it. Missing/wrong-size files
    // are (re)fetched; the download can't be canceled (game files).
    const paksManifest = await fetchPaksToApply();

    const backendUrl = Config.BACKEND_URL.replace("http://", "").replace(
      "https://",
      "",
    );

    // Mint a one-time exchange code so Fortnite can auth via -AUTH_TYPE=exchangecode
    // instead of a raw email/password (we don't have a password under Discord auth).
    const exchangeRes = await api.getExchangeCode(accessToken);
    if (!exchangeRes.success || !exchangeRes.data) {
      showToast.error("Failed to get a launch code. Please try again.");
      return false;
    }
    const exchangeCode = exchangeRes.data.exchangeCode;

    await invoke("launch_game", {
      filePath: fn,
      email: accountId,
      password: exchangeCode,
      accountId: accountId,
      arcToken: "",
      redirectLink: redirectLink,
      backend: backendUrl,
      injectExtraDlls: injectExtraDlls,
      extraDllLinks: extraDllLinks,
      useCustomPaks: useCustomPaks,
      customPaksLinks: customPaksLinks,
      extraDllOptions: extraDllOptions,
      paksManifest: paksManifest,
      editOnRelease: editOnRelease,
      disablePreEdits: disablePreEdits,
      resetOnRelease: resetOnRelease,
    });

    lib.patch(buildPath, { open: true });

    if (minimizeOnLaunch) {
      window.minimize();
    }

    sendNotification({
      title: `Launching ${Config.CURRENT_VERSION}`,
      body: `${Config.NAME} is now launching. If this is your first time launching, it may take a bit longer than usual. Thanks for playing!`,
    });

    return true;
  } catch (err) {
    console.error(err);
    return false;
  }
};
