import * as React from 'react';
import { cn } from '@/lib/utils';

export function Input({
  className,
  type = 'text',
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      type={type}
      className={cn(
        'flex h-10 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-[#111111] placeholder:text-neutral-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7B19EC] focus-visible:border-[#7B19EC] disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      {...props}
    />
  );
}
