import { describe, expect, it } from "bun:test";
import i18n from "./index";
import { Language } from "./types";

describe("app i18n runtime", () => {
  it("bootstraps the common resource bundle for the default RN language", async () => {
    await i18n.changeLanguage(Language.ZH_CN);

    expect(i18n.hasResourceBundle(Language.ZH_CN, "common")).toBe(true);
    expect(i18n.t("authLoginTargetLabel")).toBe("当前登录环境");
    expect(i18n.t("enterUsername")).toBe("请输入用户名");
    expect(i18n.t("welcomeBack")).toBe("欢迎回来！请输入您的账户信息。");
    expect(i18n.t("createAccount")).toBe("创建账户，开启您的旅程。");
    expect(i18n.t("loginFailed")).toBe("登录失败");
    expect(i18n.t("signupFailed")).toBe("注册失败");
  });

  it("translates deleteMovedToTrash across common, space, ai, and chat namespaces", async () => {
    await i18n.changeLanguage(Language.ZH_CN);

    expect(i18n.t("deleteMovedToTrash", { title: "测试文件.pdf" })).toBe('"测试文件.pdf" 已移至回收站');
    expect(i18n.t("space:deleteMovedToTrash", { title: "测试文件.pdf" })).toBe('"测试文件.pdf" 已移至回收站');
    expect(i18n.t("ai:deleteMovedToTrash", { title: "测试文件.pdf" })).toBe('"测试文件.pdf" 已移至回收站');
    expect(i18n.t("chat:deleteMovedToTrash", { title: "测试文件.pdf" })).toBe('"测试文件.pdf" 已移至回收站');

    await i18n.changeLanguage(Language.EN);
    expect(i18n.t("deleteMovedToTrash", { title: "Test.pdf" })).toBe('"Test.pdf" moved to Recycle Bin');
    expect(i18n.t("space:deleteMovedToTrash", { title: "Test.pdf" })).toBe('"Test.pdf" moved to Recycle Bin');
  });

  it("translates settings.updates namespace correctly", async () => {
    await i18n.changeLanguage(Language.ZH_CN);
    expect(i18n.t("settings.updates.title")).toBe("客户端更新");
    expect(i18n.t("settings.updates.phase.invalid_remote")).toBe("远端元数据无效");

    await i18n.changeLanguage(Language.EN);
    expect(i18n.t("settings.updates.title")).toBe("Client updates");
    expect(i18n.t("settings.updates.phase.invalid_remote")).toBe("Remote metadata is invalid");
  });
});
