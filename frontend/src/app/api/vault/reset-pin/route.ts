import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL =
  process.env.BACKEND_INTERNAL_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'http://127.0.0.1:8000';

export async function POST(request: NextRequest) {
  const token =
    request.cookies.get('auth_token')?.value ||
    request.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');

  if (!token) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { password, new_pin } = body;

    if (!password || !new_pin) {
      return NextResponse.json(
        { error: 'Account password and new PIN are required' },
        { status: 400 }
      );
    }

    const backendRes = await fetch(`${BACKEND_URL}/vault/reset-pin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ password, new_pin }),
    });

    const data = await backendRes.json();

    if (!backendRes.ok) {
      return NextResponse.json(
        { error: data.detail || 'Failed to reset vault PIN' },
        { status: backendRes.status }
      );
    }

    const response = NextResponse.json({
      success: true,
      message: data.message || 'Vault PIN reset successfully and vault unlocked',
      access_token: data.access_token,
      expires_in_minutes: data.expires_in_minutes || 15,
    });

    if (data.access_token) {
      response.cookies.set({
        name: 'vault_token',
        value: data.access_token,
        httpOnly: false,
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * (data.expires_in_minutes || 15),
      });
    }

    return response;
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json(
      { error: error?.message || 'Error communicating with OmniVise vault backend' },
      { status: 500 }
    );
  }
}
