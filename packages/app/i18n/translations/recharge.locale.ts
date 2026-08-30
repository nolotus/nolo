import { Language } from "../types";
import {
  ADVANCED_FEATURE_MIN_BALANCE,
  GPT_PRO_REQUIRED_RECHARGE_AMOUNT,
} from "core/gptProTier";

export default {
  [Language.EN]: {
    translation: {
      recharge: {
        title: "Recharge",
        viewPricing: "View pricing",
        channel: { online: "Online payment", transfer: "QR transfer" },
        loading: "Loading available payment methods...",
        noOnlineChannel:
          "No online payment method is available right now. Please pay by WeChat / Alipay QR transfer.",
        amountLabel: "Amount",
        credits: "{{count}} Points",
        custom: "Custom",
        recommended: "Popular",
        customPlaceholder:
          "Enter a whole number between {{min}} and {{max}} points",
        rateHint:
          "{{min}}-{{max}} points per order (whole numbers). The larger the top-up, the lower the price per point.",
        neverExpire: "Points never expire.",
        unlockPro: "{{n}} more points unlocks Pro — real-time web search and batch file analysis.",
        bestValue: "Best value",
        customAmountHint: "This order costs about {{price}}.",
        waffoTrust:
          "Payments are processed by Waffo Pancake under PCI-DSS. Points are credited automatically once the payment is confirmed.",
        methodLabel: "Payment method",
        methods: {
          waffo: { name: "Global payment", desc: "Visa / MasterCard / Apple Pay" },
          wechat: { name: "WeChat Pay", desc: "QR transfer" },
          alipay: { name: "Alipay", desc: "QR transfer" },
          cryptoDesc: "{{network}} network",
        },
        submit: {
          pay: "Pay now",
          paying: "Creating order...",
          getAddress: "Get my {{token}} deposit address",
          gettingAddress: "Loading...",
        },
        account: "Points go to your current account ({{username}})",
        accountWithBalance:
          "Points go to your current account ({{username}}) · balance {{balance}} points",
        notLoggedIn: "not signed in",
        cryptoHint:
          "Official {{token}} on {{network}} only. Points are converted from the amount actually received: 1 {{token}} = {{rate}} points, minimum {{min}} points for automatic crediting{{confirmations}}. The address is bound to your account and can be reused.",
        cryptoConfirmations: ", credited after {{count}} on-chain confirmations",
        addressLabel: "{{network}} {{token}} deposit address",
        copyAddress: "Copy address",
        transferRate:
          "CNY 1 = 1 point. Transfer any amount — the same number of points will be credited.",
        noticePrefix: "Please put your username in the transfer note:",
        noticeWarning:
          "This channel is credited manually. The note is the only proof of who paid — without it we cannot match your transfer.",
        qrTip: "Open {{name}} and scan the code to pay",
        qrLoading: "Loading securely...",
        qrAlt: "{{name}} payment QR code",
        returnMessage: {
          success:
            "Payment submitted. Points are credited automatically once the callback is confirmed.",
          failed: "Payment was not completed. Please try again.",
          cancel: "This payment was cancelled.",
        },
        errors: {
          invalidAmount:
            "Enter a whole number between {{min}} and {{max}} points",
          loginRequired: "Please sign in before recharging",
          serverUnavailable: "The server is unavailable. Please try again later.",
          createOrder: "Failed to create the payment order",
          createAddress: "Failed to get the {{token}} address",
        },
        notesTitle: "Notes",
        notes: [
          `Points are billed by actual token usage and never expire. A balance of ${ADVANCED_FEATURE_MIN_BALANCE} points unlocks Pro (real-time web search, batch file analysis, and more).`,
          `A single recharge of ${GPT_PRO_REQUIRED_RECHARGE_AMOUNT} points or more unlocks Advanced (GPT Pro, Claude Opus, Kimi K3, and similar models). Every payment channel counts.`,
          "Online payments are credited automatically after the provider confirms the callback. WeChat / Alipay transfers are credited manually, usually within 1-30 minutes, and may be delayed on holidays.",
          "Self-purchased points that are 100% unused can be fully refunded within 7 days. For refunds and other questions, contact {{email}}.",
        ],
      },
    },
  },
  [Language.ZH_CN]: {
    translation: {
      recharge: {
        title: "充值",
        viewPricing: "查看价格",
        channel: { online: "在线支付", transfer: "扫码转账" },
        loading: "正在加载可用的支付方式...",
        noOnlineChannel:
          "当前没有可用的在线支付方式，请使用微信 / 支付宝扫码转账。",
        amountLabel: "充值额度",
        credits: "{{count}} 积分",
        custom: "自定义",
        recommended: "推荐",
        customPlaceholder: "请输入 {{min}}-{{max}} 之间的整数积分",
        rateHint:
          "单笔 {{min}}-{{max}} 积分（整数）。充得越多，每积分单价越低。",
        neverExpire: "积分永久有效，不设有效期。",
        unlockPro: "再充 {{n}} 积分即可解锁专业版：实时联网搜索、批量文件分析。",
        bestValue: "最划算",
        customAmountHint: "本次约需 {{price}}。",
        waffoTrust:
          "支付由 Waffo Pancake 处理并符合 PCI-DSS 国际安全标准，回调确认后积分自动到账。",
        methodLabel: "支付方式",
        methods: {
          waffo: { name: "全球支付", desc: "Visa / MasterCard / Apple Pay" },
          wechat: { name: "微信支付", desc: "扫码转账" },
          alipay: { name: "支付宝", desc: "扫码转账" },
          cryptoDesc: "{{network}} 网络",
        },
        submit: {
          pay: "去支付",
          paying: "创建订单中...",
          getAddress: "获取我的 {{token}} 充值地址",
          gettingAddress: "获取中...",
        },
        account: "积分将充入当前帐户（{{username}}）",
        accountWithBalance:
          "积分将充入当前帐户（{{username}}），当前余额 {{balance}} 积分",
        notLoggedIn: "未登录",
        cryptoHint:
          "只支持 {{network}} 网络官方 {{token}}，按实际到账金额折算：1 {{token}} = {{rate}} 积分，最低自动入账 {{min}} 积分{{confirmations}}。地址与你的账户绑定，可重复使用。",
        cryptoConfirmations: "，链上 {{count}} 个确认后入账",
        addressLabel: "{{network}} {{token}} 收款地址",
        copyAddress: "复制地址",
        transferRate: "人民币 1 元 = 1 积分，转多少到账多少积分。",
        noticePrefix: "转账备注请务必填写用户名：",
        noticeWarning:
          "该渠道为人工核对充值，备注是唯一的收款人凭据；未填写将无法确认充值归属",
        qrTip: "打开{{name}}「扫一扫」完成支付",
        qrLoading: "安全加载中...",
        qrAlt: "{{name}}充值二维码",
        returnMessage: {
          success: "支付已提交，到账通常会在回调确认后自动完成。",
          failed: "支付未完成，请重新发起支付。",
          cancel: "已取消本次支付。",
        },
        errors: {
          invalidAmount: "请输入 {{min}}-{{max}} 之间的整数积分",
          loginRequired: "请先登录后再充值",
          serverUnavailable: "当前服务器不可用，请稍后重试",
          createOrder: "创建支付订单失败",
          createAddress: "创建 {{token}} 地址失败",
        },
        notesTitle: "提示",
        notes: [
          `积分按实际消耗的 Token 扣费，永久有效。余额达到 ${ADVANCED_FEATURE_MIN_BALANCE} 积分自动解锁专业版（实时联网搜索、批量文件分析等）。`,
          `单笔充值 ≥ ${GPT_PRO_REQUIRED_RECHARGE_AMOUNT} 积分解锁高阶版（GPT Pro、Claude Opus、Kimi K3 等模型），任意充值渠道均计入。`,
          "在线支付由支付平台回调确认后自动到账；微信 / 支付宝为人工核对充值，通常 1-30 分钟，节假日可能延迟。",
          "自费充值的积分在 7 天内完全未使用可申请全额退款，退款及其他问题请联系 {{email}}。",
        ],
      },
    },
  },
  [Language.ZH_HANT]: {
    translation: {
      recharge: {
        title: "儲值",
        viewPricing: "查看價格",
        channel: { online: "線上支付", transfer: "掃碼轉帳" },
        loading: "正在載入可用的支付方式...",
        noOnlineChannel:
          "目前沒有可用的線上支付方式，請使用微信 / 支付寶掃碼轉帳。",
        amountLabel: "儲值額度",
        credits: "{{count}} 積分",
        custom: "自訂",
        recommended: "推薦",
        customPlaceholder: "請輸入 {{min}}-{{max}} 之間的整數積分",
        rateHint:
          "單筆 {{min}}-{{max}} 積分（整數）。儲值越多，每積分單價越低。",
        neverExpire: "積分永久有效，不設有效期限。",
        unlockPro: "再儲值 {{n}} 積分即可解鎖專業版：即時聯網搜尋、批次檔案分析。",
        bestValue: "最划算",
        customAmountHint: "本次約需 {{price}}。",
        waffoTrust:
          "支付由 Waffo Pancake 處理並符合 PCI-DSS 國際安全標準，回呼確認後積分自動入帳。",
        methodLabel: "支付方式",
        methods: {
          waffo: { name: "全球支付", desc: "Visa / MasterCard / Apple Pay" },
          wechat: { name: "微信支付", desc: "掃碼轉帳" },
          alipay: { name: "支付寶", desc: "掃碼轉帳" },
          cryptoDesc: "{{network}} 網路",
        },
        submit: {
          pay: "前往支付",
          paying: "建立訂單中...",
          getAddress: "取得我的 {{token}} 儲值地址",
          gettingAddress: "取得中...",
        },
        account: "積分將存入目前帳戶（{{username}}）",
        accountWithBalance:
          "積分將存入目前帳戶（{{username}}），目前餘額 {{balance}} 積分",
        notLoggedIn: "未登入",
        cryptoHint:
          "僅支援 {{network}} 網路官方 {{token}}，依實際到帳金額折算：1 {{token}} = {{rate}} 積分，最低自動入帳 {{min}} 積分{{confirmations}}。地址與你的帳戶綁定，可重複使用。",
        cryptoConfirmations: "，鏈上 {{count}} 個確認後入帳",
        addressLabel: "{{network}} {{token}} 收款地址",
        copyAddress: "複製地址",
        transferRate: "人民幣 1 元 = 1 積分，轉多少入帳多少積分。",
        noticePrefix: "轉帳備註請務必填寫使用者名稱：",
        noticeWarning:
          "此管道為人工核對儲值，備註是唯一的付款人憑據；未填寫將無法確認儲值歸屬",
        qrTip: "開啟{{name}}「掃一掃」完成支付",
        qrLoading: "安全載入中...",
        qrAlt: "{{name}}儲值 QR Code",
        returnMessage: {
          success: "支付已送出，入帳通常會在回呼確認後自動完成。",
          failed: "支付未完成，請重新發起支付。",
          cancel: "已取消本次支付。",
        },
        errors: {
          invalidAmount: "請輸入 {{min}}-{{max}} 之間的整數積分",
          loginRequired: "請先登入後再儲值",
          serverUnavailable: "目前伺服器無法使用，請稍後重試",
          createOrder: "建立支付訂單失敗",
          createAddress: "建立 {{token}} 地址失敗",
        },
        notesTitle: "提示",
        notes: [
          `積分依實際消耗的 Token 扣費，永久有效。餘額達到 ${ADVANCED_FEATURE_MIN_BALANCE} 積分自動解鎖專業版（即時聯網搜尋、批次檔案分析等）。`,
          `單筆儲值 ≥ ${GPT_PRO_REQUIRED_RECHARGE_AMOUNT} 積分解鎖高階版（GPT Pro、Claude Opus、Kimi K3 等模型），任何儲值管道均計入。`,
          "線上支付由支付平台回呼確認後自動入帳；微信 / 支付寶為人工核對儲值，通常 1-30 分鐘，假日可能延遲。",
          "自費儲值的積分在 7 天內完全未使用可申請全額退款，退款及其他問題請聯絡 {{email}}。",
        ],
      },
    },
  },
  [Language.JA]: {
    translation: {
      recharge: {
        title: "チャージ",
        viewPricing: "料金を見る",
        channel: { online: "オンライン決済", transfer: "QR送金" },
        loading: "利用可能な決済方法を読み込んでいます...",
        noOnlineChannel:
          "現在利用できるオンライン決済がありません。WeChat / Alipay のQR送金をご利用ください。",
        amountLabel: "チャージ額",
        credits: "{{count}} ポイント",
        custom: "カスタム",
        recommended: "おすすめ",
        customPlaceholder: "{{min}}〜{{max}} の整数ポイントを入力してください",
        rateHint:
          "1回あたり {{min}}〜{{max}} ポイント（整数）。金額が大きいほど1ポイント単価が下がります。",
        neverExpire: "ポイントに有効期限はありません。",
        unlockPro: "あと {{n}} ポイントでプロ版（リアルタイム検索・一括ファイル分析）が解放されます。",
        bestValue: "最もお得",
        customAmountHint: "今回のお支払いは約 {{price}} です。",
        waffoTrust:
          "決済は Waffo Pancake が PCI-DSS 準拠で処理します。確認後、ポイントは自動的に反映されます。",
        methodLabel: "決済方法",
        methods: {
          waffo: { name: "グローバル決済", desc: "Visa / MasterCard / Apple Pay" },
          wechat: { name: "WeChat Pay", desc: "QR送金" },
          alipay: { name: "Alipay", desc: "QR送金" },
          cryptoDesc: "{{network}} ネットワーク",
        },
        submit: {
          pay: "支払いへ進む",
          paying: "注文を作成中...",
          getAddress: "{{token}} の入金アドレスを取得",
          gettingAddress: "取得中...",
        },
        account: "ポイントは現在のアカウント（{{username}}）に反映されます",
        accountWithBalance:
          "ポイントは現在のアカウント（{{username}}）に反映されます・残高 {{balance}} ポイント",
        notLoggedIn: "未ログイン",
        cryptoHint:
          "{{network}} ネットワークの公式 {{token}} のみ対応。実際の着金額から換算されます：1 {{token}} = {{rate}} ポイント、自動反映は最低 {{min}} ポイントから{{confirmations}}。アドレスはアカウントに紐づき、繰り返し利用できます。",
        cryptoConfirmations: "、チェーン上で {{count}} 承認後に反映",
        addressLabel: "{{network}} {{token}} 入金アドレス",
        copyAddress: "アドレスをコピー",
        transferRate:
          "人民元 1 元 = 1 ポイント。送金した金額と同じポイントが反映されます。",
        noticePrefix: "送金メモに必ずユーザー名を記入してください：",
        noticeWarning:
          "この方法は手動でのチャージです。メモが唯一の送金者の証明であり、記入がないと照合できません",
        qrTip: "{{name}}を開き、QRコードをスキャンして支払う",
        qrLoading: "安全に読み込み中...",
        qrAlt: "{{name}}のチャージ用QRコード",
        returnMessage: {
          success:
            "支払いを送信しました。コールバック確認後、自動的に反映されます。",
          failed: "支払いが完了しませんでした。もう一度お試しください。",
          cancel: "今回の支払いはキャンセルされました。",
        },
        errors: {
          invalidAmount: "{{min}}〜{{max}} の整数ポイントを入力してください",
          loginRequired: "チャージの前にログインしてください",
          serverUnavailable:
            "サーバーが利用できません。しばらくしてからお試しください",
          createOrder: "決済注文の作成に失敗しました",
          createAddress: "{{token}} アドレスの取得に失敗しました",
        },
        notesTitle: "ご案内",
        notes: [
          `ポイントは実際に消費したトークンに応じて課金され、有効期限はありません。残高が ${ADVANCED_FEATURE_MIN_BALANCE} ポイントに達するとプロ版（リアルタイム検索、一括ファイル分析など）が解放されます。`,
          `1回のチャージが ${GPT_PRO_REQUIRED_RECHARGE_AMOUNT} ポイント以上で上級版（GPT Pro、Claude Opus、Kimi K3 など）が解放されます。すべての決済方法が対象です。`,
          "オンライン決済は決済事業者の確認後に自動反映されます。WeChat / Alipay は手動対応で、通常 1〜30 分、休日は遅れる場合があります。",
          "自費で購入したポイントは、7日以内かつ未使用であれば全額返金を申請できます。返金やその他のお問い合わせは {{email}} まで。",
        ],
      },
    },
  },
};
