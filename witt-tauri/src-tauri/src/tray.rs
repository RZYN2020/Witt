use tauri::{
    menu::{Menu, MenuItem},
    tray::{TrayIconBuilder, TrayIconEvent},
    AppHandle, Manager,
};

/// Creates the system tray icon with menu
pub fn create_system_tray(app: &AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    // Create menu items
    let show_witt = MenuItem::with_id(app, "show_witt", "Show Witt", true, None::<&str>)?;
    let capture_clipboard = MenuItem::with_id(app, "capture_clipboard", "Capture Clipboard", true, None::<&str>)?;
    let separator = MenuItem::with_id(app, "separator", "Separator", true, None::<&str>)?;
    let quit = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;

    // Create menu
    let menu = Menu::with_items(app, &[&show_witt, &capture_clipboard, &separator, &quit])?;

    // Create tray icon
    let _tray = TrayIconBuilder::new()
        .icon(app.default_window_icon().unwrap().clone())
        .menu(&menu)
        .show_menu_on_left_click(false)
        .on_menu_event(move |app, event| match event.id.as_ref() {
            "show_witt" => {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.show();
                    let _ = window.set_focus();
                }
            }
            "capture_clipboard" => {
                // Show capture window if it exists, or create new one
                if let Some(window) = app.get_webview_window("capture") {
                    let _ = window.show();
                    let _ = window.set_focus();
                } else {
                    // Create new capture window if it doesn't exist
                    let _ = tauri::WebviewWindowBuilder::new(app, "capture", tauri::WebviewUrl::App("index.html".into()))
                        .title("Capture Context")
                        .inner_size(650.0, 750.0)
                        .min_inner_size(550.0, 650.0)
                        .resizable(true)
                        .always_on_top(true)
                        .visible(true)
                        .center()
                        .skip_taskbar(true)
                        .build();
                }
            }
            "quit" => {
                app.exit(0);
            }
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click { .. } = event
            {
                let app = tray.app_handle();
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.show();
                    let _ = window.set_focus();
                }
            }
        })
        .build(app)?;

    Ok(())
}
