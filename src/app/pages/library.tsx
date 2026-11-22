"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Plus, Loader2, Trash, AlertTriangle } from "lucide-react";
import { BuildGrid } from "../components/library/BuildGrid";
import EmptyState from "../components/library/EmptyState";
import { useTheme } from "../../hooks/useTheme";
import { useLibraryStore } from "../../stores/library";
import { handleAddBuild } from "../../util/build/import";
import { useAuth } from "../../hooks/useAuth";
import { Button } from "../components/ui/Button";

export function Library() {
  const entries = useLibraryStore((state) => state.entries);
  const builds = Array.from(entries.entries());

  const wipe = useLibraryStore((state) => state.wipe);
  const remove = useLibraryStore((state) => state.delete);

  const [importing, setImporting] = useState(false);
  const [options, setOptions] = useState<string | null>(null);
  const [showConfirmWipe, setShowConfirmWipe] = useState(false);

  const colors = useTheme();

  const user = useAuth.user();

  if (!user.isValidSession()) {
    return null;
  }

  function handleDeleteBuild(key: string) {
    remove(key);
  }

  function startImport() {
    try {
      setImporting(true);
      handleAddBuild().finally(() => setImporting(false));
    } catch (err) {
      console.error(err);
      setImporting(false);
    }
  }

  function confirmWipe() {
    wipe();
    setShowConfirmWipe(false);
  }

  return (
    <div className="h-full overflow-hidden">
      <motion.main
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="h-full flex flex-col"
      >
        <div className="flex-shrink-0 px-8 pt-8 relative">
          <div
            className="pointer-events-none absolute -top-24 -right-24 w-80 h-80 rounded-full blur-3xl opacity-20"
            style={{ background: colors.current.accent }}
          />

          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="relative flex items-end justify-between mb-6"
          >
            <div>
              <h1 className="text-3xl md:text-4xl font-black mb-2 tracking-tight bg-linear-to-r from-white to-zinc-400 bg-clip-text text-transparent">
                Library
              </h1>
              <p className={`text-sm font-medium ${colors.current.text.secondary}`}>
                View, manage, and launch all your builds all in one place.
              </p>
            </div>
          </motion.div>
        </div>

        <div className="flex-1 min-h-0 px-8 pb-8 overflow-y-auto overflow-x-hidden">
          <AnimatePresence mode="wait">
            {builds.length === 0 ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <EmptyState />
              </motion.div>
            ) : (
              <motion.div
                key="grid"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <BuildGrid
                  builds={builds}
                  options={options}
                  setOptions={setOptions}
                  handleDeleteBuild={handleDeleteBuild}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="fixed bottom-8 right-8 flex gap-3 z-20">
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{
              delay: 0.2,
              type: "spring",
              stiffness: 260,
              damping: 20,
            }}
            onClick={() => setShowConfirmWipe(true)}
            disabled={importing || builds.length === 0}
            className={`group cursor-pointer relative p-4 ${colors.current.button.base} hover:bg-red-500/20 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-2xl transition-all duration-200 border ${colors.current.border} hover:border-red-500/40`}
          >
            <Trash size={20} />
          </motion.button>

          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{
              delay: 0.3,
              type: "spring",
              stiffness: 260,
              damping: 20,
            }}
            onClick={() => startImport()}
            disabled={importing}
            style={{
              background: `linear-gradient(135deg, ${colors.current.accent} 0%, ${colors.current.accent}b3 100%)`,
              boxShadow: `0 8px 24px -6px ${colors.current.accent}80`,
            }}
            className="group cursor-pointer relative p-4 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-2xl transition-all duration-200 border border-white/10"
          >
            {importing ? (
              <Loader2 className="animate-spin" size={20} />
            ) : (
              <Plus size={20} />
            )}
          </motion.button>
        </div>
      </motion.main>

      <AnimatePresence>
        {showConfirmWipe && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowConfirmWipe(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              onClick={(e) => e.stopPropagation()}
              className={`${colors.current.background.secondary} border border-red-900/30 rounded-2xl p-8 max-w-md w-full`}
            >
              <div className="flex items-center justify-center mb-6">
                <motion.div
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                  className="p-2"
                >
                  <AlertTriangle className="text-red-400" size={32} />
                </motion.div>
              </div>

              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-white mb-3">
                  Delete All Builds?
                </h2>
                <p className="text-zinc-400 text-sm leading-relaxed">
                  You're about to permanently delete{" "}
                  <strong className="text-white">
                    {entries.size} {entries.size === 1 ? "build" : "builds"}
                  </strong>
                  . You will have to re-import all of your builds again.
                </p>
              </div>

              <div className="flex gap-3">
                <Button onClick={() => setShowConfirmWipe(false)} variant="secondary" fullWidth>
                  Cancel
                </Button>
                <Button onClick={confirmWipe} variant="danger" fullWidth>
                  Delete All
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
