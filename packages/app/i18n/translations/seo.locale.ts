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
  about: {
    title: string;
    description: string;
  };
  contact: {
    title: string;
    description: string;
  };
}

const seoLocale: Record<Language, SeoLocaleEntry> = {
  [Language.EN]: {
    title: "Nolo — Let Claude, GPT and DeepSeek work as your own AI team",
    description:
      "Nolo turns the AI subscriptions and API keys you already pay for into one team of agents you define. They split tasks, work in parallel, and discuss and review each other — on your own computer. Open-source client.",
    home: {
      title: "Nolo — Let Claude, GPT and DeepSeek work as your own AI team",
      description:
        "Bring Claude, GPT, DeepSeek and more into one workspace. Define each agent’s role and model, let them work in parallel and review each other, and keep conclusions as pages and docs. The client is open source and runs locally.",
    },
    pricing: {
      title: "Pricing | Pay for What You Use with Nolo Credits",
      description:
        "Start free, then top up credits only when you need more. Compare model costs, understand how credits work, and unlock advanced features without being locked into a subscription.",
    },
    explore: {
      title: "AI Plaza | Explore Public AI Agents on Nolo.Chat",
      description:
        "Browse public AI agents, compare their specialties, and discover real workflows built by the Nolo community before starting your own workspace.",
    },
    shareCommunity: {
      title: "Community Shares | See What People Build with Nolo.Chat",
      description:
        "Explore public chats, docs, apps, and shared outputs from the Nolo community to see how people use AI agents for real work.",
    },
    about: {
      title: "About Nolo.Chat | Autonomous Multi-Agent Workspace & AI Platform",
      description:
        "Learn about Nolo.Chat's mission to transform how humans work with AI through local-first autonomous multi-agent orchestration, persistent memory, and multi-model collaboration.",
    },
    contact: {
      title: "Contact Us | Nolo.Chat Support, Feedback & Community",
      description:
        "Get in touch with the Nolo.Chat team for technical support, partnerships, bug reports, and feedback. Connect via email, community, and social channels.",
    },
  },
  [Language.ZH_CN]: {
    title: "Nolo — 让 Claude、GPT、DeepSeek 组成你自己的 AI 团队",
    description:
      "用你已经付费的 AI 订阅和 API key，组成一支由你定义的 Agent 团队：拆任务、并行干活、互相讨论和 review，全程跑在你自己的电脑上。客户端开源。",
    home: {
      title: "Nolo — 让 Claude、GPT、DeepSeek 组成你自己的 AI 团队",
      description:
        "把 Claude、GPT、DeepSeek 等放进同一个工作台。定好每个 Agent 的角色和模型，让它们并行干活、互相 review，结论沉淀成页面和文档。客户端开源，本地运行。",
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
    about: {
      title: "关于 Nolo.Chat | 自主多 Agent 协作 AI 工作台",
      description:
        "了解 Nolo.Chat 的使命与技术愿景：通过本地优先架构、自主多 Agent 协作网络、持久长期记忆与多模型协同，打造真正替你把事做完的 AI 团队。",
    },
    contact: {
      title: "联系我们 | Nolo.Chat 官方支持与社区反馈",
      description:
        "获取 Nolo.Chat 官方技术支持、商务合作、问题反馈与社区交流入口。欢迎通过邮件与官方社区随时与我们联系。",
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
    about: {
      title: "關於 Nolo.Chat | 自主多 Agent 協作 AI 工作台",
      description:
        "了解 Nolo.Chat 的使命與技術願景：透過本地優先架構、自主多 Agent 協作網絡、持久長期記憶與多模型協同，打造真正替你把事做完的 AI 團隊。",
    },
    contact: {
      title: "聯絡我們 | Nolo.Chat 官方支援與社群反饋",
      description:
        "獲取 Nolo.Chat 官方技術支援、商務合作、問題反饋與社群交流入口。歡迎透過郵件與官方社群隨時與我們聯絡。",
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
    about: {
      title: "Nolo.Chat について | 自律型マルチエージェント AI ワークスペース",
      description:
        "Nolo.Chat のビジョンと技術：ローカルファースト設計、複数 Agent の自律協調、長期記憶、マルチモデル連携を通じて、仕事を実際に仕上げる AI チームを提供します。",
    },
    contact: {
      title: "お問い合わせ | Nolo.Chat 公式サポート＆コミュニティ",
      description:
        "Nolo.Chat の公式テクニカルサポート、提携、フィードバック窓口。メールや公式コミュニティからお気軽にお問い合わせください。",
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
    about: {
      title: "Nolo.Chat 소개 | 자율형 멀티 에이전트 AI 워크스페이스",
      description:
        "Nolo.Chat의 미션과 비전: 로컬 우선 아키텍처, 자율적인 멀티 에이전트 협업, 지속적인 장기 기억, 다중 모델 조율을 통해 실제 업무를 완수하는 AI 팀을 구축합니다.",
    },
    contact: {
      title: "문의하기 | Nolo.Chat 공식 지원 및 커뮤니티",
      description:
        "Nolo.Chat 기술 지원, 제휴, 피드백 및 커뮤니티 채널 안내. 이메일 및 공식 채널을 통해 언제든지 문의해 주세요.",
    },
  },
};

export default seoLocale;
