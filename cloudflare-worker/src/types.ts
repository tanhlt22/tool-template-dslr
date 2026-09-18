export interface Env {
  DB: D1Database;
  DRIVE_CLIENT_ID: string;
  DRIVE_CLIENT_SECRET: string;
  DRIVE_REFRESH_TOKEN: string;
  DRIVE_ROOT_FOLDER_ID: string;
  JWT_SECRET: string;
}

export interface User {
  id: string;
  username: string;
  password_hash: string;
  role: string;
  created_at: string;
}

export interface FrameIndex {
  id: string;
  name: string;
  category: string;
  width: number;
  height: number;
  thumbnail_url: string | null;
  background_image_url: string | null;
  drive_file_id: string | null;
  user_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface FrameLayoutPayload {
  id?: string;
  name: string;
  category?: string;
  width: number;
  height: number;
  backgroundPrompt?: string;
  background_prompt?: string;
  backgroundImageUrl?: string | null;
  background_image_url?: string | null;
  thumbnail_url?: string | null;
  slots?: any[];
  elements?: any[];
  [key: string]: any;
}
