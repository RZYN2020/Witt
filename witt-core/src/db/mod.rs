/*!
Database module for WittCore

This module provides database access layer using SQLite via sqlx.
*/

pub mod sqlite;

pub use sqlite::SqliteDb;
