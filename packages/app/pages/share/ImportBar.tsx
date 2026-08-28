import "./ImportBar.css";
import React from "react";
import { NavLink } from "app/routing";
import { LuDownload, LuCheck, LuLoader } from "react-icons/lu";

export type ImportStatus =
  | "idle"
  | "importing"
  | "purchasing"
  | "requires-purchase"
  | "done"
  | "error";

interface ImportBarProps {
  status: ImportStatus;
  importedKey: string | null;
  error: string | null;
  price: number;
  onImport: () => void;
  onPurchaseAndImport: () => void;
  onCancelPurchase: () => void;
}

const ImportBar: React.FC<ImportBarProps> = ({
  status,
  importedKey,
  error,
  price,
  onImport,
  onPurchaseAndImport,
  onCancelPurchase,
}) => {
  if (status === "done" && importedKey) {
    return (
      <div className="ImportBar-root">
        <div className="ImportBar-success">
          <LuCheck size={16} aria-hidden="true" />
          <span>已导入到你的空间</span>
          <NavLink to={`/${encodeURIComponent(importedKey)}`} className="ImportBar-link">
            打开文档 →
          </NavLink>
        </div>
      </div>
    );
  }

  if (status === "requires-purchase") {
    return (
      <div className="ImportBar-root">
        <div className="ImportBar-purchaseBar">
          <span className="ImportBar-price">{price} 积分</span>
          <button type="button" className="ImportBar-btn ImportBar-btn--primary" onClick={onPurchaseAndImport}>
            <LuDownload size={15} aria-hidden="true" /> 购买并导入
          </button>
          <button type="button" className="ImportBar-btn ImportBar-btn--ghost" onClick={onCancelPurchase}>
            取消
          </button>
        </div>
      </div>
    );
  }

  const isLoading = status === "importing" || status === "purchasing";
  const label =
    status === "purchasing" ? "购买中…" :
    status === "importing" ? "导入中…" :
    "导入到我的空间";

  return (
    <div className="ImportBar-root">
      <button
        type="button"
        className="ImportBar-btn ImportBar-btn--primary"
        onClick={onImport}
        disabled={isLoading}
      >
        {isLoading
          ? <><LuLoader size={15} className="ImportBar-spinner" aria-hidden="true" /> {label}</>
          : <><LuDownload size={15} aria-hidden="true" /> {label}</>
        }
      </button>
      {status === "error" && error && (
        <span className="ImportBar-error">{error}</span>
      )}
      
    </div>
  );
};

export default ImportBar;
