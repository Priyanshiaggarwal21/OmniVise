import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL =
  process.env.BACKEND_INTERNAL_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'http://127.0.0.1:8000';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, identifier, email, phone, password, role } = body;

    const emailValue = email || (identifier?.includes('@') ? identifier : undefined);
    const phoneValue = phone || (!identifier?.includes('@') ? identifier : undefined);

    if (!emailValue && !phoneValue) {
      return NextResponse.json(
        { error: 'Email or mobile number is required' },
        { status: 400 }
      );
    }
    if (!password) {
      return NextResponse.json(
        { error: 'Password is required' },
        { status: 400 }
      );
    }

    const normalizedRole = (role || 'analyst').toLowerCase();

    // Call real backend POST /auth/signup
    try {
      const backendRes = await fetch(`${BACKEND_URL}/auth/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name || (emailValue ? emailValue.split('@')[0] : 'User'),
          email: emailValue || `${phoneValue.replace(/[^0-9]/g, '')}@omnivise.local`,
          phone: phoneValue,
          password,
          role: normalizedRole,
        }),
      });

      const data = await backendRes.json();

      if (!backendRes.ok) {
        return NextResponse.json(
          { error: data.detail || 'Registration failed' },
          { status: backendRes.status }
        );
      }

      const response = NextResponse.json({
        success: true,
        access_token: data.access_token,
        token_type: data.token_type || 'bearer',
        role: data.role || normalizedRole,
        user: data.user,
      });

      // Set httpOnly cookie for session persistence
      response.cookies.set({
        name: 'auth_token',
        value: data.access_token,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24,
      });

      response.cookies.set({
        name: 'omnivise_role',
        value: data.role || normalizedRole,
        httpOnly: false,
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24,
      });

      return response;
    } catch (backendFetchError: unknown) {
      const fetchErr = backendFetchError as { code?: string };
      return NextResponse.json(
        {
          error:
            fetchErr?.code === 'ECONNREFUSED'
              ? 'OmniVise backend server is not reachable. Please ensure backend is running.'
              : 'Registration server error. Please try again.',
        },
        { status: 500 }
      );
    }
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json(
      { error: err?.message || 'Internal server error during signup' },
      { status: 500 }
    );
  }
}
