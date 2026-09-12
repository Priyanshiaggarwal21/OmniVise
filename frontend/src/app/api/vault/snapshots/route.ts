import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL =
  process.env.BACKEND_INTERNAL_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'http://127.0.0.1:8000';

export async function GET(request: NextRequest) {
  const token =
    request.cookies.get('auth_token')?.value ||
    request.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');

  const vaultToken =
    request.cookies.get('vault_token')?.value ||
    request.headers.get('X-Vault-Token') ||
    '';

  if (!token) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
    };
    if (vaultToken) {
      headers['X-Vault-Token'] = vaultToken;
    }

    const backendRes = await fetch(`${BACKEND_URL}/vault/snapshots`, {
      method: 'GET',
      headers,
      cache: 'no-store',
    });

    const data = await backendRes.json();

    if (!backendRes.ok) {
      return NextResponse.json(
        { error: data.detail || 'Failed to retrieve vault snapshots' },
        { status: backendRes.status }
      );
    }

    return NextResponse.json(data);
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json(
      { error: error?.message || 'Error communicating with OmniVise vault backend' },
      { status: 500 }
    );
  }
}
