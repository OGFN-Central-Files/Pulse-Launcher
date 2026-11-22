"use client";

import { OptionGroup } from "./OptionGroup";
import { ToggleOption } from "./ToggleOption";
import { DropdownOption } from "./DropdownOption";

export function OptionsTab() {
  return (
    <div className="flex flex-col gap-5">
      <OptionGroup title="General" description="Core launcher settings">
        <ToggleOption
          label="Launch on startup"
          description="Automatically start the launcher when your system boots"
          defaultChecked={true}
        />
        <div className="h-px bg-border" />
        <ToggleOption
          label="Minimize to tray"
          description="Keep running in the system tray when closed"
          defaultChecked={true}
        />
        <div className="h-px bg-border" />
        <ToggleOption
          label="Auto-update"
          description="Automatically download and install updates"
          defaultChecked={true}
        />
      </OptionGroup>

      <OptionGroup
        title="Notifications"
        description="Control how you receive alerts"
      >
        <ToggleOption
          label="Desktop notifications"
          description="Show system notifications for important events"
          defaultChecked={true}
        />
        <div className="h-px bg-border" />
        <ToggleOption
          label="Sound effects"
          description="Play audio cues for actions and alerts"
          defaultChecked={false}
        />
      </OptionGroup>

      <OptionGroup title="Performance" description="Optimize resource usage">
        <DropdownOption
          label="Hardware acceleration"
          description="Use GPU for rendering when available"
          options={[
            { value: "auto", label: "Auto" },
            { value: "enabled", label: "Enabled" },
            { value: "disabled", label: "Disabled" },
          ]}
          defaultValue="auto"
        />
        <div className="h-px bg-border" />
        <ToggleOption
          label="Low power mode"
          description="Reduce background activity to save battery"
          defaultChecked={false}
        />
      </OptionGroup>
    </div>
  );
}
