/**
 * Authentication service for client-side operations
 * Handles Cloudflare ZeroTrust email authentication
 */

import { User, ZeroTrustAuthPayload } from '../types';

const USERS_STORAGE_KEY = 'users';
const LOGGED_IN_USER_KEY = 'loggedInUser';
const AUTH_PAYLOAD_KEY = 'authPayload';

// /**
//  * Login with email and password
//  */
// export async function login(credentials: LoginCredentials): Promise<{ user: User; needsSetup: boolean }> {
//   const users = getUsers();
//   const user = users.find((u: User) => u.email === credentials.email && u.password === credentials.password);
  
//   if (!user) {
//     throw new Error('Invalid email or password');
//   }

//   // Check if user needs profile setup
//   const needsSetup = !user.name || !user.username || user.username.startsWith('user_');
  
//   return { user, needsSetup };
// }

/**
 * Sign up a new user
//  */
// export async function signup(data: SignupData): Promise<{ user: User; needsSetup: boolean }> {
//   const users = getUsers();
//   const existingUser = users.find((u: User) => u.email === data.email);
  
//   if (existingUser) {
//     throw new Error('Email already registered');
//   }

//   const newUser: User = {
//     email: data.email,
//     password: data.password,
//     username: `user_${Date.now()}`, // Temporary username
//     name: '',
//     bio: '',
//     faqs: [],
//   };

//   users.push(newUser);
//   saveUsers(users);
  
//   return { user: newUser, needsSetup: true };
// }



/**
 * Set the logged-in user from ZeroTrust authentication payload
 * @param payload - Authentication payload from Cloudflare ZeroTrust containing name and email
 */
export function setLoggedInUser(payload: ZeroTrustAuthPayload): void {
  // Store the authentication payload
  localStorage.setItem(AUTH_PAYLOAD_KEY, JSON.stringify(payload));
  
  // Get or create user from payload
  const users = getUsers();
  let user = users.find((u: User) => u.email === payload.email);
  
  if (!user) {
    // Create new user from ZeroTrust payload
    // Split name into first_name and last_name
    const nameParts = payload.name ? payload.name.trim().split(/\s+/) : ['', ''];
    const firstName = nameParts[0] || '';
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';
    
    user = {
      email: payload.email,
      name: payload.name,
      firstName,
      lastName,
      username: `user_${Date.now()}`,
      bio: '',
      faqs: [],
    };
    users.push(user);
    saveUsers(users);
  } else {
    // Update name if it changed
    if (user.name !== payload.name) {
      const nameParts = payload.name ? payload.name.trim().split(/\s+/) : ['', ''];
      user.name = payload.name;
      user.firstName = nameParts[0] || '';
      user.lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';
      const userIndex = users.findIndex((u: User) => u.email === payload.email);
      if (userIndex !== -1) {
        users[userIndex] = user;
        saveUsers(users);
      }
    }
  }
  
  // Store username for backward compatibility
  localStorage.setItem(LOGGED_IN_USER_KEY, user.username);
}

/**
 * Fetch authentication payload from server (ZeroTrust)
 * The server extracts user info from Cloudflare ZeroTrust headers
 */
export async function fetchAuthFromServer(): Promise<ZeroTrustAuthPayload | null> {
  try {
    const response = await fetch('/api/auth/me');
    if (!response.ok) {
      return null;
    }
    const payload = await response.json() as ZeroTrustAuthPayload;
    return payload;
  } catch (error) {
    console.error('Error fetching auth from server:', error);
    return null;
  }
}

/**
 * Get the authentication payload from localStorage
 */
export function getAuthPayload(): ZeroTrustAuthPayload | null {
  const payloadStr = localStorage.getItem(AUTH_PAYLOAD_KEY);
  if (!payloadStr) {
    return null;
  }
  try {
    return JSON.parse(payloadStr) as ZeroTrustAuthPayload;
  } catch {
    return null;
  }
}

/**
 * Get the currently logged-in user email (from ZeroTrust)
 */
export function getLoggedInUser(): string | null {
  const payload = getAuthPayload();
  return payload?.email || null;
}

/**
 * Clear all cookies for the current domain
 * Note: HttpOnly cookies cannot be cleared from JavaScript
 */
function clearAllCookies(): void {
  try {
    // Get all cookies
    const cookies = document.cookie.split(';');
    
    // Clear each cookie
    for (let cookie of cookies) {
      const eqPos = cookie.indexOf('=');
      const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
      
      // Clear cookie for current domain
      document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
      
      // Also try to clear for parent domain if applicable
      const domain = window.location.hostname;
      const domainParts = domain.split('.');
      if (domainParts.length > 1) {
        const parentDomain = '.' + domainParts.slice(-2).join('.');
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=${parentDomain}`;
      }
      
      // Clear for root path
      document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
    }
  } catch (error) {
    console.warn('Error clearing cookies:', error);
  }
}

/**
 * Logout the current user
 * Clears all login information, ends the session, refreshes the browser, and redirects to ifaq.ai for ZeroTrust login
 */
export function logout(): void {
  // Clear all authentication-related localStorage items
  localStorage.removeItem(LOGGED_IN_USER_KEY);
  localStorage.removeItem(AUTH_PAYLOAD_KEY);
  
  // Clear users storage (may contain sensitive user data)
  localStorage.removeItem(USERS_STORAGE_KEY);
  
  // Clear any session storage related to auth
  sessionStorage.clear();
  
  // Clear all cookies to end the ZeroTrust session
  // This includes Cloudflare ZeroTrust session cookies
  clearAllCookies();
  
  // Force a hard redirect to ifaq.ai with cache-busting parameters
  // Using replace instead of href prevents back button access
  // The timestamp ensures a fresh load bypassing cache
  const timestamp = Date.now();
  const logoutUrl = `https://ifaq.ai?logout=${timestamp}&t=${timestamp}`;
  
  // Force a complete page unload and redirect
  // This ensures all browser state is cleared before redirect
  window.location.replace(logoutUrl);
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

