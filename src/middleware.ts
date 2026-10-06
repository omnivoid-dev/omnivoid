import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        response = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const url = request.nextUrl.clone();
  const pathname = url.pathname;

  // Allow login route
  if (pathname === '/admin/login' || pathname === '/api/admin/login') {
    if (user && user.app_metadata?.role === 'admin' && pathname === '/admin/login') {
      url.pathname = '/admin/dashboard';
      return NextResponse.redirect(url);
    }
    return response;
  }

  // Protect /admin routes
  if (pathname.startsWith('/admin')) {
    if (!user || user.app_metadata?.role !== 'admin') {
      url.pathname = '/admin/login';
      return NextResponse.redirect(url);
    }
  }

  // Protect /api/admin routes
  if (pathname.startsWith('/api/admin')) {
    const authHeader = request.headers.get('Authorization');
    if (!user && (!authHeader || !authHeader.startsWith('Bearer '))) {
      return NextResponse.json(
        { success: false, error: 'UNAUTHORIZED', message: 'Authentication required' },
        { status: 401 }
      );
    }
  }

  return response;
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
};
