-- Initialize D1 Database Schema for ifaqai
-- This creates the Users table and indexes

-- Create Users table
-- Note: DROP TABLE is commented out - uncomment to reset database
-- DROP TABLE IF EXISTS Users;

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

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_email ON Users(email);
CREATE INDEX IF NOT EXISTS idx_user_name ON Users(user_name);

