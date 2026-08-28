import React, { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { usePageMeta } from "app/hooks/usePageMeta";
import { buildStaticPageMeta } from "app/seo/pageMeta";
import { Language } from "app/i18n/types";
import "./StaticInfoPages.css";

const AboutPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const pageMeta = useMemo(() => buildStaticPageMeta(t, "about"), [t]);
  usePageMeta(pageMeta);

  const lang = i18n.language;
  const isHant = lang === Language.ZH_HANT || lang.startsWith("zh-TW") || lang.startsWith("zh-HK") || lang.startsWith("zh-MO");
  const isHans = !isHant && lang.startsWith("zh");
  const isJa = lang.startsWith("ja");
  const isKo = lang.startsWith("ko");

  return (
    <main className="static-info-page">
      <header className="static-info-page__header">
        <h1 className="static-info-page__title">
          {isHant
            ? "關於 Nolo.Chat | 自主多 Agent 協作 AI 工作台"
            : isHans
              ? "关于 Nolo.Chat | 自主多 Agent 协作 AI 工作台"
              : isJa
                ? "Nolo.Chat について | 自律型マルチエージェント AI ワークスペース"
                : isKo
                  ? "Nolo.Chat 소개 | 자율형 멀티 에이전트 AI 워크스페이스"
                  : "About Nolo.Chat | Autonomous Multi-Agent Workspace"}
        </h1>
        <p className="static-info-page__subtitle">
          {isHant
            ? "不是替你聊天，而是多個 Agent 替你做完 — 你的私有本地優先 AI 團隊"
            : isHans
              ? "不是替你聊天，而是多个 Agent 替你做完 — 你的私有本地优先 AI 团队"
              : isJa
                ? "会話だけで終わらない、複数 Agent が連携して成果物を届ける AI チーム"
                : isKo
                  ? "단순한 대화를 넘어, 여러 AI 에이전트가 협업하여 실제 업무를 완성합니다"
                  : "Not Just a Chatbot — Orchestrate Multiple AI Agents that Deliver Real Work"}
        </p>
      </header>

      <section className="static-info-page__section">
        <h2 className="static-info-page__section-title">
          {isHant ? "產品使命與定位" : isHans ? "产品使命与定位" : isJa ? "ミッションと位置づけ" : isKo ? "미션과 포지셔닝" : "Our Mission & Focus"}
        </h2>
        <p className="static-info-page__text">
          {isHant
            ? "Nolo.Chat 是一個定位於「自主多 Agent 協作」與「本地優先（Local-First）」的現代化 AI 工作台。我們認為單一模型的單輪問答無法解決真實的工程與複雜業務問題。Nolo 透過將多模型（GPT、Claude、DeepSeek 等）整合進統一的編排架構，讓不同特長的 Agent 辯論、分工協作、自主審查，並在夜間持續運行，最終直接交付文件、代碼、圖片與應用等成果。"
            : isHans
              ? "Nolo.Chat 是一个定位于「自主多 Agent 协作」与「本地优先（Local-First）」的现代化 AI 工作台。我们认为单一模型的单轮问答无法解决真实的工程与复杂业务问题。Nolo 通过将多模型（GPT、Claude、DeepSeek 等）整合进统一的编排架构，让不同特长的 Agent 辩论、分工协作、自主审查，并在夜间持续运行，最终直接交付文档、代码、图片与应用等成果。"
              : isJa
                ? "Nolo.Chat は「自律型マルチエージェント協調」と「ローカルファースト」に特化した次世代 AI ワークスペースです。単一モデルの対話だけでは解決できない複雑なタスクを、GPT・Claude・DeepSeek などの複数モデルが自律的に分担・議論・レビューしながら完遂します。"
                : isKo
                  ? "Nolo.Chat은 '자율형 멀티 에이전트 협업'과 '로컬 우선(Local-First)'에 특화된 현대적인 AI 워크스페이스입니다. 단일 모델과의 단순 대화를 넘어 GPT, Claude, DeepSeek 등 다양한 모델이 토론하고 분업하며 지속적으로 실행되어 실제 결과물을 제공합니다."
                  : "Nolo.Chat is an Autonomous Multi-Agent AI Workspace built on local-first architecture. Instead of single-model chatbots, Nolo orchestrates specialized agents powered by GPT, Claude, DeepSeek and more to debate, collaborate, review, and execute long-running workflows overnight to deliver tangible artifacts."}
        </p>
      </section>

      <section className="static-info-page__section">
        <h2 className="static-info-page__section-title">
          {isHant ? "核心技術支柱" : isHans ? "核心技术支柱" : isJa ? "技術の柱" : isKo ? "핵심 기술 요소" : "Core Architecture Pillars"}
        </h2>
        <div className="static-info-grid static-info-page__grid">
          <div className="static-info-card">
            <h3 className="static-info-card__title">
              {isHant ? "多模型協同與辯論" : isHans ? "多模型协同与辩论" : isJa ? "マルチモデル協調と議論" : isKo ? "다중 모델 조율 및 토론" : "Multi-Model Orchestration"}
            </h3>
            <p className="static-info-card__desc">
              {isHant
                ? "支援同時調度不同廠商頂尖模型，打破單一供應商鎖定，讓專家 Agent 各展所長。"
                : isHans
                  ? "支持同时调度不同厂商顶尖模型，打破单一供应商锁定，让专家 Agent 各展所长。"
                  : isJa
                    ? "複数ベンダーのモデルを柔軟に組み合わせ、最適な専門 Agent を自動編成。"
                    : isKo
                      ? "다양한 제공업체의 최고 모델을 조율하여 특정 모델 종속성을 탈피합니다."
                      : "Combine top models from multiple providers to let specialized agents handle architecture, coding, and review."}
            </p>
          </div>
          <div className="static-info-card">
            <h3 className="static-info-card__title">
              {isHant ? "持久長期記憶與規則" : isHans ? "持久长期记忆与规则" : isJa ? "永続的な長期記憶" : isKo ? "영구적인 장기 기억" : "Persistent Long-Term Memory"}
            </h3>
            <p className="static-info-card__desc">
              {isHant
                ? "分層記憶機制讓 Agent 記住你的個人偏好、團隊協作共識與項目規則，跨對話無需重複教導。"
                : isHans
                  ? "分层记忆机制让 Agent 记住你的个人偏好、团队协作共识与项目规则，跨会话无需重复教导。"
                  : isJa
                    ? "階層化メモリによりユーザーの好みやルールを記憶し、会話をまたいで活用。"
                    : isKo
                      ? "계층화된 메모리 시스템으로 사용자 선호도와 규칙을 기억하여 재학습이 필요 없습니다."
                      : "Layered memory architecture preserves user preferences, project conventions, and team rules across sessions."}
            </p>
          </div>
          <div className="static-info-card">
            <h3 className="static-info-card__title">
              {isHant ? "本地優先與數據自持" : isHans ? "本地优先与数据自持" : isJa ? "ローカルファーストと主権" : isKo ? "로컬 우선 및 데이터 소유권" : "Local-First & Data Privacy"}
            </h3>
            <p className="static-info-card__desc">
              {isHant
                ? "支援本地 LevelDB 儲存與端側離線執行，數據完全屬於用戶自己，私密安全。"
                : isHans
                  ? "支持本地 LevelDB 存储与端侧离线执行，数据完全属于用户自己，私密安全。"
                  : isJa
                    ? "ローカル DB によるデータ保存と端末上での実行に対応し、高いプライバシーを保証。"
                    : isKo
                      ? "로컬 저장소 및 기기 내 실행을 지원하여 완벽한 데이터 프라이버시를 보장합니다."
                      : "Built with local embedded database storage and client runtime to ensure user data ownership and privacy."}
            </p>
          </div>
        </div>
      </section>
    </main>
  );
};

export default AboutPage;
