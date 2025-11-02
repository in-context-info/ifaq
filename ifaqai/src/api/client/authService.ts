/**
 * Authentication service for client-side operations
 */

import { LoginCredentials, SignupData, User } from '../types';

const USERS_STORAGE_KEY = 'users';
const LOGGED_IN_USER_KEY = 'loggedInUser';

/**
 * Login with email and password
 */
export async function login(credentials: LoginCredentials): Promise<{ user: User; needsSetup: boolean }> {
  const users = getUsers();
  const user = users.find((u: User) => u.email === credentials.email && u.password === credentials.password);
  
  if (!user) {
    throw new Error('Invalid email or password');
  }

  // Check if user needs profile setup
  const needsSetup = !user.name || !user.username || user.username.startsWith('user_');
  
  return { user, needsSetup };
}

/**
 * Sign up a new user
 */
export async function signup(data: SignupData): Promise<{ user: User; needsSetup: boolean }> {
  const users = getUsers();
  const existingUser = users.find((u: User) => u.email === data.email);
  
  if (existingUser) {
    throw new Error('Email already registered');
  }

  const newUser: User = {
    email: data.email,
    password: data.password,
    username: `user_${Date.now()}`, // Temporary username
    name: '',
    bio: '',
    faqs: [],
  };

  users.push(newUser);
  saveUsers(users);
  
  return { user: newUser, needsSetup: true };
}

/**
 * Set the logged-in user
 */
export function setLoggedInUser(username: string): void {
  localStorage.setItem(LOGGED_IN_USER_KEY, username);
}

/**
 * Get the currently logged-in user
 */
export function getLoggedInUser(): string | null {
  return localStorage.getItem(LOGGED_IN_USER_KEY);
}

/**
 * Logout the current user
 */
export function logout(): void {
  localStorage.removeItem(LOGGED_IN_USER_KEY);
}

/**
 * Check if a user is logged in
 */
export function isLoggedIn(): boolean {
  return getLoggedInUser() !== null;
}

// Helper functions
function getUsers(): User[] {
  return JSON.parse(localStorage.getItem(USERS_STORAGE_KEY) || '[]');
}

function saveUsers(users: User[]): void {
  localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
}

