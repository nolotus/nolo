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
    title: "Nolo — 你的 AI 團隊，自己接力把活幹完",
    description:
      "Agent 定義一次就長期保留角色、模型和記憶。做完一棒自動交給下一棒：規劃、實現、獨立審查、交付。每一棒用哪個模型、在你連上的哪台電腦上跑，由你來定。用你的訂閱或 BYOK，用戶端開源。",
    home: {
      title: "Nolo — 你的 AI 團隊，自己接力把活幹完",
      description:
        "你的 Agent 有固定角色和持久記憶，做完自動交給下一個，另一家模型負責審查。可以指定在已透過 nolo connect 連上的 Mac、Linux 或伺服器上執行，本機登入的模型需在那台機器上授權有效。用你的訂閱或 BYOK，用戶端開源。",
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
    title: "Nolo — あなたの AI チームが、自律してタスクを引き継ぐ",
    description:
      "Agent は一度定義すれば役割・モデル・記憶を維持し、一つの作業が終わると次の Agent に引き継ぎます：計画、実装、独立レビュー、納品。各ステップで使うモデルと実行する接続先コンピューターはあなたが選べます。手持ちのサブスクまたは BYOK、クライアントはオープンソース。",
    home: {
      title: "Nolo — あなたの AI チームが、自律してタスクを引き継ぐ",
      description:
        "あなたの Agent は固定の役割と持続する記憶を持ち、作業が終わると自動で次の Agent に引き継ぎ、別ベンダーのモデルがレビューを担当します。nolo connect で接続した Mac・Linux・サーバー上での実行を指定でき、マシン上でログインしたサブスクの利用にはその認証が有効である必要があります。手持ちのサブスクまたは BYOK、クライアントはオープンソース。",
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
    title: "Nolo — 당신의 AI 팀이 스스로 바통을 넘기며 일합니다",
    description:
      "Agent는 한 번 정의하면 역할, 모델, 기억을 유지합니다. 한 단계가 끝나면 자동으로 다음 단계로 넘어갑니다: 기획, 구현, 독립 리뷰, 전달. 각 단계에서 사용할 모델과 실행할 연결된 컴퓨터는 당신이 정합니다. 보유한 구독 또는 BYOK, 클라이언트는 오픈 소스입니다.",
    home: {
      title: "Nolo — 당신의 AI 팀이 스스로 바통을 넘기며 일합니다",
      description:
        "당신의 Agent는 고정된 역할과 지속되는 기억을 가지며, 작업이 끝나면 자동으로 다음 Agent에게 넘어가고 다른 제조사의 모델이 리뷰를 담당합니다. nolo connect로 연결된 Mac, Linux 또는 서버에서 실행을 지정할 수 있으며, 머신에서 로그인한 구독을 사용하는 경우 해당 인증이 유효해야 합니다. 보유한 구독 또는 BYOK, 클라이언트는 오픈 소스입니다.",
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
