import type { ReactNode } from 'react';

interface AppHeaderProps {
  title: string;
  rightActions?: ReactNode;
}

export function AppHeader({ title, rightActions }: AppHeaderProps) {
  return (
    <header className="sticky top-0 z-40 w-full bg-background border-b border-border">
      <div className="h-14 flex items-center justify-between px-4">
        <h1 className="text-h1 font-heading font-bold text-foreground">{title}</h1>
        {rightActions && (
          <div className="flex items-center gap-2">{rightActions}</div>
        )}
      </div>
    </header>
  );
}
