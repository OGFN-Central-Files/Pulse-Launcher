# Security & "Is this a virus?"

Short answer: **no.** This repository exists so you can read every line and confirm
that for yourself before running the launcher.

## Why antivirus / Windows SmartScreen may warn about it
The Pulse launcher does two things that antivirus *heuristics* treat as suspicious,
even though they are completely normal for a game launcher + anticheat:

1. **It injects a DLL and starts the Arc anticheat** to launch Fortnite. Process
   injection is exactly what the game/anticheat needs to run — but generic AV
   engines flag *any* injection as "potentially unwanted."
2. **The installer is (until signed) an "unknown publisher".** Windows SmartScreen
   warns about any executable that isn't code-signed with a recognized identity.

Neither of these means malware. They mean "this program touches another process,"
which a launcher must do.

## What the launcher actually does
- Signs you in with **Discord** (OAuth, handled by the Pulse backend).
- Downloads and verifies the game paks from the Pulse backend (resumable, size-checked).
- Launches Fortnite through **Arc** anticheat.
- Auto-updates itself from the Pulse backend.
- Shows the shop, news, leaderboard, and live server status.

It does **not** read your files, harvest data, or talk to anything except the Pulse
backend. All of that is verifiable in [`src/`](src/) and [`src-tauri/`](src-tauri/).

## Verifying a release
Official releases are **code-signed** (see [SIGNING.md](SIGNING.md)). You can check a
downloaded installer:
- Right-click the `.msi` → **Properties → Digital Signatures** → it should show the
  Pulse publisher, or
- `signtool verify /pa /v Pulse_x.y.z_x64_en-US.msi`

If a build is **not** signed and you're unsure, build it yourself from this source
(`bun install && bun run tauri build`) and compare.

## Reporting a security issue
Found something that looks wrong? Please report it privately first:
- Discord: the Pulse server (ping a staff/admin)
- Do **not** open a public issue for anything security-sensitive until it's addressed.

The backend (accounts, auth, keys) is closed-source and is **not** in this repo — so
nothing here exposes user data or secrets.
