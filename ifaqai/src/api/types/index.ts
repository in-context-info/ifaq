/**
 * Shared types for API requests and responses
 */

/**
 * Database User schema (matches D1 table structure)
 */
export interface DbUser {
  user_id: string | number;
  email: string;
  user_name: string;
  first_name: string;
  last_name: string;
  created_at: string; // ISO timestamp
}

/**
 * Application User interface (for frontend/API)
 */
export interface User {
  userId?: string | number;
  username: string;
  name: string; // Combined first_name + last_name
  firstName?: string;
  lastName?: string;
  email: string;
  password?: string;
  bio?: string;
  faqs: FAQ[];
  createdAt?: string;
}

export interface ZeroTrustAuthPayload {
  name: string;
  email: string;
}

export interface FAQ {
  question: string;
  answer: string;
  id: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface SignupData {
  email: string;
  password: string;
}

export interface ProfileData {
  username: string;
  name: string;
  bio: string;
}

export interface UpdateUserData {
  username?: string;
  name?: string;
  bio?: string;
  faqs?: FAQ[];
}

