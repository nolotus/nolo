import { Language } from "../types";
import {
  ADVANCED_FEATURE_MIN_BALANCE,
  GPT_PRO_REQUIRED_RECHARGE_AMOUNT,
} from "core/gptProTier";

export default {
  [Language.EN]: {
    translation: {
      recharge_page: {
        title: "Recharge",
        viewPricing: "View pricing",
        channel: { online: "Online payment", transfer: "Manual payment" },
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
          "{{min}}-{{max}} whole-number credits per order. Each credit has CNY 1 principal; card processing fees are shown separately. Tax and bank FX may be added at checkout.",
        neverExpire: "Points never expire.",
        unlockPro: "{{n}} more points unlocks Pro — real-time web search and batch file analysis.",
        bestValue: "Best value",
        receipt: {
          principal: "Principal",
          fee: "Processing fee",
          total: "Total",
          cnyTotal: "Total ¥{{totalCny}} (includes 3.9% fee ¥{{feeCny}})",
          usdTotal: "Principal ${{principalUsd}} + fee ≈${{feeUsd}} = ${{totalUsd}}",
          fixedFeeNote: "Fee includes a $0.50 fixed part — larger top-ups are more cost-effective.",
        },
        tierMinHint: "Card payment minimum is {{min}} points (includes $0.50 fixed fee)",
        waffoTrust:
          "Payments are processed by Waffo Pancake under PCI-DSS. Points are credited automatically once the payment is confirmed.",
        refundNotice:
          "Digital goods: consumed credits are not refundable, and any refund is net of the channel fee already incurred plus a $1.00 refund processing fee.",
        transferRefundNotice:
          "Manual top-ups can be fully refunded while the credits remain unused.",
        methodLabel: "Payment method",
        methods: {
          waffo: { name: "Global payment", desc: "Visa / MasterCard / Apple Pay" },
          cnyWechat: { name: "WeChat Pay (CNY)", desc: "Pay in RMB via WeChat; 1 credit = CNY 1 principal + 3.9% processing fee" },
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
        balanceBadge: "Balance: {{balance}} points",
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
        orderState: {
          awaitingPayment:
            "Checkout opened in a new window · this page will update once payment completes",
          reopenCheckout: "Didn't open? Reopen checkout",
          confirming: "Payment received — confirming your balance…",
          credited: "+{{delta}} points credited · balance {{balance}}",
          delayed:
            "Payment confirmation is delayed — points usually arrive within 1 minute",
          refreshBalance: "Refresh balance",
          failedTitle: "Payment not completed",
          retry: "Retry",
          switchToManual: "Use manual payment instead (no fee)",
          cancelTitle: "Payment cancelled",
          contactSupport: "Contact support",
          viewUsage: "View usage",
        },
        copyUsername: "Copy username",
        copiedUsername: "Copied — paste it as the transfer note",
        transferDone: "I've completed the transfer",
        transferWaiting:
          "Noted — usually credited in 1–30 min (may take longer on holidays). Balance updates automatically; no need to stay on this page.",
        transferWaitingExpired: "Still not credited after 30 min?",
        suggestAmount: "Suggest ¥{{amount}}",
        errors: {
          invalidAmount:
            "Enter a whole number between {{min}} and {{max}} points",
          loginRequired: "Please sign in before recharging",
          serverUnavailable: "The server is unavailable. Please try again later.",
          createOrder: "Failed to create the payment order",
          createAddress: "Failed to get the {{token}} address",
          methodUnavailable:
            "This payment method is currently unavailable. Please pick another one.",
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
      recharge_page: {
        title: "充值",
        viewPricing: "查看价格",
        channel: { online: "在线支付", transfer: "人工收款" },
        loading: "正在加载可用的支付方式...",
        noOnlineChannel:
          "当前没有可用的在线支付方式，请使用微信 / 支付宝扫码转账。",
        amountLabel: "充值额度",
        credits: "{{count}} 积分",
        custom: "自定义",
        recommended: "推荐",
        customPlaceholder: "请输入 {{min}}-{{max}} 之间的整数积分",
        rateHint:
          "单笔 {{min}}-{{max}} 积分（整数）。每积分本金为人民币 1 元；支付手续费单独显示，税费和银行汇率可能在结账时另计。",
        neverExpire: "积分永久有效，不设有效期。",
        unlockPro: "再充 {{n}} 积分即可解锁专业版：实时联网搜索、批量文件分析。",
        bestValue: "最划算",
        receipt: {
          principal: "本金",
          fee: "支付手续费",
          total: "合计",
          cnyTotal: "合计 ¥{{totalCny}}（含 3.9% 手续费 ¥{{feeCny}}）",
          usdTotal: "本金 ${{principalUsd}} + 手续费 ≈${{feeUsd}} = ${{totalUsd}}",
          fixedFeeNote: "手续费含 $0.50 固定部分，充越多单笔越划算。",
        },
        tierMinHint: "卡支付最低 {{min}} 积分（含 $0.50 固定手续费）",
        waffoTrust:
          "支付由 Waffo Pancake 处理并符合 PCI-DSS 国际安全标准，回调确认后积分自动到账。",
        refundNotice:
          "数字商品：交付后已消耗部分不支持退款；可退款部分需扣除已发生的通道手续费与 $1.00 退款处理费。",
        transferRefundNotice: "人工充值在积分未消耗时可全额退款。",
        methodLabel: "支付方式",
        methods: {
          waffo: { name: "全球支付", desc: "Visa / MasterCard / Apple Pay" },
          cnyWechat: { name: "微信支付（人民币）", desc: "人民币直付微信，1 积分 = 1 元本金 + 3.9% 支付手续费" },
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
        balanceBadge: "余额 {{balance}} 积分",
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
        orderState: {
          awaitingPayment: "收银台已在新窗口打开 · 完成支付后此页会自动更新",
          reopenCheckout: "没打开？点此重新打开",
          confirming: "支付成功，正在确认到账…",
          credited: "+{{delta}} 积分已到账，当前余额 {{balance}}",
          delayed: "支付平台确认稍有延迟，积分一般 1 分钟内到账",
          refreshBalance: "刷新余额",
          failedTitle: "支付未完成",
          retry: "重试",
          switchToManual: "改用人工收款（无手续费）",
          cancelTitle: "已取消本次支付",
          contactSupport: "联系客服",
          viewUsage: "查看使用统计",
        },
        copyUsername: "复制用户名",
        copiedUsername: "已复制，请粘贴为转账备注",
        transferDone: "我已完成转账",
        transferWaiting:
          "已记录，通常 1-30 分钟到账（节假日顺延），到账后余额自动更新，无需留在本页。",
        transferWaitingExpired: "超过 30 分钟仍未到账？",
        suggestAmount: "建议转账 ¥{{amount}}",
        errors: {
          invalidAmount: "请输入 {{min}}-{{max}} 之间的整数积分",
          loginRequired: "请先登录后再充值",
          serverUnavailable: "当前服务器不可用，请稍后重试",
          createOrder: "创建支付订单失败",
          createAddress: "创建 {{token}} 地址失败",
          methodUnavailable: "该支付方式当前不可用，请选择其他方式。",
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
      recharge_page: {
        title: "儲值",
        viewPricing: "查看價格",
        channel: { online: "線上支付", transfer: "人工收款" },
        loading: "正在載入可用的支付方式...",
        noOnlineChannel:
          "目前沒有可用的線上支付方式，請使用微信 / 支付寶掃碼轉帳。",
        amountLabel: "儲值額度",
        credits: "{{count}} 積分",
        custom: "自訂",
        recommended: "推薦",
        customPlaceholder: "請輸入 {{min}}-{{max}} 之間的整數積分",
        rateHint:
          "單筆 {{min}}-{{max}} 積分（整數）。每積分本金為人民幣 1 元；支付手續費單獨顯示，稅費和銀行匯率可能在結帳時另計。",
        neverExpire: "積分永久有效，不設有效期限。",
        unlockPro: "再儲值 {{n}} 積分即可解鎖專業版：即時聯網搜尋、批次檔案分析。",
        bestValue: "最划算",
        receipt: {
          principal: "本金",
          fee: "支付手續費",
          total: "合計",
          cnyTotal: "合計 ¥{{totalCny}}（含 3.9% 手續費 ¥{{feeCny}}）",
          usdTotal: "本金 ${{principalUsd}} + 手續費 ≈${{feeUsd}} = ${{totalUsd}}",
          fixedFeeNote: "手續費含 $0.50 固定部分，充越多單筆越划算。",
        },
        tierMinHint: "卡支付最低 {{min}} 積分（含 $0.50 固定手續費）",
        waffoTrust:
          "支付由 Waffo Pancake 處理並符合 PCI-DSS 國際安全標準，回呼確認後積分自動入帳。",
        refundNotice:
          "數位商品：交付後已消耗部分不支援退款；可退款部分需扣除已發生的通道手續費與 $1.00 退款處理費。",
        transferRefundNotice: "人工儲值在積分未消耗時可全額退款。",
        methodLabel: "支付方式",
        methods: {
          waffo: { name: "全球支付", desc: "Visa / MasterCard / Apple Pay" },
          cnyWechat: { name: "微信支付（人民幣）", desc: "人民幣直付微信，1 積分 = 1 元本金 + 3.9% 支付手續費" },
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
        balanceBadge: "餘額 {{balance}} 積分",
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
        orderState: {
          awaitingPayment: "收銀台已在新視窗開啟 · 完成支付後此頁會自動更新",
          reopenCheckout: "沒有開啟？點此重新開啟",
          confirming: "支付成功，正在確認到帳…",
          credited: "+{{delta}} 積分已到帳，目前餘額 {{balance}}",
          delayed: "支付平台確認稍有延遲，積分一般 1 分鐘內到帳",
          refreshBalance: "重新整理餘額",
          failedTitle: "支付未完成",
          retry: "重試",
          switchToManual: "改用人工收款（免手續費）",
          cancelTitle: "已取消本次支付",
          contactSupport: "聯絡客服",
          viewUsage: "查看使用統計",
        },
        copyUsername: "複製使用者名稱",
        copiedUsername: "已複製，請貼上為轉帳備註",
        transferDone: "我已完成轉帳",
        transferWaiting:
          "已記錄，通常 1-30 分鐘到帳（節假日順延），到帳後餘額自動更新，無需留在本頁。",
        transferWaitingExpired: "超過 30 分鐘仍未到帳？",
        suggestAmount: "建議轉帳 ¥{{amount}}",
        errors: {
          invalidAmount: "請輸入 {{min}}-{{max}} 之間的整數積分",
          loginRequired: "請先登入後再儲值",
          serverUnavailable: "目前伺服器無法使用，請稍後重試",
          createOrder: "建立支付訂單失敗",
          createAddress: "建立 {{token}} 地址失敗",
          methodUnavailable: "該支付方式目前不可用，請選擇其他方式。",
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
      recharge_page: {
        title: "チャージ",
        viewPricing: "料金を見る",
        channel: { online: "オンライン決済", transfer: "手動入金" },
        loading: "利用可能な決済方法を読み込んでいます...",
        noOnlineChannel:
          "現在利用できるオンライン決済がありません。WeChat / Alipay のQR送金をご利用ください。",
        amountLabel: "チャージ額",
        credits: "{{count}} ポイント",
        custom: "カスタム",
        recommended: "おすすめ",
        customPlaceholder: "{{min}}〜{{max}} の整数ポイントを入力してください",
        rateHint:
          "1回 {{min}}〜{{max}}ポイント（整数）。各ポイントの元本は人民元1元で、決済手数料は別表示です。税・銀行の為替差は決済時に加わる場合があります。",
        neverExpire: "ポイントに有効期限はありません。",
        unlockPro: "あと {{n}} ポイントでプロ版（リアルタイム検索・一括ファイル分析）が解放されます。",
        bestValue: "最もお得",
        receipt: {
          principal: "元本",
          fee: "決済手数料",
          total: "合計",
          cnyTotal: "合計 ¥{{totalCny}}（3.9% 手数料 ¥{{feeCny}} 込み）",
          usdTotal: "元本 ${{principalUsd}} + 手数料 ≈${{feeUsd}} = ${{totalUsd}}",
          fixedFeeNote: "手数料には $0.50 の固定分が含まれます。まとめて入金するほどお得です。",
        },
        tierMinHint: "カード決済は最低 {{min}} ポイントから（$0.50 の固定手数料込み）",
        waffoTrust:
          "決済は Waffo Pancake が PCI-DSS 準拠で処理します。確認後、ポイントは自動的に反映されます。",
        refundNotice:
          "デジタル商品：納品後に消費された分は返金できません。返金対象分は、既に発生した決済手数料と $1.00 の返金処理手数料を差し引いた額となります。",
        transferRefundNotice:
          "手動入金は、ポイントが未使用の間は全額返金できます。",
        methodLabel: "決済方法",
        methods: {
          waffo: { name: "グローバル決済", desc: "Visa / MasterCard / Apple Pay" },
          cnyWechat: { name: "WeChat Pay（人民元）", desc: "人民元でそのまま支払い、1ポイント = 1元の元本 + 3.9% の決済手数料" },
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
        balanceBadge: "残高 {{balance}} ポイント",
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
        orderState: {
          awaitingPayment: "決済画面を新しいウィンドウで開きました · 完了後このページは自動で更新されます",
          reopenCheckout: "開かない場合はこちらをクリック",
          confirming: "支払い成功 — 入金を確認しています…",
          credited: "+{{delta}} ポイントが反映されました · 残高 {{balance}}",
          delayed: "決済確認に少し遅れが出ています — 通常 1 分以内に反映されます",
          refreshBalance: "残高を更新",
          failedTitle: "支払いが完了しませんでした",
          retry: "再試行",
          switchToManual: "手動入金に切り替える（手数料無料）",
          cancelTitle: "支払いをキャンセルしました",
          contactSupport: "サポートへ連絡",
          viewUsage: "使用状況を見る",
        },
        copyUsername: "ユーザー名をコピー",
        copiedUsername: "コピーしました — 送金メモに貼り付けてください",
        transferDone: "送金を完了しました",
        transferWaiting:
          "記録しました。通常 1〜30 分で反映されます（休日は遅れる場合あり）。残高は自動更新されるので、このページを開いたままにする必要はありません。",
        transferWaitingExpired: "30 分経っても反映されませんか？",
        suggestAmount: "¥{{amount}} の送金を推奨",
        errors: {
          invalidAmount: "{{min}}〜{{max}} の整数ポイントを入力してください",
          loginRequired: "チャージの前にログインしてください",
          serverUnavailable:
            "サーバーが利用できません。しばらくしてからお試しください",
          createOrder: "決済注文の作成に失敗しました",
          createAddress: "{{token}} アドレスの取得に失敗しました",
          methodUnavailable: "この支払い方法は現在ご利用いただけません。別の方法を選択してください。",
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
  de: {
    translation: {
      recharge_page: {
        title: "Aufladen",
        viewPricing: "Preise anzeigen",
        channel: { online: "Online-Zahlung", transfer: "Manuelle Überweisung" },
        loading: "Verfügbare Zahlungsmethoden werden geladen...",
        noOnlineChannel:
          "Derzeit ist keine Online-Zahlungsmethode verfügbar. Bitte zahlen Sie per WeChat- / Alipay-QR-Überweisung.",
        amountLabel: "Betrag",
        credits: "{{count}} Punkte",
        custom: "Benutzerdefiniert",
        recommended: "Beliebt",
        customPlaceholder:
          "Geben Sie eine ganze Zahl zwischen {{min}} und {{max}} Punkten ein",
        rateHint:
          "{{min}}-{{max}} ganzzahlige Punkte pro Bestellung. Jeder Punkt entspricht CNY 1 Nennwert; Kartengebühren werden separat ausgewiesen. Steuern und Bankwechselkurse können an der Kasse hinzukommen.",
        neverExpire: "Punkte verfallen nie.",
        unlockPro: "Noch {{n}} Punkte schalten Pro frei – Echtzeit-Websuche und Batch-Dateianalyse.",
        bestValue: "Bester Wert",
        receipt: {
          principal: "Nennbetrag",
          fee: "Bearbeitungsgebühr",
          total: "Gesamt",
          cnyTotal: "Gesamt ¥{{totalCny}} (inkl. 3,9 % Gebühr ¥{{feeCny}})",
          usdTotal: "Nennbetrag ${{principalUsd}} + Gebühr ≈${{feeUsd}} = ${{totalUsd}}",
          fixedFeeNote: "Die Gebühr enthält einen festen Anteil von $0.50 – höhere Aufladungen sind wirtschaftlicher.",
        },
        tierMinHint: "Mindestbetrag bei Kartenzahlung beträgt {{min}} Punkte (inkl. $0.50 fester Gebühr)",
        waffoTrust:
          "Zahlungen werden von Waffo Pancake unter PCI-DSS verarbeitet. Punkte werden nach Bestätigung der Zahlung automatisch gutgeschrieben.",
        refundNotice:
          "Digitale Güter: Verbrauchte Punkte können nicht erstattet werden. Jede Erstattung versteht sich abzüglich der bereits angefallenen Kanalgebühr zuzüglich einer Erstattungsgebühr von $1.00.",
        transferRefundNotice:
          "Manuelle Aufladungen können vollständig erstattet werden, solange die Punkte ungenutzt bleiben.",
        methodLabel: "Zahlungsmethode",
        methods: {
          waffo: { name: "Globale Zahlung", desc: "Visa / MasterCard / Apple Pay" },
          cnyWechat: { name: "WeChat Pay (CNY)", desc: "In RMB über WeChat bezahlen; 1 Punkt = CNY 1 Nennbetrag + 3,9 % Bearbeitungsgebühr" },
          wechat: { name: "WeChat Pay", desc: "QR-Überweisung" },
          alipay: { name: "Alipay", desc: "QR-Überweisung" },
          cryptoDesc: "{{network}}-Netzwerk",
        },
        submit: {
          pay: "Jetzt bezahlen",
          paying: "Bestellung wird erstellt...",
          getAddress: "Meine {{token}}-Einzahlungsadresse abrufen",
          gettingAddress: "Wird geladen...",
        },
        account: "Punkte gehen an Ihr aktuelles Konto ({{username}})",
        accountWithBalance:
          "Punkte gehen an Ihr aktuelles Konto ({{username}}) · Guthaben {{balance}} Punkte",
        balanceBadge: "Guthaben: {{balance}} Punkte",
        notLoggedIn: "nicht angemeldet",
        cryptoHint:
          "Nur offizielle {{token}} im {{network}}-Netzwerk. Punkte werden aus dem tatsächlich eingegangenen Betrag umgerechnet: 1 {{token}} = {{rate}} Punkte, Mindesteinzahlung für automatische Gutschrift: {{min}} Punkte{{confirmations}}. Die Adresse ist an Ihr Konto gebunden und wiederverwendbar.",
        cryptoConfirmations: ", Gutschrift nach {{count}} On-Chain-Bestätigungen",
        addressLabel: "{{network}} {{token}} Einzahlungsadresse",
        copyAddress: "Adresse kopieren",
        transferRate:
          "CNY 1 = 1 Punkt. Überweisen Sie einen beliebigen Betrag – die entsprechende Punktzahl wird gutgeschrieben.",
        noticePrefix: "Bitte geben Sie Ihren Benutzernamen im Verwendungszweck an:",
        noticeWarning:
          "Dieser Kanal wird manuell gutgeschrieben. Der Verwendungszweck ist der einzige Nachweis über den Absender – ohne diesen können wir Ihre Überweisung nicht zuordnen.",
        qrTip: "Öffnen Sie {{name}} und scannen Sie den Code zum Bezahlen",
        qrLoading: "Wird sicher geladen...",
        qrAlt: "{{name}}-Zahlungs-QR-Code",
        returnMessage: {
          success:
            "Zahlung übermittelt. Punkte werden nach Bestätigung der Rückmeldung automatisch gutgeschrieben.",
          failed: "Zahlung wurde nicht abgeschlossen. Bitte versuchen Sie es erneut.",
          cancel: "Diese Zahlung wurde abgebrochen.",
        },
        orderState: {
          awaitingPayment:
            "Kasse in einem neuen Fenster geöffnet · diese Seite wird nach Abschluss der Zahlung aktualisiert",
          reopenCheckout: "Nicht geöffnet? Kasse erneut öffnen",
          confirming: "Zahlung erhalten — Guthaben wird bestätigt…",
          credited: "+{{delta}} Punkte gutgeschrieben · Guthaben {{balance}}",
          delayed: "Zahlungsbestätigung verzögert sich — Punkte treffen normalerweise innerhalb von 1 Minute ein",
          refreshBalance: "Guthaben aktualisieren",
          failedTitle: "Zahlung nicht abgeschlossen",
          retry: "Wiederholen",
          switchToManual: "Stattdessen manuelle Überweisung nutzen (gebührenfrei)",
          cancelTitle: "Zahlung abgebrochen",
          contactSupport: "Support kontaktieren",
          viewUsage: "Nutzung anzeigen",
        },
        copyUsername: "Benutzernamen kopieren",
        copiedUsername: "Kopiert – im Verwendungszweck einfügen",
        transferDone: "Ich habe die Überweisung abgeschlossen",
        transferWaiting:
          "Erfasst – die Gutschrift erfolgt in der Regel innerhalb von 1–30 Min. (an Feiertagen evtl. länger). Das Guthaben aktualisiert sich automatisch; Sie müssen nicht auf dieser Seite bleiben.",
        transferWaitingExpired: "Nach 30 Minuten immer noch nicht gutgeschrieben?",
        suggestAmount: "Vorschlag: ¥{{amount}}",
        errors: {
          invalidAmount:
            "Geben Sie eine ganze Zahl zwischen {{min}} und {{max}} Punkten ein",
          loginRequired: "Bitte vor dem Aufladen anmelden",
          serverUnavailable: "Der Server ist nicht erreichbar. Bitte versuchen Sie es später erneut.",
          createOrder: "Zahlungsauftrag konnte nicht erstellt werden",
          createAddress: "{{token}}-Adresse konnte nicht abgerufen werden",
          methodUnavailable:
            "Diese Zahlungsmethode ist derzeit nicht verfügbar. Bitte wählen Sie eine andere.",
        },
        notesTitle: "Hinweise",
        notes: [
          `Punkte werden nach tatsächlichem Token-Verbrauch abgerechnet und verfallen nie. Ein Guthaben von ${ADVANCED_FEATURE_MIN_BALANCE} Punkten schaltet Pro frei (Echtzeit-Websuche, Batch-Dateianalyse und mehr).`,
          `Eine einmalige Aufladung von mindestens ${GPT_PRO_REQUIRED_RECHARGE_AMOUNT} Punkten schaltet Advanced frei (GPT Pro, Claude Opus, Kimi K3 und ähnliche Modelle). Jeder Zahlungsweg zählt.`,
          "Online-Zahlungen werden automatisch gutgeschrieben, sobald der Anbieter die Rückmeldung bestätigt. WeChat- / Alipay-Überweisungen werden manuell gutgeschrieben, normalerweise innerhalb von 1–30 Minuten, an Feiertagen möglicherweise mit Verzögerung.",
          "Selbst gekaufte Punkte, die zu 100 % ungenutzt sind, können innerhalb von 7 Tagen vollständig erstattet werden. Für Erstattungen und weitere Fragen kontaktieren Sie {{email}}.",
        ],
      },
    },
  },
  es: {
    translation: {
      recharge_page: {
        title: "Recargar",
        viewPricing: "Ver precios",
        channel: { online: "Pago online", transfer: "Pago manual" },
        loading: "Cargando métodos de pago disponibles...",
        noOnlineChannel:
          "No hay ningún método de pago online disponible en este momento. Por favor, paga mediante transferencia por código QR de WeChat / Alipay.",
        amountLabel: "Importe",
        credits: "{{count}} puntos",
        custom: "Personalizado",
        recommended: "Popular",
        customPlaceholder:
          "Introduce un número entero entre {{min}} y {{max}} puntos",
        rateHint:
          "{{min}}-{{max}} créditos enteros por pedido. Cada crédito tiene un valor nominal de CNY 1; las comisiones de procesamiento de tarjeta se muestran por separado. Es posible que se agreguen impuestos y comisiones por cambio de divisa al finalizar la compra.",
        neverExpire: "Los puntos nunca caducan.",
        unlockPro: "{{n}} puntos más desbloquean Pro: búsqueda web en tiempo real y análisis de archivos por lotes.",
        bestValue: "Mejor valor",
        receipt: {
          principal: "Principal",
          fee: "Comisión de procesamiento",
          total: "Total",
          cnyTotal: "Total ¥{{totalCny}} (incluye comisión del 3,9% ¥{{feeCny}})",
          usdTotal: "Principal ${{principalUsd}} + comisión ≈${{feeUsd}} = ${{totalUsd}}",
          fixedFeeNote: "La comisión incluye una parte fija de $0.50; las recargas mayores son más rentables.",
        },
        tierMinHint: "El mínimo para pago con tarjeta es de {{min}} puntos (incluye comisión fija de $0.50)",
        waffoTrust:
          "Los pagos son procesados por Waffo Pancake bajo PCI-DSS. Los puntos se acreditan automáticamente tras confirmarse el pago.",
        refundNotice:
          "Bienes digitales: los créditos consumidos no son reembolsables, y cualquier reembolso es neto de la comisión del canal ya incurrida más una tarifa de procesamiento de reembolso de $1.00.",
        transferRefundNotice:
          "Las recargas manuales se pueden reembolsar íntegramente mientras los créditos permanezcan sin usar.",
        methodLabel: "Método de pago",
        methods: {
          waffo: { name: "Pago global", desc: "Visa / MasterCard / Apple Pay" },
          cnyWechat: { name: "WeChat Pay (CNY)", desc: "Paga en RMB con WeChat; 1 crédito = CNY 1 principal + comisión del 3,9%" },
          wechat: { name: "WeChat Pay", desc: "Transferencia QR" },
          alipay: { name: "Alipay", desc: "Transferencia QR" },
          cryptoDesc: "Red {{network}}",
        },
        submit: {
          pay: "Pagar ahora",
          paying: "Creando pedido...",
          getAddress: "Obtener mi dirección de depósito {{token}}",
          gettingAddress: "Cargando...",
        },
        account: "Los puntos van a tu cuenta actual ({{username}})",
        accountWithBalance:
          "Los puntos van a tu cuenta actual ({{username}}) · saldo {{balance}} puntos",
        balanceBadge: "Saldo: {{balance}} puntos",
        notLoggedIn: "no has iniciado sesión",
        cryptoHint:
          "Solo {{token}} oficial en {{network}}. Los puntos se convierten a partir de la cantidad realmente recibida: 1 {{token}} = {{rate}} puntos, mínimo {{min}} puntos para acreditación automática{{confirmations}}. La dirección está vinculada a tu cuenta y se puede reutilizar.",
        cryptoConfirmations: ", acreditado tras {{count}} confirmaciones en cadena",
        addressLabel: "Dirección de depósito {{network}} {{token}}",
        copyAddress: "Copiar dirección",
        transferRate:
          "CNY 1 = 1 punto. Transfiere cualquier importe: se acreditará la misma cantidad de puntos.",
        noticePrefix: "Por favor, introduce tu nombre de usuario en el concepto de la transferencia:",
        noticeWarning:
          "Este canal se acredita manualmente. El concepto es el único comprobante de quién realizó el pago; sin él no podemos asociar tu transferencia.",
        qrTip: "Abre {{name}} y escanea el código para pagar",
        qrLoading: "Cargando de forma segura...",
        qrAlt: "Código QR de pago con {{name}}",
        returnMessage: {
          success:
            "Pago enviado. Los puntos se acreditan automáticamente una vez confirmada la respuesta.",
          failed: "El pago no se completó. Por favor, inténtalo de nuevo.",
          cancel: "Este pago fue cancelado.",
        },
        orderState: {
          awaitingPayment:
            "Pasarela abierta en una nueva ventana · esta página se actualizará tras completar el pago",
          reopenCheckout: "¿No se abrió? Volver a abrir la pasarela",
          confirming: "Pago recibido: confirmando tu saldo…",
          credited: "+{{delta}} puntos acreditados · saldo {{balance}}",
          delayed: "La confirmación del pago se ha retrasado: los puntos suelen llegar en 1 minuto",
          refreshBalance: "Actualizar saldo",
          failedTitle: "Pago no completado",
          retry: "Reintentar",
          switchToManual: "Usar pago manual en su lugar (sin comisiones)",
          cancelTitle: "Pago cancelado",
          contactSupport: "Contactar con soporte",
          viewUsage: "Ver uso",
        },
        copyUsername: "Copiar nombre de usuario",
        copiedUsername: "Copiado: pégalo en el concepto de la transferencia",
        transferDone: "He completado la transferencia",
        transferWaiting:
          "Anotado: suele acreditarse en 1–30 min (puede tardar más en festivos). El saldo se actualiza automáticamente; no necesitas permanecer en esta página.",
        transferWaitingExpired: "¿Todavía no se ha acreditado tras 30 min?",
        suggestAmount: "Sugerir ¥{{amount}}",
        errors: {
          invalidAmount:
            "Introduce un número entero entre {{min}} y {{max}} puntos",
          loginRequired: "Por favor, inicia sesión antes de recargar",
          serverUnavailable: "El servidor no está disponible. Por favor, inténtalo de nuevo más tarde.",
          createOrder: "No se pudo crear el pedido de pago",
          createAddress: "No se pudo obtener la dirección de {{token}}",
          methodUnavailable:
            "Este método de pago no está disponible actualmente. Por favor, elige otro.",
        },
        notesTitle: "Notas",
        notes: [
          `Los puntos se facturan según el uso real de tokens y nunca caducan. Un saldo de ${ADVANCED_FEATURE_MIN_BALANCE} puntos desbloquea Pro (búsqueda web en tiempo real, análisis de archivos por lotes y más).`,
          `Una recarga única de ${GPT_PRO_REQUIRED_RECHARGE_AMOUNT} puntos o más desbloquea Advanced (GPT Pro, Claude Opus, Kimi K3 y modelos similares). Todos los canales de pago son válidos.`,
          "Los pagos online se acreditan automáticamente tras la confirmación del proveedor. Las transferencias de WeChat / Alipay se procesan manualmente, generalmente en un plazo de 1 a 30 minutos, con posibles demoras en días festivos.",
          "Los puntos comprados que estén 100% sin usar se pueden reembolsar íntegramente en un plazo de 7 días. Para reembolsos y otras consultas, contacta con {{email}}.",
        ],
      },
    },
  },
};
