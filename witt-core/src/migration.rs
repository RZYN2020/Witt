/*!
Data migration functionality for WittCore
*/

use crate::*;
use std::path::Path;

/// Migrates old Witt data to new format
/// Note: This is currently a no-op as the migration logic needs to be updated
pub async fn migrate_old_cards(
    _old_db_path: &Path,
    _new_db_path: &Path,
    _config: &WittConfig,
) -> Result<(), crate::WittCoreError> {
    // Migration logic temporarily disabled
    // TODO: Update migration logic for new database schema
    log::warn!("Migration logic is currently disabled. Please update for new schema.");
    Ok(())
}
