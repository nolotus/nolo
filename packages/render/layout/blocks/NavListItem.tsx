// 文件路径：render/layout/blocks/NavListItem.tsx
import type React from "react";
import { NavLink, useLocation } from "app/routing";

interface NavListItemProps {
  path?: string;
  label?: string;
  icon?: React.ReactNode;
  onClick?: () => void;
  end?: boolean;
}

const NavListItem: React.FC<NavListItemProps> = ({
  path,
  label,
  icon,
  onClick,
  end,
}) => {
  const location = useLocation(); // ✅ 拿到当前 location，用于透传 state

  return (
    <>
      <style>
        {`
          .nav-list-item {
            display: flex;
            align-items: center;
            padding: 0 var(--space-3);
            border: none;
            border-radius: var(--radius-md);
            color: var(--text);
            background: transparent;
            text-decoration: none;
            transition: all 0.2s ease;
            cursor: pointer;
            font: inherit;
            font-weight: 400;
            height: 32px;
            font-size: var(--fontSize-base);
            width: 100%;
            text-align: left;
          }

          .nav-list-icon {
            display: flex;
            align-items: center;
            margin-right: var(--space-2);
            color: var(--textSecondary);
          }

          .nav-list-item:hover {
            color: var(--primary);
            background: var(--primaryGhost);
          }

          .nav-list-item:hover .nav-list-icon {
            color: var(--primary);
          }

          .nav-list-item.active {
            background: var(--primary);
            color: var(--background);
          }

          .nav-list-item.active .nav-list-icon {
            color: var(--background);
          }

          @media (prefers-reduced-motion: reduce) {
            .nav-list-item {
              transition: none;
            }
          }
        `}
      </style>

      {onClick ? (
        <button type="button" onClick={onClick} className="nav-list-item">
          {icon && (
            <span className="nav-list-icon" aria-hidden="true">
              {icon}
            </span>
          )}
          {label}
        </button>
      ) : path ? (
        <NavLink
          to={path}
          state={location.state} // ✅ 把当前 state（包含 backgroundLocation）一起带过去
          end={end}
          className={({ isActive }) =>
            `nav-list-item ${isActive ? "active" : ""}`
          }
        >
          {icon && (
            <span className="nav-list-icon" aria-hidden="true">
              {icon}
            </span>
          )}
          {label}
        </NavLink>
      ) : null}
    </>
  );
};

export default NavListItem;
