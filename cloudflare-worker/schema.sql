-- Database Schema for Photobooth D1

-- 1. Bảng Users (Xác thực người dùng)
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT DEFAULT 'user',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. Bảng Frames Index (Mục lục các template frame để truy vấn siêu nhanh và phân loại)
CREATE TABLE IF NOT EXISTS frames_index (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT DEFAULT 'general',
    width INTEGER DEFAULT 1200,
    height INTEGER DEFAULT 1800,
    thumbnail_url TEXT,
    background_image_url TEXT,
    drive_file_id TEXT, -- ID file JSON layout config lưu trên Google Drive
    user_id TEXT,       -- ID người tạo (nếu có đăng nhập)
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for lightning fast queries
CREATE INDEX IF NOT EXISTS idx_frames_category ON frames_index(category);
CREATE INDEX IF NOT EXISTS idx_frames_created_at ON frames_index(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_frames_user_id ON frames_index(user_id);
