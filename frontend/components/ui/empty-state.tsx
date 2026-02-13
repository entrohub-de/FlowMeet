import type { ReactNode } from 'react';

interface EmptyStateProps {
  icon: ReactNode;
  message: string;
  hint?: string;
  action?: ReactNode;
}

export function EmptyState({ icon, message, hint, action }: EmptyStateProps) {
  return (
    <div className="rounded-lg border border-dashed border-border p-12 text-center">
      <div className="flex justify-center mb-4 text-muted-foreground">
        {icon}
      </div>
      <p className="text-muted-foreground text-lg">{message}</p>
      {hint && (
        <p className="text-sm text-muted-foreground mt-2">{hint}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
