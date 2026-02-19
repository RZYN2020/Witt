/*!
Logging configuration for WittCore
*/

use fern::colors::{Color, ColoredLevelConfig};
use log::LevelFilter;

/// Initializes the logging system with default configuration
pub fn init_logging() -> Result<(), crate::WittCoreError> {
    let colors = ColoredLevelConfig::new()
        .debug(Color::Magenta)
        .info(Color::Green)
        .warn(Color::Yellow)
        .error(Color::Red);

    fern::Dispatch::new()
        .level(LevelFilter::Info)
        .level_for("witt_core", LevelFilter::Debug)
        .chain(std::io::stdout())
        .chain(
            fern::log_file("witt-core.log")?
        )
        .format(move |out, message, record| {
            out.finish(format_args!(
                "[{}][{}] {}",
                chrono::Local::now().format("%Y-%m-%d %H:%M:%S"),
                colors.color(record.level()),
                message
            ))
        })
        .apply()
        .map_err(|_| crate::WittCoreError::Logger("Failed to apply log dispatch".to_string()))
}
