import "./message-input.css";
import React, { memo, useCallback } from "react";
import { LuSquare } from "react-icons/lu";
import { useAppDispatch } from "app/store";
import {
  abortAllMessages,
  useActiveControllers,
} from "chat/dialog/dialogSlice";

const STYLES = `
  .stop-generation-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    margin: 0 auto;
    padding: 6px 16px;
    border-radius: 999px;
    border: 1px solid var(--border);
    background: var(--backgroundSecondary);
    color: var(--textSecondary);
    font-size: var(--fontSize-sm);
    font-weight: 500;
    cursor: pointer;
    transition: all 0.15s ease;
    animation: stop-btn-fade-in 0.15s ease-out;
  }

  .stop-generation-btn:hover {
    background: var(--background);
    border-color: var(--error);
    color: var(--error);
  }

  @keyframes stop-btn-fade-in {
    from { opacity: 0; transform: translateY(4px); }
    to { opacity: 1; transform: translateY(0); }
  }
`;

const StopGenerationButtonComponent: React.FC = () => {
  const dispatch = useAppDispatch();
  const activeControllers = useActiveControllers();
  const isGenerating = Object.keys(activeControllers).length > 0;

  const handleStop = useCallback(() => {
    dispatch(abortAllMessages());
  }, [dispatch]);

  if (!isGenerating) return null;

  return (
    <>
      <button
        className="stop-generation-btn"
        onClick={handleStop}
        type="button"
      >
        <LuSquare size={10} aria-hidden="true" />
        <span>停止生成</span>
      </button>
    </>
  );
};

export const StopGenerationButton = memo(StopGenerationButtonComponent);
