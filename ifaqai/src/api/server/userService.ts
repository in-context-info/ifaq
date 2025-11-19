/**
 * Server-side user service for Cloudflare D1 Database
 * Handles database queries for user data
 */

import type { Context } from 'hono';
import type { Env } from '../../types/env';
import type { User, DbUser, FAQ } from '../types';

/**
 * Convert database user to application user
 */
function dbUserToUser(dbUser: DbUser): User {
  // Handle null/undefined values safely
  const firstName = dbUser.first_name || '';
  const lastName = dbUser.last_name || '';
  const fullName = `${firstName} ${lastName}`.trim() || dbUser.email.split('@')[0];
  
  return {
    userId: dbUser.user_id,
    email: dbUser.email,
    username: dbUser.user_name || '',
    name: fullName,
    firstName: firstName || undefined,
    lastName: lastName || undefined,
    bio: dbUser.user_bio || undefined,
    faqs: [], // FAQs will be loaded separately if needed
    createdAt: dbUser.created_at,
    modifiedAt: dbUser.modified_at || undefined,
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
    user_bio: user.bio || null,
    ...(user.userId && { user_id: user.userId }),
  };
}

interface DbFaq {
  faq_id: number;
  user_id: number;
  question: string;
  answer: string;
  created_at?: string;
  modified_at?: string;
}

function dbFaqToFaq(dbFaq: DbFaq): FAQ {
  const fallbackId = dbFaq.faq_id ?? Date.now();
  return {
    id: String(fallbackId),
    question: dbFaq.question,
    answer: dbFaq.answer,
  };
}

export async function getFAQsByUserId(db: D1Database, userId: number | string): Promise<FAQ[]> {
  try {
    const statement = db
      .prepare(
        'SELECT faq_id, question, answer, created_at, modified_at FROM FAQs WHERE user_id = ? ORDER BY created_at DESC'
      )
      .bind(userId);

    const { results } = await statement.all<DbFaq>();

    if (!results || results.length === 0) {
      return [];
    }

    return results.map(dbFaqToFaq);
  } catch (error) {
    console.error('Error fetching FAQs for user:', error);
    return [];
  }
}

/**
 * Get user from D1 database by email
 * @param db - D1 database binding
 * @param email - User email address
 * @returns User object or null if not found
 */
export async function getUserByEmail(
  db: D1Database,
  email: string,
  options?: { includeFaqs?: boolean }
): Promise<User | null> {
  try {
    const stmt = db.prepare('SELECT * FROM Users WHERE email = ?').bind(email);
    const result = await stmt.first<DbUser>();
    
    if (!result) {
      return null;
    }

    // Convert database user to application user
    const user = dbUserToUser(result);

    if (options?.includeFaqs && user.userId !== undefined && user.userId !== null) {
      user.faqs = await getFAQsByUserId(db, user.userId);
    }

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
export async function getUserByUsername(
  db: D1Database,
  username: string,
  options?: { includeFaqs?: boolean }
): Promise<User | null> {
  try {
    const stmt = db.prepare('SELECT * FROM Users WHERE user_name = ?').bind(username);
    const result = await stmt.first<DbUser>();
    
    if (!result) {
      return null;
    }

    // Convert database user to application user
    const user = dbUserToUser(result);

    if (options?.includeFaqs && user.userId !== undefined && user.userId !== null) {
      user.faqs = await getFAQsByUserId(db, user.userId);
    }

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
      const modifiedAt = new Date().toISOString();
      const userBio = user.bio || null;
      
      // 5.a write the user update to the database
      console.log('Updating user in database...');
      const sql = `UPDATE Users SET user_name = ?, first_name = ?, last_name = ?, user_bio = ?, modified_at = ? WHERE email = ?`;
      const sqlParams = [user.username, firstName, lastName, userBio, modifiedAt, user.email];
      console.log('SQL query:', sql);
      console.log('SQL parameters:', sqlParams);
      const { meta } = await db.prepare(sql).bind(...sqlParams).run();
      console.log('Database update results:', meta);
      
      // Verify rows were affected
      const changes = (meta as any).changes || 0;
      if (changes === 0) {
        console.warn(`Update query executed but no rows were affected for email: ${user.email}`);
      }
      
      // Fetch updated user
      const updatedUser = await getUserByEmail(db, user.email);
      return updatedUser || { ...existingUser, ...user, modifiedAt };
    } else {
      // Insert new user
      const nameParts = user.name ? user.name.trim().split(/\s+/) : ['', ''];
      const firstName = user.firstName || nameParts[0] || '';
      const lastName = user.lastName || (nameParts.length > 1 ? nameParts.slice(1).join(' ') : '');
      const createdAt = new Date().toISOString();
      const userBio = user.bio || null;
      
      // 5.a write the user to the database
      console.log('Inserting user into database...');
      const sql = `INSERT INTO Users (email, user_name, first_name, last_name, user_bio, created_at) VALUES (?, ?, ?, ?, ?, ?)`;
      const sqlParams = [user.email, user.username, firstName, lastName, userBio, createdAt];
      console.log('SQL query:', sql);
      console.log('SQL parameters:', sqlParams);
      const { meta } = await db.prepare(sql).bind(...sqlParams).run();
      console.log('Database insert results:', meta);
      
      // Verify rows were affected
      const changes = (meta as any).changes || 0;
      if (changes === 0) {
        throw new Error(`Insert query executed but no rows were inserted for email: ${user.email}`);
      }
      
      // Fetch the newly created user to get user_id
      const newUser = await getUserByEmail(db, user.email);
      if (!newUser) {
        throw new Error(`User was inserted but could not be retrieved from database`);
      }
      return newUser;
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
  c: Context<{ Bindings: Env }>
): Promise<Response> {
  // Extract email from query parameter (required for filtering)
  const email = c.req.query('email');
  const userId = c.req.query('userId');
  
  // Check if database is available
  if (!c.env.DB) {
    console.error('Database binding (DB) is not available');
    return c.json({ 
      error: 'Database not configured',
      details: 'DB binding is missing from environment'
    }, 500);
  }

  try {
    let user: User | null = null;
    
    // Support both email and userId queries
    if (email) {
      user = await getUserByEmail(c.env.DB, email, { includeFaqs: true });
    } else if (userId) {
      const stmt = c.env.DB.prepare('SELECT * FROM Users WHERE user_id = ?').bind(userId);
      const result = await stmt.first<DbUser>();
      if (result) {
        user = dbUserToUser(result);
        if (user.userId !== undefined && user.userId !== null) {
          user.faqs = await getFAQsByUserId(c.env.DB, user.userId);
        }
      }
    } else {
      return c.json({ error: 'Email or userId parameter is required' }, 400);
    }
    
    if (!user) {
      return c.json({ error: 'User not found' }, 404);
    }

    // Remove password from response if it exists
    const { password, ...userWithoutPassword } = user;
    
    return c.json(userWithoutPassword);
  } catch (error) {
    console.error('Error fetching user:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    return c.json({ 
      error: 'Internal server error',
      details: errorMessage,
      ...(errorStack && { stack: errorStack })
    }, 500);
  }
}

/**
 * Handle GET /api/users/:username endpoint
 * Returns user by username (for public chatbot access)
 */
export async function handleGetUserByUsername(
  c: Context<{ Bindings: Env }>
): Promise<Response> {
  const username = c.req.param('username');
  
  if (!username) {
    return c.json({ error: 'Username parameter is required' }, 400);
  }

  // Check if database is available
  if (!c.env.DB) {
    console.error('Database binding (DB) is not available');
    return c.json({ 
      error: 'Database not configured',
      details: 'DB binding is missing from environment'
    }, 500);
  }

  try {
    // Query Users table filtering by username (user_name column)
    const user = await getUserByUsername(c.env.DB, username, { includeFaqs: true });
    
    if (!user) {
      return c.json({ error: 'User not found' }, 404);
    }

    // Remove password from response if it exists
    const { password, ...userWithoutPassword } = user;
    
    return c.json(userWithoutPassword);
  } catch (error) {
    console.error('Error fetching user by username:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    return c.json({ 
      error: 'Internal server error',
      details: errorMessage,
      ...(errorStack && { stack: errorStack })
    }, 500);
  }
}

/**
 * Handle POST /api/users endpoint
 * Creates or updates a user in the database
 */
export async function handleCreateUser(
  c: Context<{ Bindings: Env }>
): Promise<Response> {
  try {
    const user = await c.req.json() as User;
    
    if (!user.email) {
      return c.json({ error: 'Email is required' }, 400);
    }

    // Check if database is available
    if (!c.env.DB) {
      console.error('Database binding (DB) is not available');
      return c.json({ 
        error: 'Database not configured',
        details: 'DB binding is missing from environment'
      }, 500);
    }

    // Check if user already exists by email
    // Access D1 database from Hono context: c.env.DB
    const existingUserByEmail = await getUserByEmail(c.env.DB, user.email);
    
    // Ensure username is set (use temporary if not provided)
    if (!user.username || user.username.startsWith('user_')) {
      // Generate a unique temporary username
      let tempUsername = `user_${Date.now()}`;
      // Check if temp username is taken (very unlikely, but check anyway)
      let attempts = 0;
      while (attempts < 10) {
        const existingUser = await getUserByUsername(c.env.DB, tempUsername);
        if (!existingUser) {
          break;
        }
        tempUsername = `user_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        attempts++;
      }
      user.username = tempUsername;
    } else {
      // Check if the username is already taken in the database
      const existingUserByUsername = await getUserByUsername(c.env.DB, user.username);
      
      if (existingUserByUsername) {
        // Username is taken - check if it's by the same user (updating) or different user
        const isSameUser = existingUserByUsername.email === user.email;
        
        if (!isSameUser) {
          // Username is taken by a different user - reject
          return c.json({ error: 'Username already taken' }, 409);
        }
        // If isSameUser is true, allow it (user updating their own username)
      }
      // If existingUserByUsername is null, username is available - proceed
    }

    // Create or update user in database
    const createdUser = await upsertUser(c.env.DB, user);
    const createdUserWithFaqs = await getUserByEmail(c.env.DB, user.email, { includeFaqs: true });
    const responseUser = createdUserWithFaqs || createdUser;

    // Remove password from response if it exists
    const { password, ...userWithoutPassword } = responseUser;
    
    return c.json(userWithoutPassword, 201);
  } catch (error) {
    console.error('Error creating user:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    return c.json({ 
      error: 'Internal server error',
      details: errorMessage,
      ...(errorStack && { stack: errorStack })
    }, 500);
  }
}

