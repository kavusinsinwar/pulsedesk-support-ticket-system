'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Moon, ShieldCheck, Sun, User as UserIcon } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { ApiClientError } from '@/lib/api';
import { Button } from '@/components/ui/Button';

export default function LoginPage() {
  const { login } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const performLogin = async (targetEmail: string, targetPassword: string) => {
    setLoading(true);
    setError(null);
    try {
      await login(targetEmail, targetPassword);
      router.push('/dashboard/board');
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Unable to sign in');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await performLogin(email, password);
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-surface-sunken p-4 theme-surface">
      <div className="mb-6 flex w-full max-w-[400px] items-center justify-between">
        <div className="flex items-center gap-2">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <rect width="24" height="24" rx="4" fill="var(--color-brand)" />
            <path
              d="M6 12.5H9.5L11.2 8L13.6 16L15.4 11.5H18"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span className="text-[20px] font-semibold text-ink">PulseDesk</span>
        </div>

        <button
          type="button"
          onClick={toggleTheme}
          className="flex h-8 w-8 items-center justify-center rounded-sm text-ink-subtle hover:bg-surface-hover hover:text-ink"
          aria-label="Toggle theme"
        >
          {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
        </button>
      </div>

      <div className="w-full max-w-[400px] rounded-md border border-line bg-surface p-8 shadow-overlay">
        <h1 className="text-[18px] font-medium text-ink">Log in to continue</h1>
        <p className="mt-1 text-[13px] text-ink-subtle">
          Issue tracking &amp; service desk workspace
        </p>

        {error && (
          <div
            className="mt-4 rounded-sm border border-line-danger px-3 py-2 text-[13px] text-ink-danger"
            style={{ backgroundColor: 'var(--lozenge-red-bg)' }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label className="mb-1 block text-[12px] font-semibold text-ink-subtle">
              Email <span className="text-ink-danger">*</span>
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              className="h-8 w-full rounded-sm border-2 border-line bg-surface px-2 text-[14px] text-ink transition-colors duration-[80ms] hover:bg-surface-hover focus:border-line-focus focus:bg-surface"
            />
          </div>

          <div>
            <label className="mb-1 block text-[12px] font-semibold text-ink-subtle">
              Password <span className="text-ink-danger">*</span>
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="h-8 w-full rounded-sm border-2 border-line bg-surface pl-2 pr-8 text-[14px] text-ink transition-colors duration-[80ms] hover:bg-surface-hover focus:border-line-focus focus:bg-surface"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-2 top-2 text-ink-subtlest hover:text-ink"
                aria-label="Toggle password visibility"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <Button type="submit" variant="primary" size="large" loading={loading} className="w-full">
            Continue
          </Button>
        </form>

        <div className="mt-6 border-t border-line pt-4">
          <p className="mb-2.5 text-center text-[11px] font-semibold uppercase tracking-[0.04em] text-ink-subtlest">
            Quick Demo Accounts
          </p>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="default"
              disabled={loading}
              leftIcon={<UserIcon className="h-3.5 w-3.5" />}
              onClick={() => performLogin('sarah@example.com', 'User@123')}
            >
              Demo User
            </Button>
            <Button
              variant="default"
              disabled={loading}
              leftIcon={<ShieldCheck className="h-3.5 w-3.5 text-brand" />}
              onClick={() => performLogin('admin@helpdesk.dev', 'Admin@123')}
            >
              Demo Admin
            </Button>
          </div>
        </div>

        <p className="mt-5 text-center text-[13px] text-ink-subtle">
          New to PulseDesk?{' '}
          <Link href="/register" className="font-medium text-ink-link hover:underline">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}
