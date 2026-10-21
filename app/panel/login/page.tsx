'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Spinner } from '@/components/Spinner';

export default function LoginPage() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setError('Password is required.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        if (res.status === 429) {
          setError(data.error || 'Too many failed login attempts. Please try again later.');
        } else {
          setError(data.error || 'Invalid credentials');
        }
        return;
      }

      // Successful login - full navigation ensures the session cookie is sent and /panel evaluates immediately
      window.location.href = '/panel';
    } catch {
      setError('An error occurred while connecting to the server. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-[80vh] flex-col items-center justify-center px-4">
      <div className="card w-full max-w-md p-6 sm:p-8">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-[#e6edf3]">Employee Access</h1>
          <p className="mt-2 text-sm text-[#8b949e]">
            Enter the shared password to access the changelog management panel.
          </p>
        </div>

        {error && (
          <div
            role="alert"
            className="mb-4 rounded-md border border-[#f85149]/60 bg-[#f85149]/10 p-3 text-sm text-[#f85149]"
          >
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label htmlFor="panel-password" className="mb-1 block text-sm font-medium text-[#e6edf3]">
              Shared Password
            </label>
            <input
              id="panel-password"
              type="password"
              autoFocus
              required
              disabled={loading}
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="field w-full"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary w-full cursor-pointer justify-center py-2 text-center"
          >
            {loading ? (
              <>
                <Spinner className="h-4 w-4" />
                <span>Authenticating…</span>
              </>
            ) : (
              'Log In to Panel'
            )}
          </button>
        </form>

        <div className="mt-6 border-t border-[#30363d] pt-4 text-center">
          <a href="/changelog" className="text-xs text-[#58a6ff] hover:underline">
            &larr; Back to Public Changelog
          </a>
        </div>
      </div>
    </main>
  );
}
