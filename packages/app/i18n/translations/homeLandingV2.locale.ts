import { Language } from "../types";

// Guest home copy (2026-10-04 redesign). Source of truth for claims:
// docs/product-positioning.md §3.1 ("能说 / 不能说"). No competitor names.
// Relay steps replay a real cross-machine run; keep numbers faithful.

// 英文文案里的 U+00A0 是刻意的（避免 "start over" / "to make" 这类词组被拆行）；
// CJK 文案一律不用 NBSP——NBSP 夹在中文之间会留约 4.6px 可见缝隙，改由 CSS
// text-wrap: pretty 治行尾孤字（见 HomeLanding.css 的 .hl-pillar p / .hl-compare-card li）。
const en = {
  homeLandingV2: {
    hero: {
      tag: "Your own subscriptions or API keys · Open-source client",
      title: "Your AI team\nhands off the work.",
      lead: "They split the task, work in parallel, talk it over and check each other's work. You choose the model for every step, and which connected computer runs it.",
    },
    cta: {
      primary: "Start a task",
      download: "Download Nolo",
    },
    relay: {
      label: "A real handoff",
      done: "Review passed",
      replay: "Replay",
      viewRun: "View this run",
      note: "Replayed from a real run: one sentence in, three agents handing off across two computers.",
      steps: [
        { role: "Plan", model: "GPT", machine: "Mac", seconds: "9.7s" },
        { role: "Build", model: "DeepSeek", machine: "Linux", seconds: "12.7s" },
        { role: "Review", model: "Gemini", machine: "Mac", seconds: "17.7s" },
      ],
    },
    pillars: {
      title: "Three things that make it a team",
      items: [
        {
          title: "A companion that\u00a0stays",
          body: "Each agent keeps its name, role, model and memory, and gets to know you better the more you work together. Call it next week and it is still the same one.",
          example: "Tell it once to answer in English and lead with the conclusion, and it already does so in a brand-new conversation. Switch models and you don't start over.",
        },
        {
          title: "It hands off by itself",
          body: "When one finishes, the next one picks it up, and you can have a model from another vendor check the work. Say one sentence, then go do something else.",
        },
        {
          title: "You pick",
          body: "Which model takes each step, and where it runs. Models: your subscriptions, your own API keys, or local models. Machines: your Mac, your Linux box, your own server.",
        },
      ],
    },
    orchestration: {
      title: "More than one way to work together",
      lead: "Split a task across agents, send one question to several models at once, or have them answer on their own and then cross-check, with disagreements kept on the record. No flowchart to draw.",
    },
    compare: {
      title: "You already juggle several AIs by hand. Nolo makes them one team.",
      lead: "What you do across tabs today becomes one conversation with agents you define.",
      handLabel: "Juggling AI windows yourself",
      handItems: ["Copy context between tabs by\u00a0hand", "Paste output into another model to check it", "Start over when a subscription hits its limit", "Conclusions scattered across chat\u00a0logs"],
      noloItems: ["Agents keep their role, prompt, model and memory", "An independent agent reviews the\u00a0work", "Switch agents mid-conversation; history carries over", "Conclusions land in pages and\u00a0docs"],
    },
    faq: {
      title: "Questions people ask",
      items: [
        {
          question: "How is this different from giving an AI skills or MCP tools?",
          answer: "Those add abilities to one agent. Nolo runs a team: who does the work, whose subscription pays for it, which computer it runs on, who picks it up next, and who reviews it.",
        },
        {
          question: "Can I use my own subscriptions?",
          answer: "Yes. Your subscriptions, your own API keys (BYOK) and local models all work.",
        },
        {
          question: "Where do the agents run?",
          answer: "On a computer or server you have connected. It needs to be switched on and running nolo connect. If an agent uses a subscription you signed into on that machine, the sign-in there has to still be valid.",
        },
        {
          question: "Where do my conversations and data live?",
          answer: "When agents run on your own computers, files and commands stay on those machines. The client is open source, so you can read exactly what it does and what it sends.",
        },
      ],
    },
    whyNow: {
      title: "Why now",
      lead: "Three things are already true for many people who use AI every day.",
      items: [
        {
          title: "More than one AI, already paid for",
          body: "Many people already pay for several AI subscriptions or keys, each good at something different. What's missing is a way to make them work together.",
        },
        {
          title: "Agents can finish real work",
          body: "An agent can now take a whole piece of work from plan to checked result on its own. Handing off between agents is the next step.",
        },
        {
          title: "Your work lives on several devices",
          body: "A laptop, a desktop, a server, a phone. The work should run where your files and tools already are.",
        },
      ],
    },
    closing: {
      label: "Closing",
      lead: "AI can research, build, compare, check, and move in parallel.",
      lines: ["Why you do it.", "What good looks like.", "What you truly want to make."],
      end: "That stays with you.",
      trust: ["Open-source client", "Releases match public source", "Your subscriptions or BYOK"],
      source: "View source",
    },
  },
};

const zhCN = {
  homeLandingV2: {
    hero: {
      tag: "用你自己的订阅或 Key · 客户端开源",
      title: "你的 AI 团队，\n自己接力把活干完。",
      lead: "它们会拆分任务、分头干活，还会互相讨论、互相检查。\n用哪个模型、在你连上的哪台电脑上跑，由你来定。",
    },
    cta: {
      primary: "开始一个任务",
      download: "下载 Nolo",
    },
    relay: {
      label: "一次真实的接力",
      done: "审查通过",
      replay: "重播",
      viewRun: "查看这次运行",
      note: "这是一次真实运行的回放：你说一句话，三个 Agent 在两台电脑上接力完成。",
      steps: [
        { role: "规划", model: "GPT", machine: "Mac", seconds: "9.7 秒" },
        { role: "实现", model: "DeepSeek", machine: "Linux", seconds: "12.7 秒" },
        { role: "审查", model: "Gemini", machine: "Mac", seconds: "17.7 秒" },
      ],
    },
    pillars: {
      title: "它为什么是一支团队",
      items: [
        {
          title: "长期的同伴",
          body: "每个 Agent 都有自己的名字、角色、模型和记忆，越用越懂你。下周再叫它，还是它。",
          example: "你说过一次「回复用中文、先给结论」，新开的对话它直接照做。换了模型，也不用从头教。",
        },
        {
          title: "自己接力",
          body: "一个做完，下一个自然接上；还可以让另一家的模型来把关。你说一句话，就可以去做别的事。",
        },
        {
          title: "你来挑",
          body: "每个 Agent 用哪个模型、在哪台电脑上跑，都由你决定。模型：你的订阅、自带 Key、本地模型。机器：你的 Mac、Linux、你自己的服务器。",
        },
      ],
    },
    orchestration: {
      title: "协作不只有一种方式",
      lead: "把任务拆给不同 Agent，把同一个问题同时交给多个模型，或让它们先各自作答、再互相复议，有分歧也会如实留下。不用你画流程图。",
    },
    compare: {
      title: "你已经在手动拼好几个 AI 了。Nolo 让它们成为一支团队。",
      lead: "以前在几个窗口之间来回做的事，现在放进一段对话，交给你定义的 Agent 一起完成。",
      handLabel: "自己开几个 AI 窗口拼",
      handItems: ["在窗口之间手动搬上下文", "把结果复制给另一个模型挑错", "订阅额度用完就得重开对话", "结论散落在各个聊天记录里"],
      noloItems: ["Agent 长期保留角色、提示词、模型和记忆", "另一个 Agent 独立检查", "同一段对话里换 Agent，历史接着用", "结论沉淀成页面和文档"],
    },
    faq: {
      title: "常见问题",
      items: [
        {
          question: "这和给 AI 装 skill、接 MCP 有什么不同？",
          answer: "那些是给一个 Agent 加能力。Nolo 管的是一支团队：谁来做、用谁的订阅、在哪台电脑上、做完谁接、谁来审。",
        },
        {
          question: "能用我自己的订阅吗？",
          answer: "可以。你的订阅、自带的 API Key（BYOK）和本地模型都能用。",
        },
        {
          question: "Agent 跑在哪里？",
          answer: "在你连上的电脑或服务器上。那台机器需要开着，并运行 nolo connect；如果 Agent 用的是在那台机器上登录的订阅，那边的登录要仍然有效。",
        },
        {
          question: "我的对话和数据在哪？",
          answer: "Agent 跑在你自己的电脑上时，文件和命令都留在那台机器上。客户端开源，它做了什么、发出了什么，你都可以看到。",
        },
      ],
    },
    whyNow: {
      title: "为什么是现在",
      lead: "下面三件事，在很多天天用 AI 的人身上已经同时发生。",
      items: [
        {
          title: "订阅已经不止一家",
          body: "很多人同时付着好几家 AI 的订阅或 Key，各有所长。缺的是让它们一起干活的方式。",
        },
        {
          title: "Agent 已能独立干完一段活",
          body: "从规划、动手到自查，一个 Agent 已经能自己完成一整段工作。下一步是让它们彼此接力。",
        },
        {
          title: "你不只有一台设备",
          body: "笔记本、台式机、服务器、手机。活应该在你的文件和工具所在的那台机器上跑。",
        },
      ],
    },
    closing: {
      label: "结语",
      lead: "AI 可以研究、执行、比较、检查和并行推进。",
      lines: ["你为什么做。", "什么是好的。", "你真正想创造什么。"],
      end: "始终是你。",
      trust: ["客户端开源", "发布版本可对应源码", "用你的订阅或自带 Key"],
      source: "查看源码",
    },
  },
};

const zhHant = {
  homeLandingV2: {
    hero: {
      tag: "用你自己的訂閱或 Key · 客戶端開源",
      title: "你的 AI 團隊，\n自己接力把活幹完。",
      lead: "它們會拆分任務、分頭幹活，還會互相討論、互相檢查。\n用哪個模型、在你連上的哪台電腦上跑，由你來定。",
    },
    cta: {
      primary: "開始一個任務",
      download: "下載 Nolo",
    },
    relay: {
      label: "一次真實的接力",
      done: "審查通過",
      replay: "重播",
      viewRun: "查看這次運行",
      note: "這是一次真實運行的回放：你說一句話，三個 Agent 在兩台電腦上接力完成。",
      steps: [
        { role: "規劃", model: "GPT", machine: "Mac", seconds: "9.7 秒" },
        { role: "實現", model: "DeepSeek", machine: "Linux", seconds: "12.7 秒" },
        { role: "審查", model: "Gemini", machine: "Mac", seconds: "17.7 秒" },
      ],
    },
    pillars: {
      title: "它為什麼是一支團隊",
      items: [
        {
          title: "長期的同伴",
          body: "每個 Agent 都有自己的名字、角色、模型和記憶，越用越懂你。下週再叫它，還是它。",
          example: "你說過一次「回應用中文、先給結論」，新開的對話它直接照做。換了模型，也不用從頭教。",
        },
        {
          title: "自己接力",
          body: "一個做完，下一個自然接上；還可以讓另一家的模型來把關。你說一句話，就可以去做別的事。",
        },
        {
          title: "你來挑",
          body: "每個 Agent 用哪個模型、在哪台電腦上跑，都由你決定。模型：你的訂閱、自帶 Key、本地模型。機器：你的 Mac、Linux、你自己的伺服器。",
        },
      ],
    },
    orchestration: {
      title: "協作不只有一種方式",
      lead: "把任務拆給不同 Agent，把同一個問題同時交給多個模型，或讓它們先各自作答、再互相複議，有分歧也會如實留下。不用你畫流程圖。",
    },
    compare: {
      title: "你已經在手動拼好幾個 AI 了。Nolo 讓它們成為一支團隊。",
      lead: "以前在幾個視窗之間來回做的事，現在放進一段對話，交給你看定義的 Agent 一起完成。",
      handLabel: "自己開幾個 AI 視窗拼",
      handItems: ["在視窗之間手動搬上下文", "把結果複製給另一個模型挑錯", "訂閱額度用完就得重開對話", "結論散落在各個聊天記錄裡"],
      noloItems: ["Agent 長期保留角色、提示詞、模型和記憶", "另一個 Agent 獨立檢查", "同一段對話裡換 Agent，歷史接著用", "結論沉澱成頁面和文檔"],
    },
    faq: {
      title: "常見問題",
      items: [
        {
          question: "這和給 AI 裝 skill、接 MCP 有什麼不同？",
          answer: "那些是給一個 Agent 加能力。Nolo 管的是一支團隊：誰來做、用誰的訂閱、在哪台電腦上、做完誰接、誰來審。",
        },
        {
          question: "能用我自己的訂閱嗎？",
          answer: "可以。你的訂閱、自帶的 API Key（BYOK）和本地模型都能用。",
        },
        {
          question: "Agent 跑在哪裡？",
          answer: "在你連上的電腦或伺服器上。那台機器需要開著，並運行 nolo connect；如果 Agent 用的是在那台機器上登入的訂閱，那邊的登入要仍然有效。",
        },
        {
          question: "我的對話和數據在哪？",
          answer: "Agent 跑在你自己的電腦上時，文件和命令都留在那台機器上。客戶端開源，它做了什麼、發出了什麼，你都可以看到。",
        },
      ],
    },
    whyNow: {
      title: "為什麼是現在",
      lead: "下面三件事，在很多天天用 AI 的人身上已經同時發生。",
      items: [
        {
          title: "訂閱已經不只一家",
          body: "很多人同時付著好幾家 AI 的訂閱或 Key，各有所長。缺的是讓它們一起幹活的方式。",
        },
        {
          title: "Agent 已能獨立幹完一段活",
          body: "從規劃、動手到自查，一個 Agent 已經能自己完成一整段工作。下一步是讓它們彼此接力。",
        },
        {
          title: "你不只有一台裝置",
          body: "筆電、桌機、伺服器、手機。活應該在你的檔案和工具所在的那台機器上跑。",
        },
      ],
    },
    closing: {
      label: "結語",
      lead: "AI 可以研究、執行、比較、檢查和並行推進。",
      lines: ["你為什麼做。", "什麼是好的。", "你真正想創造什麼。"],
      end: "始終是你。",
      trust: ["客戶端開源", "發布版本可對應源碼", "用你的訂閱或自帶 Key"],
      source: "查看源碼",
    },
  },
};

const ja = {
  homeLandingV2: {
    hero: {
      tag: "自分のサブスクリプションや API キーを使用 · クライアントはオープンソース",
      title: "あなたの AI チームが、\n自律してタスクを引き継ぐ。",
      lead: "タスクを分割し、並行して進め、互いに議論し、チェックし合います。\n各ステップで使うモデルも、実行する接続先コンピューターも、すべてあなたが選べます。",
    },
    cta: {
      primary: "タスクを始める",
      download: "Nolo をダウンロード",
    },
    relay: {
      label: "実際のタスク引き継ぎ",
      done: "レビュー通過",
      replay: "もう一度再生",
      viewRun: "この実行を見る",
      note: "実際の実行記録より：一言指示するだけで、3 つの Agent が 2 台のコンピューターにまたがって連携・完結します。",
      steps: [
        { role: "計画", model: "GPT", machine: "Mac", seconds: "9.7 秒" },
        { role: "実装", model: "DeepSeek", machine: "Linux", seconds: "12.7 秒" },
        { role: "レビュー", model: "Gemini", machine: "Mac", seconds: "17.7 秒" },
      ],
    },
    pillars: {
      title: "チームとして機能する 3 つの理由",
      items: [
        {
          title: "ずっとそばにいるパートナー",
          body: "各 Agent は名前、役割、モデル、記憶を保持し、使い込むほどあなたを理解します。来週呼び出しても、変わらずその Agent です。",
          example: "一度「日本語で回答し、結論から先に書いて」と伝えれば、新しい会話でもそのまま従います。モデルを変えても最初から教え直す必要はありません。",
        },
        {
          title: "自動でリレー・引き継ぎ",
          body: "ひとつの作業が終われば次の Agent が自然に引き継ぎ、他社モデルに品質チェックを任せることも可能です。一言指示を出したら、別の作業に移れます。",
        },
        {
          title: "あなたが選べる自由",
          body: "どのステップをどのモデルが担当し、どのマシンで実行するかは自由です。モデル：契約中のサブスク、持ち込み API キー（BYOK）、ローカルモデル。マシン：Mac、Linux、自前のサーバー。",
        },
      ],
    },
    orchestration: {
      title: "連携方法はひとつだけではない",
      lead: "タスクを複数の Agent に分担させる、ひとつの質問を複数モデルへ同時に投げる、または各自で回答させてから突き合わせ、食い違いも記録としてそのまま残す。フローチャートを描く必要はありません。",
    },
    compare: {
      title: "複数の AI を手作業で切り替えるのは終わり。Nolo がひとつのチームにします。",
      lead: "これまで複数のタブを行き来して行っていた作業が、あなたが定義した Agent たちとのひとつの会話にまとまります。",
      handLabel: "複数の AI ウィンドウを手作業で操作",
      handItems: ["タブ間で文脈を手作業でコピー", "出力を別のモデルに貼り付けてチェック", "サブスクの上限に達したら最初からやり直し", "結論がチャット履歴のあちこちに散らばる"],
      noloItems: ["Agent は役割・プロンプト・モデル・記憶を長期保持", "独立した Agent が客観的にレビュー", "同じ会話内で Agent を切り替えても履歴を継承", "結論はページやドキュメントとして蓄積"],
    },
    faq: {
      title: "よくある質問",
      items: [
        {
          question: "AI に skill や MCP を導入するのと何が違うのですか？",
          answer: "それらは単一の Agent に機能を追加するものです。Nolo はチーム全体を管理します：誰が担当し、誰のサブスクを使い、どのマシンで動かし、終わったら誰が引き継ぎ、誰がレビューするかを担います。",
        },
        {
          question: "手持ちのサブスクリプションは使えますか？",
          answer: "はい。ご契約中のサブスクリプション、お持ちの API キー（BYOK）、ローカルモデルのいずれも利用可能です。",
        },
        {
          question: "Agent はどこで実行されますか？",
          answer: "接続済みのコンピューターまたはサーバー上で動きます。そのマシンが起動しており、nolo connect が実行されている必要があります。また、マシン上でログインしたサブスクを利用する場合は、その認証が有効である必要があります。",
        },
        {
          question: "会話内容やデータはどこに保存されますか？",
          answer: "ご自身のコンピューターで Agent を実行する場合、ファイルや実行コマンドはそのマシン内にとどまります。クライアントはオープンソースであり、何を実行し何を送信しているかをすべて確認できます。",
        },
      ],
    },
    whyNow: {
      title: "なぜ今なのか",
      lead: "毎日 AI を使う多くの人にとって、次の三つはすでに当たり前になっています。",
      items: [
        {
          title: "AI の契約はひとつではない",
          body: "複数の AI のサブスクリプションや API キーを持ち、得意なことで使い分けている人は少なくありません。足りないのは、それらを一緒に働かせる仕組みです。",
        },
        {
          title: "Agent はひとまとまりの仕事をこなせる",
          body: "計画から実装、自己チェックまで、一つの Agent が自分で仕事をやり切れるようになりました。次は、Agent 同士で引き継ぐことです。",
        },
        {
          title: "デバイスは一台ではない",
          body: "ノート PC、デスクトップ、サーバー、スマートフォン。仕事は、ファイルとツールがあるそのマシンで動くべきです。",
        },
      ],
    },
    closing: {
      label: "おわりに",
      lead: "AI は調査、実装、比較、検証、そして並行しての進行を担えます。",
      lines: ["なぜそれを作るのか。", "何が良いものなのか。", "あなたが本当に生み出したいものは何か。"],
      end: "それを決めるのは、いつだってあなたです。",
      trust: ["オープンソースクライアント", "公開ソースと一致するリリース", "手持ちのサブスクまたは BYOK を利用可能"],
      source: "ソースコードを見る",
    },
  },
};

const ko = {
  homeLandingV2: {
    hero: {
      tag: "기존 구독 또는 API 키 사용 · 오픈소스 클라이언트",
      title: "당신의 AI 팀이\n스스로 바통을 넘기며 일합니다.",
      lead: "작업을 나누고, 병렬로 실행하며, 서로 논의하고 검토합니다.\n모든 단계에서 사용할 모델과 실행할 연결 컴퓨터를 직접 선택할 수 있습니다.",
    },
    cta: {
      primary: "작업 시작하기",
      download: "Nolo 다운로드",
    },
    relay: {
      label: "실제 바통 터치",
      done: "검토 통과",
      replay: "다시 재생",
      viewRun: "이 실행 보기",
      note: "실제 실행 리플레이: 문장 하나로 시작해 세 Agent가 두 대의 컴퓨터를 넘나들며 이어받아 완수했습니다.",
      steps: [
        { role: "기획", model: "GPT", machine: "Mac", seconds: "9.7초" },
        { role: "구현", model: "DeepSeek", machine: "Linux", seconds: "12.7초" },
        { role: "검토", model: "Gemini", machine: "Mac", seconds: "17.7초" },
      ],
    },
    pillars: {
      title: "하나의 팀이 되는 세 가지 이유",
      items: [
        {
          title: "곁에 남는 동료",
          body: "각 Agent는 이름, 역할, 모델, 기억을 그대로 유지하며 함께 일할수록 나를 더 잘 이해합니다. 다음 주에 다시 불러도 바로 그 Agent입니다.",
          example: "한 번만 '한국어로 답변하고 결론부터 제시해 줘'라고 말해 두면 새로운 대화에서도 그대로 적용됩니다. 모델을 바꿔도 처음부터 다시 가르칠 필요가 없습니다.",
        },
        {
          title: "스스로 이어받는 협업",
          body: "하나가 끝나면 다음 Agent가 자연스럽게 이어받고, 다른 제조사의 모델에 검토를 맡길 수도 있습니다. 한마디만 남겨두고 다른 일을 하러 가시면 됩니다.",
        },
        {
          title: "직접 선택하는 유연함",
          body: "각 단계를 어떤 모델이 맡고 어디서 실행할지 직접 결정합니다. 모델: 이용 중인 구독, 보유한 API 키(BYOK), 로컬 모델. 기기: Mac, Linux, 개인 서버.",
        },
      ],
    },
    orchestration: {
      title: "협업 방식은 하나가 아닙니다",
      lead: "작업을 여러 Agent에 분할하거나, 같은 질문을 여러 모델에 동시에 보내거나, 각자 답변한 뒤 서로 교차 검토하게 하여 이견까지 충실히 기록합니다. 복잡한 플로우차트를 그릴 필요가 없습니다.",
    },
    compare: {
      title: "이미 여러 AI를 손으로 조합해 쓰고 계셨나요? Nolo가 하나의 팀으로 만듭니다.",
      lead: "여러 브라우저 탭을 오가며 하던 작업을 이제 직접 정의한 Agent들과 하나의 대화 안에서 진행할 수 있습니다.",
      handLabel: "여러 AI 창을 손으로 직접 전환",
      handItems: ["탭 사이에서 맥락을 손으로 복사", "출력 결과를 다른 모델에 붙여넣어 검토", "구독 한도에 도달하면 대화를 처음부터 다시 시작", "채팅 기록 여기저기에 흩어지는 결론"],
      noloItems: ["Agent가 역할, 프롬프트, 모델, 기억을 영구 유지", "독립된 Agent가 객관적으로 검토", "같은 대화 안에서 Agent를 전환해도 이전 기록 유지", "페이지와 문서로 축적되는 결론"],
    },
    faq: {
      title: "자주 묻는 질문",
      items: [
        {
          question: "AI에 skill이나 MCP를 연결하는 것과 무엇이 다른가요?",
          answer: "그것들은 하나의 Agent에 능력을 더해주는 것입니다. Nolo는 팀 전체를 조율합니다: 누가 일하고, 누구의 구독을 쓰며, 어느 컴퓨터에서 실행하고, 끝나면 누가 이어받고 누가 검토할지를 관리합니다.",
        },
        {
          question: "기존에 쓰던 구독을 그대로 사용할 수 있나요?",
          answer: "네. 사용 중인 구독, 보유한 API 키(BYOK), 로컬 모델 모두 사용 가능합니다.",
        },
        {
          question: "Agent는 어디서 실행되나요?",
          answer: "연결된 컴퓨터나 서버에서 실행됩니다. 해당 기기가 켜져 있고 nolo connect가 실행 중이어야 합니다. 기기에서 로그인한 구독을 사용하는 경우 해당 인증이 유효해야 합니다.",
        },
        {
          question: "내 대화와 데이터는 어디에 남나요?",
          answer: "Agent가 본인의 컴퓨터에서 실행될 때 파일과 명령은 해당 기기에 그대로 남습니다. 클라이언트는 오픈소스이므로 어떤 작업을 수행하고 무엇을 전송하는지 직접 투명하게 확인할 수 있습니다.",
        },
      ],
    },
    whyNow: {
      title: "왜 지금인가",
      lead: "매일 AI를 쓰는 많은 사람에게 다음 세 가지는 이미 현실입니다.",
      items: [
        {
          title: "AI 구독은 이미 하나가 아닙니다",
          body: "여러 AI 구독이나 API 키를 함께 쓰며 잘하는 일에 따라 나눠 쓰는 사람이 많습니다. 부족한 것은 이들을 함께 일하게 하는 방법입니다.",
        },
        {
          title: "Agent는 한 덩어리의 일을 끝낼 수 있습니다",
          body: "계획부터 구현, 자체 점검까지 Agent 하나가 스스로 일을 끝낼 수 있게 되었습니다. 다음 단계는 Agent끼리 일을 이어받는 것입니다.",
        },
        {
          title: "기기는 한 대가 아닙니다",
          body: "노트북, 데스크톱, 서버, 휴대폰. 일은 파일과 도구가 있는 바로 그 기기에서 돌아가야 합니다.",
        },
      ],
    },
    closing: {
      label: "마치며",
      lead: "AI는 조사하고, 만들고, 비교하고, 검토하며 병렬로 작업을 진행할 수 있습니다.",
      lines: ["왜 만드는가.", "무엇이 좋은 것인가.", "진정으로 창조하고 싶은 것은 무엇인가."],
      end: "그 답은 언제나 당신에게 있습니다.",
      trust: ["오픈소스 클라이언트", "공개 소스와 일치하는 릴리스", "보유한 구독 또는 BYOK 사용 가능"],
      source: "소스 코드 보기",
    },
  },
};

export default {
  [Language.EN]: { translation: en },
  [Language.ZH_CN]: { translation: zhCN },
  [Language.ZH_HANT]: { translation: zhHant },
  [Language.JA]: { translation: ja },
  [Language.KO]: { translation: ko },
} as Partial<Record<Language, { translation: typeof en }>>;
