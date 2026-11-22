"use client";

import { motion, AnimatePresence } from "framer-motion";
import { LogOut } from "lucide-react";
import { useTheme } from "../../../hooks/useTheme";
import { themeAlpha } from "../../../util/color";
import { Config } from "../../../util/config";
import { useUserStore } from "../../../stores/user";
import { useState } from "react";
import { useProfileStore } from "../../../stores/profile";
import { Button } from "../ui/Button";

export function InformationTab() {
  const colors = useTheme();
  const user = useUserStore.getState();
  const [showModal, setShowModal] = useState(false);

  const favoriteCharacter =
    useProfileStore((s) => s.getFavoriteCharacter()) ||
    "cid_001_athena_commando_f_default";

  const iconUrl = `https://fortnite-api.com/images/cosmetics/br/${favoriteCharacter.toLowerCase()}/icon.png`;

  return (
    <>
      <div className="flex flex-col gap-5">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className={`relative overflow-hidden rounded-2xl p-6 border ${colors.current.border} backdrop-blur-xl`}
          style={{
            backgroundColor: themeAlpha(colors.current.background.secondary, 0.6),
          }}
        >
          <div
            className="pointer-events-none absolute -top-16 -right-16 w-48 h-48 rounded-full blur-3xl opacity-20"
            style={{ background: colors.current.accent }}
          />

          <div className="relative flex items-center justify-between gap-4">
            <div className="flex items-center gap-4 min-w-0">
              <div className="relative shrink-0">
                <img
                  src={iconUrl}
                  alt=""
                  className="w-15 h-15 rounded-full object-cover border-2"
                  style={{ borderColor: `${colors.current.accent}80` }}
                />
                <span
                  className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-black/40"
                  style={{ backgroundColor: colors.current.accent }}
                />
              </div>
              <div className="min-w-0">
                <h2
                  className={`text-xl font-bold truncate ${colors.current.text.primary}`}
                >
                  {user.displayName}
                </h2>
                <p
                  className={`text-sm truncate ${colors.current.text.secondary}`}
                >
                  {user.accountId}
                </p>
              </div>
            </div>
            <Button
              onClick={() => setShowModal(true)}
              variant="secondary"
              icon={<LogOut size={18} />}
            >
              Log Out
            </Button>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.05 }}
          className={`rounded-2xl p-6 border ${colors.current.border} backdrop-blur-xl`}
          style={{
            backgroundColor: themeAlpha(colors.current.background.secondary, 0.6),
          }}
        >
          <div className="flex items-center gap-4">
            <div
              className={`w-15 h-15 rounded-xl overflow-hidden border flex items-center justify-center shrink-0 ${colors.current.border}`}
            >
              <img
                src={"/icon.png"}
                alt=""
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <h2
                className={`text-xl font-bold ${colors.current.text.primary}`}
              >
                {Config.NAME}
              </h2>
              <p className={`text-sm ${colors.current.text.secondary}`}>
                Version {Config.VERSION}
              </p>
            </div>
          </div>
        </motion.div>
      </div>

      <AnimatePresence>
        {showModal && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className={`relative rounded-2xl p-8 w-[400px] border border-white/10 backdrop-blur-2xl text-center shadow-2xl`}
              style={{
                backgroundColor: themeAlpha(colors.current.background.secondary, 0.8),
                boxShadow: `0 0 0 1px ${colors.current.accent}22, 0 30px 80px -20px rgba(0,0,0,0.6)`,
              }}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="flex items-center justify-center mb-5">
                <div
                  className="p-3 rounded-full"
                  style={{ backgroundColor: `${colors.current.accent}1a` }}
                >
                  <LogOut size={28} style={{ color: colors.current.accent }} />
                </div>
              </div>

              <h2
                className={`text-2xl font-bold mb-3 ${colors.current.text.primary}`}
              >
                Confirm Logout
              </h2>
              <p className={`text-sm mb-6 ${colors.current.text.secondary}`}>
                Are you sure you want to log out of {Config.NAME}?
              </p>
              <div className="flex justify-center gap-3">
                <Button
                  onClick={() => setShowModal(false)}
                  variant="secondary"
                  fullWidth
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    setShowModal(false);
                    user.logout();
                  }}
                  variant="danger"
                  fullWidth
                >
                  Log Out
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
