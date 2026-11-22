use std::fs;
use std::io::{Read, Write as _};
use std::os::windows::process::CommandExt;
use std::path::PathBuf;
use std::process::Command;
use std::time::Duration;

use tauri::{Emitter, Manager, Window};

const CREATE_NO_WINDOW: u32 = 0x08000000;

// Streams the update MSI to `dest`, emitting `update-progress`. `expected` is the
// size the backend reported (the download comes back chunked with no
// Content-Length, so we use the known size for the percentage).
fn stream_download(
    window: &Window,
    url: &str,
    dest: &PathBuf,
    expected: u64,
) -> Result<(), String> {
    let client = reqwest::blocking::Client::builder()
        .connect_timeout(Duration::from_secs(30))
        .build()
        .map_err(|e| format!("HTTP client error: {}", e))?;

    let mut resp = client
        .get(url)
        .send()
        .map_err(|e| format!("Update download failed: {}", e))?
        .error_for_status()
        .map_err(|e| format!("Update server error: {}", e))?;

    let total = if expected > 0 {
        expected
    } else {
        resp.content_length().unwrap_or(0)
    };

    let mut file = fs::File::create(dest).map_err(|e| format!("Create file error: {}", e))?;
    let mut buf = vec![0u8; 256 * 1024];
    let mut downloaded: u64 = 0;
    let mut last: u64 = 0;

    loop {
        let n = resp
            .read(&mut buf)
            .map_err(|e| format!("Update read error: {}", e))?;
        if n == 0 {
            break;
        }
        file.write_all(&buf[..n])
            .map_err(|e| format!("Update write error: {}", e))?;
        downloaded += n as u64;

        if downloaded - last >= 1024 * 1024 || (total > 0 && downloaded >= total) {
            last = downloaded;
            let pct: i64 = if total > 0 {
                (((downloaded as f64 / total as f64) * 100.0) as i64).min(100)
            } else {
                0
            };
            let _ = window.emit(
                "update-progress",
                serde_json::json!({
                    "progress": pct,
                    "downloadedMB": downloaded / (1024 * 1024),
                    "totalMB": total / (1024 * 1024),
                }),
            );
        }
    }

    file.flush().map_err(|e| format!("Update flush error: {}", e))?;
    Ok(())
}

/// Downloads the given update MSI and installs it: writes a small batch that
/// waits for this process to exit, runs the installer over the existing install,
/// and relaunches the (now-updated) exe from the same path. The launcher then
/// exits so the MSI can replace its files.
#[tauri::command]
pub async fn download_and_install_update(
    window: Window,
    url: String,
    size: u64,
) -> Result<(), String> {
    let app = window.app_handle().clone();
    let win = window.clone();

    let msi_path = tauri::async_runtime::spawn_blocking(move || -> Result<PathBuf, String> {
        let tmp = std::env::temp_dir().join("Pulse_update.msi");
        let mut attempt = 0;
        loop {
            attempt += 1;
            match stream_download(&win, &url, &tmp, size) {
                Ok(()) => {
                    let got = fs::metadata(&tmp).map(|m| m.len()).unwrap_or(0);
                    if size == 0 || got == size {
                        return Ok(tmp);
                    }
                }
                Err(e) => {
                    if attempt >= 5 {
                        return Err(e);
                    }
                }
            }
            if attempt >= 5 {
                return Err("Update download failed after several attempts.".to_string());
            }
            std::thread::sleep(Duration::from_secs(2));
        }
    })
    .await
    .map_err(|e| format!("Update task failed: {}", e))??;

    let current_exe = std::env::current_exe().map_err(|e| e.to_string())?;
    let bat = std::env::temp_dir().join("pulse_update.bat");
    // ping = a portable ~3s wait so the launcher fully exits before msiexec runs;
    // /passive shows a progress bar with no prompts; then relaunch the same path.
    let script = format!(
        "@echo off\r\nping 127.0.0.1 -n 4 >nul\r\nmsiexec /i \"{}\" /passive /norestart\r\nstart \"\" \"{}\"\r\ndel \"%~f0\"\r\n",
        msi_path.display(),
        current_exe.display()
    );
    fs::write(&bat, script).map_err(|e| format!("Failed to write update script: {}", e))?;

    Command::new("cmd")
        .args(["/C", "start", "", "/min", bat.to_str().ok_or("Invalid batch path")?])
        .creation_flags(CREATE_NO_WINDOW)
        .spawn()
        .map_err(|e| format!("Failed to start installer: {}", e))?;

    std::thread::sleep(Duration::from_millis(300));
    app.exit(0);
    Ok(())
}
