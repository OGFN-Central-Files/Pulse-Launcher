"use client";

import { useTheme } from "../../hooks/useTheme";
import { InformationTab } from "../components/settings/InformationTab";
import { AppearanceTab } from "../components/settings/AppearanceTab";
import { motion } from "framer-motion";
import { OptionGroup } from "../components/settings/OptionGroup";
import { ToggleOption } from "../components/settings/ToggleOption";
import { useConfigStore } from "../../stores/settings";
import { Config } from "../../util/config";

export function Settings() {
  const colors = useTheme();
  const config = useConfigStore();

  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.2, damping: 30, stiffness: 330 }}
      className="relative h-full w-full overflow-y-auto overflow-x-hidden"
    >
      <div
        className="pointer-events-none absolute -top-24 -right-24 w-96 h-96 rounded-full blur-3xl opacity-[0.12]"
        style={{ background: colors.current.accent }}
      />

      <div className="relative p-6 md:p-8 max-w-3xl mx-auto flex flex-col gap-5">
        <div className="mb-1">
          <h1 className="text-3xl md:text-4xl font-black tracking-tight bg-linear-to-r from-white to-zinc-400 bg-clip-text text-transparent">
            Settings
          </h1>
          <p className={`mt-2 text-sm font-medium ${colors.current.text.secondary}`}>
            Customize your Pulse experience.
          </p>
        </div>

        <InformationTab />
        <AppearanceTab />

        <OptionGroup
          title="In-Game Settings"
          description="Applied to Fortnite every time you play."
        >
          <ToggleOption
            label="Edit on Release"
            description="Confirm edits on release."
            value={config.editOnRelease}
            onChange={config.setEditOnRelease}
          />

          <ToggleOption
            label="Disable Pre-Edits"
            description="Prevent accidental edits."
            value={config.disablePreEdits}
            onChange={config.setDisablePreEdits}
          />

          <ToggleOption
            label="Reset on Release"
            description="Reset edits on release."
            value={config.resetOnRelease}
            onChange={config.setResetOnRelease}
          />

          <ToggleOption
            label="Mobile Builds"
            description="Download the Mobile Builds pak. Applied on next launch; leave off if you don't use it."
            value={config.mobileBuilds}
            onChange={config.setMobileBuilds}
          />
        </OptionGroup>

        <OptionGroup
          title="Launcher"
          description="Behaviour and appearance."
        >
          <ToggleOption
            label="Minimize on Launch"
            description="Minimize when launching Fortnite."
            value={config.minimizeOnLaunch}
            onChange={config.setMinimizeOnLaunch}
          />

          <ToggleOption
            label="Always on Top"
            description="Keep the launcher above other windows."
            value={config.alwaysOnTop}
            onChange={config.setAlwaysOnTop}
          />

          <ToggleOption
            label="Reduce Motion"
            description="Disable animations and transitions."
            value={config.reduceMotion}
            onChange={config.setReduceMotion}
          />
        </OptionGroup>

        <div className="text-center pt-2 pb-6">
          <p className={`text-xs font-semibold tracking-wide ${colors.current.text.secondary}`}>
            {Config.NAME} v{Config.VERSION} · auto-updates enabled
          </p>
        </div>
      </div>
    </motion.div>
  );
}
