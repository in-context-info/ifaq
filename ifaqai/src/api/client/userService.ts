/**
 * User service for client-side operations
 * Supports both localStorage (fallback) and D1 database (primary)
 */

import { User, UpdateUserData, ProfileData, FAQ } from '../types';

const USERS_STORAGE_KEY = 'users';
const LOGGED_IN_USER_KEY = 'loggedInUser';

/**
 * Get all users (for internal use)
 */
export function getAllUsers(): User[] {
  return JSON.parse(localStorage.getItem(USERS_STORAGE_KEY) || '[]');
}

/**
 * Get user by username
 */
export function getUserByUsername(username: string): User | null {
  const users = getAllUsers();
  return users.find((u: User) => u.username === username) || null;
}

/**
 * Get user by email
 */
export function getUserByEmail(email: string): User | null {
  const users = getAllUsers();
  return users.find((u: User) => u.email === email) || null;
}

/**
 * Fetch current user from D1 database by email
 * @param email - User email address
 * @returns User object or null if not found
 */
export async function fetchUserFromDatabase(email: string): Promise<User | null> {
  try {
    const response = await fetch(`/api/users/me?email=${encodeURIComponent(email)}`);
    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(`Failed to fetch user: ${response.statusText}`);
    }
    const user = await response.json() as User;
    return user;
  } catch (error) {
    console.error('Error fetching user from database:', error);
    // Fallback to localStorage
    return getUserByEmail(email);
  }
}

/**
 * Create or update user in D1 database
 * @param user - User object to create/update
 * @returns Created/updated user
 * @throws Error if username is already taken or other error occurs
 */
export async function createUserInDatabase(user: User): Promise<User> {
  try {
    const response = await fetch('/api/users', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(user),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: response.statusText }));
      if (response.status === 409) {
        // Username conflict - rethrow with specific message
        throw new Error(errorData.error || 'Username already taken');
      }
      throw new Error(errorData.error || `Failed to create user: ${response.statusText}`);
    }
    
    const createdUser = await response.json() as User;
    return createdUser;
  } catch (error) {
    console.error('Error creating user in database:', error);
    // If it's a username conflict, rethrow it
    if (error instanceof Error && error.message.includes('already taken')) {
      throw error;
    }
    // Fallback: save to localStorage
    const users = getAllUsers();
    const userIndex = users.findIndex((u: User) => u.email === user.email);
    if (userIndex !== -1) {
      users[userIndex] = user;
    } else {
      users.push(user);
    }
    saveUsers(users);
    return user;
  }
}

/**
 * Get currently logged-in user (from localStorage - legacy)
 */
export function getCurrentUser(): User | null {
  const username = localStorage.getItem(LOGGED_IN_USER_KEY);
  if (!username) {
    return null;
  }
  return getUserByUsername(username);
}

/**
 * Update user profile
 */
export function updateUserProfile(email: string, profile: ProfileData): User {
  const users = getAllUsers();
  const userIndex = users.findIndex((u: User) => u.email === email);
  
  if (userIndex === -1) {
    throw new Error('User not found');
  }

  users[userIndex] = {
    ...users[userIndex],
    username: profile.username,
    name: profile.name,
    bio: profile.bio,
  };

  saveUsers(users);
  return users[userIndex];
}

/**
 * Update user data
 */
export function updateUser(username: string, data: UpdateUserData): User {
  const users = getAllUsers();
  const userIndex = users.findIndex((u: User) => u.username === username);
  
  if (userIndex === -1) {
    throw new Error('User not found');
  }

  users[userIndex] = {
    ...users[userIndex],
    ...data,
  };

  saveUsers(users);
  return users[userIndex];
}

/**
 * Update user FAQs
 */
export function updateUserFAQs(username: string, faqs: FAQ[]): User {
  return updateUser(username, { faqs });
}

/**
 * Check if username is available
 */
export function isUsernameAvailable(username: string, excludeEmail?: string): boolean {
  const users = getAllUsers();
  return !users.some(
    (u: User) => u.username === username && (!excludeEmail || u.email !== excludeEmail)
  );
}

// Helper functions
export function saveUsers(users: User[]): void {
  localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
}

