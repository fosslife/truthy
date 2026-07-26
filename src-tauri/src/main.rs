// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
use std::fs;
use std::io::Write;
use std::path::Path;

use tauri::Manager;

use argon2::{self, Config};

const VAULT: &str = "vault.kdbx";
const VAULT_TMP: &str = "vault.kdbx.tmp";
const VAULT_BAK: &str = "vault.kdbx.bak";

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![gethash, read_qr, save_vault])
        .setup(|app| {
            #[cfg(debug_assertions)]
            app.get_webview_window("main").unwrap().open_devtools();

            Ok(())
        })
        // .on_window_event(|event| match event.event() {
        //  this is working but use-idle on FE is not working!
        //     tauri::WindowEvent::Focused(focus) => {
        //         event.window().emit("visibilitychanged", focus).unwrap();
        //     }
        //     _ => (),
        // })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

/// Persist the vault without ever leaving a truncated file behind.
///
/// The frontend used to call `writeTextFile`, which truncates and then writes,
/// so any interruption mid-write destroyed the vault -- and the app keeps no
/// backups by design. Instead:
///
///   1. write the new contents to `vault.kdbx.tmp` in full and fsync it
///   2. snapshot the current vault to `vault.kdbx.bak` (a copy, not a rename,
///      so `vault.kdbx` is never absent even momentarily)
///   3. rename tmp over the vault, which is atomic within one filesystem
///
/// At every point `vault.kdbx` is therefore a complete file: a crash during
/// step 1 leaves it untouched, a crash during step 2 leaves it untouched with a
/// partial `.bak` (an aid, never the source of truth), and step 3 cannot be
/// observed half-done. That is why no recovery-on-load path is needed.
///
/// `contents` is the base64 text the frontend already produces -- this changes
/// how the vault is written, not the on-disk format.
#[tauri::command]
async fn save_vault(app: tauri::AppHandle, contents: String) -> Result<(), String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("could not resolve the app data directory: {e}"))?;

    fs::create_dir_all(&dir).map_err(|e| format!("could not create {}: {e}", dir.display()))?;

    let vault = dir.join(VAULT);
    let tmp = dir.join(VAULT_TMP);
    let bak = dir.join(VAULT_BAK);

    write_synced(&tmp, contents.as_bytes())
        .map_err(|e| format!("could not write {}: {e}", tmp.display()))?;

    if vault.exists() {
        fs::copy(&vault, &bak)
            .map_err(|e| format!("could not back up the vault to {}: {e}", bak.display()))?;
    }

    fs::rename(&tmp, &vault)
        .map_err(|e| format!("could not replace {}: {e}", vault.display()))?;

    // Make the rename itself durable. Best-effort: a failure here means the
    // directory entry may not survive a power cut, but the data is written.
    #[cfg(unix)]
    if let Ok(handle) = fs::File::open(&dir) {
        let _ = handle.sync_all();
    }

    Ok(())
}

fn write_synced(path: &Path, bytes: &[u8]) -> std::io::Result<()> {
    let mut file = fs::File::create(path)?;
    file.write_all(bytes)?;
    file.sync_all()
}

#[tauri::command]
fn read_qr(path: String) -> String {
    let image = image::open(path).unwrap();
    let decoder = bardecoder::default_decoder();
    let result = decoder.decode(&image);
    let mut ret = String::new();

    for code in result {
        match code {
            Ok(code) => {
                println!("Decoded QR code: {:?}", code);
                ret.push_str(&code)
            }
            Err(e) => {
                println!("Error decoding QR code: {:?}", e);
                return "".to_string();
            }
        }
    }

    ret
}

#[tauri::command]
async fn gethash(
    password: Vec<u8>,
    salt: Vec<u8>,
    memory: u32,
    iterations: u32,
    length: u32,
    parallelism: u32,
) -> Vec<u8> {
    let config = Config {
        mem_cost: memory,
        lanes: parallelism,
        hash_length: length,
        time_cost: iterations,
        ad: &[],
        secret: &[],
        variant: argon2::Variant::Argon2id,
        version: argon2::Version::Version13,
    };

    argon2::hash_raw(&password, &salt, &config).unwrap()
}
