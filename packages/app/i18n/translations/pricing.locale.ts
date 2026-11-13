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
            priceValue: "Free",
            priceDetail: "No recharge needed",
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
            priceValue: `${ADVANCED_FEATURE_MIN_BALANCE}`,
            priceDetail: "Points balance to unlock",
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
            priceValue: `${GPT_PRO_REQUIRED_RECHARGE_AMOUNT}`,
            priceDetail: "Point recharge to unlock",
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
            q: "Can I get a refund after recharging?",
            a: "Yes, but only for points you purchased yourself; bonus or gifted points are non-refundable. Refunds cover the unused portion of purchased points—consumed and gifted points are not returned. Digital goods: consumed credits are not refundable, and any refund is net of the channel fee already incurred plus a $1.00 refund processing fee."
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
            priceValue: "免费",
            priceDetail: "无需充值",
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
            priceValue: `${ADVANCED_FEATURE_MIN_BALANCE}`,
            priceDetail: "积分余额解锁",
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
            priceValue: `${GPT_PRO_REQUIRED_RECHARGE_AMOUNT}`,
            priceDetail: "积分充值解锁",
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
            q: "充值后能退款吗？",
            a: "支持，但仅限你自己充值的积分；活动或注册赠送的积分不可退。退款按充值积分的未消耗部分返还，已消耗与赠送部分不退。数字商品：交付后已消耗部分不支持退款；可退款部分需扣除已发生的通道手续费与 $1.00 退款处理费。"
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
            priceValue: "免費",
            priceDetail: "無需儲值",
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
            priceValue: `${ADVANCED_FEATURE_MIN_BALANCE}`,
            priceDetail: "積分餘額解鎖",
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
            priceValue: `${GPT_PRO_REQUIRED_RECHARGE_AMOUNT}`,
            priceDetail: "積分儲值解鎖",
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
            q: "充值後能退款嗎？",
            a: "支援，但僅限您自行充值的積分；活動或註冊贈送的積分不可退。退款按充值積分的未消耗部分返還，已消耗與贈送部分不退。數位商品：交付後已消耗部分不支援退款；可退款部分需扣除已發生的通道手續費與 $1.00 退款處理費。"
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
            priceValue: "無料",
            priceDetail: "チャージ不要",
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
            priceValue: `${ADVANCED_FEATURE_MIN_BALANCE}`,
            priceDetail: "ポイント残高でアンロック",
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
            priceValue: `${GPT_PRO_REQUIRED_RECHARGE_AMOUNT}`,
            priceDetail: "ポイントチャージでアンロック",
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
            q: "チャージ後に返金できますか？",
            a: "はい。ただしご自身でチャージしたポイントのみ対象で、キャンペーンや登録時に付与されたポイントは返金できません。返金はチャージ分の未使用部分のみで、消費済み・付与分は含まれません。デジタル商品：納品後に消費された分は返金できません。返金対象分は、既に発生した決済手数料と $1.00 の返金処理手数料を差し引いた額となります。"
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
  },
  de: {
    translation: {
      pricing: {
        title: "Nutzungsbasierte Abrechnung",
        subtitle: `Abrechnung nach tatsächlichem Token-Verbrauch. Punkte verfallen nie.\nPro wird ab ${ADVANCED_FEATURE_MIN_BALANCE} Punkten freigeschaltet. Keine Abo-Bindung.`,
        headerTrust: ["Kein Abonnement", "Zahlung nach Verbrauch", "Punkte verfallen nie"],
        free: "Kostenlos",
        points: "{{num}} Punkte",
        tiers: {
          starter: {
            name: "Starter",
            meta: "Kostenlos bei Registrierung",
            bestFor: "Zum Ausprobieren",
            price: "Kostenlos",
            priceValue: "Kostenlos",
            priceDetail: "Keine Aufladung erforderlich",
            features: [
              "Standard-LLM-Modelle",
              "Zusammenarbeit mehrerer Agenten",
              "Einzelfeilanalyse",
              "Dauerhafter Chat-Verlauf"
            ]
          },
          pro: {
            name: "Pro",
            meta: `Guthaben ab ${ADVANCED_FEATURE_MIN_BALANCE} Punkten`,
            bestFor: "Täglicher Standard",
            price: `Freischaltung ab ${ADVANCED_FEATURE_MIN_BALANCE} Punkten`,
            priceValue: `${ADVANCED_FEATURE_MIN_BALANCE}`,
            priceDetail: "Guthaben zur Freischaltung",
            features: [
              "Batch-Dateianalyse",
              "Echtzeit-Websuche",
              "Priorisierte Verarbeitungswarteschlange",
              "Google Scholar Akademische Suche"
            ]
          },
          advanced: {
            name: "Advanced",
            meta: `Einmalige Aufladung ≥ ${GPT_PRO_REQUIRED_RECHARGE_AMOUNT} Punkte`,
            bestFor: "Sehr anspruchsvolle Aufgaben",
            price: `Freischaltung ab einer Aufladung von ${GPT_PRO_REQUIRED_RECHARGE_AMOUNT} Punkten`,
            priceValue: `${GPT_PRO_REQUIRED_RECHARGE_AMOUNT}`,
            priceDetail: "Punkteaufladung zur Freischaltung",
            features: [
              "Fortgeschrittene Reasoning-Modelle",
              "Zugriff auf Claude Opus",
              "Zugriff auf Kimi K3",
              "Dedizierte VM-Laufzeitumgebung",
              "Isolierte Rechenressourcen",
              "Ausführung langlebiger Workloads"
            ]
          }
        },
        cta: {
          titleLoggedIn: "Flexible Aufladung",
          titleLoggedOut: "Kostenlos testen",
          descLoggedIn: `Punkte werden sofort gutgeschrieben. Pro wird ab ${ADVANCED_FEATURE_MIN_BALANCE} Punkten freigeschaltet; Advanced ab einer Aufladung von ${GPT_PRO_REQUIRED_RECHARGE_AMOUNT} Punkten.`,
          descLoggedOut: "Registrieren Sie sich und starten Sie mit dem kostenlosen Kontingent vor einer Aufladung.",
          btnRecharge: "Punkte aufladen",
          btnFreeStart: "Kostenlos starten",
          btnDirectRecharge: "Direkt aufladen",
          trustLoggedIn: "Jederzeit erstattungsfähig • Abrechnung nach Verbrauch • Verfällt nie",
          trustLoggedOut: "Keine Kreditkarte erforderlich • Sofortiger Zugriff • Keine Abo-Bindung"
        },
        searchPlaceholder: "Modelle nach Namen suchen...",
        recommend: "Empfohlen",
        unknown: "Unbekannt",
        comparisonTitle: "Modellpreisvergleich (Punkte)",
        noModelsFound: "Keine passenden Modelle gefunden",
        visionYes: "Unterstützt",
        visionNo: "Nicht unterstützt",
        tableHeader: {
          name: "Modellname",
          input: "Eingabe / 1M Punkte",
          output: "Ausgabe / 1M Punkte",
          cache: "Cache-Treffer / 1M Punkte",
          vision: "Visuelle Erkennung"
        },
        cacheNote: "Cache-Treffer: Wiederholte identische Eingabepräfixe werden zu einem günstigeren Cache-Preis abgerechnet. „—“ bedeutet, dass das Modell keine Cache-Preise hat.",
        faqTitle: "Häufig gestellte Fragen",
        faqSubtitle: "Haben Sie Fragen? Schauen Sie zuerst hier nach",
        faq: [
          {
            q: "Was sind Punkte?",
            a: "Punkte sind die Nutzungseinheit von Nolo. Jeder Modellaufruf zieht Punkte basierend auf dem tatsächlichen Token-Verbrauch ab, sodass die Kosten an die reale Nutzung gebunden bleiben."
          },
          {
            q: "Wie lade ich auf?",
            a: "Wählen Sie einen beliebigen Betrag auf der Aufladeseite. Punkte werden sofort gutgeschrieben und sind an kein Abonnementpaket gebunden."
          },
          {
            q: "Verfallen Punkte?",
            a: "Nein. Aufgeladene Punkte bleiben dauerhaft gültig."
          },
          {
            q: "Kann ich nach dem Aufladen eine Erstattung erhalten?",
            a: "Ja, jedoch nur für selbst gekaufte Punkte; Bonus- oder Aktionspunkte sind nicht erstattungsfähig. Erstattungen decken den ungenutzten Teil der gekauften Punkte ab – verbrauchte und geschenkte Punkte werden nicht erstattet. Digitale Güter: Verbrauchte Punkte können nicht erstattet werden. Jede Erstattung versteht sich abzüglich der bereits angefallenen Kanalgebühr zuzüglich einer Erstattungsgebühr von $1.00."
          },
          {
            q: `Erlischt Pro, wenn mein Guthaben unter ${ADVANCED_FEATURE_MIN_BALANCE} Punkte fällt?`,
            a: `Pro richtet sich in Echtzeit nach Ihrem aktuellen Guthaben: Es wird ab ${ADVANCED_FEATURE_MIN_BALANCE} Punkten freigeschaltet und fällt auf Starter zurück, wenn das Guthaben darunter sinkt, und wird bei der nächsten Aufladung wiederhergestellt. Bereits genutzte Funktionen sind davon nicht betroffen.`
          },
          {
            q: "Welche Modelle schaltet die Stufe Advanced frei?",
            a: `Sie schaltet höherwertige Modelle wie die GPT Pro-Serie, Claude Opus und Kimi K3 frei, sowie eine isolierte VM-Laufzeitumgebung und Unterstützung für langlebige Aufgaben. Eine einmalige Aufladung von ${GPT_PRO_REQUIRED_RECHARGE_AMOUNT} Punkten aktiviert sie.`
          },
          {
            q: "Wie werden Punkte abgezogen?",
            a: "Bei jedem Aufruf wird der Einzelpreis des Modells mit den tatsächlich verbrauchten Eingabe-/Ausgabe-Tokens multipliziert; zwischengespeicherte wiederholte Eingaben werden zum günstigeren Cache-Tarif berechnet. Die Einzelpreise jedes Modells finden Sie in der Vergleichstabelle unten."
          }
        ]
      }
    }
  },
  es: {
    translation: {
      pricing: {
        title: "Pago por uso",
        subtitle: `Facturado según el uso real de tokens. Los puntos nunca caducan.\nPro se desbloquea con ${ADVANCED_FEATURE_MIN_BALANCE} puntos. Sin permanencia ni suscripción.`,
        headerTrust: ["Sin suscripción", "Pago por uso", "Los puntos nunca caducan"],
        free: "Gratis",
        points: "{{num}} puntos",
        tiers: {
          starter: {
            name: "Starter",
            meta: "Gratis al registrarse",
            bestFor: "Para explorar",
            price: "Gratis",
            priceValue: "Gratis",
            priceDetail: "No requiere recarga",
            features: [
              "Modelos LLM estándar",
              "Colaboración multi-agent",
              "Análisis de archivos individuales",
              "Historial de chat permanente"
            ]
          },
          pro: {
            name: "Pro",
            meta: `Saldo a partir de ${ADVANCED_FEATURE_MIN_BALANCE} puntos`,
            bestFor: "Uso diario principal",
            price: `Desbloquea con ${ADVANCED_FEATURE_MIN_BALANCE} puntos`,
            priceValue: `${ADVANCED_FEATURE_MIN_BALANCE}`,
            priceDetail: "Saldo de puntos para desbloquear",
            features: [
              "Análisis de archivos por lotes",
              "Búsqueda web en tiempo real",
              "Cola de procesamiento prioritario",
              "Búsqueda académica en Google Scholar"
            ]
          },
          advanced: {
            name: "Advanced",
            meta: `Recarga única ≥ ${GPT_PRO_REQUIRED_RECHARGE_AMOUNT} puntos`,
            bestFor: "Tareas pesadas",
            price: `Desbloquea con una recarga de ${GPT_PRO_REQUIRED_RECHARGE_AMOUNT} puntos`,
            priceValue: `${GPT_PRO_REQUIRED_RECHARGE_AMOUNT}`,
            priceDetail: "Recarga de puntos para desbloquear",
            features: [
              "Modelos avanzados de razonamiento",
              "Acceso a Claude Opus",
              "Acceso a Kimi K3",
              "Entorno de ejecución en máquina virtual dedicada",
              "Recursos de computación aislados",
              "Ejecución de cargas de trabajo de larga duración"
            ]
          }
        },
        cta: {
          titleLoggedIn: "Recarga flexible",
          titleLoggedOut: "Prueba gratis",
          descLoggedIn: `Los puntos se abonan al instante. Pro se desbloquea con ${ADVANCED_FEATURE_MIN_BALANCE} puntos; Advanced se desbloquea con una recarga de ${GPT_PRO_REQUIRED_RECHARGE_AMOUNT} puntos.`,
          descLoggedOut: "Regístrate y comienza con el nivel gratuito antes de recargar.",
          btnRecharge: "Recargar puntos",
          btnFreeStart: "Empezar gratis",
          btnDirectRecharge: "Recargar directamente",
          trustLoggedIn: "Reembolsable en cualquier momento • Facturado por uso • No caduca",
          trustLoggedOut: "Sin tarjeta de crédito • Acceso instantáneo • Sin suscripción obligatoria"
        },
        searchPlaceholder: "Buscar modelos por nombre...",
        recommend: "Recomendado",
        unknown: "Desconocido",
        comparisonTitle: "Comparación de precios de modelos (puntos)",
        noModelsFound: "No se encontraron modelos coincidentes",
        visionYes: "Compatible",
        visionNo: "No compatible",
        tableHeader: {
          name: "Nombre del modelo",
          input: "Entrada / 1M puntos",
          output: "Salida / 1M puntos",
          cache: "Acierto de caché / 1M puntos",
          vision: "Visión"
        },
        cacheNote: "Acierto de caché: los prefijos de entrada idénticos y repetidos se facturan a una tarifa de caché más económica. «—» indica que el modelo no dispone de tarifa de caché.",
        faqTitle: "Preguntas frecuentes",
        faqSubtitle: "¿Tienes dudas? Consulta aquí primero",
        faq: [
          {
            q: "¿Qué son los puntos?",
            a: "Los puntos son la unidad de uso de Nolo. Cada llamada al modelo deduce puntos según el consumo real de tokens, manteniendo los costes vinculados al uso real."
          },
          {
            q: "¿Cómo recargo?",
            a: "Elige cualquier importe en la página de recarga. Los puntos se acreditan inmediatamente y no están vinculados a ningún paquete de suscripción."
          },
          {
            q: "¿Caducan los puntos?",
            a: "No. Los puntos recargados siguen siendo válidos permanentemente."
          },
          {
            q: "¿Puedo obtener un reembolso tras recargar?",
            a: "Sí, pero solo por los puntos que hayas comprado tú mismo; los puntos de regalo o promocionales no son reembolsables. Los reembolsos cubren la parte no utilizada de los puntos comprados; los puntos consumidos o regalados no se reembolsan. Bienes digitales: los créditos consumidos no son reembolsables, y cualquier reembolso es neto de la comisión del canal ya incurrida más una tarifa de procesamiento de reembolso de $1.00."
          },
          {
            q: `¿Caduca Pro si mi saldo baja de ${ADVANCED_FEATURE_MIN_BALANCE} puntos?`,
            a: `Pro se determina en tiempo real según tu saldo actual: se desbloquea con ${ADVANCED_FEATURE_MIN_BALANCE} puntos y vuelve a Starter si el saldo baja de esa cifra, restaurándose con tu próxima recarga. Nada de lo que ya hayas utilizado se verá afectado.`
          },
          {
            q: "¿Qué modelos desbloquea el nivel Advanced?",
            a: `Desbloquea modelos de gama alta como la serie GPT Pro, Claude Opus y Kimi K3, además de un entorno de ejecución en máquina virtual aislada y soporte para tareas de larga duración. Se activa con una recarga única de ${GPT_PRO_REQUIRED_RECHARGE_AMOUNT} puntos.`
          },
          {
            q: "¿Cómo se deducen los puntos?",
            a: "Cada llamada deduce el precio unitario del modelo multiplicado por los tokens reales de entrada/salida consumidos; las entradas repetidas en caché se facturan a una tarifa de caché reducida. Consulta la tabla de comparación inferior para ver el precio unitario de cada modelo."
          }
        ]
      }
    }
  }
};
