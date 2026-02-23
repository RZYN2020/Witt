/*!
Word extraction helpers for context processing.
*/

use std::collections::{HashMap, HashSet};

fn is_ascii_stop_word(word: &str) -> bool {
    matches!(
        word,
        "a"
            | "an"
            | "and"
            | "are"
            | "as"
            | "at"
            | "be"
            | "but"
            | "by"
            | "can"
            | "could"
            | "do"
            | "does"
            | "did"
            | "for"
            | "from"
            | "had"
            | "has"
            | "have"
            | "he"
            | "her"
            | "hers"
            | "him"
            | "his"
            | "how"
            | "i"
            | "if"
            | "in"
            | "into"
            | "is"
            | "it"
            | "its"
            | "may"
            | "might"
            | "more"
            | "most"
            | "my"
            | "no"
            | "not"
            | "of"
            | "on"
            | "or"
            | "our"
            | "ours"
            | "shall"
            | "she"
            | "should"
            | "so"
            | "some"
            | "such"
            | "than"
            | "that"
            | "the"
            | "their"
            | "theirs"
            | "them"
            | "then"
            | "there"
            | "these"
            | "they"
            | "this"
            | "those"
            | "to"
            | "too"
            | "us"
            | "was"
            | "we"
            | "were"
            | "what"
            | "when"
            | "where"
            | "which"
            | "who"
            | "why"
            | "will"
            | "with"
            | "would"
            | "you"
            | "your"
            | "yours"
    )
}

fn tokenize_words(text: &str) -> Vec<String> {
    let mut out: Vec<String> = Vec::new();
    let mut buf_raw = String::new();
    let mut buf_lower = String::new();
    let mut len_letters = 0_usize;

    for ch in text.chars() {
        if ch.is_alphabetic() {
            buf_raw.push(ch);
            for lc in ch.to_lowercase() {
                buf_lower.push(lc);
            }
            len_letters += 1;
        } else if (ch == '\'' || ch == '’') && !buf_raw.is_empty() && buf_raw.is_ascii() {
            continue;
        } else if !buf_raw.is_empty() {
            if len_letters >= 3 {
                if buf_raw.is_ascii() {
                    out.extend(split_camel_ascii(&buf_raw));
                } else {
                    out.push(std::mem::replace(&mut buf_lower, String::new()));
                }
            } else {
                buf_lower.clear();
            }
            buf_raw.clear();
            buf_lower.clear();
            len_letters = 0;
        }
    }

    if !buf_raw.is_empty() && len_letters >= 3 {
        if buf_raw.is_ascii() {
            out.extend(split_camel_ascii(&buf_raw));
        } else {
            out.push(buf_lower);
        }
    }

    out
}

fn split_camel_ascii(raw: &str) -> Vec<String> {
    let mut parts: Vec<String> = Vec::new();
    let mut start = 0_usize;
    let bytes = raw.as_bytes();

    for i in 1..bytes.len() {
        let prev = bytes[i - 1];
        let cur = bytes[i];
        if prev.is_ascii_lowercase() && cur.is_ascii_uppercase() {
            let part = &raw[start..i];
            if part.len() >= 3 {
                parts.push(part.to_ascii_lowercase());
            }
            start = i;
        }
    }

    let tail = &raw[start..];
    if tail.len() >= 3 {
        parts.push(tail.to_ascii_lowercase());
    }

    if parts.is_empty() && raw.len() >= 3 {
        parts.push(raw.to_ascii_lowercase());
    }

    parts
}

/// Extract unique candidate words from the given context.
pub fn extract_words(context: &str) -> Vec<String> {
    let mut uniq = HashSet::new();
    for w in tokenize_words(context) {
        if w.is_ascii() && is_ascii_stop_word(&w) {
            continue;
        }
        uniq.insert(w);
    }
    let mut out: Vec<String> = uniq.into_iter().collect();
    out.sort();
    out
}

/// Extract unique candidate words from the given context.
pub fn extract_words_with_frequency(context: &str) -> Vec<(String, usize)> {
    let mut counts: HashMap<String, usize> = HashMap::new();
    for w in tokenize_words(context) {
        if w.is_ascii() && is_ascii_stop_word(&w) {
            continue;
        }
        *counts.entry(w).or_insert(0) += 1;
    }

    let mut out: Vec<(String, usize)> = counts.into_iter().collect();
    out.sort_by(|a, b| {
        b.1.cmp(&a.1)
            .then_with(|| b.0.len().cmp(&a.0.len()))
            .then_with(|| a.0.cmp(&b.0))
    });
    out
}
