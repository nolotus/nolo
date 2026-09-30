import { Language } from "../types";

const english = {
  openAuditable: {
    kicker: "Privacy · Open · Auditable",
    title: "We don’t collect your data. Our code is open for inspection.",
    description:
      "The Nolo client never collects your conversations or personal data, and its source code is fully public. Every official release maps to an exact version in the public repository, so anyone can inspect and verify it.",
    viewSource: "View source",
    verifyRelease: "Verify current release",
    privacyTitle: "No data collection",
    privacyText:
      "Your conversations and files stay on your own device. We don’t track how you use the app or collect your personal data.",
    auditTitle: "Auditable code",
    auditText:
      "How the client reads files, calls tools, and talks to model providers is all written in public source code — read it line by line.",
    verifyTitle: "Verifiable releases",
    verifyText:
      "Every official build maps to a public source version with published checksums, so you can confirm your download comes from the public code.",
  },
};

export default {
  [Language.EN]: { translation: english },
  [Language.ZH_CN]: {
    translation: {
      openAuditable: {
        kicker: "隐私 · 开放 · 可审计",
        title: "不收集你的隐私，代码摊开给你看。",
        description:
          "Nolo 客户端不收集你的对话和个人数据，源码完全公开。每个正式版本都能对应到公开仓库里的确切代码，任何人都可以检查、验证。",
        viewSource: "查看源码",
        verifyRelease: "验证当前版本",
        privacyTitle: "不收集隐私",
        privacyText: "你的对话和文件留在你自己的设备上。我们不追踪你怎么使用，也不收集你的个人数据。",
        auditTitle: "代码可审计",
        auditText: "客户端如何读取文件、调用工具、连接模型提供方，全部写在公开的源码里，欢迎逐行检查。",
        verifyTitle: "版本可验证",
        verifyText: "每个正式安装包都能对应到公开的源码版本和校验信息，你可以确认手里的安装包来自公开代码。",
      },
    },
  },
  [Language.ZH_HANT]: {
    translation: {
      openAuditable: {
        kicker: "隱私 · 開放 · 可稽核",
        title: "不收集你的隱私，程式碼攤開給你看。",
        description:
          "Nolo 用戶端不收集你的對話和個人資料，原始碼完全公開。每個正式版本都能對應到公開儲存庫裡的確切程式碼，任何人都可以檢查、驗證。",
        viewSource: "查看原始碼",
        verifyRelease: "驗證目前版本",
        privacyTitle: "不收集隱私",
        privacyText: "你的對話和檔案留在你自己的裝置上。我們不追蹤你怎麼使用，也不收集你的個人資料。",
        auditTitle: "程式碼可稽核",
        auditText: "用戶端如何讀取檔案、呼叫工具、連接模型提供方，全部寫在公開的原始碼裡，歡迎逐行檢查。",
        verifyTitle: "版本可驗證",
        verifyText: "每個正式安裝檔都能對應到公開的原始碼版本和校驗資訊，你可以確認手上的安裝檔來自公開程式碼。",
      },
    },
  },
  [Language.JA]: {
    translation: {
      openAuditable: {
        kicker: "プライバシー · オープン · 監査可能",
        title: "あなたのデータは収集しません。コードは公開されています。",
        description:
          "Nolo クライアントは会話や個人データを一切収集せず、ソースコードは完全公開です。すべての正式リリースは公開リポジトリの正確なコードに対応づけられており、誰でも検査・検証できます。",
        viewSource: "ソースを見る",
        verifyRelease: "現在のリリースを検証",
        privacyTitle: "データを収集しない",
        privacyText:
          "会話やファイルはあなたのデバイスに残ります。利用状況のトラッキングや個人データの収集は行いません。",
        auditTitle: "監査可能なコード",
        auditText:
          "クライアントがファイルを読み、ツールを呼び出し、モデルプロバイダーと通信する方法は、すべて公開されたソースコードに書かれています。",
        verifyTitle: "検証可能なリリース",
        verifyText:
          "すべての正式ビルドは公開されたソースバージョンとチェックサムに対応しており、お手元のインストーラーが公開コード由来であることを確認できます。",
      },
    },
  },
};
