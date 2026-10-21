import React from "react";
import { useTranslation } from "react-i18next";
import { useAppDispatch, useAppSelector } from "app/store";
import {
  selectAutoApproveSelfUpdateFields,
  selectAiRecentContentLimit,
  selectShowScrollToTopButton,
  selectShowScrollToBottomButton,
  setSettings,
  setAiRecentContentLimit,
} from "app/settings/settingSlice";
import ChatConfigSections from "./chat-config/ChatConfigSections";

const ChatConfig: React.FC = () => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();

  const aiRecentContentLimit = useAppSelector(selectAiRecentContentLimit);
  const autoApproveSelfUpdateFields = useAppSelector(
    selectAutoApproveSelfUpdateFields
  );
  const showScrollToTopButton = useAppSelector(selectShowScrollToTopButton);
  const showScrollToBottomButton = useAppSelector(selectShowScrollToBottomButton);

  return (
    <>
      <div className="chat-config-page">
        <h1 className="page-title">{t("chat.title", "对话设置")}</h1>
        <ChatConfigSections
          autoApproveSelfUpdateFields={autoApproveSelfUpdateFields}
          onToggleAutoApproveSelfUpdateField={(field) => {
            const nextFields = autoApproveSelfUpdateFields.includes(field)
              ? autoApproveSelfUpdateFields.filter((item) => item !== field)
              : [...autoApproveSelfUpdateFields, field];
            dispatch(setSettings({ autoApproveSelfUpdateFields: nextFields }));
          }}
          aiRecentContentLimit={aiRecentContentLimit}
          onAiRecentContentLimitChange={(value) =>
            dispatch(setAiRecentContentLimit(value))
          }
          showScrollToTopButton={showScrollToTopButton}
          onShowScrollToTopButtonChange={(value) =>
            dispatch(setSettings({ showScrollToTopButton: value }))
          }
          showScrollToBottomButton={showScrollToBottomButton}
          onShowScrollToBottomButtonChange={(value) =>
            dispatch(setSettings({ showScrollToBottomButton: value }))
          }
        />
      </div>
    </>
  );
};


export default ChatConfig;
