// src/app/i18n/translations/seo.locale.ts
import { Language } from "app/i18n/types";

export interface SeoLocaleEntry {
  title: string;
  description: string;
  home: {
    title: string;
    description: string;
  };
  pricing: {
    title: string;
    description: string;
  };
  explore: {
    title: string;
    description: string;
  };
  shareCommunity: {
    title: string;
    description: string;
  };
}

const seoLocale: Record<Language, SeoLocaleEntry> = {
  [Language.EN]: {
    title: "Nolo — Your AI team hands off the work",
    description:
      "Define persistent agents once, then let them plan, build, review and hand off to each other automatically. You choose the model for every step and which of your connected computers runs it. Your subscriptions or BYOK. Open-source client.",
    home: {
      title: "Nolo — Your AI team hands off the work",
      description:
        "Define persistent agents once, then let them plan, build, review and hand off to each other automatically. You choose the model for every step and which of your connected computers runs it. Your subscriptions or BYOK. Open-source client.",
    },
    pricing: {
      title: "Nolo Pricing | Pay as You Go, No Subscriptions",
      description:
        "Start free upon signup. Points are billed transparently by actual model token usage. Compare model costs and recharge anytime with no subscription lock-in.",
    },
    explore: {
      title: "Nolo AI Plaza | Discover Public AI Agents and Workflows",
      description:
        "Browse public AI agents, compare their specialties, and discover real workflows built by the Nolo community before starting your own workspace.",
    },
    shareCommunity: {
      title: "Community Shares | See What People Build with Nolo.Chat",
      description:
        "Explore public chats, docs, apps, and shared outputs from the Nolo community to see how people use AI agents for real work.",
    },
  },
  [Language.ZH_CN]: {
    title: "Nolo — 你的 AI 团队，自己接力把活干完",
    description:
      "Agent 定义一次就长期保留角色、模型和记忆。做完一棒自动唤醒下一棒：规划、实现、独立审查、交付。每一棒用哪个模型、在你连上的哪台电脑上跑，由你来定。用你的订阅或 BYOK，客户端开源。",
    home: {
      title: "Nolo — 你的 AI 团队，自己接力把活干完",
      description:
        "你的 Agent 有固定角色和持久记忆，做完自动交给下一个，另一家模型负责审查。可以指定在已通过 nolo connect 连上的 Mac、Linux 或服务器上执行，本地登录的模型需在那台机器上授权有效。用你的订阅或 BYOK，客户端开源。",
    },
    pricing: {
      title: "Nolo 定价 | 用多少，付多少",
      description:
        "注册即可免费开始，按实际模型消耗扣积分。查看积分规则、模型价格对比，以及如何在不订阅的情况下随时充值、随时使用。",
    },
    explore: {
      title: "Nolo AI 广场 | 发现公开 AI 与现成工作流",
      description:
        "在 AI 广场浏览公开 AI、查看它们擅长的任务与真实能力，再决定要不要把它加入你的工作流。",
    },
    shareCommunity: {
      title: "Nolo 社区分享 | 看别人怎样用 AI 把事做完",
      description:
        "浏览社区公开分享的对话、文档、应用与成果，了解真实用户如何用 Nolo 完成研究、写作、开发与自动化任务。",
    },
  },
  [Language.ZH_HANT]: {
    title: "Nolo — 讓 Claude、GPT、DeepSeek 組成你自己的 AI 團隊",
    description:
      "用你已經付費的 AI 訂閱和 API key，組成一支由你定義的 Agent 團隊：拆任務、並行幹活、互相討論和 review，全程跑在你自己的電腦上。用戶端開源。",
    home: {
      title: "Nolo — 讓 Claude、GPT、DeepSeek 組成你自己的 AI 團隊",
      description:
        "把 Claude、GPT、DeepSeek 等放進同一個工作台。定好每個 Agent 的角色和模型，讓它們並行幹活、互相 review，結論沉澱成頁面和文件。用戶端開源，本機執行。",
    },
    pricing: {
      title: "Nolo 定價 | 用多少，付多少",
      description:
        "註冊即可免費開始，按實際模型消耗扣積分。查看積分規則、模型價格對比，以及如何在不訂閱的情況下隨時儲值、隨時使用。",
    },
    explore: {
      title: "Nolo AI 廣場 | 發現公開 AI 與現成工作流",
      description:
        "在 AI 廣場瀏覽公開 AI、查看它們擅長的任務與真實能力，再決定要不要把它加入你的工作流。",
    },
    shareCommunity: {
      title: "Nolo 社群分享 | 看別人如何用 AI 把事做完",
      description:
        "瀏覽社群公開分享的對話、文件、應用與成果，了解真實使用者如何用 Nolo 完成研究、寫作、開發與自動化任務。",
    },
  },
  [Language.JA]: {
    title: "Nolo — Claude、GPT、DeepSeek をあなた専用の AI チームに",
    description:
      "すでに払っている AI サブスクリプションや API キーで、あなたが定義する Agent チームを。タスクを分け、並行で進め、互いに議論とレビューを行う——すべてあなたのコンピューター上で。クライアントはオープンソース。",
    home: {
      title: "Nolo — Claude、GPT、DeepSeek をあなた専用の AI チームに",
      description:
        "Claude、GPT、DeepSeek などを一つのワークスペースに。各 Agent の役割とモデルを決め、並行作業と相互レビューを行い、結論をページやドキュメントに残せます。クライアントはオープンソースでローカル実行。",
    },
    pricing: {
      title: "Nolo 料金 | 使った分だけ支払うクレジット制",
      description:
        "無料ではじめて、必要な時だけクレジットを追加。モデルごとの消費量、クレジットの仕組み、サブスクなしで上位機能を使う方法を確認できます。",
    },
    explore: {
      title: "AI Plaza | Nolo.Chat の公開 AI を探す",
      description:
        "公開 AI エージェントを一覧で見比べ、それぞれの得意分野や実際の使い道を確認してから自分のワークフローに取り込めます。",
    },
    shareCommunity: {
      title: "コミュニティ共有 | Nolo.Chat で作られた実例を見る",
      description:
        "コミュニティが公開した対話、文書、アプリ、成果物を見ながら、Nolo が実務でどう使われているかを確認できます。",
    },
  },
  [Language.KO]: {
    title: "Nolo — Claude, GPT, DeepSeek를 나만의 AI 팀으로",
    description:
      "이미 결제한 AI 구독과 API 키로, 직접 정의한 에이전트 팀을 꾸리세요. 작업을 나누고, 병렬로 진행하고, 서로 토론하고 리뷰합니다 — 모두 내 컴퓨터에서. 클라이언트는 오픈 소스입니다.",
    home: {
      title: "Nolo — Claude, GPT, DeepSeek를 나만의 AI 팀으로",
      description:
        "Claude, GPT, DeepSeek 등을 하나의 작업 공간에. 에이전트마다 역할과 모델을 정하고, 병렬 작업과 상호 리뷰를 거쳐 결론을 페이지와 문서로 남기세요. 클라이언트는 오픈 소스이며 로컬에서 실행됩니다.",
    },
    pricing: {
      title: "Nolo 요금제 | 사용한 만큼만 결제하는 크레딧 시스템",
      description:
        "무료로 시작하고 필요할 때만 크레딧을 충전하세요. 모델별 비용을 비교하고, 구독 없이 고급 기능을 유연하게 이용해 보세요.",
    },
    explore: {
      title: "AI 광장 | Nolo.Chat 공개 AI 에이전트 탐색",
      description:
        "공개된 AI 에이전트를 살펴보고, 각 분야의 전문성과 실제 워크플로를 확인한 뒤 나만의 작업 공간에 추가하세요.",
    },
    shareCommunity: {
      title: "커뮤니티 공유 | Nolo.Chat으로 완성된 실제 작업 사례",
      description:
        "Nolo 커뮤니티에서 공개 공유한 대화, 문서, 앱, 작업 결과물을 둘러보고 실제 업무에 AI를 활용하는 방법을 확인하세요.",
    },
  },
};

export default seoLocale;
