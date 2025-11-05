/**
 * Server-side authentication handler for Cloudflare ZeroTrust
 * Extracts user information from ZeroTrust JWT token
 */

export interface ZeroTrustAuthPayload {
  name: string;
  email: string;
}

/**
 * Check if we're in local development mode
 */
function isLocalDevelopment(request: Request): boolean {
  const url = new URL(request.url);
  // Check if running on localhost or 127.0.0.1
  const isLocalhost = url.hostname === 'localhost' || 
                     url.hostname === '127.0.0.1' || 
                     url.hostname.includes('localhost') ||
                     url.hostname.includes('127.0.0.1');
  
  // Also check for dev mode query parameter or header
  const devMode = url.searchParams.get('dev') === 'true' || 
                  request.headers.get('X-Dev-Mode') === 'true';
  
  return isLocalhost || devMode;
}

/**
 * Get mock/test user for local development
 */
function getLocalDevUser(request: Request): ZeroTrustAuthPayload | null {
  const url = new URL(request.url);
  
  // Check for email in query params or header
  const email = url.searchParams.get('dev_email') || 
                request.headers.get('X-Dev-Email') || 
                'dev@localhost.local';
  
  const name = url.searchParams.get('dev_name') || 
               request.headers.get('X-Dev-Name') || 
               'Dev User';
  
  console.log('[LOCAL DEV MODE] Using mock authentication:', { email, name });
  
  return {
    email,
    name,
  };
}

/**
 * Extract user information from Cloudflare ZeroTrust JWT token
 * ZeroTrust provides user info in the CF-Access-JWT-Assertion header
 * or in request.cf properties
 * 
 * In local development, returns a mock user for testing
 */
export function extractZeroTrustAuth(request: Request): ZeroTrustAuthPayload | null {
  // Local development bypass
  if (isLocalDevelopment(request)) {
    return getLocalDevUser(request);
  }
  
  // Method 1: Check CF-Access-JWT-Assertion header (most common)
  const jwtHeader = request.headers.get('CF-Access-JWT-Assertion');
  if (jwtHeader) {
    try {
      // Decode JWT payload (base64url)
      const parts = jwtHeader.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(
          atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'))
        );
        
        // Extract email and name from JWT claims
        // Cloudflare ZeroTrust typically uses 'email' and 'name' or 'common_name'
        return {
          email: payload.email || payload.common_name || '',
          name: payload.name || payload.given_name || payload.common_name || '',
        };
      }
    } catch (error) {
      console.error('Error parsing JWT token:', error);
    }
  }

  // Method 2: Check CF-Access-Authenticated-User-Email header (simpler, if available)
  const email = request.headers.get('CF-Access-Authenticated-User-Email');
  const name = request.headers.get('CF-Access-Authenticated-User-Name') || 
               request.headers.get('CF-Access-Authenticated-User-Common-Name');
  
  if (email) {
    return {
      email,
      name: name || email.split('@')[0], // Fallback to email prefix if no name
    };
  }

  // Method 3: Check request.cf properties (if available)
  // Note: This requires proper TypeScript types for request.cf
  const cf = (request as any).cf;
  if (cf?.tlsClientAuth?.subject?.CN) {
    // Extract from client certificate subject
    return {
      email: cf.tlsClientAuth.subject.email || cf.tlsClientAuth.subject.CN,
      name: cf.tlsClientAuth.subject.name || cf.tlsClientAuth.subject.CN,
    };
  }

  return null;
}

/**
 * Create API endpoint to return authentication payload
 * This endpoint should be protected by Cloudflare ZeroTrust
 * In local development, returns a mock user for testing
 */
export async function handleAuthEndpoint(request: Request): Promise<Response> {
  const authPayload = extractZeroTrustAuth(request);
  
  if (!authPayload) {
    // In local dev, still return a default user instead of error
    if (isLocalDevelopment(request)) {
      const defaultUser = getLocalDevUser(request);
      return new Response(
        JSON.stringify(defaultUser),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    return new Response(
      JSON.stringify({ error: 'Not authenticated' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  return new Response(
    JSON.stringify(authPayload),
    { headers: { 'Content-Type': 'application/json' } }
  );
}

