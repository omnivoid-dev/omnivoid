/**
 * OMNIVOID LABS - Admin Login API (Supabase Auth)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'INVALID_INPUT', message: 'Email and password are required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.user) {
      return NextResponse.json(
        { success: false, error: 'INVALID_CREDENTIALS', message: error?.message || 'Invalid email or password' },
        { status: 401 }
      );
    }

    if (data.user.app_metadata?.role !== 'admin') {
      await supabase.auth.signOut();
      return NextResponse.json(
        { success: false, error: 'FORBIDDEN', message: 'Admin role required' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      user: {
        id: data.user.id,
        email: data.user.email,
        role: data.user.app_metadata?.role,
      },
      session: data.session,
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { success: false, error: 'INTERNAL_ERROR', message: 'An error occurred during login' },
      { status: 500 }
    );
  }
}