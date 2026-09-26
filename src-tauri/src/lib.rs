use std::fs;
use std::path::Path;

#[tauri::command]
async fn pick_file_to_open() -> Option<String> {
    let file = rfd::AsyncFileDialog::new()
        .add_filter("Manuscript Files (*.chronicle, *.epub, *.md)", &["chronicle", "epub", "md", "markdown", "mdown", "mkd"])
        .add_filter("Chronicle Project (*.chronicle)", &["chronicle"])
        .add_filter("EPUB Books (*.epub)", &["epub"])
        .add_filter("Markdown Files (*.md, *.markdown)", &["md", "markdown", "mdown", "mkd"])
        .add_filter("All Files (*.*)", &["*"])
        .pick_file()
        .await;
    file.map(|f| f.path().to_string_lossy().to_string())
}

#[tauri::command]
async fn pick_file_to_save(default_name: Option<String>) -> Option<String> {
    let mut dialog = rfd::AsyncFileDialog::new()
        .add_filter("Chronicle Project (*.chronicle)", &["chronicle"])
        .add_filter("All Files (*.*)", &["*"]);

    if let Some(ref name) = default_name {
        dialog = dialog.set_file_name(name);
    }

    let file = dialog.save_file().await;
    file.map(|f| f.path().to_string_lossy().to_string())
}

#[tauri::command]
fn read_binary_file(path: String) -> Result<Vec<u8>, String> {
    fs::read(&path).map_err(|e| format!("Failed to read file '{}': {}", path, e))
}

#[tauri::command]
fn write_binary_file(path: String, contents: Vec<u8>) -> Result<(), String> {
    if let Some(parent) = Path::new(&path).parent() {
        if !parent.as_os_str().is_empty() && !parent.exists() {
            fs::create_dir_all(parent).map_err(|e| format!("Failed to create directory: {}", e))?;
        }
    }
    fs::write(&path, contents).map_err(|e| format!("Failed to write file '{}': {}", path, e))
}

#[tauri::command]
fn file_exists(path: String) -> bool {
    Path::new(&path).exists()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    #[cfg(target_os = "linux")]
    {
        // Fix for WebKitGTK DMA-BUF renderer on Linux (Fedora, Wayland, Mesa/NVIDIA)
        // which causes a blank or gray window due to GBM buffer allocation failure.
        if std::env::var_os("WEBKIT_DISABLE_DMABUF_RENDERER").is_none() {
            std::env::set_var("WEBKIT_DISABLE_DMABUF_RENDERER", "1");
        }
    }

    tauri::Builder::default()
        .plugin(tauri_plugin_http::init())
        .invoke_handler(tauri::generate_handler![
            pick_file_to_open,
            pick_file_to_save,
            read_binary_file,
            write_binary_file,
            file_exists
        ])
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

