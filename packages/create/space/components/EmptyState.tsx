// create/space/components/EmptyState.tsx
import "./EmptyState.css";
import React from "react";

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  actionText?: React.ReactNode;
  onAction?: () => void;
  secondaryAction?: {
    text: string;
    onClick: () => void;
  };
  size?: "small" | "medium" | "large";
}

const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionText,
  onAction,
  secondaryAction,
  size = "medium",
}) => {
  const showActions = Boolean((actionText && onAction) || secondaryAction);

  // Prefixed class root avoids collision with packages/ai/agent/web/EmptyState.css
  // which also uses a bare empty-state class and paints a bordered card + box-shadow.
  return (
    <div className={`space-empty-state space-empty-state--${size}`}>
      <div className="space-empty-state__icon" aria-hidden="true">
        {icon}
      </div>
      <h3 className="space-empty-state__title">{title}</h3>
      <p className="space-empty-state__description">{description}</p>

      {showActions && (
        <div className="space-empty-state__actions">
          {actionText && onAction && (
            <button
              type="button"
              className="space-empty-state__action space-empty-state__action--primary"
              onClick={onAction}
            >
              {actionText}
            </button>
          )}

          {secondaryAction && (
            <button
              type="button"
              className="space-empty-state__action space-empty-state__action--secondary"
              onClick={secondaryAction.onClick}
            >
              {secondaryAction.text}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default EmptyState;
