"use client";

import {
  Folder,
  Loader2,
  Lock,
  Play,
  Trash2,
  MoreVertical,
  Pause,
  X,
  CheckCircle2,
  TriangleAlert,
  ShieldCheck,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { openPath } from "@tauri-apps/plugin-opener";
import { useState } from "react";
import { SeasonInfo } from "../../../util/seasonInfo";
import { listen } from "@tauri-apps/api/event";
import { LIBRARY_KEY, useLibraryStore } from "../../../stores/library";
import { exit } from "../../../util/build/close";
import { start } from "../../../util/build/launch";
import { verifyFiles } from "../../../util/build/verify";
// import { Build } from "../../../vite-env";
import { useTheme } from "../../../hooks/useTheme";
import { themeAlpha } from "../../../util/color";
import { useAuth } from "../../../hooks/useAuth";
import { invoke } from "@tauri-apps/api/core";
import { Button } from "../ui/Button";

interface Item {
  path: string;
  build: any;
  options: string | null;
  setOptions: (path: string | null) => void;
  handleDeleteBuild: (path: string) => void;
  isPublicBuild: boolean;
}

interface DownloadState {
  file: string;
  progress: number;
  stage:
    | "downloading"
    | "injecting"
    | "launching"
    | "verifying"
    | "done"
    | null;
  active: boolean;
  nonCancelable?: boolean;
  downloadedMB?: number;
  totalMB?: number;
}

interface ValidationError {
  message: string;
  errors: string[];
}

export function BuildCard({
  path,
  build,
  options,
  setOptions,
  handleDeleteBuild,
  isPublicBuild,
}: Item) {
  const majorVersion = build.season.split(".")[0];
  const [hover, setHover] = useState(false);
  const [downloadState, setDownloadState] = useState<DownloadState>({
    file: "",
    progress: 0,
    stage: null,
    active: false,
  });
  const [validationError, setValidationError] =
    useState<ValidationError | null>(null);
  const [verifyingFiles, setVerifyingFiles] = useState<string[]>([]);

  const { isValidSession } = useAuth.user();
  const imageProxy = "https://images.weserv.nl/?url=";

  const getProxiedUrl = (url: string) => {
    return imageProxy + encodeURIComponent(url.replace(/^https?:\/\//, ""));
  };

  // useEffect(() => {
  //   const unlisten = listen("download-progress", (event: any) => {
  //     const payload = event.payload;

  //     if (payload.stage === "done") {
  //       setDownloadState({
  //         file: payload.file || "",
  //         progress: 100,
  //         stage: "launching",
  //         active: true,
  //       });

  //       setTimeout(() => {
  //         setDownloadState({
  //           file: "",
  //           progress: 0,
  //           stage: null,
  //           active: false,
  //         });
  //       }, 1500);

  //       return;
  //     }

  //     setDownloadState({
  //       file: payload.file || "",
  //       progress: payload.progress ?? 0,
  //       stage: payload.stage ?? "downloading",
  //       active: true,
  //     });
  //   });

  //   return () => {
  //     setDownloadState((prev) => ({
  //       ...prev,
  //       stage: "done",
  //       active: false,
  //     }));
  //     unlisten.then((f) => f());
  //   };
  // }, []);

  setTimeout(() => {
    if (build.open) {
      async function check() {
        await invoke("is_fn_running").then((result) => {
          if (!result) {
            build.open = false;
            localStorage.setItem(
              LIBRARY_KEY,
              JSON.stringify([...BuildState.entries]),
            );
          }
        });
      }

      check();
    }
  }, 500);

  const handleOpen = async () => {
    await openPath(build.path);
  };

  async function Launch() {
    if (!isPublicBuild) return;

    if (build.open) {
      const result = await exit(path);
      if (result) {
        localStorage.setItem(
          LIBRARY_KEY,
          JSON.stringify([...BuildState.entries]),
        );

        build.open = false;
      }
      return;
    }

    setDownloadState({
      file: "",
      progress: 0,
      stage: "verifying",
      active: true,
    });
    setValidationError(null);
    setVerifyingFiles([]);

    const unlistenDownload = await listen("download-progress", (event: any) => {
      const payload = event.payload;
      setDownloadState({
        file: payload.file || "",
        progress: payload.progress ?? 0,
        stage: payload.stage ?? "downloading",
        active: true,
        nonCancelable: payload.type === "gamefile" || payload.type === "pak",
        downloadedMB: payload.downloadedMB,
        totalMB: payload.totalMB,
      });
    });

    const unlistenVerify = await listen("verify-build", (event: any) => {
      const payload = event.payload;

      if (payload.status === "deleted") {
        setVerifyingFiles((prev) => [...prev, `Removed: ${payload.file}`]);
      } else if (payload.status === "failed") {
        setVerifyingFiles((prev) => [
          ...prev,
          `Failed to remove: ${payload.file}`,
        ]);
      }
    });

    const unlistenValidation = await listen(
      "build-validation-error",
      (event: any) => {
        const payload = event.payload;
        setValidationError({
          message: payload.message,
          errors: payload.errors,
        });
        setDownloadState({
          file: "",
          progress: 0,
          stage: null,
          active: true,
        });
      },
    );

    try {
      setDownloadState({
        file: "",
        progress: 100,
        stage: "launching",
        active: true,
      });
      const result = await start(path, isValidSession);

      if (result) {
        build.open = true;

        localStorage.setItem(
          LIBRARY_KEY,
          JSON.stringify([...BuildState.entries]),
        );
      }
    } catch (error: any) {
      console.error("Launch error:", error);
    } finally {
      if (!validationError) {
        setDownloadState({ file: "", progress: 0, stage: null, active: false });
        setVerifyingFiles([]);
      }
      unlistenDownload();
      unlistenVerify();
      unlistenValidation();
    }
  }

  async function handleVerifyFiles() {
    if (build.open) return;
    setOptions(null);

    setDownloadState({ file: "", progress: 0, stage: "verifying", active: true });
    setVerifyingFiles([]);

    const unlistenVerify = await listen("verify-build", (event: any) => {
      const payload = event.payload;

      if (payload.status === "deleted") {
        setVerifyingFiles((prev) => [...prev, `Removed: ${payload.file}`]);
      } else if (payload.status === "failed") {
        setVerifyingFiles((prev) => [
          ...prev,
          `Failed to remove: ${payload.file}`,
        ]);
      }
    });

    const unlistenDownload = await listen("download-progress", (event: any) => {
      const payload = event.payload;
      setDownloadState({
        file: payload.file || "",
        progress: payload.progress ?? 0,
        stage: payload.stage ?? "downloading",
        active: true,
        nonCancelable: payload.type === "gamefile" || payload.type === "pak",
        downloadedMB: payload.downloadedMB,
        totalMB: payload.totalMB,
      });
    });

    try {
      const ok = await verifyFiles(path);

      setDownloadState({
        file: "",
        progress: 100,
        stage: "done",
        active: true,
      });

      if (ok) {
        setTimeout(() => {
          setDownloadState({ file: "", progress: 0, stage: null, active: false });
          setVerifyingFiles([]);
        }, 1200);
      }
    } catch (error: any) {
      console.error("Verify files error:", error);
    } finally {
      unlistenVerify();
      unlistenDownload();
    }
  }

  const BuildState = useLibraryStore.getState();
  // const currentBuild: Build | undefined = BuildState.entries.get(path);
  const colors = useTheme();
  const accent = colors.current.accent;

  // Prefer the season key-art; fall back to the bundled local splash if it's
  // missing or fails to load (many of the external season URLs are hotlink-
  // blocked, which left the card blank). Drop a custom public/build-splash.png
  // to change the fallback.
  const BUILD_FALLBACK = "/build-splash.png";
  const seasonImage = SeasonInfo(majorVersion).image;
  const [imageUrl, setImageUrl] = useState(
    seasonImage ? getProxiedUrl(seasonImage) : BUILD_FALLBACK,
  );

  const getStatusText = () => {
    if (downloadState.nonCancelable) return "Downloading Game Files";
    switch (downloadState.stage) {
      case "injecting":
        return "Injecting DLL...";
      case "launching":
        return "Launching...";
      case "verifying":
        return "Verifying Files...";
      case "done":
        return "Finished!";
      default:
        return "Downloading...";
    }
  };

  const getDescriptionText = () => {
    if (validationError) {
      return validationError.message;
    }

    if (downloadState.nonCancelable) {
      return `Required game files — please keep the launcher open. ${downloadState.file || ""}`.trim();
    }

    if (downloadState.stage === "verifying") {
      return "Checking build integrity...";
    }

    if (downloadState.stage === "launching") {
      return `Preparing ${build.season}...`;
    }
    return downloadState.file || "Preparing...";
  };

  return (
    <>
      {downloadState.active && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className={`rounded-2xl border ${colors.current.border} backdrop-blur-2xl p-8 max-w-md w-full mx-4 shadow-2xl`}
            style={{
              boxShadow: `0 0 0 1px ${accent}22, 0 30px 80px -20px rgba(0,0,0,0.6)`,
              backgroundColor: themeAlpha(colors.current.background.secondary, 0.95),
            }}
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                {validationError ? (
                  <TriangleAlert className="w-6 h-6 text-red-400" />
                ) : downloadState.stage === "verifying" ? (
                  <Loader2 className="w-6 h-6 animate-spin" style={{ color: accent }} />
                ) : (
                  <Loader2 className="w-6 h-6 animate-spin" style={{ color: accent }} />
                )}
                <h3
                  className={`text-xl font-semibold ${validationError ? "text-red-400" : colors.current.text.primary}`}
                >
                  {getStatusText()}
                </h3>
              </div>
              {downloadState.stage !== "launching" &&
                !downloadState.nonCancelable && (
                  <button
                    onClick={() => {
                      setDownloadState((prev) => ({ ...prev, active: false }));
                      setValidationError(null);
                      setVerifyingFiles([]);
                    }}
                    className={`${colors.current.text.secondary} hover:text-white transition-colors p-2 hover:bg-white/10 rounded-xl`}
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
            </div>

            <p
              className={`mb-6 ${validationError ? "text-red-300" : colors.current.text.secondary}`}
            >
              {getDescriptionText()}
            </p>

            {validationError ? (
              <div className="space-y-4">
                <div className="bg-red-950/30 border border-red-900/50 rounded-lg p-4 max-h-60 overflow-y-auto backdrop-blur-sm">
                  <h4 className="text-red-400 font-semibold mb-2 text-sm">
                    Corrupted Files:
                  </h4>
                  <ul className="space-y-1">
                    {validationError.errors.map((error, idx) => (
                      <li
                        key={idx}
                        className="text-xs text-red-300/80 font-mono"
                      >
                        • {error}
                      </li>
                    ))}
                  </ul>
                </div>
                <Button
                  onClick={() => {
                    setDownloadState((prev) => ({ ...prev, active: false }));
                    setValidationError(null);
                    setVerifyingFiles([]);
                  }}
                  variant="danger"
                  fullWidth
                >
                  Close
                </Button>
              </div>
            ) : downloadState.stage === "verifying" ? (
              <div className="space-y-4">
                {verifyingFiles.length > 0 && (
                  <div
                    className={`border ${colors.current.border} rounded-lg p-4 max-h-40 overflow-y-auto backdrop-blur-sm`}
                    style={{
                      backgroundColor: themeAlpha(colors.current.background.primary, 0.5),
                    }}
                  >
                    <h4 className={`font-semibold mb-2 text-sm ${colors.current.text.primary}`}>
                      Cleaning up:
                    </h4>
                    <ul className="space-y-1">
                      {verifyingFiles.map((file, idx) => (
                        <li
                          key={idx}
                          className={`text-xs font-mono flex items-center gap-2 ${colors.current.text.secondary}`}
                        >
                          <CheckCircle2 className="w-3 h-3 text-green-400 flex-shrink-0" />
                          {file}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <div className={`flex items-center justify-center gap-2 text-sm ${colors.current.text.secondary}`}>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Verifying pak files...</span>
                </div>
              </div>
            ) : downloadState.stage !== "launching" ? (
              <>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className={colors.current.text.secondary}>Current File</span>
                      <span className={`font-medium ${colors.current.text.primary}`}>
                        {downloadState.file}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className={colors.current.text.secondary}>Progress</span>
                      <span className={`font-medium ${colors.current.text.primary}`}>
                        {downloadState.progress.toFixed(1)}%
                      </span>
                    </div>
                    {downloadState.totalMB != null &&
                      downloadState.totalMB > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className={colors.current.text.secondary}>
                            Downloaded
                          </span>
                          <span className={`font-medium ${colors.current.text.primary}`}>
                            {(downloadState.downloadedMB ?? 0).toLocaleString()} /{" "}
                            {downloadState.totalMB.toLocaleString()} MB
                          </span>
                        </div>
                      )}
                  </div>

                  <div className={`w-full ${colors.current.background.primary} rounded-full h-2 overflow-hidden`}>
                    <motion.div
                      className="h-full rounded-full"
                      style={{
                        background: `linear-gradient(90deg, ${accent} 0%, ${accent}cc 100%)`,
                      }}
                      initial={{ width: 0 }}
                      animate={{ width: `${downloadState.progress}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                </div>
              </>
            ) : null}
          </motion.div>
        </motion.div>
      )}

      <motion.div
        layout
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9 }}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        style={{
          boxShadow: hover
            ? `0 20px 45px -15px ${accent}40, 0 0 0 1px ${accent}25`
            : "0 8px 24px -12px rgba(0,0,0,0.4)",
          backgroundColor: themeAlpha(colors.current.background.secondary, 0.6),
        }}
        className={`relative group rounded-2xl border ${colors.current.border} backdrop-blur-xl max-w-xs overflow-hidden transition-all duration-300`}
      >
        <div className="relative aspect-[10/10] overflow-hidden bg-black/30">
          <img
            src={imageUrl}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            onError={() => {
              if (imageUrl !== BUILD_FALLBACK) setImageUrl(BUILD_FALLBACK);
            }}
          />

          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

          {!isPublicBuild ? (
            <div className="absolute top-2.5 left-2.5 z-10 flex items-center gap-1 px-2 py-0.5 rounded-md bg-black/50 backdrop-blur-md border border-white/10">
              <Lock size={10} className="text-zinc-300" strokeWidth={2} />
              <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-300">
                Outdated
              </span>
            </div>
          ) : build.open ? (
            <div className="absolute top-2.5 left-2.5 z-10 flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-black/50 backdrop-blur-md border border-white/10">
              <span className="relative flex h-1.5 w-1.5">
                <span
                  className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
                  style={{ backgroundColor: accent }}
                />
                <span
                  className="relative inline-flex rounded-full h-1.5 w-1.5"
                  style={{ backgroundColor: accent }}
                />
              </span>
              <span className="text-[9px] font-bold uppercase tracking-wider text-white/90">
                Running
              </span>
            </div>
          ) : null}

          <AnimatePresence>
            {build.open ? (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="absolute bottom-3 right-3 flex gap-2"
              >
                <button
                  onClick={Launch}
                  disabled={!isPublicBuild || build.loading}
                  className={`py-2.5 px-3.5 cursor-pointer rounded-xl w-max font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-2 bg-black/70 hover:bg-black/85 text-white border border-white/10 backdrop-blur-md`}
                >
                  {!isPublicBuild ? (
                    <>
                      <Lock size={16} />
                    </>
                  ) : build.loading ? (
                    <>
                      <Loader2 className="animate-spin" size={16} />
                    </>
                  ) : build.open ? (
                    <>
                      <Pause size={16} />
                    </>
                  ) : (
                    <>
                      <Play size={16} />
                    </>
                  )}
                </button>

                <div className="relative">
                  <button
                    onClick={() => setOptions(options === path ? null : path)}
                    className="p-2.5 cursor-pointer bg-black/70 hover:bg-black/85 backdrop-blur-md rounded-xl transition-all duration-200 border border-white/10"
                  >
                    <MoreVertical className="text-white" size={18} />
                  </button>

                  <AnimatePresence>
                    {options === path && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: -10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -10 }}
                        className={`absolute bottom-full right-0 mb-2 backdrop-blur-xl border ${colors.current.border} rounded-xl overflow-hidden shadow-2xl min-w-[160px]`}
                        style={{
                          backgroundColor: themeAlpha(colors.current.background.secondary, 0.95),
                        }}
                      >
                        <button
                          onClick={handleOpen}
                          className={`w-full flex items-center gap-3 px-4 py-3 text-sm ${colors.current.text.secondary} hover:bg-white/5 hover:text-white transition-colors`}
                        >
                          <Folder size={16} />
                          Open Folder
                        </button>
                        <button
                          onClick={() => handleDeleteBuild(path)}
                          className={`w-full flex items-center gap-3 px-4 py-3 text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors border-t ${colors.current.border}`}
                        >
                          <Trash2 size={16} />
                          Delete
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            ) : (
              hover && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute bottom-3 right-3 flex gap-2"
                >
                  <button
                    onClick={Launch}
                    disabled={!isPublicBuild || build.loading}
                    className={`py-2.5 px-3.5 cursor-pointer rounded-xl w-max font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-2 bg-black/70 hover:bg-black/85 text-white border border-white/10 backdrop-blur-md`}
                  >
                    {!isPublicBuild ? (
                      <>
                        <Lock size={16} />
                      </>
                    ) : build.loading ? (
                      <>
                        <Loader2 className="animate-spin" size={16} />
                      </>
                    ) : build.open ? (
                      <>
                        <Pause size={16} />
                      </>
                    ) : (
                      <>
                        <Play size={16} />
                      </>
                    )}
                  </button>

                  <div className="relative">
                    <button
                      onClick={() => setOptions(options === path ? null : path)}
                      className="p-2.5 cursor-pointer bg-black/70 hover:bg-black/85 backdrop-blur-md rounded-xl transition-all duration-200 border border-white/10"
                    >
                      <MoreVertical className="text-white" size={18} />
                    </button>

                    <AnimatePresence>
                      {options === path && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95, y: -10 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95, y: -10 }}
                          className={`absolute bottom-full right-0 mb-2 backdrop-blur-xl border ${colors.current.border} rounded-xl overflow-hidden shadow-2xl min-w-[160px]`}
                          style={{
                            backgroundColor: themeAlpha(colors.current.background.secondary, 0.95),
                          }}
                        >
                          <button
                            onClick={handleOpen}
                            className={`w-full flex items-center gap-3 px-4 py-3 text-sm ${colors.current.text.secondary} hover:bg-white/5 hover:text-white transition-colors`}
                          >
                            <Folder size={16} />
                            Open Folder
                          </button>
                          <button
                            onClick={handleVerifyFiles}
                            className={`w-full flex items-center gap-3 px-4 py-3 text-sm ${colors.current.text.secondary} hover:bg-white/5 hover:text-white transition-colors border-t ${colors.current.border}`}
                          >
                            <ShieldCheck size={16} />
                            Verify Files
                          </button>
                          <button
                            onClick={() => handleDeleteBuild(path)}
                            className={`w-full flex items-center gap-3 px-4 py-3 text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors border-t ${colors.current.border}`}
                          >
                            <Trash2 size={16} />
                            Delete
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              )
            )}
          </AnimatePresence>
        </div>

        <div className="p-4 space-y-3">
          <div>
            <h3 className={`text-lg font-bold mb-1 truncate ${colors.current.text.primary}`}>
              Fortnite {build.season}
            </h3>
            <div className="flex items-center gap-2">
              {build.version.includes("CL") && (
                <span className={`text-xs ${colors.current.text.secondary}`}>
                  {build.version}
                </span>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </>
  );
}
