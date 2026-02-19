use crate::models::{Card, Definition, Source};
use chrono::{Duration, Utc};
use std::sync::{Arc, RwLock};
use uuid::Uuid;

/// In-memory store for mock development
#[derive(Debug, Default)]
pub struct StoreState {
    pub store: Arc<RwLock<MockStore>>,
}

#[derive(Debug)]
pub struct MockStore {
    pub cards: Vec<Card>,
    pub tags: Vec<TagUsage>,
}

#[derive(Debug, Clone)]
pub struct TagUsage {
    pub tag: String,
    pub count: u32,
    pub last_used: chrono::DateTime<Utc>,
}

impl Default for MockStore {
    fn default() -> Self {
        Self {
            cards: generate_sample_cards(),
            tags: generate_sample_tags(),
        }
    }
}

fn generate_sample_cards() -> Vec<Card> {
    let now = Utc::now();
    
    vec![
        // English cards
        Card {
            id: Uuid::parse_str("00000000-0000-0000-0000-000000000001").unwrap(),
            word: String::from("bank"),
            lemma: String::from("bank"),
            context: String::from("The bank was steep and muddy, slipping underfoot."),
            definitions: vec![
                Definition {
                    id: Uuid::new_v4(),
                    text: String::from("sloping land beside a river or lake"),
                    source: String::from("Wiktionary"),
                    part_of_speech: Some(String::from("noun")),
                    is_custom: false,
                    is_user_edited: false,
                },
                Definition {
                    id: Uuid::new_v4(),
                    text: String::from("a financial institution"),
                    source: String::from("Wiktionary"),
                    part_of_speech: Some(String::from("noun")),
                    is_custom: false,
                    is_user_edited: false,
                },
            ],
            tags: vec![String::from("river"), String::from("geography")],
            source: Source::Video {
                filename: String::from("the_revenant.mp4"),
                timestamp: String::from("00:23:45"),
                frame: None,
            },
            notes: None,
            language: String::from("en"),
            created_at: now - Duration::hours(2),
            updated_at: None,
        },
        Card {
            id: Uuid::parse_str("00000000-0000-0000-0000-000000000002").unwrap(),
            word: String::from("run"),
            lemma: String::from("run"),
            context: String::from("She decided to run along the riverbank in the morning."),
            definitions: vec![
                Definition {
                    id: Uuid::new_v4(),
                    text: String::from("move at a speed faster than a walk"),
                    source: String::from("Wiktionary"),
                    part_of_speech: Some(String::from("verb")),
                    is_custom: false,
                    is_user_edited: false,
                },
            ],
            tags: vec![String::from("exercise"), String::from("movement")],
            source: Source::Web {
                title: String::from("Morning Routines - Medium"),
                url: String::from("https://medium.com/morning-routines"),
                icon: None,
            },
            notes: None,
            language: String::from("en"),
            created_at: now - Duration::hours(5),
            updated_at: None,
        },
        // German cards
        Card {
            id: Uuid::parse_str("00000000-0000-0000-0000-000000000003").unwrap(),
            word: String::from("Haus"),
            lemma: String::from("Haus"),
            context: String::from("Das Haus war alt und wunderschön."),
            definitions: vec![
                Definition {
                    id: Uuid::new_v4(),
                    text: String::from("building for human habitation"),
                    source: String::from("Wiktionary"),
                    part_of_speech: Some(String::from("noun")),
                    is_custom: false,
                    is_user_edited: false,
                },
            ],
            tags: vec![String::from("architecture"), String::from("building")],
            source: Source::Pdf {
                filename: String::from("german_stories.pdf"),
                page: Some(42),
            },
            notes: None,
            language: String::from("de"),
            created_at: now - Duration::days(1),
            updated_at: None,
        },
        Card {
            id: Uuid::parse_str("00000000-0000-0000-0000-000000000004").unwrap(),
            word: String::from("laufen"),
            lemma: String::from("laufen"),
            context: String::from("Wir müssen schneller laufen."),
            definitions: vec![
                Definition {
                    id: Uuid::new_v4(),
                    text: String::from("to run, to walk"),
                    source: String::from("Dict.cc"),
                    part_of_speech: Some(String::from("verb")),
                    is_custom: false,
                    is_user_edited: false,
                },
            ],
            tags: vec![String::from("movement")],
            source: Source::App {
                name: String::from("Duolingo"),
                title: None,
            },
            notes: None,
            language: String::from("de"),
            created_at: now - Duration::days(2),
            updated_at: None,
        },
        // Japanese cards
        Card {
            id: Uuid::parse_str("00000000-0000-0000-0000-000000000005").unwrap(),
            word: String::from("銀行"),
            lemma: String::from("銀行"),
            context: String::from("銀行にお金を預ける。"),
            definitions: vec![
                Definition {
                    id: Uuid::new_v4(),
                    text: String::from("bank, financial institution"),
                    source: String::from("Jisho"),
                    part_of_speech: Some(String::from("noun")),
                    is_custom: false,
                    is_user_edited: false,
                },
            ],
            tags: vec![String::from("finance"), String::from("business")],
            source: Source::Web {
                title: String::from("NHK News Web Easy"),
                url: String::from("https://www3.nhk.or.jp/news/easy/"),
                icon: None,
            },
            notes: None,
            language: String::from("ja"),
            created_at: now - Duration::days(3),
            updated_at: None,
        },
        Card {
            id: Uuid::parse_str("00000000-0000-0000-0000-000000000006").unwrap(),
            word: String::from("食べる"),
            lemma: String::from("食べる"),
            context: String::from("寿司を食べる。"),
            definitions: vec![
                Definition {
                    id: Uuid::new_v4(),
                    text: String::from("to eat"),
                    source: String::from("Jisho"),
                    part_of_speech: Some(String::from("verb")),
                    is_custom: false,
                    is_user_edited: false,
                },
            ],
            tags: vec![String::from("food"), String::from("action")],
            source: Source::Video {
                filename: String::from("japanese_cooking.mp4"),
                timestamp: String::from("05:12:30"),
                frame: None,
            },
            notes: None,
            language: String::from("ja"),
            created_at: now - Duration::days(4),
            updated_at: None,
        },
        // Korean cards
        Card {
            id: Uuid::parse_str("00000000-0000-0000-0000-000000000007").unwrap(),
            word: String::from("은행"),
            lemma: String::from("은행"),
            context: String::from("은행에 갔어요."),
            definitions: vec![
                Definition {
                    id: Uuid::new_v4(),
                    text: String::from("bank"),
                    source: String::from("Naver Dictionary"),
                    part_of_speech: Some(String::from("noun")),
                    is_custom: false,
                    is_user_edited: false,
                },
            ],
            tags: vec![String::from("finance")],
            source: Source::Web {
                title: String::from("Korean Drama Subtitles"),
                url: String::from("https://example.com/kdrama"),
                icon: None,
            },
            notes: None,
            language: String::from("ko"),
            created_at: now - Duration::days(5),
            updated_at: None,
        },
        // Chinese cards
        Card {
            id: Uuid::parse_str("00000000-0000-0000-0000-000000000008").unwrap(),
            word: String::from("银行"),
            lemma: String::from("银行"),
            context: String::from("我去银行取钱。"),
            definitions: vec![
                Definition {
                    id: Uuid::new_v4(),
                    text: String::from("bank (financial institution)"),
                    source: String::from("CEDICT"),
                    part_of_speech: Some(String::from("noun")),
                    is_custom: false,
                    is_user_edited: false,
                },
            ],
            tags: vec![String::from("finance"), String::from("business")],
            source: Source::App {
                name: String::from("HelloChinese"),
                title: None,
            },
            notes: None,
            language: String::from("zh"),
            created_at: now - Duration::days(6),
            updated_at: None,
        },
        // More English for variety
        Card {
            id: Uuid::parse_str("00000000-0000-0000-0000-000000000009").unwrap(),
            word: String::from("set"),
            lemma: String::from("set"),
            context: String::from("The sun set behind the mountains."),
            definitions: vec![
                Definition {
                    id: Uuid::new_v4(),
                    text: String::from("to go down below the horizon"),
                    source: String::from("Wiktionary"),
                    part_of_speech: Some(String::from("verb")),
                    is_custom: false,
                    is_user_edited: false,
                },
            ],
            tags: vec![String::from("nature"), String::from("time")],
            source: Source::Pdf {
                filename: String::from("poetry_collection.pdf"),
                page: Some(15),
            },
            notes: None,
            language: String::from("en"),
            created_at: now - Duration::hours(12),
            updated_at: None,
        },
        Card {
            id: Uuid::parse_str("00000000-0000-0000-0000-000000000010").unwrap(),
            word: String::from("set"),
            lemma: String::from("set"),
            context: String::from("She set the table for dinner."),
            definitions: vec![
                Definition {
                    id: Uuid::new_v4(),
                    text: String::from("to put something in a particular place"),
                    source: String::from("Wiktionary"),
                    part_of_speech: Some(String::from("verb")),
                    is_custom: false,
                    is_user_edited: false,
                },
            ],
            tags: vec![String::from("household"), String::from("action")],
            source: Source::Video {
                filename: String::from("cooking_show.mp4"),
                timestamp: String::from("12:45:00"),
                frame: None,
            },
            notes: None,
            language: String::from("en"),
            created_at: now - Duration::hours(8),
            updated_at: None,
        },
    ]
}

fn generate_sample_tags() -> Vec<TagUsage> {
    let now = Utc::now();
    vec![
        TagUsage { tag: String::from("finance"), count: 15, last_used: now - Duration::hours(1) },
        TagUsage { tag: String::from("movement"), count: 12, last_used: now - Duration::hours(2) },
        TagUsage { tag: String::from("river"), count: 8, last_used: now - Duration::hours(3) },
        TagUsage { tag: String::from("geography"), count: 7, last_used: now - Duration::hours(4) },
        TagUsage { tag: String::from("nature"), count: 20, last_used: now - Duration::hours(5) },
        TagUsage { tag: String::from("food"), count: 10, last_used: now - Duration::hours(6) },
        TagUsage { tag: String::from("building"), count: 5, last_used: now - Duration::days(1) },
        TagUsage { tag: String::from("business"), count: 9, last_used: now - Duration::days(2) },
    ]
}

impl MockStore {
    pub fn get_all_cards(&self) -> Vec<Card> {
        self.cards.clone()
    }

    pub fn get_card(&self, id: Uuid) -> Option<Card> {
        self.cards.iter().find(|c| c.id == id).cloned()
    }

    pub fn add_card(&mut self, mut card: Card) -> Uuid {
        card.id = Uuid::new_v4();
        let new_id = card.id;
        self.cards.push(card);
        new_id
    }

    pub fn update_card(&mut self, id: Uuid, updates: Card) -> Option<Card> {
        if let Some(card) = self.cards.iter_mut().find(|c| c.id == id) {
            *card = updates;
            return Some(card.clone());
        }
        None
    }

    pub fn delete_card(&mut self, id: Uuid) -> bool {
        if let Some(pos) = self.cards.iter().position(|c| c.id == id) {
            self.cards.remove(pos);
            true
        } else {
            false
        }
    }

    pub fn search_cards(&self, query: &str) -> Vec<Card> {
        let query_lower = query.to_lowercase();
        self.cards
            .iter()
            .filter(|card| {
                card.word.to_lowercase().contains(&query_lower)
                    || card.context.to_lowercase().contains(&query_lower)
                    || card.tags.iter().any(|t| t.to_lowercase().contains(&query_lower))
            })
            .cloned()
            .collect()
    }

    pub fn get_tag_suggestions(&self, prefix: &str) -> Vec<String> {
        let prefix_lower = prefix.to_lowercase();
        let mut suggestions: Vec<_> = self
            .tags
            .iter()
            .filter(|t| t.tag.to_lowercase().starts_with(&prefix_lower))
            .collect();
        
        suggestions.sort_by(|a, b| {
            b.last_used.cmp(&a.last_used)
                .then(b.count.cmp(&a.count))
        });
        
        suggestions.into_iter().map(|t| t.tag.clone()).collect()
    }
}
