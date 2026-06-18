import {
  forwardRef,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
} from 'react';

export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md';

const buttonVariants: Record<ButtonVariant, string> = {
  primary:
    'border border-brand-black bg-brand-black text-white hover:bg-brand-elevated focus-visible:ring-brand-silver disabled:border-neutral-300 disabled:bg-neutral-300 disabled:text-neutral-500',
  secondary:
    'border border-brand-graphite bg-white text-brand-elevated hover:bg-surface-muted focus-visible:ring-brand-graphite disabled:border-neutral-200 disabled:text-neutral-400',
  ghost:
    'border border-transparent bg-transparent text-brand-graphite hover:bg-surface-muted hover:text-brand-elevated focus-visible:ring-brand-graphite disabled:text-neutral-400',
  danger:
    'border border-semantic-danger bg-semantic-danger text-white hover:bg-red-800 focus-visible:ring-red-300 disabled:border-red-200 disabled:bg-red-200',
};

const buttonSizes: Record<ButtonSize, string> = {
  sm: 'min-h-10 px-3 text-sm',
  md: 'min-h-11 px-4 text-sm',
};

export const Button = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: ButtonVariant;
    size?: ButtonSize;
  }
>(function Button(
  { className, variant = 'primary', size = 'md', type = 'button', ...props },
  ref
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-control font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed',
        buttonVariants[variant],
        buttonSizes[size],
        className
      )}
      {...props}
    />
  );
});

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return (
      <input
        ref={ref}
        className={cn(
          'min-h-11 w-full rounded-control border border-border-light bg-white px-3 text-base text-text-primary shadow-inner-soft outline-none placeholder:text-neutral-400 focus:border-brand-graphite focus:ring-2 focus:ring-brand-silver disabled:cursor-not-allowed disabled:bg-neutral-100 disabled:text-neutral-500',
          className
        )}
        {...props}
      />
    );
  }
);

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  function Select({ className, ...props }, ref) {
    return (
      <select
        ref={ref}
        className={cn(
          'min-h-11 rounded-control border border-border-light bg-white px-3 text-sm text-text-primary outline-none focus:border-brand-graphite focus:ring-2 focus:ring-brand-silver disabled:cursor-not-allowed disabled:bg-neutral-100 disabled:text-neutral-500',
          className
        )}
        {...props}
      />
    );
  }
);

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'rounded-panel border border-border-light bg-surface shadow-card',
        className
      )}
      {...props}
    />
  );
}

type BadgeVariant = 'neutral' | 'success' | 'warning' | 'danger' | 'info';

const badgeVariants: Record<BadgeVariant, string> = {
  neutral: 'border-border-light bg-surface-muted text-brand-graphite',
  success: 'border-green-200 bg-semantic-success-bg text-semantic-success',
  warning: 'border-amber-200 bg-semantic-warning-bg text-semantic-warning',
  danger: 'border-red-200 bg-semantic-danger-bg text-semantic-danger',
  info: 'border-blue-200 bg-semantic-info-bg text-semantic-info',
};

export function Badge({
  children,
  className,
  variant = 'neutral',
}: {
  children: ReactNode;
  className?: string;
  variant?: BadgeVariant;
}) {
  return (
    <span
      className={cn(
        'inline-flex min-h-6 items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold',
        badgeVariants[variant],
        className
      )}
    >
      {children}
    </span>
  );
}

type AlertVariant = 'danger' | 'success' | 'warning' | 'info';

const alertVariants: Record<AlertVariant, string> = {
  danger: 'border-red-200 bg-semantic-danger-bg text-semantic-danger',
  success: 'border-green-200 bg-semantic-success-bg text-semantic-success',
  warning: 'border-amber-200 bg-semantic-warning-bg text-semantic-warning',
  info: 'border-blue-200 bg-semantic-info-bg text-semantic-info',
};

export function Alert({
  children,
  className,
  title,
  variant = 'info',
}: {
  children: ReactNode;
  className?: string;
  title?: string;
  variant?: AlertVariant;
}) {
  return (
    <div
      className={cn('rounded-card border px-4 py-3 text-sm', alertVariants[variant], className)}
      role={variant === 'danger' ? 'alert' : 'status'}
    >
      {title ? <div className="mb-1 font-semibold">{title}</div> : null}
      <div>{children}</div>
    </div>
  );
}

export function PageHeader({
  actions,
  description,
  title,
}: {
  actions?: ReactNode;
  description?: ReactNode;
  title: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight text-text-primary sm:text-3xl">
          {title}
        </h1>
        {description ? (
          <p className="mt-2 max-w-3xl text-sm leading-6 text-text-secondary sm:text-base">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

export function TableContainer({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'w-full overflow-x-auto rounded-card border border-border-light bg-white',
        className
      )}
      {...props}
    />
  );
}

export function EmptyState({
  action,
  description,
  icon,
  title,
}: {
  action?: ReactNode;
  description: ReactNode;
  icon?: ReactNode;
  title: ReactNode;
}) {
  return (
    <div className="flex min-h-48 flex-col items-center justify-center px-6 py-10 text-center">
      {icon ? (
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-surface-muted text-brand-graphite">
          {icon}
        </div>
      ) : null}
      <h2 className="text-base font-semibold text-text-primary">{title}</h2>
      <p className="mt-2 max-w-md text-sm leading-6 text-text-secondary">{description}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function LoadingState({ label = 'Cargando…' }: { label?: string }) {
  return (
    <div
      className="flex min-h-48 items-center justify-center gap-3 text-sm font-medium text-text-secondary"
      aria-live="polite"
      aria-busy="true"
    >
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-brand-silver border-t-brand-black" />
      <span>{label}</span>
    </div>
  );
}
