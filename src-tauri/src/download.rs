use once_cell::sync::Lazy;
use reqwest::blocking::Client;
use reqwest::header::RANGE;
use std::fs::{self, File, OpenOptions};
use std::io::{Read, Write};
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use std::thread;
use std::time::Duration;
use tauri::{Emitter, Window};
use unrar::Archive;
use zip::read::ZipArchive;

static CANCEL_TOKEN: Lazy<Mutex<bool>> = Lazy::new(|| Mutex::new(false));

#[tauri::command]
pub fn cancel_download() {
    let mut token = CANCEL_TOKEN.lock().unwrap();
    *token = true;
}

#[tauri::command]
pub fn download_build(window: Window, url: String, folder_path: String) -> Result<(), String> {
    thread::spawn(move || {
        let client = Client::builder()
            .timeout(None)
            .connect_timeout(Duration::from_secs(30))
            .build()
            .unwrap();

        if let Err(e) = fs::create_dir_all(&folder_path) {
            let _ = window.emit("download-error", e.to_string());
            return;
        }

        let filename = url
            .split('/')
            .last()
            .unwrap_or("file.dat")
            .replace('%', "_");
        let file_path: PathBuf = Path::new(&folder_path).join(&filename);

        let existing_size = if file_path.exists() {
            fs::metadata(&file_path).map(|m| m.len()).unwrap_or(0)
        } else {
            0
        };

        let mut request = client.get(&url);
        if existing_size > 0 {
            request = request.header(RANGE, format!("bytes={}-", existing_size));
        }

        let mut response = match request.send() {
            Ok(r) => r,
            Err(e) => {
                let _ = window.emit("download-error", e.to_string());
                return;
            }
        };

        if !response.status().is_success() && response.status().as_u16() != 206 {
            let _ = window.emit(
                "download-error",
                format!("HTTP error: {}", response.status()),
            );
            return;
        }

        let total_size = if response.status().as_u16() == 206 {
            existing_size + response.content_length().unwrap_or(0)
        } else {
            response.content_length().unwrap_or(0)
        };

        let mut downloaded: u64 = existing_size;

        let mut file = if existing_size > 0 && response.status().as_u16() == 206 {
            match OpenOptions::new().append(true).open(&file_path) {
                Ok(f) => f,
                Err(e) => {
                    let _ = window.emit("download-error", e.to_string());
                    return;
                }
            }
        } else {
            match File::create(&file_path) {
                Ok(f) => f,
                Err(e) => {
                    let _ = window.emit("download-error", e.to_string());
                    return;
                }
            }
        };

        let mut buffer = [0u8; 8192];
        *CANCEL_TOKEN.lock().unwrap() = false;

        loop {
            if *CANCEL_TOKEN.lock().unwrap() {
                let _ = window.emit("download-cancelled", "cancelled");
                return;
            }

            let bytes_read = match response.read(&mut buffer) {
                Ok(0) => break,
                Ok(n) => n,
                Err(e) => {
                    let _ = window.emit("download-error", e.to_string());
                    return;
                }
            };

            if let Err(e) = file.write(&buffer[..bytes_read]) {
                let _ = window.emit("download-error", e.to_string());
                return;
            }

            downloaded += bytes_read as u64;
            let progress = if total_size > 0 {
                (downloaded as f64 / total_size as f64) * 100.0
            } else {
                0.0
            };

            let _ = window.emit(
                "download-progress",
                serde_json::json!({
                    "downloadedGB": downloaded as f64 / 1024.0 / 1024.0 / 1024.0,
                    "progress": progress,
                    "currentFile": filename,
                    "totalBytes": total_size
                }),
            );
        }

        drop(file);

        if *CANCEL_TOKEN.lock().unwrap() {
            return;
        }

        if filename.ends_with(".zip") {
            if let Ok(file) = File::open(&file_path) {
                if let Ok(mut zip) = ZipArchive::new(file) {
                    let total_files = zip.len();
                    for i in 0..total_files {
                        if *CANCEL_TOKEN.lock().unwrap() {
                            return;
                        }
                        let mut f = zip.by_index(i).unwrap();
                        let outpath = Path::new(&folder_path).join(f.mangled_name());
                        if let Some(parent) = outpath.parent() {
                            let _ = fs::create_dir_all(parent);
                        }
                        let mut outfile = File::create(&outpath).unwrap();
                        std::io::copy(&mut f, &mut outfile).unwrap();
                        let _ = window.emit(
                            "extract-progress",
                            serde_json::json!({
                                "currentFile": f.name(),
                                "index": i + 1,
                                "total": total_files
                            }),
                        );
                    }
                }
            }
            let _ = fs::remove_file(&file_path);
        } else if filename.ends_with(".rar") {
            let file_count = match Archive::new(&file_path).open_for_listing() {
                Ok(archive) => archive.count(),
                Err(_) => 0,
            };

            match Archive::new(&file_path).open_for_processing() {
                Ok(mut archive) => {
                    let mut extracted = 0;
                    loop {
                        if *CANCEL_TOKEN.lock().unwrap() {
                            return;
                        }

                        match archive.read_header() {
                            Ok(Some(header)) => {
                                let entry = header.entry();
                                let filename_str = entry.filename.to_string_lossy().to_string();

                                let _ = window.emit(
                                    "extract-progress",
                                    serde_json::json!({
                                        "currentFile": filename_str,
                                        "index": extracted + 1,
                                        "total": file_count
                                    }),
                                );

                                archive = match header.extract_with_base(&folder_path) {
                                    Ok(a) => a,
                                    Err(e) => {
                                        let _ = window.emit(
                                            "download-error",
                                            format!("Extract error: {}", e),
                                        );
                                        break;
                                    }
                                };
                                extracted += 1;
                            }
                            Ok(None) => break,
                            Err(e) => {
                                let _ = window
                                    .emit("download-error", format!("Read header error: {}", e));
                                break;
                            }
                        }
                    }
                }
                Err(e) => {
                    let _ = window.emit("download-error", format!("RAR open error: {}", e));
                }
            }

            let _ = fs::remove_file(&file_path);
        }

        *CANCEL_TOKEN.lock().unwrap() = false;
        let _ = window.emit(
            "download-finished",
            serde_json::json!({
                "filePath": folder_path,
                "totalBytes": total_size
            }),
        );
    });

    Ok(())
}
