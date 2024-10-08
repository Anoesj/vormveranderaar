import { type VariantProps, cva } from 'class-variance-authority';

export { default as Button } from './Button.vue';

export const buttonVariants = cva(
  // eslint-disable-next-line @stylistic/max-len
  'inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:duration-75',
  {
    variants: {
      variant: {
        default: 'bg-primary font-semibold text-primary-foreground hover:bg-primary/90 active:bg-primary-dark',
        destructive:
          'bg-destructive font-semibold text-destructive-foreground hover:bg-destructive/90 active:bg-destructive-dark',
        outline:
          'border font-semibold border-input bg-background hover:bg-accent hover:text-accent-foreground',
        secondary:
          'bg-secondary font-semibold text-secondary-foreground hover:bg-secondary/80 active:bg-secondary-dark',
        ghost: 'font-semibold hover:bg-accent hover:text-accent-foreground',
        link: 'text-primary font-semibold underline-offset-4 hover:underline',
      },
      size: {
        default: 'px-4 py-2',
        xs: 'h-7 rounded px-2',
        sm: 'h-9 rounded-md px-3',
        lg: 'h-11 rounded-md px-8',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

export type ButtonVariants = VariantProps<typeof buttonVariants>;
