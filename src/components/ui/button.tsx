import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7B19EC] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 cursor-pointer',
  {
    variants: {
      variant: {
        default:
          'bg-[#7B19EC] text-white hover:bg-[#6612C9] active:bg-[#570FB0]',
        dark: 'bg-[#111111] text-white hover:bg-neutral-800',
        outline:
          'border border-neutral-300 bg-white text-[#111111] hover:border-[#7B19EC] hover:text-[#7B19EC]',
        secondary:
          'bg-neutral-100 text-[#111111] hover:bg-neutral-200',
        ghost:
          'text-[#111111] hover:bg-neutral-100 hover:text-[#7B19EC]',
        destructive:
          'bg-red-600 text-white hover:bg-red-700',
        link: 'text-[#7B19EC] underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-md px-3 text-xs',
        lg: 'h-12 rounded-lg px-6 text-base',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : 'button';
  return (
    <Comp
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { buttonVariants };
