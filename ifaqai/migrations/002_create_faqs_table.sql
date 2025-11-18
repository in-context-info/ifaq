-- Migration: Create FAQs table
-- This table stores FAQ questions and answers with embeddings in Vectorize

CREATE TABLE IF NOT EXISTS FAQs (
  faq_id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')) NOT NULL,
  modified_at TEXT,
  FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_faq_user_id ON FAQs(user_id);
CREATE INDEX IF NOT EXISTS idx_faq_created_at ON FAQs(created_at);

