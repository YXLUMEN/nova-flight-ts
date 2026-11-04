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
    let result = ChosenDirResult {
        root: String::new(),
        files: Vec::new(),
    };

    let Some(dir) = app.dialog().file().blocking_pick_folder() else {
        return Ok(result);
    };

    let Some(path) = dir.as_path() else {
        return Ok(result);
    };

    let mut files: Vec<PathBuf> = Vec::new();
    traverse_dir(path, &mut files, 0, 8).map_err(|e| e.to_string())?;
    files.push(path.to_path_buf());

    make_result(result, path, &files)
}

#[tauri::command]
pub fn traverse_dir_cmd(url: &str, max_depth: u8) -> Result<ChosenDirResult, String> {
    if max_depth > 32 {
        return Err(String::from("Max depth exceeded"));
    }

    let result = ChosenDirResult {
        root: String::new(),
        files: Vec::new(),
    };

    let path = Path::new(url);
    let mut files: Vec<PathBuf> = Vec::new();
    traverse_dir(path, &mut files, 0, max_depth).map_err(|e| e.to_string())?;
    files.push(path.to_path_buf());

    make_result(result, path, &files)
}

fn traverse_dir(
    dir_path: &Path,
    collect: &mut Vec<PathBuf>,
    depth: u8,
    max_depth: u8,
) -> std::io::Result<()> {
    if depth > max_depth {
        return Ok(());
    }

    let dir = fs::read_dir(dir_path)?;
    for entry in dir {
        let entry = entry?;
        let path = entry.path();

        if path.is_file() {
            collect.push(path);
        } else if path.is_dir() {
            traverse_dir(&path, collect, depth + 1, max_depth)?;
        }
    }
    Ok(())
}

fn make_result(
    mut result: ChosenDirResult,
    path: &Path,
    files: &Vec<PathBuf>,
) -> Result<ChosenDirResult, String> {
    result.root = path.to_str().ok_or("Invalid path encoding")?.to_owned();
    result.files.reserve(files.len());
    result.files.extend(
        files
            .into_iter()
            .filter_map(|p| p.to_str().map(|s| s.to_owned())),
    );
    Ok(result)
}
