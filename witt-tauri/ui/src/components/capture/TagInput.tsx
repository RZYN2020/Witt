import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TagInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  isFocused: boolean;
  onFocus: () => void;
}

/**
 * Tag input with autocomplete and pill display
 */
export function TagInput({ value, onChange, isFocused, onFocus }: TagInputProps) {
  const [inputValue, setInputValue] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);

  // Mock suggestions - in real app, fetch from backend
  const allSuggestions = [
    'finance', 'movement', 'river', 'geography', 'nature',
    'food', 'building', 'business', 'technology', 'science',
    'art', 'music', 'literature', 'history', 'philosophy',
    'emotion', 'action', 'description', 'abstract', 'concrete'
  ];

  useEffect(() => {
    if (inputValue.trim()) {
      const filtered = allSuggestions
        .filter((tag) =>
          tag.toLowerCase().startsWith(inputValue.toLowerCase()) &&
          !value.includes(tag)
        )
        .slice(0, 5);
      setSuggestions(filtered);
      setSelectedIndex(filtered.length > 0 ? 0 : -1);
    } else {
      setSuggestions([]);
      setSelectedIndex(-1);
    }
  }, [inputValue, value]);

  useEffect(() => {
    if (isFocused && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isFocused]);

  const addTag = (tag: string) => {
    const normalizedTag = tag.trim().toLowerCase();
    if (normalizedTag && !value.includes(normalizedTag)) {
      onChange([...value, normalizedTag]);
    }
    setInputValue('');
    setSuggestions([]);
    setSelectedIndex(-1);
  };

  const removeTag = (tagToRemove: string) => {
    onChange(value.filter((tag) => tag !== tagToRemove));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      if (selectedIndex >= 0 && suggestions[selectedIndex]) {
        addTag(suggestions[selectedIndex]);
      } else if (inputValue.trim()) {
        addTag(inputValue);
      }
    } else if (e.key === 'Backspace' && !inputValue && value.length > 0) {
      removeTag(value[value.length - 1]);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === 'Escape') {
      setSuggestions([]);
      setSelectedIndex(-1);
    }
  };

  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        Tags
      </label>

      {/* Tag pills */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((tag) => (
            <motion.span
              key={tag}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="inline-flex items-center gap-1 px-2 py-1 bg-accent text-accent-foreground text-xs rounded-md"
            >
              {tag}
              <button
                onClick={() => removeTag(tag)}
                className="p-0.5 hover:bg-accent-foreground/20 rounded"
              >
                <X className="w-3 h-3" />
              </button>
            </motion.span>
          ))}
        </div>
      )}

      {/* Input field */}
      <div className="relative">
        <input
          ref={inputRef}
          data-field="tags"
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={onFocus}
          className={cn(
            'w-full px-3 py-2 rounded-md border border-input bg-background',
            'text-sm text-foreground placeholder:text-muted-foreground',
            'focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent',
            'transition-all duration-200'
          )}
          placeholder="Add tags... (Enter to add)"
        />

        {/* Suggestions dropdown */}
        <AnimatePresence>
          {suggestions.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="absolute z-10 w-full mt-1 bg-popover border border-border rounded-md shadow-lg max-h-48 overflow-y-auto"
            >
              {suggestions.map((suggestion, index) => (
                <button
                  key={suggestion}
                  onClick={() => addTag(suggestion)}
                  className={cn(
                    'w-full px-3 py-2 text-left text-sm hover:bg-accent transition-colors',
                    index === selectedIndex && 'bg-accent'
                  )}
                >
                  {suggestion}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
