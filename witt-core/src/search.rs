/*!
Search functionality for WittCore
*/

use crate::*;

/// Type of search to perform
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub enum SearchType {
    /// Search in lemma
    Lemma,
    /// Search in word forms
    WordForm,
    /// Search in sentences
    Sentence,
    /// Search in tags
    Tag,
    /// Search in comments
    Comment,
    /// Search in sources
    Source,
}

/// Query parameters for searching Notes
#[derive(Debug, Clone)]
pub struct SearchQuery {
    /// Search terms
    pub query: String,

    /// Search types to perform
    pub search_types: Vec<SearchType>,

    /// Language filter (optional)
    pub language: Option<String>,

    /// Tag filters (optional)
    pub tags: Vec<String>,

    /// Deck filter (optional)
    pub deck: Option<String>,

    /// Limit results (optional)
    pub limit: Option<usize>,

    /// Offset for pagination (optional)
    pub offset: Option<usize>,
}

impl Default for SearchQuery {
    fn default() -> Self {
        SearchQuery {
            query: String::new(),
            search_types: vec![SearchType::Lemma, SearchType::WordForm, SearchType::Sentence],
            language: None,
            tags: Vec::new(),
            deck: None,
            limit: Some(100),
            offset: None,
        }
    }
}

impl SearchQuery {
    /// Creates a new SearchQuery with minimal parameters
    pub fn new(query: &str) -> Self {
        SearchQuery {
            query: query.to_string(),
            ..Default::default()
        }
    }

    /// Adds a search type to the query
    pub fn add_search_type(mut self, search_type: SearchType) -> Self {
        if !self.search_types.contains(&search_type) {
            self.search_types.push(search_type);
        }
        self
    }

    /// Sets all search types for the query
    pub fn set_search_types(mut self, search_types: Vec<SearchType>) -> Self {
        self.search_types = search_types;
        self
    }

    /// Sets the language filter for the query
    pub fn set_language(mut self, language: &str) -> Self {
        self.language = Some(language.to_string());
        self
    }

    /// Adds a tag to the tag filter
    pub fn add_tag(mut self, tag: &str) -> Self {
        self.tags.push(tag.to_string());
        self
    }

    /// Sets all tags for the tag filter
    pub fn set_tags(mut self, tags: Vec<String>) -> Self {
        self.tags = tags;
        self
    }

    /// Sets the deck filter for the query
    pub fn set_deck(mut self, deck: &str) -> Self {
        self.deck = Some(deck.to_string());
        self
    }

    /// Sets the result limit for the query
    pub fn set_limit(mut self, limit: usize) -> Self {
        self.limit = Some(limit);
        self
    }

    /// Sets the offset for pagination
    pub fn set_offset(mut self, offset: usize) -> Self {
        self.offset = Some(offset);
        self
    }
}

/// Result of a search operation
pub struct SearchResult {
    /// Matching note
    pub note: Note,

    /// Match scores for each search field
    pub scores: Vec<Score>,
}

/// Match score for a specific field
pub struct Score {
    /// Field that matched
    pub field: String,

    /// Score (0-1)
    pub score: f32,

    /// Matched text snippet
    pub snippet: Option<String>,
}

impl SearchResult {
    /// Creates a new SearchResult
    pub fn new(note: Note, scores: Vec<Score>) -> SearchResult {
        SearchResult { note, scores }
    }

    /// Returns the highest score for this result
    pub fn max_score(&self) -> f32 {
        self.scores.iter().map(|s| s.score).fold(0.0, f32::max)
    }
}

/// Search engine for Notes and Contexts
pub struct SearchEngine {
    // We can store an index here for faster searching
}

impl SearchEngine {
    /// Creates a new SearchEngine instance
    pub fn new() -> Self {
        SearchEngine {}
    }

    /// Searches notes using the given query
    pub async fn search_notes<'a>(
        &self,
        db: &SqliteDb,
        query: &SearchQuery,
    ) -> Result<Vec<SearchResult>, crate::WittCoreError> {
        // Get all notes from the database
        let notes = db.get_all_notes().await?;

        // Filter notes based on query
        let mut filtered: Vec<Note> = Vec::new();

        for note in notes {
            if self.match_note(&note, query) {
                filtered.push(note);
            }
        }

        // Calculate scores and create search results
        let mut results = Vec::new();
        for note in filtered {
            let scores = self.calculate_scores(&note, query);
            if !scores.is_empty() {
                results.push(SearchResult::new(note, scores));
            }
        }

        // Sort results by score (descending)
        results.sort_by(|a, b| b.max_score().partial_cmp(&a.max_score()).unwrap_or(std::cmp::Ordering::Equal));

        // Apply pagination and limit
        if let Some(offset) = query.offset {
            if offset < results.len() {
                results = results.into_iter().skip(offset).collect();
            } else {
                return Ok(Vec::new());
            }
        }

        if let Some(limit) = query.limit {
            if limit < results.len() {
                results.truncate(limit);
            }
        }

        Ok(results)
    }

    /// Determines if a note matches the search query
    fn match_note(&self, note: &Note, query: &SearchQuery) -> bool {
        let query_lower = query.query.to_lowercase();

        // Check lemma
        if query.search_types.contains(&SearchType::Lemma) && note.lemma.to_lowercase().contains(&query_lower) {
            return true;
        }

        // Check word forms in contexts
        if query.search_types.contains(&SearchType::WordForm) {
            for context in &note.contexts {
                if context.word_form.to_lowercase().contains(&query_lower) {
                    return true;
                }
            }
        }

        // Check sentences in contexts
        if query.search_types.contains(&SearchType::Sentence) {
            for context in &note.contexts {
                if context.sentence.to_lowercase().contains(&query_lower) {
                    return true;
                }
            }
        }

        // Check tags
        if query.search_types.contains(&SearchType::Tag) {
            for tag in &note.tags {
                if tag.to_lowercase().contains(&query_lower) {
                    return true;
                }
            }
        }

        // Check comment
        if query.search_types.contains(&SearchType::Comment) && !note.comment.is_empty() {
            if note.comment.to_lowercase().contains(&query_lower) {
                return true;
            }
        }

        // Check tags filter
        if !query.tags.is_empty() {
            let note_tags_lower: Vec<String> = note.tags.iter().map(|t| t.to_lowercase()).collect();
            let query_tags_lower: Vec<String> = query.tags.iter().map(|t| t.to_lowercase()).collect();

            let has_common_tags = query_tags_lower
                .iter()
                .any(|t| note_tags_lower.contains(t));

            if !has_common_tags {
                return false;
            }
        }

        true
    }

    /// Calculates match scores for a note
    fn calculate_scores(&self, note: &Note, query: &SearchQuery) -> Vec<Score> {
        let mut scores = Vec::new();
        let query_lower = query.query.to_lowercase();
        let query_length = query.query.len() as f32;

        // Check lemma
        if query.search_types.contains(&SearchType::Lemma) {
            let lemma_lower = note.lemma.to_lowercase();
            if lemma_lower.contains(&query_lower) {
                let score = self.calculate_score(
                    &lemma_lower,
                    &query_lower,
                    query_length,
                    "Lemma",
                );
                scores.push(score);
            }
        }

        // Check word forms in contexts
        if query.search_types.contains(&SearchType::WordForm) {
            for context in &note.contexts {
                let word_lower = context.word_form.to_lowercase();
                if word_lower.contains(&query_lower) {
                    let score = self.calculate_score(
                        &word_lower,
                        &query_lower,
                        query_length,
                        "WordForm",
                    );
                    scores.push(score);
                }
            }
        }

        // Check sentences in contexts
        if query.search_types.contains(&SearchType::Sentence) {
            for context in &note.contexts {
                let sentence_lower = context.sentence.to_lowercase();
                if sentence_lower.contains(&query_lower) {
                    let score = self.calculate_score(
                        &sentence_lower,
                        &query_lower,
                        query_length,
                        "Sentence",
                    );
                    scores.push(score);
                }
            }
        }

        // Check tags
        if query.search_types.contains(&SearchType::Tag) {
            for tag in &note.tags {
                let tag_lower = tag.to_lowercase();
                if tag_lower.contains(&query_lower) {
                    let score = self.calculate_score(
                        &tag_lower,
                        &query_lower,
                        query_length,
                        "Tag",
                    );
                    scores.push(score);
                }
            }
        }

        scores
    }

    /// Calculates a score for a field match
    fn calculate_score(
        &self,
        field_text: &str,
        query_text: &str,
        query_length: f32,
        field_name: &str,
    ) -> Score {
        let field_length = field_text.len() as f32;
        let match_length = query_length;

        // Calculate score based on:
        // - Position of match
        // - Length of match relative to field
        // - Exactness of match

        let position_score = if field_text.starts_with(query_text) {
            0.8
        } else if field_text.ends_with(query_text) {
            0.6
        } else {
            0.4
        };

        let coverage_score = (match_length / field_length).min(0.2);

        let exactness_score = if field_text == query_text {
            1.0
        } else if field_text.contains(query_text) {
            0.7
        } else {
            0.0
        };

        let total = position_score + coverage_score + exactness_score;

        // Get snippet
        let snippet = if total > 0.0 {
            Some(self.extract_snippet(field_text, query_text))
        } else {
            None
        };

        Score {
            field: field_name.to_string(),
            score: total,
            snippet,
        }
    }

    /// Extracts a snippet from text containing the query
    fn extract_snippet(&self, text: &str, query: &str) -> String {
        const SNIPPET_LENGTH: usize = 100;

        let position = text.find(query).unwrap_or(0);

        let start = std::cmp::max(0, position as i32 - (SNIPPET_LENGTH / 2) as i32) as usize;
        let end = std::cmp::min(text.len(), position + query.len() + SNIPPET_LENGTH / 2);

        let mut snippet = String::new();
        if start > 0 {
            snippet.push_str("...");
        }
        snippet.push_str(&text[start..end]);
        if end < text.len() {
            snippet.push_str("...");
        }

        snippet
    }
}

impl Default for SearchEngine {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::note::{NoteBuilder, Source, Context};
    use tempfile::tempdir;

    #[tokio::test]
    async fn test_search_engine_basic() {
        let temp_dir = tempdir().unwrap();
        let db = SqliteDb::connect(&temp_dir.path().join("witt.db")).await.unwrap();

        // Add some test notes
        let note1 = NoteBuilder::new("test", "a test note")
            .add_context(Context::new(
                "test".to_string(),
                "This is a test sentence.".to_string(),
                None,
                None,
                Source::App {
                    name: "test".to_string(),
                    title: None,
                },
            ))
            .unwrap()
            .build();

        let note2 = NoteBuilder::new("example", "an example note")
            .add_context(Context::new(
                "example".to_string(),
                "This is an example sentence.".to_string(),
                None,
                None,
                Source::App {
                    name: "test".to_string(),
                    title: None,
                },
            ))
            .unwrap()
            .build();

        db.save_note(&note1).await.unwrap();
        db.save_note(&note2).await.unwrap();

        // Test search engine
        let search_engine = SearchEngine::new();
        let results = search_engine.search_notes(
            &db,
            &SearchQuery::new("test"),
        ).await.unwrap();

        // We should find note1
        assert_eq!(results.len(), 1);
        assert_eq!(results[0].note.lemma, "test");
        assert!(results[0].scores.len() > 0);

        // Test multiple results
        let results2 = search_engine.search_notes(
            &db,
            &SearchQuery::new("sentence"),
        ).await.unwrap();

        assert_eq!(results2.len(), 2);
    }
}
