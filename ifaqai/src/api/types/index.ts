/**
 * Shared types for API requests and responses
 */

export interface User {
  username: string;
  name: string;
  email: string;
  password?: string;
  bio?: string;
  faqs: FAQ[];
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

