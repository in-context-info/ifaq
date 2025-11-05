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
      const modifiedAt = new Date().toISOString();
      const userBio = user.bio || null;
      
      // 5.a write the user update to the database
      console.log('Updating user in database...');
      console.log('Existing user email:', existingUser.email);
      console.log('Update user email:', user.email);
      const sql = `UPDATE Users SET user_name = ?, first_name = ?, last_name = ?, user_bio = ?, modified_at = ? WHERE email = ?`;
      const sqlParams = [user.username, firstName, lastName, userBio, modifiedAt, user.email];
      console.log('SQL query:', sql);
      console.log('SQL parameters:', sqlParams);
      const { meta } = await db.prepare(sql).bind(...sqlParams).run();
      console.log('Database update results:', meta);
      
      // Verify rows were affected
      const changes = (meta as any).changes || 0;
      if (changes === 0) {
        console.error(`Update query executed but no rows were affected for email: ${user.email}`);
        console.error('This means the WHERE clause did not match any rows.');
        console.error('Checking if user exists with different email casing...');
        // Try to find user with case-insensitive email
        const checkUser = await db.prepare('SELECT email FROM Users WHERE LOWER(email) = LOWER(?)').bind(user.email).first();
        if (checkUser) {
          console.error(`Found user with different email casing: ${checkUser.email} vs ${user.email}`);
          throw new Error(`Email case mismatch: found '${checkUser.email}' but updating with '${user.email}'`);
        }
        throw new Error(`Failed to update user: no rows affected for email ${user.email}. User may not exist in database.`);
      }
      console.log(`Successfully updated ${changes} row(s)`);
      
      // Fetch updated user
      const updatedUser = await getUserByEmail(db, user.email);
      if (!updatedUser) {
        throw new Error(`User was updated but could not be retrieved from database`);
      }
      return updatedUser;
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
  request: Request,
  env: { DB: D1Database }
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

/**
 * Handle POST /api/users endpoint
 * Creates or updates a user in the database
 */
export async function handleCreateUser(
  request: Request,
  env: { DB: D1Database }
): Promise<Response> {
  try {
    // Log request details
    console.log('POST /api/users - Received request');
    console.log('Request headers:', Object.fromEntries(request.headers.entries()));
    
    // Parse request body
    let user: User;
    try {
      const bodyText = await request.text();
      console.log('Request body:', bodyText);
      user = JSON.parse(bodyText) as User;
      console.log('Parsed user:', user);
    } catch (parseError) {
      console.error('Error parsing request body:', parseError);
      return new Response(
        JSON.stringify({ error: 'Invalid JSON in request body', details: parseError instanceof Error ? parseError.message : String(parseError) }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    if (!user.email) {
      console.error('Email is missing from request');
      return new Response(
        JSON.stringify({ error: 'Email is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Check if user already exists by email
    const existingUserByEmail = await getUserByEmail(env.DB, user.email);
    
    // Ensure username is set (use temporary if not provided)
    if (!user.username || user.username.startsWith('user_')) {
      // Generate a unique temporary username
      let tempUsername = `user_${Date.now()}`;
      // Check if temp username is taken (very unlikely, but check anyway)
      let attempts = 0;
      while (attempts < 10) {
        const existingUser = await getUserByUsername(env.DB, tempUsername);
        if (!existingUser) {
          break;
        }
        tempUsername = `user_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        attempts++;
      }
      user.username = tempUsername;
    } else {
      // Check if the username is already taken in the database
      const existingUserByUsername = await getUserByUsername(env.DB, user.username);
      
      if (existingUserByUsername) {
        // Username is taken - check if it's by the same user (updating) or different user
        const isSameUser = existingUserByUsername.email === user.email;
        
        if (!isSameUser) {
          // Username is taken by a different user - reject
          return new Response(
            JSON.stringify({ error: 'Username already taken' }),
            { status: 409, headers: { 'Content-Type': 'application/json' } }
          );
        }
        // If isSameUser is true, allow it (user updating their own username)
      }
      // If existingUserByUsername is null, username is available - proceed
    }

    // Create or update user in database
    const createdUser = await upsertUser(env.DB, user);

    // Remove password from response if it exists
    const { password, ...userWithoutPassword } = createdUser;
    
    return new Response(
      JSON.stringify(userWithoutPassword),
      { 
        status: 201,
        headers: { 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    console.error('Error creating user:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    console.error('Error details:', {
      message: error instanceof Error ? error.message : String(error),
      name: error instanceof Error ? error.name : 'Unknown',
    });
    
    // Return more detailed error message
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    const errorDetails = error instanceof Error && error.stack ? error.stack : String(error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        message: errorMessage,
        // Include error details for debugging (remove in production if needed)
        details: errorDetails
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

