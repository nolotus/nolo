import { Language } from "../types";

const english = {
  openAuditable: {
    kicker: "Open & Auditable",
    title: "Don’t trust the binary. Verify it.",
    description:
      "Nolo’s client source is public. Official desktop release metadata records the exact public repository commit used for the build and the SHA-256 of each artifact.",
    viewSource: "View source",
    verifyRelease: "Verify current release",
    publicCommitTitle: "Exact public commit",
    publicCommitText: "Release metadata records the exact public projection SHA used for the build.",
    hashTitle: "Artifact checksum",
    hashText: "The public manifest records SHA-256 for each downloadable desktop artifact.",
    auditTitle: "Auditable client",
    auditText: "Inspect how the client reads files, invokes tools, and talks to model providers.",
  },
};

export default {
  [Language.EN]: { translation: english },
  [Language.ZH_CN]: {
    translation: {
      openAuditable: {
        kicker: "开放 · 可审计",
        title: "不要只信安装包，自己验证。",
        description:
          "Nolo 客户端源码公开。官方桌面版发布元数据会记录构建所对应的公开仓库提交，以及每个安装包的 SHA-256 校验值。",
        viewSource: "查看源码",
        verifyRelease: "验证当前版本",
        publicCommitTitle: "对应公开提交",
        publicCommitText: "发布元数据会记录构建使用的准确公开 projection SHA。",
        hashTitle: "安装包校验值",
        hashText: "公开 manifest 会记录每个可下载桌面安装包的 SHA-256。",
        auditTitle: "客户端可审计",
        auditText: "你可以检查客户端如何读取文件、调用工具，以及连接模型提供方。",
      },
    },
  },
  [Language.ZH_HANT]: {
    translation: {
      openAuditable: {
        kicker: "開放 · 可稽核",
        title: "不要只相信安裝檔，自己驗證。",
        description:
          "Nolo 用戶端原始碼公開。官方桌面版發布中繼資料會記錄建置所對應的公開儲存庫提交，以及每個安裝檔的 SHA-256 校驗值。",
        viewSource: "查看原始碼",
        verifyRelease: "驗證目前版本",
        publicCommitTitle: "對應公開提交",
        publicCommitText: "發布中繼資料會記錄建置使用的精確公開 projection SHA。",
        hashTitle: "安裝檔校驗值",
        hashText: "公開 manifest 會記錄每個可下載桌面安裝檔的 SHA-256。",
        auditTitle: "用戶端可稽核",
        auditText: "你可以檢查用戶端如何讀取檔案、呼叫工具，以及連接模型提供方。",
      },
    },
  },
  [Language.JA]: {
    translation: {
      openAuditable: {
        kicker: "Open & Auditable",
        title: "バイナリをただ信じず、自分で検証できます。",
        description:
          "Nolo のクライアントソースは公開されています。公式デスクトップ版のリリースメタデータには、ビルドに対応する公開リポジトリの正確なコミットと、各成果物の SHA-256 が記録されます。",
        viewSource: "ソースを見る",
        verifyRelease: "現在のリリースを検証",
        publicCommitTitle: "正確な公開コミット",
        publicCommitText: "リリースメタデータには、ビルドに使用した公開 projection SHA が記録されます。",
        hashTitle: "成果物チェックサム",
        hashText: "公開 manifest には、ダウンロード可能な各デスクトップ成果物の SHA-256 が記録されます。",
        auditTitle: "監査可能なクライアント",
        auditText: "クライアントがファイルを読み、ツールを呼び出し、モデルプロバイダーと通信する方法を確認できます。",
      },
    },
  },
};
