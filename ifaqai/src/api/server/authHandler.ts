/**
 * Server-side authentication handler for Cloudflare ZeroTrust
 * Extracts user information from ZeroTrust JWT token
 */

export interface ZeroTrustAuthPayload {
  name: string;
  email: string;
}

/**
 * Extract user information from Cloudflare ZeroTrust JWT token
 * ZeroTrust provides user info in the CF-Access-JWT-Assertion header
 * or in request.cf properties
 */
export function extractZeroTrustAuth(request: Request): ZeroTrustAuthPayload | null {
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
 */
export async function handleAuthEndpoint(request: Request): Promise<Response> {
  const authPayload = extractZeroTrustAuth(request);
  
  if (!authPayload) {
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

