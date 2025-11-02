/**
 * Client-side user API utilities
 * Functions to interact with user APIs and manage session storage
 */

export interface User {
	id?: number;
	username?: string;
	email?: string;
	name?: string;
	bio?: string;
	created_at?: string;
	updated_at?: string;
	[key: string]: any; // Allow for additional fields from database
}

export interface FetchUserResponse {
	success: boolean;
	user?: User;
	error?: string;
}

/**
 * Fetches user information from D1 database via API
 * @param email - User email address (optional)
 * @param username - User username (optional)
 * @returns User object or null if not found
 */
export async function fetchUserFromDB(email?: string, username?: string): Promise<User | null> {
	try {
		const params = new URLSearchParams();
		if (email) {
			params.append('email', email);
		}
		if (username) {
			params.append('username', username);
		}

		if (!email && !username) {
			console.error('fetchUserFromDB: email or username is required');
			return null;
		}

		const response = await fetch(`/api/users/fetch?${params.toString()}`);
		
		if (!response.ok) {
			if (response.status === 404) {
				console.log('User not found in database');
				return null;
			}
			throw new Error(`Failed to fetch user: ${response.statusText}`);
		}

		const data: FetchUserResponse = await response.json();
		
		if (data.success && data.user) {
			return data.user;
		}

		return null;
	} catch (error) {
		console.error('Error fetching user from database:', error);
		return null;
	}
}

/**
 * Stores user information in sessionStorage
 * @param user - User object to store
 */
export function storeUserInSession(user: User): void {
	try {
		sessionStorage.setItem('user', JSON.stringify(user));
		console.log('User stored in sessionStorage:', user.email || user.username);
	} catch (error) {
		console.error('Error storing user in sessionStorage:', error);
	}
}

/**
 * Retrieves user information from sessionStorage
 * @returns User object or null if not found
 */
export function getUserFromSession(): User | null {
	try {
		const userStr = sessionStorage.getItem('user');
		if (!userStr) {
			return null;
		}
		return JSON.parse(userStr) as User;
	} catch (error) {
		console.error('Error retrieving user from sessionStorage:', error);
		return null;
	}
}

/**
 * Removes user information from sessionStorage
 */
export function clearUserFromSession(): void {
	try {
		sessionStorage.removeItem('user');
		console.log('User cleared from sessionStorage');
	} catch (error) {
		console.error('Error clearing user from sessionStorage:', error);
	}
}

/**
 * Fetches user from database and stores in sessionStorage
 * @param email - User email address (optional)
 * @param username - User username (optional)
 * @returns User object or null if not found
 */
export async function fetchAndStoreUser(email?: string, username?: string): Promise<User | null> {
	const user = await fetchUserFromDB(email, username);
	if (user) {
		storeUserInSession(user);
	}
	return user;
}

/**
 * Gets user from sessionStorage, or fetches from database if not found
 * @param email - User email address (optional)
 * @param username - User username (optional)
 * @param forceRefresh - If true, fetches from database even if user exists in session
 * @returns User object or null if not found
 */
export async function getUser(
	email?: string,
	username?: string,
	forceRefresh: boolean = false
): Promise<User | null> {
	// Check sessionStorage first (unless force refresh)
	if (!forceRefresh) {
		const sessionUser = getUserFromSession();
		if (sessionUser) {
			return sessionUser;
		}
	}

	// Fetch from database if not in session or force refresh
	if (email || username) {
		return await fetchAndStoreUser(email, username);
	}

	return null;
}
