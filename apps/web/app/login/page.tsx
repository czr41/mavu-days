'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';

export default function LoginPage() {
  const api = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await fetch(`${api}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) return setError((json as { error?: string }).error ?? 'Login failed');
    localStorage.setItem('mavu_token', (json as { token: string }).token);
    const meRes = await fetch(`${api}/me`, {
      headers: { Authorization: `Bearer ${(json as { token: string }).token}` },
    });
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
