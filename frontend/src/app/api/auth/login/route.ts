import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL =
  process.env.BACKEND_INTERNAL_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'http://127.0.0.1:8000';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { identifier, email, phone, password, role } = body;

    const searchIdentifier = identifier || email || phone;
    if (!searchIdentifier || !password) {
      return NextResponse.json(
        { error: 'Email or mobile number and password are required' },
        { status: 400 }
      );
    }

    // Try real backend endpoint POST /auth/login
    try {
      const backendRes = await fetch(`${BACKEND_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          identifier: searchIdentifier,
          email: searchIdentifier.includes('@') ? searchIdentifier : undefined,
          phone: !searchIdentifier.includes('@') ? searchIdentifier : undefined,
          password,
        }),
      });

      const data = await backendRes.json();

      if (!backendRes.ok) {
        return NextResponse.json(
          { error: data.detail || 'Invalid email/mobile number or password' },
          { status: backendRes.status }
        );
      }

      // Successful login from real backend
      const response = NextResponse.json({
        success: true,
        access_token: data.access_token,
        token_type: data.token_type || 'bearer',
        role: data.role || role || 'Analyst',
        user: data.user || {
          id: 'user',
          name: data.name || searchIdentifier.split('@')[0],
          email: data.email || searchIdentifier,
          role: data.role || role || 'Analyst',
        },
      });

      // Set httpOnly cookie for secure JWT storage
      response.cookies.set({
        name: 'auth_token',
        value: data.access_token,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24, // 24 hours
      });

      // Client-readable cookie for role-based UI switching
      response.cookies.set({
        name: 'omnivise_role',
        value: data.role || role || 'Analyst',
        httpOnly: false,
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24,
      });

      return response;
    } catch (backendFetchError: unknown) {
      // If backend is unreachable, check demo credentials fallback
      const demoUsers: Record<string, { pass: string; role: string; name: string }> = {
        'admin@omnivise.ai': { pass: 'admin123', role: 'admin', name: 'Priyanshi Aggarwal' },
        'auditor@omnivise.ai': { pass: 'audit123', role: 'reviewer', name: 'Alex Chen' },
        'viewer@omnivise.ai': { pass: 'view123', role: 'viewer', name: 'Jordan Hale' },
      };

      const userMatch = demoUsers[searchIdentifier.toLowerCase()];
      if (userMatch && userMatch.pass === password) {
        const mockToken = `mock-jwt-${Buffer.from(JSON.stringify({ sub: searchIdentifier, role: userMatch.role })).toString('base64')}`;
        const response = NextResponse.json({
          success: true,
          access_token: mockToken,
          token_type: 'bearer',
          role: userMatch.role,
          user: {
            id: 'mock-user-id',
            name: userMatch.name,
            email: searchIdentifier,
            role: userMatch.role,
          },
        });

        response.cookies.set({
          name: 'auth_token',
          value: mockToken,
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          path: '/',
          maxAge: 60 * 60 * 24,
        });

        response.cookies.set({
          name: 'omnivise_role',
          value: userMatch.role,
          httpOnly: false,
          sameSite: 'lax',
          path: '/',
          maxAge: 60 * 60 * 24,
        });

        return response;
      }

      const fetchErr = backendFetchError as { code?: string; message?: string };
      return NextResponse.json(
        {
          error:
            fetchErr?.code === 'ECONNREFUSED'
              ? 'OmniVise backend server is not reachable. Please ensure backend is running.'
              : 'Invalid email/mobile number or password',
        },
        { status: 401 }
      );
    }
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json(
      { error: err?.message || 'Internal server error during login' },
      { status: 500 }
    );
  }
}
