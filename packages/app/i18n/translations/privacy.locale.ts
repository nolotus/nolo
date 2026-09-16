import { Language } from "../types";

export default {
  [Language.EN]: {
    translation: {
      privacy: {
        title: "Privacy Policy",
        lastUpdated: "Last updated: September 16, 2026",
        intro: "Welcome to Nolo (hereinafter referred to as \"we\" or \"our\"). We take your privacy and data security very seriously. This Privacy Policy outlines how we handle and protect your personal information.",
        section1: {
          title: "1. Information We Collect",
          desc: "We collect minimal information necessary to deliver our services, including:",
          device: "Account & Profile: Email address, username, and authentication identifiers.",
          location: "Transaction Records: Point purchase amounts, order IDs, and payment status (we never collect or store sensitive payment details such as card numbers or CVV).",
          network: "Technical & Log Data: IP address, browser type, and system logs necessary for security and abuse prevention."
        },
        section2: {
          title: "2. Use of Information",
          desc: "We process your information for the following legitimate purposes:",
          core: "Providing and maintaining our digital AI computing and multi-agent workspace services.",
          map: "Processing points recharge orders and fulfilling accounting obligations.",
          analysis: "Ensuring platform stability, security, and preventing malicious activity."
        },
        section3: {
          title: "3. Information Sharing & Third Parties",
          desc: "We strictly do not sell, rent, or trade your personal information. Data is only shared in the following required contexts:",
          thirdParty: "Payment Processing: Payments are securely handled by Waffo Pancake in full compliance with PCI-DSS standards.",
          legal: "Legal Compliance: Disclosure required by law, regulation, or mandatory legal process."
        },
        section4: {
          title: "4. Data Security",
          desc: "All network traffic is encrypted via HTTPS/TLS. We implement industry-standard organizational and technical safeguards to protect your personal data."
        },
        section5: {
          title: "5. User Rights",
          desc: "You retain full rights to access, export, rectify, or request the deletion of your account and personal data at any time by contacting us."
        },
        browserExtension: {
          title: "6. Browser Extension (Nolo Browser Connector)",
          desc: "The optional Nolo Browser Connector extension lets the Nolo Desktop app on the same computer drive the Chrome tabs you ask about. For those tabs only, it processes:",
          page: "Page content: visible text, interactive elements, and the value of visible non-password fields, used to act and to verify that typing worked.",
          debug: "Debug data: console messages and network request metadata (URL, method, resource type) for a tab you are debugging, plus a screenshot when one is requested.",
          tabs: "Tab metadata: id, title, URL, and whether the connector opened the tab.",
          local: "This data goes to the Nolo Desktop app over a token-protected connection on 127.0.0.1. The extension does not send data to our servers, has no analytics, never reads cookies, passwords, the Chrome profile database or session stores, and keeps nothing beyond the current browser session (buffers are capped; element references expire after two minutes).",
          irreversible: "Irreversible actions such as payments, sending, deleting, publishing or permission changes are refused: those steps stay with you."
        },
        section6: {
          title: "7. Contact Us",
          desc: "For any questions or privacy inquiries, please contact us at s@nolotus.com (Brand: Nolo)."
        }
      }
    }
  },
  [Language.ZH_CN]: {
    translation: {
      privacy: {
        title: "隐私政策 (Privacy Policy)",
        lastUpdated: "最后更新日期：2026年9月16日",
        intro: "欢迎使用 Nolo（以下简称“我们”）。我们高度重视您的隐私与个人信息安全。本隐私政策说明我们在您使用本服务时如何处理与保护您的信息。",
        section1: {
          title: "1. 我们收集的信息",
          desc: "为保障核心功能与交易安全，我们仅收集必要的信息：",
          device: "账号信息：注册邮箱、用户名及安全认证标识。",
          location: "交易与账单：充值积分额度、订单编号及支付状态（我们绝不收集或存储您的银行卡完整卡号、CVV 等敏感信息）。",
          network: "系统日志：用于防护网络攻击与异常风控的基础 IP 与访问日志。"
        },
        section2: {
          title: "2. 信息的使用目的",
          desc: "我们仅出于以下合法合规目的使用信息：",
          core: "提供、维护并结算基于积分的数字 AI 计算与智能体协作服务。",
          map: "处理积分充值订单并履行必要的账单审计义务。",
          analysis: "保障服务稳定与安全风控，防御恶意滥用。"
        },
        section3: {
          title: "3. 信息共享与第三方处理方",
          desc: "我们坚决不出售、出租或泄露您的个人信息。仅在以下必要场景下与受信任合作方共享：",
          thirdParty: "支付处理方：所有支付均由 Waffo Pancake 安全处理，严格符合 PCI-DSS 国际安全规范。",
          legal: "法律合规：依法依规响应司法或监管机构的法定要求。"
        },
        section4: {
          title: "4. 数据安全保障",
          desc: "全站通信与数据传输均通过 HTTPS/TLS 高强度加密保护，采取严格的权限隔离与技术安全措施防止数据泄露。"
        },
        section5: {
          title: "5. 您的数据权利",
          desc: "您有权随时联系我们查询、更正、导出或申请删除您的个人数据及注销账户。"
        },
        browserExtension: {
          title: "6. 浏览器扩展（Nolo Browser Connector）",
          desc: "可选的 Nolo Browser Connector 扩展用于让同一台电脑上的 Nolo Desktop 应用操作你指定的 Chrome 标签页。仅针对这些标签页，它会处理：",
          page: "页面内容：可见文本、可交互元素，以及可见的非密码输入框的值，用于执行操作并验证输入是否生效。",
          debug: "调试数据：你正在调试的标签页的 console 消息与网络请求元信息（URL、方法、资源类型），以及在你要求时截取的页面截图。",
          tabs: "标签页元信息：id、标题、URL，以及该标签页是否由连接器打开。",
          local: "这些数据只通过 127.0.0.1 上带令牌保护的连接发送给本机的 Nolo Desktop 应用。扩展不会把数据发送到我们的服务器，不含任何统计代码，从不读取 Cookie、密码、Chrome profile 数据库或 session 存储，并且除当前浏览器会话外不保留任何数据（缓冲区有上限，元素引用两分钟后失效）。",
          irreversible: "支付、发送、删除、发布、权限变更等不可逆操作会被拒绝执行：这些步骤由你自己完成。"
        },
        section6: {
          title: "7. 联系我们",
          desc: "如有任何疑问或隐私诉求，请联系我们（邮箱：s@nolotus.com，品牌：Nolo）。"
        }
      }
    }
  },
  [Language.ZH_HANT]: {
    translation: {
      privacy: {
        title: "隱私權政策 (Privacy Policy)",
        lastUpdated: "最後更新日期：2026年9月16日",
        intro: "歡迎使用 Nolo（以下簡稱“我們”）。我們高度重視您的隱私與個人資訊安全。本隱私權政策說明我們在您使用本服務時如何處理與保護您的資訊。",
        section1: {
          title: "1. 我們收集的資訊",
          desc: "為保障核心功能與交易安全，我們僅收集必要的資訊：",
          device: "帳號資訊：註冊信箱、使用者名稱及安全認證標識。",
          location: "交易與帳單：充值積分額度、訂單編號及支付狀態（我們絕不收集或儲存您的信用卡完整卡號、CVV 等敏感資訊）。",
          network: "系統日誌：用於防護網路攻擊與異常風控的基礎 IP 與存取日誌。"
        },
        section2: {
          title: "2. 資訊的使用目的",
          desc: "我們僅出於以下合法合規目的使用資訊：",
          core: "提供、維護並結算基於積分的數位 AI 計算與智能體協作服務。",
          map: "處理積分充值訂單並履行必要的帳單審計義務。",
          analysis: "保障服務穩定與安全風控，防禦惡意濫用。"
        },
        section3: {
          title: "3. 資訊共享與第三方處理方",
          desc: "我們堅決不出售、出租或洩漏您的個人資訊。僅在以下必要場景下與受信任合作方共享：",
          thirdParty: "支付處理方：所有支付均由 Waffo Pancake 安全處理，嚴格符合 PCI-DSS 國際安全規範。",
          legal: "法律合規：依法依規回應司法或監管機構的法定要求。"
        },
        section4: {
          title: "4. 資料安全保障",
          desc: "全站通訊與資料傳輸均透過 HTTPS/TLS 高強度加密保護，採取嚴格的權限隔離與技術安全措施防止資料外洩。",
        },
        section5: {
          title: "5. 您的資料權利",
          desc: "您有權隨時聯絡我們查詢、更正、匯出或申請刪除您的個人資料及註銷帳號。",
        },
        browserExtension: {
          title: "6. 瀏覽器擴充功能（Nolo Browser Connector）",
          desc: "可選的 Nolo Browser Connector 擴充功能讓同一台電腦上的 Nolo Desktop 應用程式操作你指定的 Chrome 分頁。僅針對這些分頁，它會處理：",
          page: "頁面內容：可見文字、可互動元素，以及可見的非密碼欄位值，用於執行動作並驗證輸入是否生效。",
          debug: "除錯資料：你正在偵錯的分頁的 console 訊息與網路請求中介資料（URL、方法、資源類型），以及你要求時擷取的分頁截圖。",
          tabs: "分頁中介資料：id、標題、URL，以及該分頁是否由連接器開啟。",
          local: "這些資料僅透過 127.0.0.1 上受權杖保護的連線傳送給本機的 Nolo Desktop 應用程式。擴充功能不會將資料傳送至我們的伺服器，不含任何分析程式碼，從不讀取 Cookie、密碼、Chrome profile 資料庫或 session 儲存，且除目前瀏覽器工作階段外不保留任何資料（緩衝區有上限，元素參照兩分鐘後失效）。",
          irreversible: "付款、傳送、刪除、發布、權限變更等不可逆動作會被拒絕執行：這些步驟由你自己完成。"
        },
        section6: {
          title: "7. 聯絡我們",
          desc: "如有任何疑問或隱私訴求，請聯絡我們（信箱：s@nolotus.com，品牌：Nolo）。"
        }
      }
    }
  },
  [Language.JA]: {
    translation: {
      privacy: {
        title: "プライバシーポリシー",
        lastUpdated: "最終更新日：2026年9月16日",
        intro: "Nolo（以下「当社」）はお客様のプライバシーを尊重し、個人情報の保護に努めます。",
        section1: {
          title: "1. 収集する情報",
          desc: "サービス提供に必要な最小限の情報を収集します：",
          device: "アカウント情報：メールアドレス、ユーザー名",
          location: "取引記録：ポイント購入履歴、注文番号（カード番号やセキュリティコードは保持しません）",
          network: "アクセスログ：IPアドレスおよびシステムセキュリティログ"
        },
        section2: {
          title: "2. 情報の利用目的",
          desc: "AI計算サービスの提供、ポイント決済、およびセキュリティ管理のために利用します。",
          core: "コアサービスの提供",
          map: "取引処理および請求",
          analysis: "セキュリティおよび不正防止"
        },
        section3: {
          title: "3. 第三者への開示と提供",
          desc: "個人情報を販売することはありません。決済は PCI-DSS に準拠した Waffo Pancake により安全に処理されます。",
          thirdParty: "決済処理：Waffo Pancake",
          legal: "法令に基づく開示"
        },
        section4: {
          title: "4. データセキュリティ",
          desc: "すべての通信は HTTPS/TLS により暗号化されています。"
        },
        section5: {
          title: "5. お客様の権利",
          desc: "データの開示、訂正、削除をいつでも請求できます。"
        },
        browserExtension: {
          title: "6. ブラウザ拡張機能（Nolo Browser Connector）",
          desc: "任意で導入する Nolo Browser Connector 拡張機能は、同じコンピューター上の Nolo Desktop アプリが、指定された Chrome タブを操作するためのものです。対象のタブに限り、次の情報を処理します：",
          page: "ページ内容：表示中のテキスト、操作可能な要素、および表示されている非パスワード入力欄の値（操作の実行と入力結果の確認に使用）。",
          debug: "デバッグ情報：デバッグ対象タブの console メッセージとネットワーク要求のメタデータ（URL、メソッド、リソース種別）、および要求時のスクリーンショット。",
          tabs: "タブ情報：ID、タイトル、URL、およびそのタブを接続機能が開いたかどうか。",
          local: "これらのデータは 127.0.0.1 上のトークン保護された接続を通じて、同じコンピューター上の Nolo Desktop アプリにのみ送信されます。拡張機能は当社サーバーへデータを送信せず、解析コードも含みません。Cookie、パスワード、Chrome プロファイルデータベース、セッションストレージを読み取ることはなく、現在のブラウザーセッションを超えて保持しません（バッファーには上限があり、要素参照は 2 分で失効します）。",
          irreversible: "支払い、送信、削除、公開、権限変更などの不可逆的な操作は拒否されます。これらの手順はご自身で行っていただきます。"
        },
        section6: {
          title: "7. お問い合わせ",
          desc: "ブランド：Nolo / メール：s@nolotus.com"
        }
      }
    }
  }
};
