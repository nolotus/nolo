import { Language } from "../types";

export default {
  [Language.EN]: {
    translation: {
      aup: {
        title: "AIGC Acceptable Use Policy",
        lastUpdated: "Last updated: August 24, 2026",
        intro:
          "Welcome to Nolo. This Acceptable Use Policy (AUP) outlines the acceptable and prohibited uses of our AI Generation Services to ensure a safe, legal, and responsible computing environment.",
        section1: {
          title: "1. Prohibited Content Categories",
          desc: "You may not generate, attempt to generate, or distribute the following categories of content:",
          nsfw: "Adult / Pornographic / NSFW Content: Explicit sexual acts, sexual services, non-consensual sexual content.",
          violence: "Violence & Gore: Content depicting extreme violence, physical harm, self-harm, suicide encouragement, or weapons manufacturing.",
          hate: "Hate Speech & Harassment: Content promoting discrimination, hatred, abuse, or degradation based on protected characteristics.",
          childSafety: "Child Exploitation & Unsafe Content: Zero-tolerance for CSAM, sexualization of minors, or exploitation.",
          deepfake: "Deepfakes & Impersonation: Non-consensual synthetic impersonation of real individuals, deceptive identity manipulation, or fraudulent endorsements.",
          infringement: "Copyright & Trademark Infringement: Generating content that directly infringes valid intellectual property rights without authorization.",
        },
        section2: {
          title: "2. Content Moderation & Screening",
          desc: "We employ multi-layered automated filtering (including prompt inspection, real-time safety classification API, and keyword interceptors) alongside human review to detect and block non-compliant prompts and generated outputs before or immediately upon generation.",
        },
        section3: {
          title: "3. Enforcement & Penalties",
          desc: "Violations of this Policy will result in enforcement actions based on severity:",
          warning: "1. Warning & Content Removal: Written warning and immediate deletion of non-compliant content.",
          limit: "2. Feature Limitation: Restricting access to specific models, tools, or generation quotas.",
          ban: "3. Account Suspension & Termination: Immediate permanent ban for severe violations (such as child safety or malicious deepfakes) without credit refund.",
          legal: "4. Legal Action: Reporting unlawful content to competent regulatory and law enforcement authorities.",
        },
        section4: {
          title: "4. User Reporting & Appeals",
          desc: "If you detect any non-compliant, unsafe, or infringing content generated via our platform, please report it immediately to our Safety Team at s@nolotus.com. We review L1 high-priority reports within 24 hours.",
        },
        section5: {
          title: "5. Contact & Safety Team",
          desc: "Safety & Abuse Contact: s@nolotus.com (Operator: Nolo).",
        },
      },
    },
  },
  [Language.ZH_CN]: {
    translation: {
      aup: {
        title: "AIGC 可接受使用规范 (AUP)",
        lastUpdated: "最后更新日期：2026年8月24日",
        intro:
          "欢迎使用 Nolo。本规范（AUP）旨在明确使用本平台 AI 生成服务时的内容标准、违规分类与处置规则，保障健康、安全、负责任的 AI 使用环境。",
        section1: {
          title: "1. 严禁生成的六大类违规内容",
          desc: "用户严禁利用本平台生成、诱导生成或传播包含以下内容的文本、图片或多媒体材料：",
          nsfw: "色情与低俗 (NSFW)：明确的性行为描写、色情交易信息或非自愿性内容。",
          violence: "暴力与血腥：极端暴力致残、人身伤害、鼓励自残自杀、制作危险武器等内容。",
          hate: "仇恨与骚扰：基于种族、民族、宗教、性别、残障等群体的歧视言论、网络霸凌与恐吓。",
          childSafety: "危害未成年人 (CSAM)：严厉零容忍涉及未成年人的任何色情、剥削或虐待内容。",
          deepfake: "深度伪造与冒用：未经授权伪造他人真实肖像/声音、冒充公众人物、从事欺诈或造谣。",
          infringement: "侵犯知识产权：明知侵犯他人著作权、商标权或商业秘密的恶意生成与传播。",
        },
        section2: {
          title: "2. 平台内容审核机制",
          desc: "平台部署了多层次自动化安全审查机制（包括输入 Prompt 敏感词扫描、实时安全模型分类过滤以及输出内容拦截），并辅以人工巡检与复核，确保不良信息在第一时间被阻断。",
        },
        section3: {
          title: "3. 违规处置措施",
          desc: "一旦发现或被举报违规，平台将视情节轻重采取以下处置措施：",
          warning: "1. 警告与下架：发出正式警告并立即下架/删除违规内容。",
          limit: "2. 权限限制：限制特定模型、降低计算额度或冻结部分功能。",
          ban: "3. 永久封号：针对严重违规（如危害未成年人、严重深度伪造）立即永久终止账号，未消耗积分不予退还。",
          legal: "4. 移送司法：涉嫌违法犯罪的，依法保存证据并向监管与公安机关报告。",
        },
        section4: {
          title: "4. 用户举报与申诉渠道",
          desc: "如发现任何违规生成内容或侵权行为，请立即向安全合规团队举报（邮箱：s@nolotus.com）。我们将在 24 小时内受理高优先级安全事件并进行处置。",
        },
        section5: {
          title: "5. 安全联系方式",
          desc: "安全与举报邮箱：s@nolotus.com（运营方：Nolo）。",
        },
      },
    },
  },
  [Language.ZH_HANT]: {
    translation: {
      aup: {
        title: "AIGC 可接受使用規範 (AUP)",
        lastUpdated: "最後更新日期：2026年8月24日",
        intro:
          "歡迎使用 Nolo。本規範（AUP）旨在明確使用本平台 AI 生成服務時的內容標準、違規分類與處置規則，保障健康、安全、負責任的 AI 使用環境。",
        section1: {
          title: "1. 嚴禁生成的六大類違規內容",
          desc: "使用者嚴禁利用本平台生成、誘導生成或傳播包含以下內容的文字、圖片或多媒體材料：",
          nsfw: "色情與低俗 (NSFW)：明確的性行為描寫、色情交易資訊或非自願性內容。",
          violence: "暴力與血腥：極端暴力致殘、人身傷害、鼓勵自殘自殺、製作危險武器等內容。",
          hate: "仇恨與騷擾：基於種族、民族、宗教、性別、殘障等群體的歧視言論、網路霸凌與恐嚇。",
          childSafety: "危害未成年人 (CSAM)：嚴格零容忍涉及未成年人的任何色情、剝削或虐待內容。",
          deepfake: "深度偽造與冒用：未經授權偽造他人真實肖像/聲音、冒充公眾人物、從事詐欺或造謠。",
          infringement: "侵害智慧財產權：明知侵害他人著作權、商標權或商業秘密的惡意生成與傳播。",
        },
        section2: {
          title: "2. 平台內容審核機制",
          desc: "平台部署了多層次自動化安全審查機制（包括輸入 Prompt 敏感詞掃描、即時安全模型分類過濾以及輸出內容攔截），並輔以人工巡檢與複核。",
        },
        section3: {
          title: "3. 違規處置措施",
          desc: "平台將視情節輕重採取警告、下架、限制權限、永久封號或移送執法機關處置。",
          warning: "1. 警告與下架：發出正式警告並立即刪除違規內容。",
          limit: "2. 權限限制：限制特定模型或凍結部分功能。",
          ban: "3. 永久封號：嚴重違規立即永久終止帳號。",
          legal: "4. 移送司法：涉嫌違法犯罪的依法報告執法機構。",
        },
        section4: {
          title: "4. 使用者檢舉與申訴管道",
          desc: "檢舉信箱：s@nolotus.com，我們將在 24 小時內受理並處置。",
        },
        section5: {
          title: "5. 安全聯絡方式",
          desc: "安全信箱：s@nolotus.com（營運方：Nolo）。",
        },
      },
    },
  },
  [Language.JA]: {
    translation: {
      aup: {
        title: "AIGC 利用規約 (AUP)",
        lastUpdated: "最終更新日：2026年8月24日",
        intro: "Nolo AIGC 利用規約。安全で責任ある AI 利用環境を維持するための禁止事項とモデレーション基準。",
        section1: {
          title: "1. 禁止コンテンツ",
          desc: "成人向け/NSFW、暴力/自傷、ヘイトスピーチ、児童搾取、ディープフェイク、著作権侵害コンテンツの生成を厳格に禁止します。",
          nsfw: "成人向け/NSFW コンテンツの禁止",
          violence: "暴力・自傷行為の禁止",
          hate: "差別・ヘイトスピーチの禁止",
          childSafety: "児童安全侵害の禁止（ゼロトレランス）",
          deepfake: "無断ディープフェイク・なりすましの禁止",
          infringement: "著作権侵害の禁止",
        },
        section2: {
          title: "2. コンテンツモデレーション",
          desc: "リアルタイム自動フィルタリングおよび人間によるレビューを実施しています。",
        },
        section3: {
          title: "3. 違反時の措置",
          desc: "警告、コンテンツ削除、機能制限、アカウント永久停止、法的機関への報告を行います。",
          warning: "1. 警告とコンテンツ削除",
          limit: "2. アクセス制限",
          ban: "3. アカウント永久停止",
          legal: "4. 法的機関への報告",
        },
        section4: {
          title: "4. 通報窓口",
          desc: "違反コンテンツの通報は s@nolotus.com までご連絡ください。",
        },
        section5: {
          title: "5. お問い合わせ",
          desc: "安全窓口：s@nolotus.com (運営：Nolo)",
        },
      },
    },
  },
};
