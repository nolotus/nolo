import { describe, expect, it, mock } from "bun:test";
import React, { act } from "react";
import { flushDomUpdates, renderInDom } from "../../../testing/domRender";
import { SendErrorCard } from "./SendErrorCard";
import type { MessageErrorMeta } from "../types";

describe("SendErrorCard", () => {
  it("renders network error card with retry button", async () => {
    const onRetryMock = mock(() => {});
    const errorMeta: MessageErrorMeta = {
      kind: "network",
      retryable: true,
      stage: "desktop_local_runtime",
      summary: "连接中断",
      actionHint: "可能是网络波动或服务端瞬时问题，点击重试通常可恢复",
      fallbackText: "TypeError: fetch failed\n[cause]: Error: connect ECONNRESET",
    };

    const view = await renderInDom(
      <SendErrorCard errorMeta={errorMeta} onRetry={onRetryMock} />
    );

    try {
      expect(view.getByText("网络错误")).toBeTruthy();
      expect(view.getByText("连接中断")).toBeTruthy();
      expect(view.getByText("建议：可能是网络波动或服务端瞬时问题，点击重试通常可恢复")).toBeTruthy();

      const retryBtn = view.container.querySelector(".send-error-card__retry-btn");
      expect(retryBtn).toBeTruthy();

      // 点击重试
      await act(async () => {
        (retryBtn as HTMLButtonElement).click();
      });
      expect(onRetryMock).toHaveBeenCalledTimes(1);

      // 查看详情折叠
      const detailsToggle = view.container.querySelector(".send-error-card__details-toggle");
      expect(detailsToggle).toBeTruthy();
      await act(async () => {
        (detailsToggle as HTMLButtonElement).click();
      });
      await flushDomUpdates();
      const detailsPre = view.container.querySelector(".send-error-card__details");
      expect(detailsPre).toBeTruthy();
      expect(detailsPre?.textContent).toContain("ECONNRESET");
    } finally {
      await view.cleanup();
    }
  });

  it("renders auth error card with validation link", async () => {
    const errorMeta: MessageErrorMeta = {
      kind: "auth",
      retryable: false,
      summary: "Antigravity (Google) 连接失败 (HTTP 403)",
      actionHint: "请点击链接完成验证",
      validationUrl: "https://accounts.google.com/signin/continue?test=1",
      validationLinkText: "Verify your account",
    };

    const view = await renderInDom(
      <SendErrorCard errorMeta={errorMeta} />
    );

    try {
      expect(view.getByText("认证失败")).toBeTruthy();
      expect(view.getByText("Antigravity (Google) 连接失败 (HTTP 403)")).toBeTruthy();
      const valLink = view.container.querySelector(".send-error-card__val-btn") as HTMLAnchorElement;
      expect(valLink).toBeTruthy();
      expect(valLink.href).toBe("https://accounts.google.com/signin/continue?test=1");
      expect(valLink.textContent).toContain("Verify your account");

      // retryable: false 且无 onRetry 时不渲染重试按钮
      expect(view.container.querySelector(".send-error-card__retry-btn")).toBeNull();
    } finally {
      await view.cleanup();
    }
  });

  it("[LOW-3] applies StyleX spinning class on retry icon when isRetrying is true without inline styles", async () => {
    const errorMeta: MessageErrorMeta = {
      kind: "network",
      retryable: true,
      summary: "连接中断",
    };

    const view = await renderInDom(
      <SendErrorCard errorMeta={errorMeta} onRetry={() => {}} isRetrying={true} />
    );

    try {
      const retryIcon = view.container.querySelector(".send-error-card__retry-btn svg");
      expect(retryIcon).toBeTruthy();
      // 确认无内联 style="animation: ..."
      expect(retryIcon?.getAttribute("style")).toBeNull();
    } finally {
      await view.cleanup();
    }
  });
});
