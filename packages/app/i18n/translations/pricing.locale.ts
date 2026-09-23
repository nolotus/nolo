import { Language } from "../types";
import {
  ADVANCED_FEATURE_MIN_BALANCE,
  GPT_PRO_REQUIRED_RECHARGE_AMOUNT,
} from "core/gptProTier";

export default {
  [Language.EN]: {
    translation: {
      pricing: {
        title: "Pay-As-You-Go",
        subtitle: `Billed by actual token usage. Points never expire.\nPro unlocks at ${ADVANCED_FEATURE_MIN_BALANCE} points. No subscription lock-in.`,
        headerTrust: ["No subscription", "Pay per use", "Points never expire"],
        free: "Free",
        points: "{{num}} Points",
        tiers: {
          starter: {
            name: "Starter",
            meta: "Free upon Signup",
            bestFor: "Just exploring",
            price: "Free",
            features: [
              "Standard LLM models",
              "Multi-agent collaboration",
              "Single file analysis",
              "Permanent chat history"
            ]
          },
          pro: {
            name: "Pro",
            meta: `Balance at ${ADVANCED_FEATURE_MIN_BALANCE} Points`,
            bestFor: "Daily driver",
            price: `Unlock at ${ADVANCED_FEATURE_MIN_BALANCE} Points`,
            features: [
              "Batch file analysis",
              "Real-time web search",
              "Priority processing queue",
              "Google Scholar Academic Search"
            ]
          },
          advanced: {
            name: "Advanced",
            meta: `Single recharge ≥ ${GPT_PRO_REQUIRED_RECHARGE_AMOUNT} Points`,
            bestFor: "Heavy lifting",
            price: `Unlock with a ${GPT_PRO_REQUIRED_RECHARGE_AMOUNT}-Point recharge`,
            features: [
              "Advanced reasoning models",
              "Claude Opus access",
              "Kimi K3 access",
              "Dedicated VM runtime",
              "Isolated compute resources",
              "Long-running workload execution"
            ]
          }
        },
        cta: {
          titleLoggedIn: "Flexible Recharge",
          titleLoggedOut: "Try Free",
          descLoggedIn: `Points are credited instantly. Pro unlocks at ${ADVANCED_FEATURE_MIN_BALANCE} points; Advanced unlocks with a ${GPT_PRO_REQUIRED_RECHARGE_AMOUNT}-point recharge.`,
          descLoggedOut: "Sign up and start with the free tier before recharging.",
          btnRecharge: "Recharge Points",
          btnFreeStart: "Start Free",
          btnDirectRecharge: "Recharge Directly",
          trustLoggedIn: "Refundable anytime • Billed by usage • Never expires",
          trustLoggedOut: "No credit card • Instant access • No subscription lock-in"
        },
        searchPlaceholder: "Search models by name...",
        recommend: "Recommended",
        unknown: "Unknown",
        comparisonTitle: "Model Price Comparison (Points)",
        noModelsFound: "No matching models found",
        visionYes: "Yes",
        visionNo: "No",
        tableHeader: {
          name: "Model Name",
          input: "Input / 1M Points",
          output: "Output / 1M Points",
          cache: "Cache Hit / 1M Points",
          vision: "Vision"
        },
        cacheNote: "Cache hit: repeated identical input prefixes are billed at a lower cached rate. \"—\" means the model has no cached pricing.",
        faqTitle: "Frequently Asked Questions",
        faqSubtitle: "Have questions? Check here first",
        faq: [
          {
            q: "What are points?",
            a: "Points are Nolo's usage unit. Every model call deducts points based on actual token consumption, so costs stay tied to real usage."
          },
          {
            q: "How do I recharge?",
            a: "Choose any amount on the recharge page. Points are credited immediately and are not tied to any subscription package."
          },
          {
            q: "Do points expire?",
            a: "No. Recharged points stay valid permanently."
          },
          {
            q: "Is it more cost-effective than subscriptions?",
            a: "Usually yes. Nolo uses transparent pay-as-you-go pricing based on actual token usage, with no subscription lock-in."
          },
          {
            q: "Can I get a refund after recharging?",
            a: "Yes, but only for points you purchased yourself; bonus or gifted points are non-refundable. Refunds cover the unused portion of purchased points—consumed and gifted points are not returned."
          },
          {
            q: `Does Pro expire if my balance drops below ${ADVANCED_FEATURE_MIN_BALANCE} points?`,
            a: `Pro is determined by your current balance in real time: it unlocks at ${ADVANCED_FEATURE_MIN_BALANCE} points and falls back to Starter when you drop below, then restores on your next recharge. Nothing you've used is affected.`
          },
          {
            q: "Which models does the Advanced tier unlock?",
            a: `It unlocks higher-tier models such as the GPT Pro series, Claude Opus, and Kimi K3, plus an isolated VM execution environment and support for long-running tasks. A single recharge of ${GPT_PRO_REQUIRED_RECHARGE_AMOUNT} points activates it.`
          },
          {
            q: "How are points deducted?",
            a: "Each call deducts the model's unit price times the actual input/output tokens consumed; cached repeated input is billed at a lower cached rate. See the comparison table below for each model's unit price."
          }
        ]
      }
    }
  },
  [Language.ZH_CN]: {
    translation: {
      pricing: {
        title: "按量付费",
        subtitle: `按实际消耗的 Token 扣费，积分永久有效。\n余额达到 ${ADVANCED_FEATURE_MIN_BALANCE} 自动解锁专业版，无订阅绑定，随时降档。`,
        headerTrust: ["无订阅绑定", "按量计费", "积分永久有效"],
        free: "免费",
        points: "{{num}} 积分",
        tiers: {
          starter: {
            name: "基础版",
            meta: "注册即可使用",
            bestFor: "先试试水",
            price: "免费",
            features: [
              "标准 LLM 模型",
              "多 Agent 协作",
              "单文件分析",
              "对话历史保存"
            ]
          },
          pro: {
            name: "专业版",
            meta: `余额达到 ${ADVANCED_FEATURE_MIN_BALANCE} 积分`,
            bestFor: "日常主力",
            price: `余额满 ${ADVANCED_FEATURE_MIN_BALANCE} 积分解锁`,
            features: [
              "批量文件分析",
              "实时联网搜索",
              "优先处理队列",
              "Google Scholar 学术检索"
            ]
          },
          advanced: {
            name: "高阶版",
            meta: `单笔充值 ≥ ${GPT_PRO_REQUIRED_RECHARGE_AMOUNT} 积分`,
            bestFor: "重载任务",
            price: `充值 ${GPT_PRO_REQUIRED_RECHARGE_AMOUNT} 积分解锁`,
            features: [
              "GPT Pro 系列模型",
              "Claude Opus 模型",
              "Kimi K3 模型",
              "独立虚拟机执行环境",
              "隔离的计算资源",
              "支持长时间超重任务"
            ]
          }
        },
        cta: {
          titleLoggedIn: "灵活充值",
          titleLoggedOut: "免费体验",
          descLoggedIn: `充值积分即时到账。余额达到 ${ADVANCED_FEATURE_MIN_BALANCE} 解锁专业版，单笔充值 ${GPT_PRO_REQUIRED_RECHARGE_AMOUNT} 解锁高阶版。`,
          descLoggedOut: "注册即可体验免费额度，先试再决定是否充值。",
          btnRecharge: "充值积分",
          btnFreeStart: "免费开始",
          btnDirectRecharge: "直接充值",
          trustLoggedIn: "支持退款 • 按量扣费 • 永久有效",
          trustLoggedOut: "无需信用卡 • 注册即用 • 无订阅绑定"
        },
        searchPlaceholder: "按模型名搜索...",
        recommend: "推荐",
        unknown: "未知",
        comparisonTitle: "模型价格对比（积分）",
        noModelsFound: "未找到匹配的模型",
        visionYes: "支持",
        visionNo: "不支持",
        tableHeader: {
          name: "模型名称",
          input: "输入 / 1M 积分",
          output: "输出 / 1M 积分",
          cache: "缓存命中 / 1M 积分",
          vision: "视觉识别"
        },
        cacheNote: "缓存命中：相同前缀的重复输入按更低的缓存价计费；「—」表示该模型暂无缓存价。",
        searchBoxPlaceholder: "按模型名搜索...",
        faqTitle: "常见问题",
        faqSubtitle: "有疑问？先看这里",
        faq: [
          {
            q: "积分是什么？",
            a: "积分是 Nolo 的使用量单位。每次调用 AI 模型时，按实际消耗的 Token 数扣除对应积分。不同模型消耗速率不同，可按需切换，自主掌控支出。"
          },
          {
            q: "怎么充值？",
            a: "在充值页面选择任意金额即可，积分实时到账，不绑定任何套餐。"
          },
          {
            q: "积分会过期吗？",
            a: "不会。充值的积分长期有效，永不过期。"
          },
          {
            q: "比包月订阅更划算吗？",
            a: "通常更划算。Nolo 按实际 Token 消耗透明计费，无订阅绑定，只为实际用量付费。"
          },
          {
            q: "充值后能退款吗？",
            a: "支持，但仅限你自己充值的积分；活动或注册赠送的积分不可退。退款按充值积分的未消耗部分返还，已消耗与赠送部分不退。"
          },
          {
            q: `余额降到 ${ADVANCED_FEATURE_MIN_BALANCE} 积分以下，专业版会失效吗？`,
            a: `专业版按当前余额实时判定：余额达到 ${ADVANCED_FEATURE_MIN_BALANCE} 积分即解锁，低于后自动回落到基础版，再充值即恢复，不影响已用功能。`
          },
          {
            q: "高阶版能用哪些模型？",
            a: `解锁 GPT Pro 系列、Claude Opus、Kimi K3 等高阶模型，并获得独立虚拟机执行环境与长时间任务支持。单笔充值 ${GPT_PRO_REQUIRED_RECHARGE_AMOUNT} 积分即开通。`
          },
          {
            q: "积分按什么扣？",
            a: "按每次调用的实际输入/输出 Token 数，乘以对应模型单价扣除；命中缓存的重复输入按更低的缓存价计。各模型单价见下方对比表。"
          }
        ]
      }
    }
  },
  [Language.ZH_HANT]: {
    translation: {
      pricing: {
        title: "按量付費",
        subtitle: `按實際消耗的 Token 扣費，積分永久有效。\n餘額達到 ${ADVANCED_FEATURE_MIN_BALANCE} 自動解鎖專業版，無訂閱綁定，隨時降檔。`,
        headerTrust: ["無訂閱綁定", "按量計費", "積分永久有效"],
        free: "免費",
        points: "{{num}} 積分",
        tiers: {
          starter: {
            name: "基礎版",
            meta: "註冊即可使用",
            bestFor: "先試試水",
            price: "免費",
            features: [
              "標準 LLM 模型",
              "多 Agent 協作",
              "單檔案分析",
              "對話歷史保存"
            ]
          },
          pro: {
            name: "專業版",
            meta: `餘額達到 ${ADVANCED_FEATURE_MIN_BALANCE} 積分`,
            bestFor: "日常主力",
            price: `餘額滿 ${ADVANCED_FEATURE_MIN_BALANCE} 積分解鎖`,
            features: [
              "批次檔案分析",
              "即時聯網搜尋",
              "優先處理佇列",
              "Google Scholar 學術檢索"
            ]
          },
          advanced: {
            name: "高階版",
            meta: `單筆充值 ≥ ${GPT_PRO_REQUIRED_RECHARGE_AMOUNT} 積分`,
            bestFor: "重載任務",
            price: `充值 ${GPT_PRO_REQUIRED_RECHARGE_AMOUNT} 積分解鎖`,
            features: [
              "GPT Pro 系列模型",
              "Claude Opus 模型",
              "Kimi K3 模型",
              "獨立虛擬機執行環境",
              "隔離的計算資源",
              "支援長時間超重任務"
            ]
          }
        },
        cta: {
          titleLoggedIn: "靈活充值",
          titleLoggedOut: "免費體驗",
          descLoggedIn: `充值積分即時到帳。餘額達到 ${ADVANCED_FEATURE_MIN_BALANCE} 解鎖專業版，單筆充值 ${GPT_PRO_REQUIRED_RECHARGE_AMOUNT} 解鎖高階版。`,
          descLoggedOut: "註冊即可體驗免費額度，先試再決定是否充值。",
          btnRecharge: "充值積分",
          btnFreeStart: "免費開始",
          btnDirectRecharge: "直接充值",
          trustLoggedIn: "支援退款 • 按量扣費 • 永久有效",
          trustLoggedOut: "無需信用卡 • 註冊即用 • 無訂閱綁定"
        },
        searchPlaceholder: "按模型名搜尋...",
        recommend: "推薦",
        unknown: "未知",
        comparisonTitle: "模型價格對比（積分）",
        noModelsFound: "未找到匹配的模型",
        visionYes: "支援",
        visionNo: "不支援",
        tableHeader: {
          name: "模型名稱",
          input: "輸入 / 1M 積分",
          output: "輸出 / 1M 積分",
          cache: "快取命中 / 1M 積分",
          vision: "視覺識別"
        },
        cacheNote: "快取命中：相同前綴的重複輸入按更低的快取價計費；「—」表示該模型暫無快取價。",
        faqTitle: "常見問題",
        faqSubtitle: "有疑問？先看這裡",
        faq: [
          {
            q: "積分是什麼？",
            a: "積分是 Nolo 的使用量單位。每次調用 AI 模型時，按實際消耗的 Token 數扣除對應積分。不同模型消耗速率不同，可按需切換，自主掌控支出。"
          },
          {
            q: "怎麼充值？",
            a: "在充值頁面選擇任意金額即可，積分即時到帳，不綁定任何套餐。"
          },
          {
            q: "積分會過期嗎？",
            a: "不會。充值的積分長期有效，永不過期。"
          },
          {
            q: "比包月訂閱更划算嗎？",
            a: "通常更划算。Nolo 按實際 API 成本透明計費，沒有訂閱溢價，只為實際消耗付費。"
          },
          {
            q: "充值後能退款嗎？",
            a: "支援，但僅限您自行充值的積分；活動或註冊贈送的積分不可退。退款按充值積分的未消耗部分返還，已消耗與贈送部分不退。"
          },
          {
            q: `餘額降到 ${ADVANCED_FEATURE_MIN_BALANCE} 積分以下，專業版會失效嗎？`,
            a: `專業版按當前餘額即時判定：餘額達到 ${ADVANCED_FEATURE_MIN_BALANCE} 積分即解鎖，低於後自動回落到基礎版，再充值即恢復，不影響已用功能。`
          },
          {
            q: "高階版能用哪些模型？",
            a: `解鎖 GPT Pro 系列、Claude Opus、Kimi K3 等高階模型，並獲得獨立虛擬機執行環境與長時間任務支援。單筆充值 ${GPT_PRO_REQUIRED_RECHARGE_AMOUNT} 積分即開通。`
          },
          {
            q: "積分按什麼扣？",
            a: "按每次調用的實際輸入/輸出 Token 數，乘以對應模型單價扣除；命中快取的重複輸入按更低的快取價計。各模型單價見下方對比表。"
          }
        ]
      }
    }
  },
  [Language.JA]: {
    translation: {
      pricing: {
        title: "従量課金制",
        subtitle: `実際のトークン消費量に基づいてポイントを減算。ポイントの有効期限はありません。\n残高が${ADVANCED_FEATURE_MIN_BALANCE}ポイントに達すると自動的にプロ版がアンロックされます。いつでもダウングレード可能で、定期購入の縛りはありません。`,
        headerTrust: ["サブスク不要", "従量課金", "ポイント無期限"],
        free: "無料",
        points: "{{num}} ポイント",
        tiers: {
          starter: {
            name: "スターター",
            meta: "登録ですぐに使用可能",
            bestFor: "まず試す",
            price: "無料",
            features: [
              "標準的なLLMモデル",
              "マルチエージェント協調",
              "単一ファイル分析",
              "チャット履歴の保存"
            ]
          },
          pro: {
            name: "プロ",
            meta: `残高${ADVANCED_FEATURE_MIN_BALANCE}ポイント到達`,
            bestFor: "日常の主力",
            price: `${ADVANCED_FEATURE_MIN_BALANCE}ポイントでアンロック`,
            features: [
              "複数ファイル分析",
              "リアルタイムWeb検索",
              "優先処理キュー",
              "Google Scholar 学術検索"
            ]
          },
          advanced: {
            name: "アドバンスド",
            meta: `1回のチャージが${GPT_PRO_REQUIRED_RECHARGE_AMOUNT}ポイント以上`,
            bestFor: "重いタスク",
            price: `${GPT_PRO_REQUIRED_RECHARGE_AMOUNT}ポイントのチャージでアンロック`,
            features: [
              "GPT Pro 系列モデル",
              "Claude Opus へのアクセス",
              "Kimi K3 へのアクセス",
              "独立した仮想マシン実行環境",
              "隔離された計算リソース",
              "長時間・高負荷タスクの実行"
            ]
          }
        },
        cta: {
          titleLoggedIn: "フレキシブルなチャージ",
          titleLoggedOut: "無料体験",
          descLoggedIn: `チャージ後、ポイントは即座に反映されます。${ADVANCED_FEATURE_MIN_BALANCE}ポイントでプロ版、${GPT_PRO_REQUIRED_RECHARGE_AMOUNT}ポイントのチャージでアドバンスドがアンロックされます。`,
          descLoggedOut: "登録後すぐに無料枠を体験できます。",
          btnRecharge: "ポイントをチャージ",
          btnFreeStart: "無料で開始",
          btnDirectRecharge: "直接チャージ",
          trustLoggedIn: "返金可能 • 従量課金 • 有効期限なし",
          trustLoggedOut: "クレジットカード不要 • 登録だけで開始 • 定期購入の縛りなし"
        },
        searchPlaceholder: "モデル名で検索...",
        recommend: "オススメ",
        unknown: "不明",
        comparisonTitle: "モデル価格比較（ポイント）",
        noModelsFound: "該当するモデルが見つかりません",
        visionYes: "対応",
        visionNo: "非対応",
        tableHeader: {
          name: "モデル名",
          input: "入力 / 1M ポイント",
          output: "出力 / 1M ポイント",
          cache: "キャッシュヒット / 1M ポイント",
          vision: "ビジョン認識"
        },
        cacheNote: "キャッシュヒット：同じ接頭辞の繰り返し入力は、より低いキャッシュ価格で課金されます。「—」はキャッシュ価格が設定されていないモデルです。",
        faqTitle: "よくある質問",
        faqSubtitle: "ご質問がありますか？ まずはこちらをご確認ください",
        faq: [
          {
            q: "ポイントとは何ですか？",
            a: "ポイントは Nolo の使用量単位です。AI モデルを呼び出すたびに、実際に消費されたトークン数に基づいて差し引かれます。"
          },
          {
            q: "チャージ方法は？",
            a: "チャージページで任意の金額を選択するだけで、ポイントが即座に反映されます。特定のパッケージには縛られません。"
          },
          {
            q: "ポイントに有効期限はありますか？",
            a: "いいえ。チャージされたポイントは長期的に有効で、期限はありません。"
          },
          {
            q: "月額サブスクリプションよりお得ですか？",
            a: "通常はお得です。Nolo は実際の API コストに基づいて透明性の高い課金を行い、実際の消費分だけを支払います。"
          },
          {
            q: "チャージ後に返金できますか？",
            a: "はい。ただしご自身でチャージしたポイントのみ対象で、キャンペーンや登録時に付与されたポイントは返金できません。返金はチャージ分の未使用部分のみで、消費済み・付与分は含まれません。"
          },
          {
            q: `残高が${ADVANCED_FEATURE_MIN_BALANCE}ポイントを下回ると Pro は失効しますか？`,
            a: `Pro は現在の残高に応じてリアルタイムで判定されます。${ADVANCED_FEATURE_MIN_BALANCE}ポイントでアンロックされ、下回ると Starter に戻り、次回チャージで復帰します。利用済みの機能には影響しません。`
          },
          {
            q: "アドバンスドティアではどのモデルが使えますか？",
            a: `GPT Pro シリーズ、Claude Opus、Kimi K3 などの上位モデルに加え、分離された VM 実行環境と長時間タスクのサポートが利用できます。${GPT_PRO_REQUIRED_RECHARGE_AMOUNT}ポイントの一回チャージで有効になります。`
          },
          {
            q: "ポイントはどのように差し引かれますか？",
            a: "各呼び出しで、モデルの単価に実際の入出力トークン数を掛けて差し引きます。キャッシュにヒットした重複入力は低いキャッシュ料金が適用されます。各モデルの単価は下の比較表をご覧ください。"
          }
        ]
      }
    }
  }
};
