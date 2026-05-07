'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';

function apiBaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_API_URL;
  const trimmed = typeof raw === 'string' ? raw.trim() : '';
  return trimmed || 'http://localhost:3001';
}

export default function LoginPage() {
  const api = apiBaseUrl();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const loginUrl = `${api.replace(/\/$/, '')}/auth/login`;
    let res: Response;
    try {
      res = await fetch(loginUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
    } catch {
      setError(
        `Cannot reach the API at ${loginUrl}. Try: (1) From the repo root run "npm run dev" (API + web together) or "npm run dev -w @mavu/api" for the API only. (2) If the API exits on startup with a Prisma error, run "npm run db:generate" then start the API again. (3) Open ${api.replace(/\/$/, '')}/health/live — if you see ok:true, the server is listening.`,
      );
      return;
    }
    const json = await res.json().catch(() => ({}));
    if (!res.ok) return setError((json as { error?: string }).error ?? 'Login failed');
    localStorage.setItem('mavu_token', (json as { token: string }).token);
    let meRes: Response;
    try {
      meRes = await fetch(`${api.replace(/\/$/, '')}/me`, {
        headers: { Authorization: `Bearer ${(json as { token: string }).token}` },
      });
    } catch {
      setError(
        `Login succeeded but profile could not be loaded. Check the API at ${api.replace(/\/$/, '')}.`,
      );
      return;
    }
    const me = await meRes.json();
    const first = me.organizations?.[0]?.slug ?? 'demo';
    router.push(`/admin/${first}`);
  }

  return (
    <main style={{ maxWidth: 420, margin: '5rem auto', padding: '0 1rem' }}>
      <h1>Sign in</h1>
      <form onSubmit={submit}>
        <label style={{ display: 'grid', gap: 4 }}>
          Email
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required />
        </label>
        <label style={{ display: 'grid', gap: 4, marginTop: 12 }}>
          Password
          <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" required />
        </label>
        {error ? <p style={{ color: '#dc2626' }}>{error}</p> : null}
        <button type="submit" style={{ marginTop: 16, padding: '8px 16px' }}>
          Continue
        </button>
      </form>
      <p style={{ marginTop: 24 }}>
        <Link href="/">Home</Link>
      </p>
    </main>
  );
}
