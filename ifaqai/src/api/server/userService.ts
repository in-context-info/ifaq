/**
 * Server-side user service for Cloudflare D1 Database
 * Handles database queries for user data
 */

import type { User, DbUser } from '../types';

/**
 * Convert database user to application user
 */
function dbUserToUser(dbUser: DbUser): User {
  return {
    userId: dbUser.user_id,
    email: dbUser.email,
    username: dbUser.user_name,
    name: `${dbUser.first_name} ${dbUser.last_name}`.trim(),
    firstName: dbUser.first_name,
    lastName: dbUser.last_name,
    faqs: [], // FAQs will be loaded separately if needed
    createdAt: dbUser.created_at,
  };
}

/**
 * Convert application user to database user
 */
function userToDbUser(user: User): Partial<DbUser> {
  // Split name into first_name and last_name
  const nameParts = user.name ? user.name.trim().split(/\s+/) : ['', ''];
  const firstName = user.firstName || nameParts[0] || '';
  const lastName = user.lastName || (nameParts.length > 1 ? nameParts.slice(1).join(' ') : '');
  
  return {
    email: user.email,
    user_name: user.username,
    first_name: firstName,
    last_name: lastName,
    ...(user.userId && { user_id: user.userId }),
  };
}

/**
 * Get user from D1 database by email
 * @param db - D1 database binding
 * @param email - User email address
 * @returns User object or null if not found
 */
export async function getUserByEmail(db: D1Database, email: string): Promise<User | null> {
  try {
    const stmt = db.prepare('SELECT * FROM Users WHERE email = ?').bind(email);
    const result = await stmt.first<DbUser>();
    
    if (!result) {
      return null;
    }

    // Convert database user to application user
    const user = dbUserToUser(result);
    
    return user;
  } catch (error) {
    console.error('Error fetching user from database:', error);
    throw error;
  }
}

/**
 * Get user from D1 database by username (user_name column)
 * @param db - D1 database binding
 * @param username - Username (user_name)
 * @returns User object or null if not found
 */
export async function getUserByUsername(db: D1Database, username: string): Promise<User | null> {
  try {
    const stmt = db.prepare('SELECT * FROM Users WHERE user_name = ?').bind(username);
    const result = await stmt.first<DbUser>();
    
    if (!result) {
      return null;
    }

    // Convert database user to application user
    const user = dbUserToUser(result);
    
    return user;
  } catch (error) {
    console.error('Error fetching user from database:', error);
    throw error;
  }
}

/**
 * Create or update user in D1 database
 * @param db - D1 database binding
 * @param user - User object to create/update
 * @returns Created/updated user
 */
export async function upsertUser(db: D1Database, user: User): Promise<User> {
  try {
    const dbUser = userToDbUser(user);
    
    // Check if user exists by email
    const existingUser = await getUserByEmail(db, user.email);
    
    if (existingUser) {
      // Update existing user
      const nameParts = user.name ? user.name.trim().split(/\s+/) : ['', ''];
      const firstName = user.firstName || nameParts[0] || '';
      const lastName = user.lastName || (nameParts.length > 1 ? nameParts.slice(1).join(' ') : '');
      
      const stmt = db.prepare(`
        UPDATE Users 
        SET user_name = ?, first_name = ?, last_name = ?
        WHERE email = ?
      `).bind(
        user.username,
        firstName,
        lastName,
        user.email
      );
      await stmt.run();
      
      // Fetch updated user
      const updatedUser = await getUserByEmail(db, user.email);
      return updatedUser || { ...existingUser, ...user };
    } else {
      // Insert new user
      const nameParts = user.name ? user.name.trim().split(/\s+/) : ['', ''];
      const firstName = user.firstName || nameParts[0] || '';
      const lastName = user.lastName || (nameParts.length > 1 ? nameParts.slice(1).join(' ') : '');
      const createdAt = new Date().toISOString();
      
      const stmt = db.prepare(`
        INSERT INTO Users (email, user_name, first_name, last_name, created_at)
        VALUES (?, ?, ?, ?, ?)
      `).bind(
        user.email,
        user.username,
        firstName,
        lastName,
        createdAt
      );
      await stmt.run();
      
      // Fetch the newly created user to get user_id
      const newUser = await getUserByEmail(db, user.email);
      return newUser || { ...user, createdAt };
    }
  } catch (error) {
    console.error('Error upserting user to database:', error);
    throw error;
  }
}

/**
 * Handle GET /api/users/me endpoint
 * Returns current user based on email from ZeroTrust authentication
 * Filters by email column in Users table
 */
export async function handleGetCurrentUser(
  request: Request,
  env: { DB?: D1Database }
): Promise<Response> {
  // Extract email from query parameter (required for filtering)
  const url = new URL(request.url);
  const email = url.searchParams.get('email');
  
  if (!email) {
    return new Response(
      JSON.stringify({ error: 'Email parameter is required' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  if (!env.DB) {
    return new Response(
      JSON.stringify({ error: 'Database binding not configured' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    // Query Users table filtering by email column
    const user = await getUserByEmail(env.DB, email);
    
    if (!user) {
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Remove password from response if it exists
    const { password, ...userWithoutPassword } = user;
    
    return new Response(
      JSON.stringify(userWithoutPassword),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error fetching user:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

