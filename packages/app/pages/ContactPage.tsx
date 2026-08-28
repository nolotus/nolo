import React, { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { usePageMeta } from "app/hooks/usePageMeta";
import { buildStaticPageMeta } from "app/seo/pageMeta";
import { Language } from "app/i18n/types";
import "./StaticInfoPages.css";

const ContactPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const pageMeta = useMemo(() => buildStaticPageMeta(t, "contact"), [t]);
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
            ? "聯絡我們 | Nolo.Chat 官方支援與社群反饋"
            : isHans
              ? "联系我们 | Nolo.Chat 官方支持与社区反馈"
              : isJa
                ? "お問い合わせ | Nolo.Chat 公式サポート＆コミュニティ"
                : isKo
                  ? "문의하기 | Nolo.Chat 공식 지원 및 커뮤니티"
                  : "Contact Us | Nolo.Chat Support & Community"}
        </h1>
        <p className="static-info-page__subtitle">
          {isHant
            ? "我們隨時傾聽你的聲音。歡迎透過以下管道聯繫 Nolo.Chat 團隊"
            : isHans
              ? "我们随时倾听你的声音。欢迎通过以下渠道联系 Nolo.Chat 团队"
              : isJa
                ? "Nolo.Chat チームへのご意見、お問い合わせはこちらからお気軽にどうぞ"
                : isKo
                  ? "Nolo.Chat 팀은 언제나 사용자의 피드백과 제안을 환영합니다"
                  : "We are always here to help. Reach out to the Nolo.Chat team through the channels below"}
        </p>
      </header>

      <section className="static-info-page__section">
        <h2 className="static-info-page__section-title">
          {isHant ? "官方聯絡管道" : isHans ? "官方联络渠道" : isJa ? "連絡先一覧" : isKo ? "공식 연락 채널" : "Official Channels"}
        </h2>
        <div className="static-info-grid static-info-page__grid">
          <div className="static-info-card">
            <h3 className="static-info-card__title">
              {isHant ? "技術支援與用戶服務" : isHans ? "技术支持与用户服务" : isJa ? "技術サポート" : isKo ? "기술 지원" : "Support & Assistance"}
            </h3>
            <p className="static-info-card__desc">
              {isHant ? "遇到帳號、積分或使用問題？" : isHans ? "遇到账号、积分或使用问题？" : isJa ? "アカウントや使用上の問題について：" : isKo ? "계정 또는 사용 관련 문의:" : "For account, billing, or technical queries:"}
              <br />
              <a href="mailto:support@nolo.chat">support@nolo.chat</a>
            </p>
          </div>
          <div className="static-info-card">
            <h3 className="static-info-card__title">
              {isHant ? "商務合作與反饋" : isHans ? "商务合作与反馈" : isJa ? "ビジネス・提携" : isKo ? "비즈니스 제휴" : "Partnerships & General"}
            </h3>
            <p className="static-info-card__desc">
              {isHant ? "商務洽談、模型接入與合作：" : isHans ? "商务洽谈、模型接入与合作：" : isJa ? "協業・パートナーシップ：" : isKo ? "제휴 및 협력 문의:" : "For partnerships, integrations, and press:"}
              <br />
              <a href="mailto:contact@nolo.chat">contact@nolo.chat</a>
            </p>
          </div>
          <div className="static-info-card">
            <h3 className="static-info-card__title">
              {isHant ? "社群與社群動態" : isHans ? "社交与社区动态" : isJa ? "公式コミュニティ" : isKo ? "소셜 및 커뮤니티" : "Community & Social"}
            </h3>
            <p className="static-info-card__desc">
              {isHant ? "關注最新更新與產品動態：" : isHans ? "关注最新更新与产品动态：" : isJa ? "最新情報とアップデート：" : isKo ? "최신 업데이트 소식:" : "Follow our latest releases and news:"}
              <br />
              <a href="https://x.com/nolodotchat" target="_blank" rel="noopener noreferrer">
                Twitter / X: @nolodotchat
              </a>
            </p>
          </div>
        </div>
      </section>

      <section className="static-info-page__section">
        <h2 className="static-info-page__section-title">
          {isHant ? "服務時效承諾" : isHans ? "服务时效承诺" : isJa ? "対応時間について" : isKo ? "응답 안내" : "Response Time"}
        </h2>
        <p className="static-info-page__text">
          {isHant
            ? "團隊通常會在 1-2 個工作日內回覆你的郵件。如遇緊急安全漏洞或故障報告，我們會優先處理並快速響應。"
            : isHans
              ? "团队通常会在 1-2 个工作日内回复你的邮件。如遇紧急安全漏洞或故障报告，我们会优先处理并快速响应。"
              : isJa
                ? "通常 1〜2 営業日以内にご返信いたします。緊急の不具合やセキュリティ報告は優先的に対応いたします。"
                : isKo
                  ? "일반적으로 영업일 기준 1~2일 이내에 회신해 드립니다. 긴급 보안 이슈나 장애는 최우선으로 처리됩니다."
                  : "We typically respond to emails within 1–2 business days. Critical security or uptime issues are prioritized immediately."}
        </p>
      </section>
    </main>
  );
};

export default ContactPage;
