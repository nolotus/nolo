// ai/agent/web/EmptyState.tsx

import React from "react";
import "./EmptyState.css";

export type EmptyStateProps = {
    icon: React.ReactNode;
    title: React.ReactNode;
    subtitle?: React.ReactNode;
    action?: React.ReactNode;
    className?: string;
};

const EmptyState: React.FC<EmptyStateProps> = ({
    icon,
    title,
    subtitle,
    action,
    className,
}) => {
    const rootClass = className
        ? `empty-state ${className}`
        : "empty-state";
    return (
        <div className={rootClass}>
            <div className="empty-state__icon-wrapper" aria-hidden="true">{icon}</div>
            <p className="empty-state__text">{title}</p>
            {subtitle && <span className="empty-state__subtext">{subtitle}</span>}
            {action ? <div className="empty-state__action">{action}</div> : null}
        </div>
    );
};

export default EmptyState;
