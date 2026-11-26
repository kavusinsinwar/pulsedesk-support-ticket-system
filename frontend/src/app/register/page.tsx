'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Moon, Sun } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { ApiClientError } from '@/lib/api';
import { Button } from '@/components/ui/Button';

export default function RegisterPage() {
  const { register } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const router = useRouter();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await register(name, email, password);
      router.push('/dashboard/board');
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err.details?.[0]?.message || err.message);
      } else {
        setError('Unable to create account');
      }
    } finally {
      setLoading(false);
    }
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
        <h1 className="text-[18px] font-medium text-ink">Sign up for your account</h1>
        <p className="mt-1 text-[13px] text-ink-subtle">
          Raise tickets and track progress on the live board
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
              Full Name <span className="text-ink-danger">*</span>
            </label>
            <input
              type="text"
              required
              minLength={2}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Alex Rivera"
              className="h-8 w-full rounded-sm border-2 border-line bg-surface px-2 text-[14px] text-ink transition-colors duration-[80ms] hover:bg-surface-hover focus:border-line-focus focus:bg-surface"
            />
          </div>

          <div>
            <label className="mb-1 block text-[12px] font-semibold text-ink-subtle">
              Email <span className="text-ink-danger">*</span>
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
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
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min 8 chars, upper, lower & number"
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
            <p className="mt-1 text-[11px] text-ink-subtlest">
              Must include uppercase, lowercase, and a number.
            </p>
          </div>

          <Button type="submit" variant="primary" size="large" loading={loading} className="w-full">
            Sign up
          </Button>
        </form>

        <p className="mt-5 text-center text-[13px] text-ink-subtle">
          Already have an account?{' '}
          <Link href="/login" className="font-medium text-ink-link hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
