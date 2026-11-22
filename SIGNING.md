# Code signing the Pulse launcher

Signing the installer removes the "Unknown Publisher" / SmartScreen warning and cuts
down antivirus false-positives. This is set up so **normal builds stay unsigned** and
signing is opt-in via a separate config — nothing breaks before you have a certificate.

## What you need
A **Windows code-signing certificate**. Since June 2023 the private key must live on a
**hardware token (USB)** or a **cloud HSM** — you can't just have a `.pfx` file.
- **EV** cert → instant SmartScreen trust (recommended). ~$300–600/yr.
- **OV** cert → trust builds over time. Cheapest reputable option: **Certum Open Source
  Code Signing** (~$100–150/yr incl. token).
- CAs: Certum, SSL.com, Sectigo, DigiCert, GlobalSign.

The private key **never** goes in this repo — it stays on the token/HSM.

## One-time setup
1. Plug in the token / finish your CA's setup so the certificate is in the Windows
   certificate store. Find its **thumbprint**:
   ```powershell
   Get-ChildItem Cert:\CurrentUser\My | Format-List Subject, Thumbprint
   ```
   (Copy the Thumbprint, remove any spaces.)
2. Put it into [`src-tauri/tauri.signing.conf.json`](src-tauri/tauri.signing.conf.json),
   replacing `REPLACE_WITH_YOUR_CERT_THUMBPRINT`. Set `timestampUrl` to your CA's
   timestamp server if different (DigiCert/Sectigo/SSL.com all publish one — the
   timestamp keeps the signature valid after the cert expires).

## Building a SIGNED release
```bash
bun run tauri build --config src-tauri/tauri.signing.conf.json
```
- Tauri signs both the `.exe` and the `.msi` with your certificate.
- The token may prompt for its **PIN** during signing.
- This is also how you build the **auto-update** MSI — build signed, then drop it in
  the backend's `update/` folder as usual.

A normal `bun run tauri build` (no `--config`) stays unsigned, for quick local testing.

## Cloud HSM / eSigner / KeyLocker (no thumbprint)
If your CA uses a cloud signing service (SSL.com eSigner, DigiCert KeyLocker, Certum
cloud), use a custom sign command instead of a thumbprint — replace the `windows`
block in `tauri.signing.conf.json` with:
```json
"windows": {
  "signCommand": "your-cli sign --input %1"
}
```
(`%1` is the file Tauri passes in.) Follow your provider's exact CLI.

## Verify it worked
```bash
signtool verify /pa /v "src-tauri/target/release/bundle/msi/Pulse_x.y.z_x64_en-US.msi"
```
Or right-click the `.msi` → **Properties → Digital Signatures**.
