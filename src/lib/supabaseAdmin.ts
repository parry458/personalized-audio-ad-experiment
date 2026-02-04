/**
 * Supabase Admin Client
 * =====================
 * This file creates a Supabase client for SERVER-SIDE use only.
 * 
 * IMPORTANT: This uses the SERVICE_ROLE_KEY which has full database access.
 * NEVER import this file in client-side code (components, pages).
 * Only use in API routes (/app/api/...) which run on the server.
 */

import { createClient } from '@supabase/supabase-js';

// Get environment variables
// These are set in .env.local (copy from .env.example)
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Validate that required environment variables are set
if (!supabaseUrl) {
  throw new Error(
    'Missing SUPABASE_URL environment variable. ' +
    'Copy .env.example to .env.local and fill in your Supabase URL.'
  );
}

if (!supabaseServiceRoleKey) {
  throw new Error(
    'Missing SUPABASE_SERVICE_ROLE_KEY environment variable. ' +
    'Copy .env.example to .env.local and fill in your service role key.'
  );
}

/**
 * Supabase Admin Client
 * 
 * Use this client in API routes to interact with your Supabase database.
 * It has full access to all tables (bypasses Row Level Security).
 * 
 * Example usage in an API route:
 *   import { supabaseAdmin } from '@/lib/supabaseAdmin';
 *   const { data, error } = await supabaseAdmin.from('participants').select('*');
 */
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    // We don't need to persist sessions for server-side admin client
    autoRefreshToken: false,
    persistSession: false,
  },
});
