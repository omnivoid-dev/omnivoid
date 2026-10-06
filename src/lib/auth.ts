/**
 * OMNIVOID LABS - Supabase Authentication Utilities
 */

import { createClient as createServerSupabaseClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export interface VerifyAdminResult {
  success: boolean;
  userId?: string;
  user?: any;
  error?: string;
}

/**
 * Verify admin user session from request (cookies or Authorization header)
 * Checks for a valid user and that user.app_metadata.role === 'admin'
 */
export async function verifyAdminToken(request?: Request): Promise<VerifyAdminResult> {
  try {
    // 1. Check Authorization Bearer token header if present
    const authHeader = request?.headers.get('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const adminClient = createAdminClient();
      const { data: { user }, error } = await adminClient.auth.getUser(token);

      if (error || !user) {
        return { success: false, error: 'Invalid authentication token' };
      }

      if (user.app_metadata?.role !== 'admin') {
        return { success: false, error: 'Forbidden: Admin role required' };
      }

      return { success: true, userId: user.id, user };
    }

    // 2. Check session via cookies using server client
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      return { success: false, error: 'Unauthorized: Session missing or invalid' };
    }

    if (user.app_metadata?.role !== 'admin') {
      return { success: false, error: 'Forbidden: Admin role required' };
    }

    return { success: true, userId: user.id, user };
  } catch (error: any) {
    console.error('Error verifying admin auth:', error);
    return { success: false, error: 'Authentication check failed' };
  }
}
