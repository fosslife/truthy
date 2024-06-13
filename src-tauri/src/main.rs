// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
use tauri::Manager;

use argon2::{self, Config};

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![gethash, read_qr])
        .setup(|app| {
            #[cfg(debug_assertions)]
            app.get_window("main").unwrap().open_devtools();

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
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
