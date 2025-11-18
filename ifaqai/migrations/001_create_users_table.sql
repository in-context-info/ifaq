-- Migration: Create Users table
-- This table stores user account information

CREATE TABLE IF NOT EXISTS Users (
  user_id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  user_name TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  user_bio TEXT,
  created_at TEXT DEFAULT (datetime('now')) NOT NULL,
  modified_at TEXT
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_email ON Users(email);
CREATE INDEX IF NOT EXISTS idx_user_name ON Users(user_name);

