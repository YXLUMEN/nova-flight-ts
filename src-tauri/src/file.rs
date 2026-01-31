use serde::Serialize;
use std::fs;
use std::path::{Path, PathBuf};
use tauri_plugin_dialog::DialogExt;

#[derive(Serialize)]
pub struct ChosenDirResult {
    root: String,
    files: Vec<String>,
}

#[tauri::command]
pub fn chose_dir(app: tauri::AppHandle) -> Result<ChosenDirResult, String> {
    if let Some(dir) = app.dialog().file().blocking_pick_folder() {
        if let Some(path) = dir.as_path() {
            let mut files: Vec<PathBuf> = Vec::new();

            traverse_dir(path, &mut files, 0).map_err(|e| e.to_string())?;
            files.push(path.to_path_buf());

            let file_path: Vec<String> = files
                .into_iter()
                .filter_map(|p| p.to_str().map(|s| s.to_owned()))
                .collect();

            let root = path.to_str().ok_or("Invalid path encoding")?.to_owned();

            return Ok(ChosenDirResult {
                root,
                files: file_path,
            });
        }
    }

    Ok(ChosenDirResult {
        root: String::new(),
        files: Vec::new(),
    })
}

fn traverse_dir(dir_path: &Path, collect: &mut Vec<PathBuf>, depth: u8) -> std::io::Result<()> {
    if depth > 8 {
        return Ok(());
    }

    let dir = fs::read_dir(dir_path)?;
    for entry in dir {
        let entry = entry?;
        let path = entry.path();

        if path.is_file() {
            collect.push(path);
        } else if path.is_dir() {
            traverse_dir(&path, collect, depth + 1)?;
        }
    }
    Ok(())
}
