import {
  canAccessSystemAdminPage
} from "/public/assets/chunks/chunk-4BEOT5EM.js";
import {
  useForm
} from "/public/assets/chunks/chunk-Q66XOYF3.js";
import {
  Input
} from "/public/assets/chunks/chunk-XXYYZRCQ.js";
import {
  TextArea
} from "/public/assets/chunks/chunk-MDRAKVMH.js";
import "/public/assets/chunks/chunk-IOQKDOEC.js";
import {
  Switch
} from "/public/assets/chunks/chunk-FORT2GLR.js";
import {
  EMAIL_ADMIN_ENDPOINTS
} from "/public/assets/chunks/chunk-7QRUURKO.js";
import {
  Button_default
} from "/public/assets/chunks/chunk-252FCKHS.js";
import "/public/assets/chunks/chunk-AL5TXIK3.js";
import "/public/assets/chunks/chunk-DIU2H7DW.js";
import "/public/assets/chunks/chunk-ZTDLGZ3X.js";
import "/public/assets/chunks/chunk-VELLRNIX.js";
import "/public/assets/chunks/chunk-I2UX5KHN.js";
import {
  useAuth
} from "/public/assets/chunks/chunk-WT5G4HGZ.js";
import {
  useToken
} from "/public/assets/chunks/chunk-4C6PJRJA.js";
import "/public/assets/chunks/chunk-OOUNP25R.js";
import "/public/assets/chunks/chunk-B4ZQOXFP.js";
import "/public/assets/chunks/chunk-BELEJNOF.js";
import {
  useAppSelector
} from "/public/assets/chunks/chunk-U73LCHVO.js";
import "/public/assets/chunks/chunk-O47BZ5SQ.js";
import {
  selectRemoteServer,
  selectRemoteServers,
  toTrimmedString
} from "/public/assets/chunks/chunk-RWWUEPWY.js";
import "/public/assets/chunks/chunk-IJ3A6Q7E.js";
import "/public/assets/chunks/chunk-PN3BZAFX.js";
import "/public/assets/chunks/chunk-CILBJ2I2.js";
import {
  LuCircleAlert,
  LuCircleCheck,
  LuMail,
  LuSend,
  LuUsers
} from "/public/assets/chunks/chunk-GQPLRP65.js";
import "/public/assets/chunks/chunk-UWXJIOEO.js";
import "/public/assets/chunks/chunk-TBNFSVJC.js";
import "/public/assets/chunks/chunk-SM3EH4JD.js";
import "/public/assets/chunks/chunk-JOOBQBMM.js";
import "/public/assets/chunks/chunk-7OO56Y7L.js";
import "/public/assets/chunks/chunk-NKT4VBPJ.js";
import "/public/assets/chunks/chunk-LPS7IE46.js";
import "/public/assets/chunks/chunk-RUG5F6GD.js";
import "/public/assets/chunks/chunk-XJRNNKKF.js";
import "/public/assets/chunks/chunk-IRTDRTXE.js";
import "/public/assets/chunks/chunk-XDKHKMJ3.js";
import {
  asTrimmedLowercaseString
} from "/public/assets/chunks/chunk-VCXOIOLL.js";
import "/public/assets/chunks/chunk-AHAP23JL.js";
import {
  require_jsx_runtime
} from "/public/assets/chunks/chunk-VU4ZNPEP.js";
import "/public/assets/chunks/chunk-3EHRYDZ6.js";
import {
  require_react
} from "/public/assets/chunks/chunk-JXB3DLZU.js";
import "/public/assets/chunks/chunk-HYYCZJXV.js";
import {
  __toESM
} from "/public/assets/chunks/chunk-PKRG6ODM.js";

// packages/app/pages/EmailAdmin.tsx
var import_react = __toESM(require_react());
var import_jsx_runtime = __toESM(require_jsx_runtime());
var toSafeNumber = (value) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
};
var buildServerUrl = (server, path) => `${String(server || "").replace(/\/+$/, "")}${path}`;
var getFailureKey = (item) => item.id || `${toSafeNumber(item.timestamp)}:${String(item.tag || "")}:${String(item.to || "")}:${String(
  item.subject || ""
)}:${toSafeNumber(item.attempt)}`;
var mergeEmailReports = (reports, maxFailures = 200) => {
  const totals = {
    sent: 0,
    failed: 0,
    retried: 0,
    queued: 0,
    pendingRetryCount: 0
  };
  const statsMap = /* @__PURE__ */ new Map();
  const failureMap = /* @__PURE__ */ new Map();
  for (const item of reports) {
    const report = item.data || {};
    totals.sent += toSafeNumber(report.totals?.sent);
    totals.failed += toSafeNumber(report.totals?.failed);
    totals.retried += toSafeNumber(report.totals?.retried);
    totals.queued += toSafeNumber(report.totals?.queued);
    totals.pendingRetryCount += toSafeNumber(report.totals?.pendingRetryCount);
    if (Array.isArray(report.stats)) {
      for (const stat of report.stats) {
        const dayKey = String(stat?.dayKey || "");
        const tag = String(stat?.tag || "untagged");
        if (!dayKey) continue;
        const key = `${dayKey}:${tag}`;
        const current = statsMap.get(key) || {
          dayKey,
          tag,
          sent: 0,
          failed: 0,
          retried: 0,
          queued: 0
        };
        current.sent += toSafeNumber(stat?.sent);
        current.failed += toSafeNumber(stat?.failed);
        current.retried += toSafeNumber(stat?.retried);
        current.queued += toSafeNumber(stat?.queued);
        statsMap.set(key, current);
      }
    }
    if (Array.isArray(report.recentFailures)) {
      for (const failure of report.recentFailures) {
        const normalized = {
          id: String(failure?.id || ""),
          userId: failure?.userId ? String(failure.userId) : void 0,
          server: item.server,
          timestamp: toSafeNumber(failure?.timestamp),
          tag: String(failure?.tag || "untagged"),
          to: String(failure?.to || ""),
          subject: String(failure?.subject || ""),
          attempt: toSafeNumber(failure?.attempt),
          error: failure?.error ? String(failure.error) : void 0
        };
        if (!normalized.id && !normalized.timestamp) continue;
        const key = getFailureKey(normalized);
        const existing = failureMap.get(key);
        if (!existing || normalized.timestamp > existing.timestamp) {
          failureMap.set(key, normalized);
        }
      }
    }
  }
  const stats = Array.from(statsMap.values()).sort(
    (a, b) => a.dayKey === b.dayKey ? a.tag.localeCompare(b.tag) : a.dayKey.localeCompare(b.dayKey)
  );
  const recentFailures = Array.from(failureMap.values()).sort((a, b) => b.timestamp - a.timestamp).slice(0, Math.max(1, maxFailures));
  return {
    generatedAt: Date.now(),
    totals,
    stats,
    recentFailures
  };
};
var isRecordNewer = (next, current) => {
  if (next.timestamp !== current.timestamp) {
    return next.timestamp > current.timestamp;
  }
  if (next.status !== current.status) {
    return next.status === "sent";
  }
  return next.id > current.id;
};
var buildReengagementReplayPlan = (reports) => {
  const latestByUser = /* @__PURE__ */ new Map();
  for (const item of reports) {
    const recent = Array.isArray(item.data?.recent) ? item.data.recent : [];
    for (const record of recent) {
      const tag = asTrimmedLowercaseString(record?.tag);
      const userId = toTrimmedString(record?.userId);
      if (tag !== "reengagement" || !userId) continue;
      const normalized = {
        id: String(record?.id || ""),
        timestamp: toSafeNumber(record?.timestamp),
        status: String(record?.status || "")
      };
      const existing = latestByUser.get(userId);
      if (!existing || isRecordNewer(normalized, existing.record)) {
        latestByUser.set(userId, {
          server: item.server,
          record: normalized
        });
      }
    }
  }
  const plan = /* @__PURE__ */ new Map();
  for (const [userId, value] of latestByUser.entries()) {
    if (value.record.status !== "failed") continue;
    const list = plan.get(value.server) || [];
    list.push(userId);
    plan.set(value.server, list);
  }
  return plan;
};
var EmailAdmin = () => {
  const { user } = useAuth();
  const currentToken = useToken();
  const currentServer = useAppSelector(selectRemoteServer);
  const targetServers = useAppSelector(selectRemoteServers);
  const isAdmin = canAccessSystemAdminPage(user?.userId);
  const [loading, setLoading] = (0, import_react.useState)(false);
  const [status, setStatus] = (0, import_react.useState)(null);
  const [reportLoading, setReportLoading] = (0, import_react.useState)(false);
  const [resendFailedLoading, setResendFailedLoading] = (0, import_react.useState)(false);
  const [pauseLowBalanceLoading, setPauseLowBalanceLoading] = (0, import_react.useState)(false);
  const [unfreezeEmailLoading, setUnfreezeEmailLoading] = (0, import_react.useState)(false);
  const [reengagementDeliveryUpdating, setReengagementDeliveryUpdating] = (0, import_react.useState)(null);
  const [reengagementMarketingSegmentId, setReengagementMarketingSegmentId] = (0, import_react.useState)("");
  const [report, setReport] = (0, import_react.useState)(null);
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
    reset
  } = useForm({
    defaultValues: {
      subject: "",
      body: "",
      isHtml: false,
      userIds: ""
    }
  });
  const subject = watch("subject");
  const body = watch("body");
  const isHtml = watch("isHtml");
  const fetchReport = (0, import_react.useCallback)(async () => {
    setReportLoading(true);
    try {
      if (!currentToken) {
        throw new Error("\u9274\u6743\u5931\u8D25\uFF0C\u8BF7\u91CD\u65B0\u767B\u5F55\u540E\u91CD\u8BD5");
      }
      if (targetServers.length === 0) {
        throw new Error("\u672A\u914D\u7F6E\u53EF\u7528\u670D\u52A1\u5668");
      }
      const settled = await Promise.allSettled(
        targetServers.map(async (server) => {
          const response = await fetch(
            buildServerUrl(server, `${EMAIL_ADMIN_ENDPOINTS.report.path}?days=7&recent=all`),
            {
              method: EMAIL_ADMIN_ENDPOINTS.report.method,
              headers: {
                Authorization: `Bearer ${currentToken}`
              }
            }
          );
          const result = await response.json().catch(() => ({}));
          if (!response.ok) {
            throw new Error(result.error || `\u62A5\u8868\u62C9\u53D6\u5931\u8D25: ${server}`);
          }
          return { server, data: result };
        })
      );
      const successful = settled.filter((item) => item.status === "fulfilled").map((item) => item.value);
      const failedCount = settled.length - successful.length;
      if (successful.length === 0) {
        throw new Error("\u6240\u6709\u670D\u52A1\u5668\u62A5\u8868\u62C9\u53D6\u5931\u8D25");
      }
      setReport(mergeEmailReports(successful));
      if (failedCount > 0) {
        setStatus({
          type: "error",
          message: `\u5DF2\u6709 ${failedCount} \u53F0\u670D\u52A1\u5668\u62A5\u8868\u62C9\u53D6\u5931\u8D25\uFF0C\u5F53\u524D\u5C55\u793A\u53EF\u7528\u8282\u70B9\u6C47\u603B`
        });
      }
    } catch (error) {
      setStatus({
        type: "error",
        message: error?.message || "\u62C9\u53D6\u62A5\u8868\u5931\u8D25"
      });
    } finally {
      setReportLoading(false);
    }
  }, [currentToken, targetServers]);
  const runRetry = async () => {
    setReportLoading(true);
    try {
      if (!currentToken) {
        throw new Error("\u9274\u6743\u5931\u8D25\uFF0C\u8BF7\u91CD\u65B0\u767B\u5F55\u540E\u91CD\u8BD5");
      }
      if (targetServers.length === 0) {
        throw new Error("\u672A\u914D\u7F6E\u53EF\u7528\u670D\u52A1\u5668");
      }
      const settled = await Promise.allSettled(
        targetServers.map(async (server) => {
          const response = await fetch(buildServerUrl(server, EMAIL_ADMIN_ENDPOINTS.retryRun.path), {
            method: EMAIL_ADMIN_ENDPOINTS.retryRun.method,
            headers: {
              Authorization: `Bearer ${currentToken}`
            }
          });
          const result = await response.json().catch(() => ({}));
          if (!response.ok) {
            throw new Error(result.error || `\u91CD\u8BD5\u89E6\u53D1\u5931\u8D25: ${server}`);
          }
          return result;
        })
      );
      const successCount = settled.filter((item) => item.status === "fulfilled").length;
      const failedCount = settled.length - successCount;
      if (successCount === 0) {
        throw new Error("\u6240\u6709\u670D\u52A1\u5668\u91CD\u8BD5\u89E6\u53D1\u5931\u8D25");
      }
      await fetchReport();
      setStatus({
        type: "success",
        message: failedCount > 0 ? `\u5DF2\u89E6\u53D1 ${successCount} \u53F0\u670D\u52A1\u5668\u91CD\u8BD5\u961F\u5217\uFF0C${failedCount} \u53F0\u5931\u8D25` : `\u5DF2\u89E6\u53D1 ${successCount} \u53F0\u670D\u52A1\u5668\u91CD\u8BD5\u961F\u5217`
      });
    } catch (error) {
      setStatus({
        type: "error",
        message: error?.message || "\u89E6\u53D1\u91CD\u8BD5\u5931\u8D25"
      });
    } finally {
      setReportLoading(false);
    }
  };
  const resendFailedUsers = async () => {
    setResendFailedLoading(true);
    setStatus(null);
    try {
      if (!currentToken) {
        throw new Error("\u9274\u6743\u5931\u8D25\uFF0C\u8BF7\u91CD\u65B0\u767B\u5F55\u540E\u91CD\u8BD5");
      }
      if (targetServers.length === 0) {
        throw new Error("\u672A\u914D\u7F6E\u53EF\u7528\u670D\u52A1\u5668");
      }
      const reportSettled = await Promise.allSettled(
        targetServers.map(async (server) => {
          const response = await fetch(
            buildServerUrl(
              server,
              `${EMAIL_ADMIN_ENDPOINTS.report.path}?days=30&recent=all`
            ),
            {
              method: EMAIL_ADMIN_ENDPOINTS.report.method,
              headers: {
                Authorization: `Bearer ${currentToken}`
              }
            }
          );
          const result = await response.json().catch(() => ({}));
          if (!response.ok) {
            throw new Error(result.error || `\u8865\u53D1\u524D\u62A5\u8868\u62C9\u53D6\u5931\u8D25: ${server}`);
          }
          return { server, data: result };
        })
      );
      const successfulReports = reportSettled.filter((item) => item.status === "fulfilled").map((item) => item.value);
      const failedReportCount = reportSettled.length - successfulReports.length;
      if (successfulReports.length === 0) {
        throw new Error("\u6240\u6709\u670D\u52A1\u5668\u62A5\u8868\u62C9\u53D6\u5931\u8D25\uFF0C\u65E0\u6CD5\u5B89\u5168\u8865\u53D1");
      }
      const replayPlan = buildReengagementReplayPlan(successfulReports);
      const planEntries = Array.from(replayPlan.entries()).filter(([, userIds]) => userIds.length > 0);
      const plannedUserCount = planEntries.reduce((acc, [, userIds]) => acc + userIds.length, 0);
      if (plannedUserCount === 0) {
        setStatus({
          type: "success",
          message: failedReportCount > 0 ? `\u672A\u53D1\u73B0\u9700\u8981\u8865\u53D1\u7684 reengagement \u7528\u6237\uFF08${failedReportCount} \u53F0\u670D\u52A1\u5668\u62A5\u8868\u62C9\u53D6\u5931\u8D25\uFF09` : "\u672A\u53D1\u73B0\u9700\u8981\u8865\u53D1\u7684 reengagement \u7528\u6237"
        });
        await fetchReport();
        return;
      }
      const replaySettled = await Promise.allSettled(
        planEntries.map(async ([server, userIds]) => {
          const replayResponse = await fetch(
            buildServerUrl(
              server,
              `${EMAIL_ADMIN_ENDPOINTS.replayFailures.path}?days=30&recent=all&tags=reengagement`
            ),
            {
              method: EMAIL_ADMIN_ENDPOINTS.replayFailures.method,
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${currentToken}`
              },
              body: JSON.stringify({ userIds })
            }
          );
          const replayResult = await replayResponse.json().catch(() => ({}));
          if (!replayResponse.ok) {
            throw new Error(replayResult.error || `\u4E00\u952E\u8865\u53D1\u5931\u8D25: ${server}`);
          }
          return replayResult;
        })
      );
      const successfulReplays = replaySettled.filter((item) => item.status === "fulfilled").map((item) => item.value);
      const failedReplayCount = replaySettled.length - successfulReplays.length;
      if (successfulReplays.length === 0) {
        throw new Error("\u8865\u53D1\u6267\u884C\u5931\u8D25\uFF1A\u6240\u6709\u8BA1\u5212\u8282\u70B9\u90FD\u8BF7\u6C42\u5931\u8D25");
      }
      const replayed = successfulReplays.reduce((acc, item) => acc + toSafeNumber(item?.replayed), 0);
      const queued = successfulReplays.reduce((acc, item) => acc + toSafeNumber(item?.queued), 0);
      const failed = successfulReplays.reduce((acc, item) => acc + toSafeNumber(item?.failed), 0);
      const skippedByReplayCooldown = successfulReplays.reduce(
        (acc, item) => acc + toSafeNumber(item?.skippedByReplayCooldown),
        0
      );
      const degradedNodes = failedReportCount + failedReplayCount;
      setStatus({
        type: "success",
        message: degradedNodes > 0 ? `reengagement \u8865\u53D1\u5B8C\u6210\uFF1A\u8BA1\u5212 ${plannedUserCount}\uFF0C\u6210\u529F ${replayed}\uFF0C\u5165\u961F ${queued}\uFF0C\u5931\u8D25 ${failed}\uFF0C\u51B7\u5374\u8DF3\u8FC7 ${skippedByReplayCooldown}\uFF08${degradedNodes} \u53F0\u670D\u52A1\u5668\u5F02\u5E38\uFF09` : `reengagement \u8865\u53D1\u5B8C\u6210\uFF1A\u8BA1\u5212 ${plannedUserCount}\uFF0C\u6210\u529F ${replayed}\uFF0C\u5165\u961F ${queued}\uFF0C\u5931\u8D25 ${failed}\uFF0C\u51B7\u5374\u8DF3\u8FC7 ${skippedByReplayCooldown}`
      });
      await fetchReport();
    } catch (error) {
      setStatus({
        type: "error",
        message: error?.message || "\u4E00\u952E\u8865\u53D1\u5931\u8D25"
      });
    } finally {
      setResendFailedLoading(false);
    }
  };
  const pauseLowBalanceReminder = async () => {
    setPauseLowBalanceLoading(true);
    setStatus(null);
    try {
      if (!currentToken) {
        throw new Error("\u9274\u6743\u5931\u8D25\uFF0C\u8BF7\u91CD\u65B0\u767B\u5F55\u540E\u91CD\u8BD5");
      }
      if (targetServers.length === 0) {
        throw new Error("\u672A\u914D\u7F6E\u53EF\u7528\u670D\u52A1\u5668");
      }
      const settled = await Promise.allSettled(
        targetServers.map(async (server) => {
          const response = await fetch(
            buildServerUrl(server, EMAIL_ADMIN_ENDPOINTS.configUpdate.path),
            {
              method: EMAIL_ADMIN_ENDPOINTS.configUpdate.method,
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${currentToken}`
              },
              body: JSON.stringify({
                config: {
                  EMAIL_LOW_BALANCE_THRESHOLD: -1
                }
              })
            }
          );
          const result = await response.json().catch(() => ({}));
          if (!response.ok) {
            throw new Error(result.error || `\u5173\u95ED\u4F4E\u4F59\u989D\u63D0\u9192\u5931\u8D25: ${server}`);
          }
          return result;
        })
      );
      const successCount = settled.filter((item) => item.status === "fulfilled").length;
      const failedCount = settled.length - successCount;
      if (successCount === 0) {
        throw new Error("\u6240\u6709\u670D\u52A1\u5668\u90FD\u672A\u6210\u529F\u5173\u95ED\u4F4E\u4F59\u989D\u63D0\u9192");
      }
      setStatus({
        type: "success",
        message: failedCount > 0 ? `\u5DF2\u5728 ${successCount} \u53F0\u670D\u52A1\u5668\u5173\u95ED low-balance-reminder\uFF0C${failedCount} \u53F0\u5931\u8D25` : `\u5DF2\u4E34\u65F6\u5173\u95ED low-balance-reminder\uFF08\u5171 ${successCount} \u53F0\u670D\u52A1\u5668\uFF09`
      });
    } catch (error) {
      setStatus({
        type: "error",
        message: error?.message || "\u5173\u95ED\u4F4E\u4F59\u989D\u63D0\u9192\u5931\u8D25"
      });
    } finally {
      setPauseLowBalanceLoading(false);
    }
  };
  const unfreezeEmailDelivery = async () => {
    setUnfreezeEmailLoading(true);
    setStatus(null);
    try {
      if (!currentToken) {
        throw new Error("\u9274\u6743\u5931\u8D25\uFF0C\u8BF7\u91CD\u65B0\u767B\u5F55\u540E\u91CD\u8BD5");
      }
      if (targetServers.length === 0) {
        throw new Error("\u672A\u914D\u7F6E\u53EF\u7528\u670D\u52A1\u5668");
      }
      const settled = await Promise.allSettled(
        targetServers.map(async (server) => {
          const response = await fetch(
            buildServerUrl(server, EMAIL_ADMIN_ENDPOINTS.configUpdate.path),
            {
              method: EMAIL_ADMIN_ENDPOINTS.configUpdate.method,
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${currentToken}`
              },
              body: JSON.stringify({
                config: {
                  EMAIL_ONLY_SIGNUP_WELCOME_ENABLED: false
                }
              })
            }
          );
          const result = await response.json().catch(() => ({}));
          if (!response.ok) {
            throw new Error(result.error || `\u89E3\u9664\u90AE\u4EF6\u51BB\u7ED3\u5931\u8D25: ${server}`);
          }
          return result;
        })
      );
      const successCount = settled.filter((item) => item.status === "fulfilled").length;
      const failedCount = settled.length - successCount;
      if (successCount === 0) {
        throw new Error("\u6240\u6709\u670D\u52A1\u5668\u90FD\u672A\u6210\u529F\u89E3\u9664\u90AE\u4EF6\u51BB\u7ED3");
      }
      setStatus({
        type: "success",
        message: failedCount > 0 ? `\u5DF2\u5728 ${successCount} \u53F0\u670D\u52A1\u5668\u89E3\u9664\u90AE\u4EF6\u51BB\u7ED3\uFF0C${failedCount} \u53F0\u5931\u8D25` : `\u5DF2\u89E3\u9664\u90AE\u4EF6\u51BB\u7ED3\uFF08\u5171 ${successCount} \u53F0\u670D\u52A1\u5668\uFF09`
      });
    } catch (error) {
      setStatus({
        type: "error",
        message: error?.message || "\u89E3\u9664\u90AE\u4EF6\u51BB\u7ED3\u5931\u8D25"
      });
    } finally {
      setUnfreezeEmailLoading(false);
    }
  };
  const updateReengagementDeliveryMode = async (mode) => {
    setReengagementDeliveryUpdating(mode);
    setStatus(null);
    try {
      if (!currentToken) {
        throw new Error("\u9274\u6743\u5931\u8D25\uFF0C\u8BF7\u91CD\u65B0\u767B\u5F55\u540E\u91CD\u8BD5");
      }
      if (targetServers.length === 0) {
        throw new Error("\u672A\u914D\u7F6E\u53EF\u7528\u670D\u52A1\u5668");
      }
      const normalizedSegmentId = reengagementMarketingSegmentId.trim();
      if (mode === "marketing" && !normalizedSegmentId) {
        throw new Error("\u8BF7\u5148\u586B\u5199 reengagement Marketing Segment ID");
      }
      const config = mode === "marketing" ? {
        EMAIL_REENGAGEMENT_DELIVERY_MODE: "marketing",
        EMAIL_REENGAGEMENT_MARKETING_SEGMENT_ID: normalizedSegmentId
      } : {
        EMAIL_REENGAGEMENT_DELIVERY_MODE: "transactional",
        EMAIL_REENGAGEMENT_MARKETING_SEGMENT_ID: null
      };
      const settled = await Promise.allSettled(
        targetServers.map(async (server) => {
          const response = await fetch(
            buildServerUrl(server, EMAIL_ADMIN_ENDPOINTS.configUpdate.path),
            {
              method: EMAIL_ADMIN_ENDPOINTS.configUpdate.method,
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${currentToken}`
              },
              body: JSON.stringify({ config })
            }
          );
          const result = await response.json().catch(() => ({}));
          if (!response.ok) {
            throw new Error(result.error || `\u66F4\u65B0 reengagement \u6295\u9012\u6A21\u5F0F\u5931\u8D25: ${server}`);
          }
          return result;
        })
      );
      const successCount = settled.filter((item) => item.status === "fulfilled").length;
      const failedCount = settled.length - successCount;
      if (successCount === 0) {
        throw new Error("\u6240\u6709\u670D\u52A1\u5668\u90FD\u672A\u6210\u529F\u66F4\u65B0 reengagement \u6295\u9012\u6A21\u5F0F");
      }
      setStatus({
        type: "success",
        message: mode === "marketing" ? failedCount > 0 ? `\u5DF2\u5728 ${successCount} \u53F0\u670D\u52A1\u5668\u542F\u7528 reengagement Marketing\uFF08segment: ${normalizedSegmentId}\uFF09\uFF0C${failedCount} \u53F0\u5931\u8D25` : `\u5DF2\u542F\u7528 reengagement Marketing\uFF08segment: ${normalizedSegmentId}\uFF0C\u5171 ${successCount} \u53F0\u670D\u52A1\u5668\uFF09` : failedCount > 0 ? `\u5DF2\u5728 ${successCount} \u53F0\u670D\u52A1\u5668\u5207\u56DE reengagement Transactional\uFF0C${failedCount} \u53F0\u5931\u8D25` : `\u5DF2\u5207\u56DE reengagement Transactional\uFF08\u5171 ${successCount} \u53F0\u670D\u52A1\u5668\uFF09`
      });
    } catch (error) {
      setStatus({
        type: "error",
        message: error?.message || "\u66F4\u65B0 reengagement \u6295\u9012\u6A21\u5F0F\u5931\u8D25"
      });
    } finally {
      setReengagementDeliveryUpdating(null);
    }
  };
  (0, import_react.useEffect)(() => {
    if (!isAdmin) return;
    void fetchReport();
  }, [isAdmin, fetchReport]);
  const onSubmit = async (data) => {
    setLoading(true);
    setStatus(null);
    try {
      if (!currentServer) {
        throw new Error("\u672A\u914D\u7F6E\u53EF\u7528\u670D\u52A1\u5668");
      }
      const response = await fetch(buildServerUrl(currentServer, EMAIL_ADMIN_ENDPOINTS.sendEmail.path), {
        method: EMAIL_ADMIN_ENDPOINTS.sendEmail.method,
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${currentToken}`
        },
        body: JSON.stringify({
          subject: data.subject,
          body: data.body,
          isHtml: data.isHtml,
          userIds: data.userIds ? data.userIds.split(",").map((s) => s.trim()) : void 0
        })
      });
      const result = await response.json();
      if (response.ok) {
        setStatus({
          type: "success",
          message: `\u6210\u529F\u53D1\u9001 ${result.sentCount} \u5C01\u90AE\u4EF6\u3002${result.failedCount > 0 ? `\u5931\u8D25 ${result.failedCount} \u5C01\u3002` : ""}`
        });
        reset();
      } else {
        setStatus({
          type: "error",
          message: result.error || "\u53D1\u9001\u90AE\u4EF6\u5931\u8D25"
        });
      }
    } catch (error) {
      console.error("Failed to send email:", error);
      setStatus({
        type: "error",
        message: "\u53D1\u9001\u90AE\u4EF6\u8FC7\u7A0B\u4E2D\u9047\u5230\u7F51\u7EDC\u9519\u8BEF"
      });
    } finally {
      setLoading(false);
    }
  };
  if (!isAdmin) {
    return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { maxWidth: 640, margin: "80px auto", padding: "0 24px", color: "var(--textSecondary)" }, children: "\u4EC5\u7CFB\u7EDF\u7BA1\u7406\u5458\u53EF\u8BBF\u95EE\u90AE\u4EF6\u7BA1\u7406\u9875\u9762\u3002" });
  }
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_jsx_runtime.Fragment, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "email-admin", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", { className: "email-admin__header", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", { className: "email-admin__title", children: "\u90AE\u4EF6\u8C03\u5EA6\u4E2D\u5FC3" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "email-admin__subtitle", children: "\u7CBE\u51C6\u89E6\u8FBE\u60A8\u7684\u7528\u6237\u3002\u652F\u6301 HTML \u6A21\u677F\u3001\u5B9A\u5411\u53D1\u9001\u53CA\u8BE6\u5C3D\u7684\u5B9E\u65F6\u6295\u9012\u62A5\u8868\u3002" })
    ] }),
    status && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: `email-admin__status email-admin__status--${status.type}`, children: [
      status.type === "success" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuCircleCheck, { size: 20, "aria-hidden": "true" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuCircleAlert, { size: 20, "aria-hidden": "true" }),
      status.message
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "email-admin__layout", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "email-admin__card", children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", { onSubmit: handleSubmit(onSubmit), className: "email-admin__form", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          Input,
          {
            label: "\u90AE\u4EF6\u4E3B\u9898",
            placeholder: "\u8F93\u5165\u5F15\u4EBA\u6CE8\u76EE\u7684\u4E3B\u9898...",
            icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuMail, { size: 16, "aria-hidden": "true" }),
            ...register("subject", { required: "\u8BF7\u8F93\u5165\u4E3B\u9898" }),
            error: !!errors.subject
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "4px 0" }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { fontSize: "0.875rem", fontWeight: 600 }, children: "HTML \u6A21\u5F0F" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { fontSize: "0.75rem", color: "var(--textSecondary)" }, children: "\u542F\u7528\u5BCC\u6587\u672C\u6E32\u67D3\u652F\u6301" })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
            Switch,
            {
              ...register("isHtml")
            }
          )
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          TextArea,
          {
            label: "\u90AE\u4EF6\u6B63\u6587",
            placeholder: "\u5728\u6B64\u7F16\u5199\u90AE\u4EF6\u5185\u5BB9\uFF0C\u652F\u6301 HTML \u6807\u7B7E...",
            rows: 12,
            autoResize: true,
            ...register("body", { required: "\u8BF7\u8F93\u5165\u6B63\u6587" }),
            error: !!errors.body
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          Input,
          {
            label: "\u5B9A\u5411\u53D1\u9001 (\u53EF\u9009)",
            placeholder: "\u8F93\u5165\u7528\u6237 ID\uFF0C\u7528\u9017\u53F7\u5206\u9694\uFF08\u5982\uFF1A1001, 1002\uFF09",
            icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuUsers, { size: 16, "aria-hidden": "true" }),
            ...register("userIds")
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          Button_default,
          {
            variant: "primary",
            type: "submit",
            loading,
            icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuSend, { size: 18, "aria-hidden": "true" }),
            block: true,
            style: { height: "48px", fontSize: "1rem", marginTop: "8px" },
            children: loading ? "\u6B63\u5728\u6295\u9012\u961F\u5217..." : "\u7ACB\u5373\u7FA4\u53D1\u90AE\u4EF6"
          }
        )
      ] }) }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "email-admin__preview-section", children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "email-admin__card", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h2", { className: "email-admin__section-title", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuMail, { size: 20, "aria-hidden": "true" }),
          " \u5185\u5BB9\u5B9E\u65F6\u9884\u89C8"
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "email-admin__preview-window", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "email-admin__preview-header", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { color: "var(--textSecondary)" }, children: "\u4E3B\u9898:" }),
            " ",
            subject || /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { opacity: 0.5 }, children: "(\u6682\u65E0\u4E3B\u9898)" })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "email-admin__preview-body", children: isHtml ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { dangerouslySetInnerHTML: { __html: body } }) : body || /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { color: "var(--textSecondary)", opacity: 0.5, textAlign: "center", marginTop: "100px" }, children: "\u5F85\u8F93\u5165\u7684\u90AE\u4EF6\u6B63\u6587\u5C06\u5728\u6B64\u5448\u73B0\u9884\u89C8\u6548\u679C..." }) })
        ] })
      ] }) })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { className: "email-admin__report", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "email-admin__report-header", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h2", { className: "email-admin__section-title", style: { marginBottom: 0 }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuMail, { size: 20, "aria-hidden": "true" }),
          " \u6295\u9012\u8D28\u91CF\u62A5\u8868 (\u8FD17\u5929)"
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { display: "flex", gap: "12px" }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
            Button_default,
            {
              variant: "secondary",
              onClick: () => void fetchReport(),
              loading: reportLoading,
              size: "small",
              children: "\u5237\u65B0\u6570\u636E"
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
            Button_default,
            {
              variant: "secondary",
              onClick: () => void runRetry(),
              loading: reportLoading,
              size: "small",
              children: "\u6FC0\u6D3B\u91CD\u8BD5\u961F\u5217"
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
            Button_default,
            {
              variant: "secondary",
              onClick: () => void resendFailedUsers(),
              loading: resendFailedLoading,
              size: "small",
              children: "\u4E00\u952E\u8865\u53D1 reengagement"
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
            Button_default,
            {
              variant: "secondary",
              onClick: () => void pauseLowBalanceReminder(),
              loading: pauseLowBalanceLoading,
              size: "small",
              children: "\u6682\u505C low-balance-reminder"
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
            Button_default,
            {
              variant: "secondary",
              onClick: () => void unfreezeEmailDelivery(),
              loading: unfreezeEmailLoading,
              size: "small",
              children: "\u89E3\u9664\u90AE\u4EF6\u51BB\u7ED3"
            }
          )
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
        "div",
        {
          style: {
            display: "flex",
            gap: "10px",
            alignItems: "center",
            flexWrap: "wrap",
            marginBottom: "16px"
          },
          children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
              "input",
              {
                value: reengagementMarketingSegmentId,
                onChange: (event) => setReengagementMarketingSegmentId(event.target.value),
                placeholder: "reengagement Marketing Segment ID",
                style: {
                  minWidth: "280px",
                  padding: "8px 10px",
                  borderRadius: "8px",
                  border: "1px solid var(--border)",
                  background: "var(--background)",
                  color: "var(--text)"
                }
              }
            ),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
              Button_default,
              {
                variant: "secondary",
                onClick: () => void updateReengagementDeliveryMode("marketing"),
                loading: reengagementDeliveryUpdating === "marketing",
                size: "small",
                children: "reengagement \u5207\u5230 Marketing"
              }
            ),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
              Button_default,
              {
                variant: "secondary",
                onClick: () => void updateReengagementDeliveryMode("transactional"),
                loading: reengagementDeliveryUpdating === "transactional",
                size: "small",
                children: "reengagement \u5207\u56DE Transactional"
              }
            )
          ]
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "email-admin__stats-grid", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "email-admin__stat-card", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "email-admin__stat-label", children: "\u53D1\u9001\u6210\u529F" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "email-admin__stat-value", style: { color: "#10b981" }, children: report?.totals?.sent ?? 0 })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "email-admin__stat-card", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "email-admin__stat-label", children: "\u53D1\u9001\u5931\u8D25" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "email-admin__stat-value", style: { color: report?.totals?.failed ? "#ef4444" : "var(--text)" }, children: report?.totals?.failed ?? 0 })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "email-admin__stat-card", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "email-admin__stat-label", children: "\u91CD\u8BD5\u6210\u529F" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "email-admin__stat-value", style: { color: "#3b82f6" }, children: report?.totals?.retried ?? 0 })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "email-admin__stat-card", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "email-admin__stat-label", children: "\u8C03\u5EA6\u5165\u961F" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "email-admin__stat-value", children: report?.totals?.queued ?? 0 })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "email-admin__stat-card", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "email-admin__stat-label", children: "\u5F85\u5904\u7406\u91CD\u8BD5" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "email-admin__stat-value", children: report?.totals?.pendingRetryCount ?? 0 })
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "email-admin__layout", style: { gridTemplateColumns: "1fr 1fr" }, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { className: "email-admin__section-title", style: { fontSize: "1rem" }, children: "\u6BCF\u65E5\u8D8B\u52BF\u6982\u89C8" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "email-admin__table-container", children: [
            (report?.stats || []).slice(0, 10).map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "email-admin__list-item", children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { fontWeight: 600 }, children: item.dayKey }),
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { marginLeft: "8px", color: "var(--textSecondary)" }, children: item.tag })
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { fontVariantNumeric: "tabular-nums" }, children: [
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { title: "\u6210\u529F", style: { color: "#10b981" }, children: item.sent }),
                " /",
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { title: "\u5931\u8D25", style: { color: "#ef4444", marginLeft: "4px" }, children: item.failed }),
                " /",
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { title: "\u91CD\u8BD5", style: { color: "#3b82f6", marginLeft: "4px" }, children: item.retried })
              ] })
            ] }, `${item.dayKey}-${item.tag}`)),
            (!report?.stats || report.stats.length === 0) && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { padding: "40px", textAlign: "center", color: "var(--textSecondary)" }, children: "\u6682\u65E0\u5468\u671F\u6570\u636E" })
          ] })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { className: "email-admin__section-title", style: { fontSize: "1rem" }, children: "\u5F02\u5E38\u6295\u9012\u6837\u672C (Recent Failures)" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "email-admin__table-container", children: [
            (report?.recentFailures || []).map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "email-admin__failure-item", children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "email-admin__failure-meta", children: [
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: new Date(item.timestamp).toLocaleString() }),
                /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
                  "\u5C1D\u8BD5: ",
                  item.attempt
                ] })
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { fontSize: "0.75rem", color: "var(--textSecondary)", marginBottom: "4px" }, children: [
                "To: ",
                item.to
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "email-admin__failure-subject", children: item.subject }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "email-admin__failure-error", children: item.error || "\u672A\u77E5\u7F51\u7EDC\u6216\u4E2D\u95F4\u4EF6\u9519\u8BEF" })
            ] }, item.id)),
            (!report?.recentFailures || report.recentFailures.length === 0) && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { padding: "40px", textAlign: "center", color: "var(--textSecondary)" }, children: "\u5F53\u524D\u7CFB\u7EDF\u8FD0\u884C\u7A33\u5065\uFF0C\u672A\u53D1\u73B0\u5F02\u5E38\u6837\u672C" })
          ] })
        ] })
      ] })
    ] })
  ] }) });
};
var EmailAdmin_default = EmailAdmin;
export {
  EmailAdmin_default as default
};
