import { Fragment, isValidElement, type ComponentType, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { BackButton } from "@/components/ui/back-button";

/**
 * Page title row: [back] [icon chip] h1 [badge] on the left, actions on the right (stacks on mobile).
 * `back`: an href, `true` for browser back, or a handler.
 */
export function PageHeader({
  title,
  icon: Icon,
  back,
  badge,
  actions,
  actionsClassName,
  className,
}: {
  title: ReactNode;
  icon?: ComponentType<{ className?: string }>;
  back?: string | true | (() => void);
  /** Small status/count pill next to the title. */
  badge?: ReactNode;
  actions?: ReactNode;
  /** Layout of the actions row (default: wrapping flex). */
  actionsClassName?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col sm:flex-row sm:items-center justify-between gap-3", className)}>
      <div className="flex items-center gap-2.5 min-w-0">
        {back && <BackButton back={back} />}
        {Icon && (
          <div className="p-2 bg-primary/10 text-primary rounded-xl shrink-0">
            <Icon className="h-5 w-5" />
          </div>
        )}
        <div className="flex flex-wrap items-center gap-2 min-w-0">
          <h1 className="text-lg sm:text-xl font-bold tracking-tight text-foreground break-words">{title}</h1>
          {badge}
        </div>
      </div>
      {/* A single action element keeps its own layout (e.g. a full-width grid on mobile); several get a wrapping row. */}
      {actions &&
        (isValidElement(actions) && actions.type !== Fragment && !actionsClassName ? (
          actions
        ) : (
          <div className={cn("flex flex-wrap items-center gap-2", actionsClassName)}>{actions}</div>
        ))}
    </div>
  );
}
