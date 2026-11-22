use std::ffi::{CString, OsStr, OsString};
use std::fs;
use std::io::{Read, Write as _};
use std::mem::zeroed;
use std::os::windows::process::CommandExt;
use std::path::{Path, PathBuf};
use std::process::{Command, Stdio};
use winapi::shared::windef::HWND;
use winapi::um::processthreadsapi::GetProcessId;
use winapi::um::shellapi::{ShellExecuteExA, SEE_MASK_NOCLOSEPROCESS, SHELLEXECUTEINFOA};
use winapi::um::{handleapi::CloseHandle, winbase::CREATE_SUSPENDED, winuser::SW_SHOW};

use tauri::Emitter;
use tauri::Window;

use crate::utilities;

use serde::Deserialize;

// A required game pak the launcher must have on disk, described by the backend
// manifest (GET /api/launcher/paks). `size` is the authoritative byte size — a
// local file whose size doesn't match is treated as missing/outdated and
// redownloaded. Editing the manifest server-side is how paks get updated monthly.
#[derive(Debug, Deserialize)]
pub struct PakEntry {
    pub name: String,
    pub url: String,
    pub size: u64,
}

// A required pak needs (re)downloading if it's missing, or if we know its
// expected size and the local file doesn't match. When size is 0 (unknown) an
// existing file is trusted so we don't refetch large files every launch.
fn pak_needs_download(path: &Path, expected_size: u64) -> bool {
    match fs::metadata(path) {
        Ok(meta) => expected_size != 0 && meta.len() != expected_size,
        Err(_) => true,
    }
}

const CREATE_NO_WINDOW: u32 = 0x08000000;

// The Arc anticheat config (client id + loader url) is fetched from the backend
// at launch time — NOT hardcoded here — so it stays out of the public source and
// can be rotated server-side. This is only a fallback loader url (public, not a
// secret) used if the backend omits one; the client id always comes from backend.
const ARC_EXE_URL_FALLBACK: &str =
    "https://cloud.arc-services.dev/modules/anticheat/Arc.exe";

#[derive(serde::Deserialize)]
struct ArcConfigResp {
    #[serde(rename = "clientId")]
    client_id: String,
    #[serde(rename = "exeUrl")]
    exe_url: Option<String>,
}

// Fetch the Arc client id (and loader url) from the backend. `backend` is the
// host:port the launch was given (e.g. "pulsefn.de:2603"); it may already carry
// a scheme. Fails closed — Arc can't run with a wrong/missing client id anyway.
fn fetch_arc_config(backend: &str) -> Result<(String, String), String> {
    let base = backend.trim().trim_end_matches('/');
    let url = if base.starts_with("http://") || base.starts_with("https://") {
        format!("{}/api/launcher/arc", base)
    } else {
        format!("http://{}/api/launcher/arc", base)
    };

    let client = reqwest::blocking::Client::builder()
        .timeout(std::time::Duration::from_secs(15))
        .build()
        .map_err(|e| format!("Failed to build http client: {}", e))?;

    let resp = client
        .get(&url)
        .send()
        .map_err(|e| format!("Failed to fetch Arc config: {}", e))?;
    if !resp.status().is_success() {
        return Err(format!("Arc config request failed: HTTP {}", resp.status()));
    }

    let parsed: ArcConfigResp = resp
        .json()
        .map_err(|e| format!("Failed to parse Arc config: {}", e))?;

    let client_id = parsed.client_id.trim().to_string();
    if client_id.is_empty() {
        return Err("Backend returned an empty Arc client id".to_string());
    }

    let exe_url = parsed
        .exe_url
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty())
        .unwrap_or_else(|| ARC_EXE_URL_FALLBACK.to_string());

    Ok((client_id, exe_url))
}

fn is_hex32(s: &str) -> bool {
    let s = s.trim();
    s.len() == 32 && s.bytes().all(|c| matches!(c, b'0'..=b'9' | b'a'..=b'f' | b'A'..=b'F'))
}

fn b64url_encode(data: &[u8]) -> String {
    const TABLE: &[u8; 64] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
    let mut out = String::with_capacity(((data.len() + 2) / 3) * 4);
    let mut i = 0;
    while i + 3 <= data.len() {
        let n = ((data[i] as u32) << 16) | ((data[i + 1] as u32) << 8) | (data[i + 2] as u32);
        out.push(TABLE[((n >> 18) & 63) as usize] as char);
        out.push(TABLE[((n >> 12) & 63) as usize] as char);
        out.push(TABLE[((n >> 6) & 63) as usize] as char);
        out.push(TABLE[(n & 63) as usize] as char);
        i += 3;
    }
    let rem = data.len() - i;
    if rem == 1 {
        let n = (data[i] as u32) << 16;
        out.push(TABLE[((n >> 18) & 63) as usize] as char);
        out.push(TABLE[((n >> 12) & 63) as usize] as char);
    } else if rem == 2 {
        let n = ((data[i] as u32) << 16) | ((data[i + 1] as u32) << 8);
        out.push(TABLE[((n >> 18) & 63) as usize] as char);
        out.push(TABLE[((n >> 12) & 63) as usize] as char);
        out.push(TABLE[((n >> 6) & 63) as usize] as char);
    }
    out
}

// Per-user token our gameserver's join validation reads as a fallback to extract
// account_id when UniqueId replication bytes are empty (see exloBackend gameserver checks).
// NOTE: this is an UNSIGNED JWT (alg:none) — there is no signing key here. The
// calderaGuid below is a static, non-secret identifier, not a credential.
fn make_caldera_token(account_id: &str) -> String {
    let header = r#"{"alg":"none","typ":"JWT"}"#;
    let payload = format!(
        r#"{{"account_id":"{}","generated":0,"calderaGuid":"3810b863-2a65-4457-9b58-4dab3b482a86","acProvider":"EasyAntiCheat","notes":"","fallback":false}}"#,
        account_id
    );
    format!(
        "{}.{}.x",
        b64url_encode(header.as_bytes()),
        b64url_encode(payload.as_bytes())
    )
}

fn get_remote_file_size(url: &str) -> Result<u64, String> {
    let client = reqwest::blocking::Client::new();
    let response = client
        .head(url)
        .send()
        .map_err(|e| format!("Failed to get file info: {}", e))?;

    response
        .headers()
        .get(reqwest::header::CONTENT_LENGTH)
        .and_then(|v| v.to_str().ok())
        .and_then(|s| s.parse::<u64>().ok())
        .ok_or_else(|| "Could not determine remote file size".to_string())
}

fn should_skip_download(local_path: &Path, remote_url: &str) -> Result<bool, String> {
    if !local_path.exists() {
        return Ok(false);
    }

    let local_size = fs::metadata(local_path)
        .map_err(|e| format!("Failed to get local file size: {}", e))?
        .len();

    match get_remote_file_size(remote_url) {
        Ok(remote_size) => Ok(local_size == remote_size),
        Err(_) => Ok(false),
    }
}

// Streams a `progress` event for the game-file phase.
fn emit_pak_progress(window: &Window, label: &str, downloaded: u64, total: u64) {
    let pct: i64 = if total > 0 {
        (((downloaded as f64 / total as f64) * 100.0) as i64).min(100)
    } else {
        0
    };
    let _ = window.emit(
        "download-progress",
        serde_json::json!({
            "type": "gamefile",
            "file": label,
            "progress": pct,
            "downloadedMB": downloaded / (1024 * 1024),
            "totalMB": total / (1024 * 1024),
        }),
    );
}

/// Downloads a (multi-GB) game pak RESUMABLY. Writes to `<dest>.part` and, on any
/// connection drop, resumes from the bytes already on disk via an HTTP Range
/// request (`bytes=<have>-`) instead of restarting from zero — so a hiccup near
/// the end costs a few retried megabytes, not the whole 2.8 GB. Only renames the
/// `.part` into place once the full expected size is present, so an interrupted
/// download is never mistaken for a finished one. Flat memory use (256 KB chunks)
/// regardless of file size.
fn download_pak_resumable(
    window: &Window,
    url: &str,
    dest: &Path,
    label: &str,
    expected_size: u64,
) -> Result<(), String> {
    let part_path = {
        let mut s = dest.as_os_str().to_os_string();
        s.push(".part");
        PathBuf::from(s)
    };

    let client = reqwest::blocking::Client::builder()
        .connect_timeout(std::time::Duration::from_secs(30))
        .build()
        .map_err(|e| format!("Failed to build HTTP client: {}", e))?;

    const MAX_ATTEMPTS: u32 = 40;
    const EMIT_EVERY: u64 = 8 * 1024 * 1024; // ~8 MB
    let mut attempt: u32 = 0;

    loop {
        // Bytes already on disk are the source of truth for where to resume.
        let mut downloaded = fs::metadata(&part_path).map(|m| m.len()).unwrap_or(0);

        if expected_size != 0 && downloaded >= expected_size {
            break; // already complete
        }

        attempt += 1;
        if attempt > MAX_ATTEMPTS {
            return Err(format!(
                "Download of '{}' keeps dropping (got {} / {} bytes after {} tries). Check your connection and try again — it will resume where it left off.",
                label, downloaded, expected_size, MAX_ATTEMPTS
            ));
        }

        // Resume from where we stopped.
        let mut req = client.get(url);
        if downloaded > 0 {
            req = req.header(reqwest::header::RANGE, format!("bytes={}-", downloaded));
        }

        let resp = match req.send() {
            Ok(r) => r,
            Err(_) => {
                std::thread::sleep(std::time::Duration::from_secs(3));
                continue;
            }
        };

        let status = resp.status();
        if !status.is_success() {
            std::thread::sleep(std::time::Duration::from_secs(3));
            continue;
        }

        // If we asked to resume but the server ignored the Range and sent the whole
        // file (200 instead of 206), we must start over from scratch.
        let restart = downloaded > 0 && status.as_u16() == 200;
        let mut file = if restart {
            downloaded = 0;
            fs::File::create(&part_path).map_err(|e| format!("Failed to create file: {}", e))?
        } else {
            std::fs::OpenOptions::new()
                .create(true)
                .append(true)
                .open(&part_path)
                .map_err(|e| format!("Failed to open file: {}", e))?
        };

        let total = if expected_size != 0 {
            expected_size
        } else {
            downloaded + resp.content_length().unwrap_or(0)
        };

        let mut resp = resp;
        let mut buf = vec![0u8; 256 * 1024];
        let mut last_emit = downloaded;
        emit_pak_progress(window, label, downloaded, total);

        loop {
            match resp.read(&mut buf) {
                Ok(0) => break, // stream ended (may still be short → checked below)
                Ok(n) => {
                    if let Err(e) = file.write_all(&buf[..n]) {
                        return Err(format!("Disk write error on '{}': {}", label, e));
                    }
                    downloaded += n as u64;
                    if downloaded - last_emit >= EMIT_EVERY
                        || (total > 0 && downloaded >= total)
                    {
                        last_emit = downloaded;
                        emit_pak_progress(window, label, downloaded, total);
                    }
                }
                Err(_) => break, // connection dropped — resume on next attempt
            }
        }
        let _ = file.flush();

        let have = fs::metadata(&part_path).map(|m| m.len()).unwrap_or(0);
        if expected_size != 0 {
            if have >= expected_size {
                break;
            }
            // Incomplete — brief backoff, then the outer loop resumes.
            std::thread::sleep(std::time::Duration::from_secs(2));
            continue;
        } else {
            // Unknown size: a clean end-of-stream is our only completion signal.
            break;
        }
    }

    // Verify the finished size before trusting it.
    let final_size = fs::metadata(&part_path).map(|m| m.len()).unwrap_or(0);
    if expected_size != 0 && final_size != expected_size {
        let _ = fs::remove_file(&part_path);
        return Err(format!(
            "Game file '{}' finished at the wrong size (expected {}, got {}). Please try again.",
            label, expected_size, final_size
        ));
    }

    if dest.exists() {
        let _ = fs::remove_file(dest);
    }
    fs::rename(&part_path, dest).map_err(|e| format!("Failed to finalize '{}': {}", label, e))?;

    emit_pak_progress(window, label, final_size, final_size);
    Ok(())
}

/// Derives the local filename a custom-pak/extra-DLL link would be saved as —
/// shared between download and cleanup so "Verify Files" removes exactly the
/// files launch would (re)create, not anything the player added themselves.
fn derive_link_filename(link: &str, idx: usize, fallback_prefix: &str, fallback_ext: &str) -> String {
    let clean_url = link.split('?').next().unwrap_or(link);
    match clean_url.rsplit('/').next() {
        Some(name) if !name.is_empty() => name.replace('%', "_"),
        _ => format!("{}_{}.{}", fallback_prefix, idx, fallback_ext),
    }
}

/// Ensures every file the launcher itself manages (redirect DLL, Arc loader +
/// config, custom paks) is present and correctly sized, downloading only what's
/// missing or mismatched. Shared by launch_game and verify_build_files so both
/// "launch" and "repair" go through the exact same setup path.
fn ensure_launcher_managed_files(
    window: &Window,
    game_game_directory: &Path,
    build_root: &Path,
    paks_dir: &Path,
    redirect_link: &str,
    backend: &str,
    use_custom_paks: bool,
    custom_paks_links: &[String],
    paks_manifest: &[PakEntry],
) -> Result<PathBuf, String> {
    let game_dll_path = utilities::handle_game_dll_path(game_game_directory);

    if game_dll_path.exists() {
        utilities::remove_game_dll_sync(game_game_directory)
            .map_err(|err| format!("Failed to remove game DLL: {}", err))?;
    }

    match should_skip_download(&game_dll_path, redirect_link) {
        Ok(true) => {
            let _ = window.emit(
                "download-progress",
                serde_json::json!({
                    "type": "main_dll",
                    "file": game_dll_path.file_name().unwrap_or_default().to_string_lossy(),
                    "progress": 100,
                    "stage": "skipped"
                }),
            );
        }
        _ => {
            utilities::download_file(redirect_link, &game_dll_path)
                .map_err(|err| format!("Failed to download game DLL: {}", err))?;
        }
    }

    if !game_dll_path.exists() {
        return Err("Failed to find Redirect".to_string());
    }

    // Arc anticheat: re-fetch the loader fresh and point it at the real shipping
    // exe via Config.json. Arc.exe (not FortniteClient directly) is what actually
    // gets launched, so it can wrap the game with anticheat.
    let arc_dir = build_root.join("Arc");
    if !arc_dir.exists() {
        std::fs::create_dir_all(&arc_dir)
            .map_err(|e| format!("Failed to create Arc dir: {}", e))?;
    }
    let arc_exe_path = arc_dir.join("Arc.exe");
    let arc_config_path = arc_dir.join("Config.json");

    if arc_exe_path.exists() {
        let _ = std::fs::remove_file(&arc_exe_path);
    }
    if arc_config_path.exists() {
        let _ = std::fs::remove_file(&arc_config_path);
    }

    // Pull the Arc client id + loader url from the backend (kept out of source).
    let (arc_client_id, arc_exe_url) = fetch_arc_config(backend)?;

    utilities::download_file(&arc_exe_url, &arc_exe_path)
        .map_err(|e| format!("Failed to download Arc: {}", e))?;

    let arc_config = format!(
        "{{\n    \"ClientID\": \"{}\",\n    \"Executable\": \"FortniteGame\\\\Binaries\\\\Win64\\\\FortniteClient-Win64-Shipping.exe\"\n}}",
        arc_client_id
    );
    std::fs::write(&arc_config_path, arc_config)
        .map_err(|e| format!("Failed to write Arc config: {}", e))?;

    if !arc_exe_path.exists() {
        return Err("Failed to find Arc (game bootstrapper)".to_string());
    }

    std::fs::create_dir_all(paks_dir).map_err(|e| format!("Failed to create Paks dir: {}", e))?;

    if use_custom_paks && !custom_paks_links.is_empty() {
        for (idx, link) in custom_paks_links.iter().enumerate() {
            let link = link.trim();
            if link.is_empty() {
                continue;
            }

            let filename = derive_link_filename(link, idx, "CustomPak", "pak");
            let save_path = paks_dir.join(&filename);

            match should_skip_download(&save_path, link) {
                Ok(true) => {
                    let _ = window.emit(
                        "download-progress",
                        serde_json::json!({
                            "type": "pak",
                            "file": filename,
                            "progress": 100,
                            "stage": "skipped"
                        }),
                    );
                }
                _ => {
                    let _ = window.emit(
                        "download-progress",
                        serde_json::json!({
                            "type": "pak",
                            "file": filename,
                            "progress": 0
                        }),
                    );

                    utilities::download_file(link, &save_path)
                        .map_err(|err| format!("Failed to download custom pak '{}': {}", link, err))?;

                    let _ = window.emit(
                        "download-progress",
                        serde_json::json!({
                            "type": "pak",
                            "file": filename,
                            "progress": 100
                        }),
                    );
                }
            }
        }
    }

    // Required game paks from the backend manifest. Downloaded for everyone; a
    // file is fetched only when missing or the wrong size (authoritative size
    // from the manifest). Emitted as "gamefile" so the UI marks the phase
    // non-cancelable. When a pak is updated server-side (new url + size), the
    // size mismatch makes every launcher redownload it on the next launch.
    for pak in paks_manifest {
        let filename = Path::new(&pak.name)
            .file_name()
            .and_then(|s| s.to_str())
            .unwrap_or("");
        if filename.is_empty() || pak.url.trim().is_empty() {
            continue;
        }

        let save_path = paks_dir.join(filename);

        if !pak_needs_download(&save_path, pak.size) {
            let _ = window.emit(
                "download-progress",
                serde_json::json!({
                    "type": "gamefile",
                    "file": filename,
                    "progress": 100,
                    "stage": "skipped"
                }),
            );
            continue;
        }

        let _ = window.emit(
            "download-progress",
            serde_json::json!({
                "type": "gamefile",
                "file": filename,
                "progress": 0
            }),
        );

        // Resumable + retrying: only renames into place once the full expected
        // size is on disk, so a drop near the end resumes instead of restarting,
        // and an interrupted download is never mistaken for a finished one.
        download_pak_resumable(window, pak.url.trim(), &save_path, filename, pak.size)
            .map_err(|err| format!("Failed to download game file '{}': {}", filename, err))?;
    }

    Ok(arc_exe_path)
}

fn build_root_and_dirs(file_path: &str) -> (PathBuf, PathBuf, PathBuf, PathBuf) {
    let game_path = PathBuf::from(file_path);
    let game_game_directory = game_path
        .parent()
        .expect("Failed to get parent directory")
        .parent()
        .expect("Failed to get FortniteGame directory")
        .to_path_buf();
    let build_root = game_game_directory
        .parent()
        .expect("Failed to get FortniteGame directory")
        .parent()
        .expect("Failed to get build root directory")
        .to_path_buf();
    let paks_dir = build_root.join("FortniteGame").join("Content").join("Paks");
    (game_path, game_game_directory, build_root, paks_dir)
}

#[tauri::command]
pub async fn launch_game(
    window: Window,
    file_path: String,
    email: String,
    password: String,
    redirect_link: String,
    backend: String,
    inject_extra_dlls: bool,
    extra_dll_links: Vec<String>,
    use_custom_paks: bool,
    custom_paks_links: Vec<String>,
    extra_dll_options: Vec<std::collections::HashMap<String, String>>,
    paks_manifest: Vec<PakEntry>,
    account_id: String,
    arc_token: String,
    edit_on_release: bool,
    disable_pre_edits: bool,
    reset_on_release: bool,
) -> Result<bool, String> {
    // Heavy, blocking work (multi-GB pak downloads, DLL injection, process
    // spawning + sleeps) must NOT run on the main thread or the window freezes
    // and Windows shows "Not Responding". Run it on a blocking worker so the UI
    // stays responsive and download-progress events keep flowing.
    tauri::async_runtime::spawn_blocking(move || {
        launch_game_impl(
            window,
            file_path,
            email,
            password,
            redirect_link,
            backend,
            inject_extra_dlls,
            extra_dll_links,
            use_custom_paks,
            custom_paks_links,
            extra_dll_options,
            paks_manifest,
            account_id,
            arc_token,
            edit_on_release,
            disable_pre_edits,
            reset_on_release,
        )
    })
    .await
    .map_err(|e| format!("Launch task failed: {}", e))?
}

fn launch_game_impl(
    window: Window,
    file_path: String,
    email: String,
    password: String,
    redirect_link: String,
    backend: String,
    inject_extra_dlls: bool,
    extra_dll_links: Vec<String>,
    use_custom_paks: bool,
    custom_paks_links: Vec<String>,
    extra_dll_options: Vec<std::collections::HashMap<String, String>>,
    paks_manifest: Vec<PakEntry>,
    account_id: String,
    arc_token: String,
    edit_on_release: bool,
    disable_pre_edits: bool,
    reset_on_release: bool,
) -> Result<bool, String> {
    let _ = utilities::kill_all_procs();

    let (_game_path, game_game_directory, build_root, paks_dir) = build_root_and_dirs(&file_path);
    let game_game_directory = game_game_directory.as_path();
    let build_root = build_root.as_path();

    let cwd = game_game_directory.join("Win64");
    let fn_launcher = cwd.join("FortniteLauncher.exe");
    let eac = cwd.join("FortniteClient-Win64-Shipping_BE.exe");

    let arc_exe_path = ensure_launcher_managed_files(
        &window,
        game_game_directory,
        build_root,
        &paks_dir,
        &redirect_link,
        &backend,
        use_custom_paks,
        &custom_paks_links,
        &paks_manifest,
    )?;

    let effective_account_id = {
        let v = account_id.trim();
        if is_hex32(v) {
            v.to_string()
        } else if is_hex32(email.trim()) {
            email.trim().to_string()
        } else {
            String::new()
        }
    };

    if effective_account_id.is_empty() {
        return Err("Missing accountId for launch (required for Arc/caldera).".to_string());
    }

    let caldera = make_caldera_token(&effective_account_id);

    let mut combined_args = vec![
        "-epicapp=Fortnite",
        "-epicenv=Prod",
        "-epiclocale=en-us",
        "-epicportal",
        "-nobe",
        "-fromfl=eac",
        "-nocodeguards",
        "-nouac",
        // Public, community-shared Fortnite client launch flag (not a Pulse
        // credential — it authenticates nothing against our backend).
        "-fltoken=3db3ba5dcbd2e16703f3978d",
        "-caldera=",
        "-skippatchcheck",
        "-AUTH_TYPE=exchangecode",
        "-useallavailablecores",
        "-steamimportavailable",
    ]
    .into_iter()
    .map(|s| s.to_string())
    .collect::<Vec<String>>();

    if let Some(pos) = combined_args.iter().position(|a| a == "-caldera=") {
        combined_args[pos] = format!("-caldera={}", caldera);
    }

    combined_args.insert(combined_args.len() - 3, format!("-AUTH_LOGIN={}", email));
    combined_args.insert(
        combined_args.len() - 3,
        format!("-AUTH_PASSWORD={}", password),
    );

    if redirect_link == "https://ttttttttttttttttttttttttttttttttttt.vercel.app/Tellurium.dll" {
        combined_args.push(format!("-backend={}", backend));
    }

    // Build-editor behaviour toggles — direct Fortnite launch args, no DLL involved.
    if edit_on_release {
        combined_args.push("-eor".to_string());
    }
    if disable_pre_edits {
        combined_args.push("-dpe".to_string());
    }
    if reset_on_release {
        combined_args.push("-ror".to_string());
    }

    // Only the old "session" credential type used -t. Under the Exchange code
    // credential type there's no client token, so skip it when empty.
    if !arc_token.trim().is_empty() {
        combined_args.push(format!("-t={}", arc_token));
    }

    let combined_args_os: Vec<OsString> = combined_args
        .iter()
        .map(|arg| OsString::from(arg))
        .collect();

    let combined_args_str: String = combined_args_os
        .iter()
        .map(|s| s.to_string_lossy())
        .collect::<Vec<_>>()
        .join(" ");

    let hwnd: HWND = std::ptr::null_mut();

    let exe_str = arc_exe_path.to_str().ok_or("Invalid path to executable")?;
    let exe_cstring = CString::new(exe_str).map_err(|e| format!("CString error: {}", e))?;

    let args_cstring =
        CString::new(combined_args_str).map_err(|e| format!("CString error: {}", e))?;

    let lp_file = exe_cstring;
    let lp_params = args_cstring;
    let lp_verb = CString::new("runas").unwrap();

    let mut sei: SHELLEXECUTEINFOA = unsafe { zeroed() };
    sei.cbSize = std::mem::size_of::<SHELLEXECUTEINFOA>() as u32;
    sei.fMask = SEE_MASK_NOCLOSEPROCESS;
    sei.hwnd = hwnd;
    sei.lpVerb = lp_verb.as_ptr();
    sei.lpFile = lp_file.as_ptr();
    sei.lpParameters = lp_params.as_ptr();
    sei.nShow = SW_SHOW;

    let success = unsafe { ShellExecuteExA(&mut sei) };
    if success == 0 {
        return Err("ShellExecuteExA failed".to_string());
    }

    if sei.hProcess.is_null() {
        return Err("Failed to get process handle".to_string());
    }

    let pid = unsafe { GetProcessId(sei.hProcess) };
    unsafe { CloseHandle(sei.hProcess) };

    std::thread::sleep(std::time::Duration::from_secs(5));

    let _eac_proc = Command::new(&eac)
        .creation_flags(CREATE_NO_WINDOW | CREATE_SUSPENDED)
        .args(
            combined_args_os
                .iter()
                .map(|arg| arg as &OsStr)
                .collect::<Vec<&OsStr>>(),
        )
        .stdout(Stdio::piped())
        .spawn()
        .map_err(|e| format!("Failed to start EAC: {}", e));

    let _launcher_proc = Command::new(&fn_launcher)
        .creation_flags(CREATE_NO_WINDOW | CREATE_SUSPENDED)
        .args(
            combined_args_os
                .iter()
                .map(|arg| arg as &OsStr)
                .collect::<Vec<&OsStr>>(),
        )
        .stdout(Stdio::piped())
        .spawn()
        .map_err(|e| format!("Failed to start Launcher: {}", e));

    std::thread::sleep(std::time::Duration::from_secs(5));

    if inject_extra_dlls {
        for (idx, link) in extra_dll_links.iter().enumerate() {
            if link.trim().is_empty() {
                continue;
            }

            let filename = derive_link_filename(link, idx, "ExtraDll", "dll");
            let save_path = game_game_directory.join("Win64").join(&filename);

            match should_skip_download(&save_path, link) {
                Ok(true) => {
                    let _ = window.emit(
                        "download-progress",
                        serde_json::json!({
                            "type": "dll",
                            "file": filename,
                            "progress": 100,
                            "stage": "skipped"
                        }),
                    );
                }
                _ => {
                    let _ = window.emit(
                        "download-progress",
                        serde_json::json!({
                            "type": "dll",
                            "file": filename,
                            "progress": 0
                        }),
                    );

                    if let Err(err) = utilities::download_file(link, &save_path) {
                        return Err(format!("Failed to download extra DLL '{}': {}", link, err));
                    }

                    let _ = window.emit(
                        "download-progress",
                        serde_json::json!({
                            "type": "dll",
                            "file": filename,
                            "progress": 100
                        }),
                    );
                }
            }

            utilities::inject_dll(pid, save_path.to_str().ok_or("Invalid DLL path")?).map_err(
                |e| {
                    format!(
                        "Failed to inject extra DLL '{}': {}",
                        save_path.display(),
                        e
                    )
                },
            )?;

            std::thread::sleep(std::time::Duration::from_millis(300));
        }

        for option in extra_dll_options.iter() {
            for (_key, link) in option.iter() {
                if link.trim().is_empty() {
                    continue;
                }

                let clean_link = link.split('?').next().unwrap_or(link);

                let filename = match clean_link.rsplit('/').next() {
                    Some(name) if !name.is_empty() => name.replace('%', "_"),
                    _ => "OptionDll.dll".to_string(),
                };

                let save_path = game_game_directory.join("Win64").join(&filename);

                match should_skip_download(&save_path, link) {
                    Ok(true) => {
                        let _ = window.emit(
                            "download-progress",
                            serde_json::json!({
                                "type": "dll",
                                "file": filename,
                                "progress": 100,
                                "stage": "skipped"
                            }),
                        );
                    }
                    _ => {
                        let _ = window.emit(
                            "download-progress",
                            serde_json::json!({
                                "type": "dll",
                                "file": filename,
                                "progress": 0
                            }),
                        );

                        if let Err(err) = utilities::download_file(link, &save_path) {
                            return Err(format!(
                                "Failed to download option DLL '{}': {}",
                                link, err
                            ));
                        }

                        let _ = window.emit(
                            "download-progress",
                            serde_json::json!({
                                "type": "dll",
                                "file": filename,
                                "progress": 100
                            }),
                        );
                    }
                }

                utilities::inject_dll(pid, save_path.to_str().ok_or("Invalid DLL path")?).map_err(
                    |e| {
                        format!(
                            "Failed to inject option DLL '{}': {}",
                            save_path.display(),
                            e
                        )
                    },
                )?;

                std::thread::sleep(std::time::Duration::from_millis(300));
            }
        }
    }

    Ok(true)
}

/// Repairs a build: removes every file the launcher itself manages (redirect
/// DLL, Arc loader, configured custom paks/extra DLLs) and re-applies them
/// fresh via the same setup path launch_game uses. Never touches the player's
/// own Fortnite files or any pak it didn't put there itself.
#[tauri::command]
pub async fn verify_build_files(
    window: Window,
    file_path: String,
    redirect_link: String,
    backend: String,
    use_custom_paks: bool,
    custom_paks_links: Vec<String>,
    inject_extra_dlls: bool,
    extra_dll_links: Vec<String>,
    paks_manifest: Vec<PakEntry>,
) -> Result<bool, String> {
    // Same as launch: verify re-downloads managed files (incl. the big paks), so
    // run it off the main thread to keep the UI responsive.
    tauri::async_runtime::spawn_blocking(move || {
        verify_build_files_impl(
            window,
            file_path,
            redirect_link,
            backend,
            use_custom_paks,
            custom_paks_links,
            inject_extra_dlls,
            extra_dll_links,
            paks_manifest,
        )
    })
    .await
    .map_err(|e| format!("Verify task failed: {}", e))?
}

fn verify_build_files_impl(
    window: Window,
    file_path: String,
    redirect_link: String,
    backend: String,
    use_custom_paks: bool,
    custom_paks_links: Vec<String>,
    inject_extra_dlls: bool,
    extra_dll_links: Vec<String>,
    paks_manifest: Vec<PakEntry>,
) -> Result<bool, String> {
    let (_game_path, game_game_directory, build_root, paks_dir) = build_root_and_dirs(&file_path);
    let game_game_directory = game_game_directory.as_path();
    let build_root = build_root.as_path();

    let _ = window.emit(
        "verify-build",
        serde_json::json!({ "file": "Redirect DLL", "status": "checking" }),
    );

    let game_dll_path = utilities::handle_game_dll_path(game_game_directory);
    if game_dll_path.exists() {
        utilities::remove_game_dll_sync(game_game_directory)
            .map_err(|e| format!("Failed to remove game DLL: {}", e))?;
        let _ = window.emit(
            "verify-build",
            serde_json::json!({ "file": "Redirect DLL", "status": "deleted" }),
        );
    }

    let arc_dir = build_root.join("Arc");
    if arc_dir.exists() {
        std::fs::remove_dir_all(&arc_dir)
            .map_err(|e| format!("Failed to remove Arc folder: {}", e))?;
        let _ = window.emit(
            "verify-build",
            serde_json::json!({ "file": "Arc", "status": "deleted" }),
        );
    }

    if use_custom_paks {
        for (idx, link) in custom_paks_links.iter().enumerate() {
            let link = link.trim();
            if link.is_empty() {
                continue;
            }
            let filename = derive_link_filename(link, idx, "CustomPak", "pak");
            let path = paks_dir.join(&filename);
            if path.exists() {
                let _ = fs::remove_file(&path);
                let _ = window.emit(
                    "verify-build",
                    serde_json::json!({ "file": filename, "status": "deleted" }),
                );
            }
        }
    }

    if inject_extra_dlls {
        for (idx, link) in extra_dll_links.iter().enumerate() {
            let link = link.trim();
            if link.is_empty() {
                continue;
            }
            let filename = derive_link_filename(link, idx, "ExtraDll", "dll");
            let path = game_game_directory.join("Win64").join(&filename);
            if path.exists() {
                let _ = fs::remove_file(&path);
                let _ = window.emit(
                    "verify-build",
                    serde_json::json!({ "file": filename, "status": "deleted" }),
                );
            }
        }
    }

    // Required manifest paks are removed by name so ensure_* redownloads them
    // fresh. Only the files named in the manifest are touched — never the game's
    // own base paks.
    for pak in &paks_manifest {
        let filename = Path::new(&pak.name)
            .file_name()
            .and_then(|s| s.to_str())
            .unwrap_or("");
        if filename.is_empty() {
            continue;
        }
        let path = paks_dir.join(filename);
        if path.exists() {
            let _ = fs::remove_file(&path);
            let _ = window.emit(
                "verify-build",
                serde_json::json!({ "file": filename, "status": "deleted" }),
            );
        }
    }

    ensure_launcher_managed_files(
        &window,
        game_game_directory,
        build_root,
        &paks_dir,
        &redirect_link,
        &backend,
        use_custom_paks,
        &custom_paks_links,
        &paks_manifest,
    )?;

    let _ = window.emit(
        "verify-build",
        serde_json::json!({ "file": "All files", "status": "done" }),
    );

    Ok(true)
}

#[tauri::command]
pub fn close_game() -> Result<(), String> {
    let _ = utilities::kill_all_procs();
    Ok(())
}
