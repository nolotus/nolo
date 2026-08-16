import "../sidebar.css";
import React from "react";
import { useTranslation } from "react-i18next";
import { LuSearch } from "react-icons/lu";

interface ChatSidebarEmptySearchProps {
  onClear: () => void;
}

const ChatSidebarEmptySearch: React.FC<ChatSidebarEmptySearchProps> = ({
  onClear,
}) => {
  const { t } = useTranslation("space");

  return (
    <>
      <div className="ChatSidebarEmptySearch">
        <div className="ChatSidebarEmptySearch__illustration">
          <LuSearch size={40} aria-hidden="true" />
        </div>
        <p className="ChatSidebarEmptySearch__text">
          {t("no_results_found", "没有找到匹配项")}
        </p>
        <p className="ChatSidebarEmptySearch__subtext">
          {t("try_another_keyword", "换个关键词试试吧")}
        </p>
        <button
          className="ChatSidebarEmptySearch__clearBtn"
          onClick={onClear}
          type="button"
        >
          {t("clear_search", "清空搜索内容")}
        </button>
      </div>

    </>
  );
};

export default ChatSidebarEmptySearch;
