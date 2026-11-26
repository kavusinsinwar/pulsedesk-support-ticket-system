'use client';

import React from 'react';
import { User as UserIcon } from 'lucide-react';
import { getInitials } from '@/lib/format';
import { Tooltip } from './Tooltip';

const AVATAR_PALETTE = [
  '#0C66E4',
  '#5E4DB2',
  '#216E4E',
  '#AE2E24',
  '#974F0C',
  '#006644',
  '#403294',
  '#0E7490',
];

function hashColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_PALETTE[Math.abs(hash) % AVATAR_PALETTE.length];
}

export type AvatarSize = 16 | 24 | 32 | 40;

const SIZE_CLASSES: Record<AvatarSize, string> = {
  16: 'h-4 w-4 text-[9px]',
  24: 'h-6 w-6 text-[10px]',
  32: 'h-8 w-8 text-[12px]',
  40: 'h-10 w-10 text-[14px]',
};

export function Avatar({
  name,
  size = 24,
  liftOnHover = true,
  className = '',
}: {
  name?: string | null;
  size?: AvatarSize;
  liftOnHover?: boolean;
  className?: string;
}) {
  if (!name) {
    return (
      <Tooltip content="Unassigned">
        <span
          className={`inline-flex shrink-0 items-center justify-center rounded-full border border-dashed border-line-strong text-ink-subtlest ${SIZE_CLASSES[size]} ${className}`}
        >
          <UserIcon className="h-3 w-3" />
        </span>
      </Tooltip>
    );
  }

  return (
    <Tooltip content={name}>
      <span
        style={{ backgroundColor: hashColor(name) }}
        className={`inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white ring-2 ring-surface select-none transition-transform duration-[120ms] ease-out ${
          liftOnHover ? 'hover:-translate-y-0.5' : ''
        } ${SIZE_CLASSES[size]} ${className}`}
      >
        {getInitials(name)}
      </span>
    </Tooltip>
  );
}
