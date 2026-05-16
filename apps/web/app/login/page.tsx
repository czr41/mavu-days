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
        `Cannot reach the booking API (${loginUrl}). Check your connection and that NEXT_PUBLIC_API_URL matches your deployed API, then try again.`,
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
      setError('Login succeeded but your profile could not be loaded. Try again in a moment.');
      return;
    }
    const me = await meRes.json();
    const first = me.organizations?.[0]?.slug as string | undefined;
    if (!first) {
      setError('This account is not linked to an organization yet. Ask an owner to send you an invite.');
      return;
    }
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
