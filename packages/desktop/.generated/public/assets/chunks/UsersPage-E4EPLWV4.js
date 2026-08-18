import {
  Pagination
} from "/public/assets/chunks/chunk-GVD2EAH6.js";
import {
  ADMIN_PAGE_PATHS,
  ADMIN_PERMISSION_DEFINITIONS
} from "/public/assets/chunks/chunk-4BEOT5EM.js";
import "/public/assets/chunks/chunk-45KYWPDW.js";
import "/public/assets/chunks/chunk-HWC2ZOVH.js";
import {
  formatCredits
} from "/public/assets/chunks/chunk-FXB3NEER.js";
import {
  SearchInput_default
} from "/public/assets/chunks/chunk-6RIRH2EC.js";
import "/public/assets/chunks/chunk-LVVUA2RZ.js";
import {
  BaseTable,
  BaseTableCell,
  BaseTableRow
} from "/public/assets/chunks/chunk-QJUZO4YG.js";
import "/public/assets/chunks/chunk-VPAVB2J5.js";
import {
  deleteUserAcrossServers,
  fetchAcrossServers
} from "/public/assets/chunks/chunk-IA3XQPBZ.js";
import {
  ConfirmModal
} from "/public/assets/chunks/chunk-EPKZ4DTY.js";
import {
  require_browser
} from "/public/assets/chunks/chunk-2CATDSNY.js";
import {
  Dialog
} from "/public/assets/chunks/chunk-7HTHEFUV.js";
import {
  Button_default
} from "/public/assets/chunks/chunk-252FCKHS.js";
import "/public/assets/chunks/chunk-XTMQULJ5.js";
import "/public/assets/chunks/chunk-B4ZQOXFP.js";
import {
  useNavigate,
  useSearchParams
} from "/public/assets/chunks/chunk-BELEJNOF.js";
import {
  useAppDispatch,
  useAppSelector
} from "/public/assets/chunks/chunk-U73LCHVO.js";
import "/public/assets/chunks/chunk-O47BZ5SQ.js";
import {
  authRoutes,
  buildFormatLongFn,
  buildLocalizeFn,
  buildMatchFn,
  buildMatchPatternFn,
  formatDistanceToNow,
  isAbortError,
  requiredArgs,
  selectCurrentToken,
  selectRemoteServer,
  selectRemoteServers,
  startOfUTCWeek,
  toast,
  ulid,
  write
} from "/public/assets/chunks/chunk-RWWUEPWY.js";
import "/public/assets/chunks/chunk-IJ3A6Q7E.js";
import "/public/assets/chunks/chunk-PN3BZAFX.js";
import "/public/assets/chunks/chunk-CILBJ2I2.js";
import {
  LuCreditCard
} from "/public/assets/chunks/chunk-GQPLRP65.js";
import {
  useTranslation
} from "/public/assets/chunks/chunk-UWXJIOEO.js";
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
import "/public/assets/chunks/chunk-VCXOIOLL.js";
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

// packages/auth/web/UsersPage.tsx
var import_react8 = __toESM(require_react(), 1);

// node_modules/date-fns/esm/_lib/isSameUTCWeek/index.js
function isSameUTCWeek(dirtyDateLeft, dirtyDateRight, options) {
  requiredArgs(2, arguments);
  var dateLeftStartOfWeek = startOfUTCWeek(dirtyDateLeft, options);
  var dateRightStartOfWeek = startOfUTCWeek(dirtyDateRight, options);
  return dateLeftStartOfWeek.getTime() === dateRightStartOfWeek.getTime();
}

// node_modules/date-fns/esm/locale/zh-CN/_lib/formatDistance/index.js
var formatDistanceLocale = {
  lessThanXSeconds: {
    one: "\u4E0D\u5230 1 \u79D2",
    other: "\u4E0D\u5230 {{count}} \u79D2"
  },
  xSeconds: {
    one: "1 \u79D2",
    other: "{{count}} \u79D2"
  },
  halfAMinute: "\u534A\u5206\u949F",
  lessThanXMinutes: {
    one: "\u4E0D\u5230 1 \u5206\u949F",
    other: "\u4E0D\u5230 {{count}} \u5206\u949F"
  },
  xMinutes: {
    one: "1 \u5206\u949F",
    other: "{{count}} \u5206\u949F"
  },
  xHours: {
    one: "1 \u5C0F\u65F6",
    other: "{{count}} \u5C0F\u65F6"
  },
  aboutXHours: {
    one: "\u5927\u7EA6 1 \u5C0F\u65F6",
    other: "\u5927\u7EA6 {{count}} \u5C0F\u65F6"
  },
  xDays: {
    one: "1 \u5929",
    other: "{{count}} \u5929"
  },
  aboutXWeeks: {
    one: "\u5927\u7EA6 1 \u4E2A\u661F\u671F",
    other: "\u5927\u7EA6 {{count}} \u4E2A\u661F\u671F"
  },
  xWeeks: {
    one: "1 \u4E2A\u661F\u671F",
    other: "{{count}} \u4E2A\u661F\u671F"
  },
  aboutXMonths: {
    one: "\u5927\u7EA6 1 \u4E2A\u6708",
    other: "\u5927\u7EA6 {{count}} \u4E2A\u6708"
  },
  xMonths: {
    one: "1 \u4E2A\u6708",
    other: "{{count}} \u4E2A\u6708"
  },
  aboutXYears: {
    one: "\u5927\u7EA6 1 \u5E74",
    other: "\u5927\u7EA6 {{count}} \u5E74"
  },
  xYears: {
    one: "1 \u5E74",
    other: "{{count}} \u5E74"
  },
  overXYears: {
    one: "\u8D85\u8FC7 1 \u5E74",
    other: "\u8D85\u8FC7 {{count}} \u5E74"
  },
  almostXYears: {
    one: "\u5C06\u8FD1 1 \u5E74",
    other: "\u5C06\u8FD1 {{count}} \u5E74"
  }
};
var formatDistance = function formatDistance2(token, count, options) {
  var result;
  var tokenValue = formatDistanceLocale[token];
  if (typeof tokenValue === "string") {
    result = tokenValue;
  } else if (count === 1) {
    result = tokenValue.one;
  } else {
    result = tokenValue.other.replace("{{count}}", String(count));
  }
  if (options !== null && options !== void 0 && options.addSuffix) {
    if (options.comparison && options.comparison > 0) {
      return result + "\u5185";
    } else {
      return result + "\u524D";
    }
  }
  return result;
};
var formatDistance_default = formatDistance;

// node_modules/date-fns/esm/locale/zh-CN/_lib/formatLong/index.js
var dateFormats = {
  full: "y'\u5E74'M'\u6708'd'\u65E5' EEEE",
  long: "y'\u5E74'M'\u6708'd'\u65E5'",
  medium: "yyyy-MM-dd",
  short: "yy-MM-dd"
};
var timeFormats = {
  full: "zzzz a h:mm:ss",
  long: "z a h:mm:ss",
  medium: "a h:mm:ss",
  short: "a h:mm"
};
var dateTimeFormats = {
  full: "{{date}} {{time}}",
  long: "{{date}} {{time}}",
  medium: "{{date}} {{time}}",
  short: "{{date}} {{time}}"
};
var formatLong = {
  date: buildFormatLongFn({
    formats: dateFormats,
    defaultWidth: "full"
  }),
  time: buildFormatLongFn({
    formats: timeFormats,
    defaultWidth: "full"
  }),
  dateTime: buildFormatLongFn({
    formats: dateTimeFormats,
    defaultWidth: "full"
  })
};
var formatLong_default = formatLong;

// node_modules/date-fns/esm/locale/zh-CN/_lib/formatRelative/index.js
function checkWeek(date, baseDate, options) {
  var baseFormat = "eeee p";
  if (isSameUTCWeek(date, baseDate, options)) {
    return baseFormat;
  } else if (date.getTime() > baseDate.getTime()) {
    return "'\u4E0B\u4E2A'" + baseFormat;
  }
  return "'\u4E0A\u4E2A'" + baseFormat;
}
var formatRelativeLocale = {
  lastWeek: checkWeek,
  // days before yesterday, maybe in this week or last week
  yesterday: "'\u6628\u5929' p",
  today: "'\u4ECA\u5929' p",
  tomorrow: "'\u660E\u5929' p",
  nextWeek: checkWeek,
  // days after tomorrow, maybe in this week or next week
  other: "PP p"
};
var formatRelative = function formatRelative2(token, date, baseDate, options) {
  var format = formatRelativeLocale[token];
  if (typeof format === "function") {
    return format(date, baseDate, options);
  }
  return format;
};
var formatRelative_default = formatRelative;

// node_modules/date-fns/esm/locale/zh-CN/_lib/localize/index.js
var eraValues = {
  narrow: ["\u524D", "\u516C\u5143"],
  abbreviated: ["\u524D", "\u516C\u5143"],
  wide: ["\u516C\u5143\u524D", "\u516C\u5143"]
};
var quarterValues = {
  narrow: ["1", "2", "3", "4"],
  abbreviated: ["\u7B2C\u4E00\u5B63", "\u7B2C\u4E8C\u5B63", "\u7B2C\u4E09\u5B63", "\u7B2C\u56DB\u5B63"],
  wide: ["\u7B2C\u4E00\u5B63\u5EA6", "\u7B2C\u4E8C\u5B63\u5EA6", "\u7B2C\u4E09\u5B63\u5EA6", "\u7B2C\u56DB\u5B63\u5EA6"]
};
var monthValues = {
  narrow: ["\u4E00", "\u4E8C", "\u4E09", "\u56DB", "\u4E94", "\u516D", "\u4E03", "\u516B", "\u4E5D", "\u5341", "\u5341\u4E00", "\u5341\u4E8C"],
  abbreviated: ["1\u6708", "2\u6708", "3\u6708", "4\u6708", "5\u6708", "6\u6708", "7\u6708", "8\u6708", "9\u6708", "10\u6708", "11\u6708", "12\u6708"],
  wide: ["\u4E00\u6708", "\u4E8C\u6708", "\u4E09\u6708", "\u56DB\u6708", "\u4E94\u6708", "\u516D\u6708", "\u4E03\u6708", "\u516B\u6708", "\u4E5D\u6708", "\u5341\u6708", "\u5341\u4E00\u6708", "\u5341\u4E8C\u6708"]
};
var dayValues = {
  narrow: ["\u65E5", "\u4E00", "\u4E8C", "\u4E09", "\u56DB", "\u4E94", "\u516D"],
  short: ["\u65E5", "\u4E00", "\u4E8C", "\u4E09", "\u56DB", "\u4E94", "\u516D"],
  abbreviated: ["\u5468\u65E5", "\u5468\u4E00", "\u5468\u4E8C", "\u5468\u4E09", "\u5468\u56DB", "\u5468\u4E94", "\u5468\u516D"],
  wide: ["\u661F\u671F\u65E5", "\u661F\u671F\u4E00", "\u661F\u671F\u4E8C", "\u661F\u671F\u4E09", "\u661F\u671F\u56DB", "\u661F\u671F\u4E94", "\u661F\u671F\u516D"]
};
var dayPeriodValues = {
  narrow: {
    am: "\u4E0A",
    pm: "\u4E0B",
    midnight: "\u51CC\u6668",
    noon: "\u5348",
    morning: "\u65E9",
    afternoon: "\u4E0B\u5348",
    evening: "\u665A",
    night: "\u591C"
  },
  abbreviated: {
    am: "\u4E0A\u5348",
    pm: "\u4E0B\u5348",
    midnight: "\u51CC\u6668",
    noon: "\u4E2D\u5348",
    morning: "\u65E9\u6668",
    afternoon: "\u4E2D\u5348",
    evening: "\u665A\u4E0A",
    night: "\u591C\u95F4"
  },
  wide: {
    am: "\u4E0A\u5348",
    pm: "\u4E0B\u5348",
    midnight: "\u51CC\u6668",
    noon: "\u4E2D\u5348",
    morning: "\u65E9\u6668",
    afternoon: "\u4E2D\u5348",
    evening: "\u665A\u4E0A",
    night: "\u591C\u95F4"
  }
};
var formattingDayPeriodValues = {
  narrow: {
    am: "\u4E0A",
    pm: "\u4E0B",
    midnight: "\u51CC\u6668",
    noon: "\u5348",
    morning: "\u65E9",
    afternoon: "\u4E0B\u5348",
    evening: "\u665A",
    night: "\u591C"
  },
  abbreviated: {
    am: "\u4E0A\u5348",
    pm: "\u4E0B\u5348",
    midnight: "\u51CC\u6668",
    noon: "\u4E2D\u5348",
    morning: "\u65E9\u6668",
    afternoon: "\u4E2D\u5348",
    evening: "\u665A\u4E0A",
    night: "\u591C\u95F4"
  },
  wide: {
    am: "\u4E0A\u5348",
    pm: "\u4E0B\u5348",
    midnight: "\u51CC\u6668",
    noon: "\u4E2D\u5348",
    morning: "\u65E9\u6668",
    afternoon: "\u4E2D\u5348",
    evening: "\u665A\u4E0A",
    night: "\u591C\u95F4"
  }
};
var ordinalNumber = function ordinalNumber2(dirtyNumber, options) {
  var number = Number(dirtyNumber);
  switch (options === null || options === void 0 ? void 0 : options.unit) {
    case "date":
      return number.toString() + "\u65E5";
    case "hour":
      return number.toString() + "\u65F6";
    case "minute":
      return number.toString() + "\u5206";
    case "second":
      return number.toString() + "\u79D2";
    default:
      return "\u7B2C " + number.toString();
  }
};
var localize = {
  ordinalNumber,
  era: buildLocalizeFn({
    values: eraValues,
    defaultWidth: "wide"
  }),
  quarter: buildLocalizeFn({
    values: quarterValues,
    defaultWidth: "wide",
    argumentCallback: function argumentCallback(quarter) {
      return quarter - 1;
    }
  }),
  month: buildLocalizeFn({
    values: monthValues,
    defaultWidth: "wide"
  }),
  day: buildLocalizeFn({
    values: dayValues,
    defaultWidth: "wide"
  }),
  dayPeriod: buildLocalizeFn({
    values: dayPeriodValues,
    defaultWidth: "wide",
    formattingValues: formattingDayPeriodValues,
    defaultFormattingWidth: "wide"
  })
};
var localize_default = localize;

// node_modules/date-fns/esm/locale/zh-CN/_lib/match/index.js
var matchOrdinalNumberPattern = /^(第\s*)?\d+(日|时|分|秒)?/i;
var parseOrdinalNumberPattern = /\d+/i;
var matchEraPatterns = {
  narrow: /^(前)/i,
  abbreviated: /^(前)/i,
  wide: /^(公元前|公元)/i
};
var parseEraPatterns = {
  any: [/^(前)/i, /^(公元)/i]
};
var matchQuarterPatterns = {
  narrow: /^[1234]/i,
  abbreviated: /^第[一二三四]刻/i,
  wide: /^第[一二三四]刻钟/i
};
var parseQuarterPatterns = {
  any: [/(1|一)/i, /(2|二)/i, /(3|三)/i, /(4|四)/i]
};
var matchMonthPatterns = {
  narrow: /^(一|二|三|四|五|六|七|八|九|十[二一])/i,
  abbreviated: /^(一|二|三|四|五|六|七|八|九|十[二一]|\d|1[12])月/i,
  wide: /^(一|二|三|四|五|六|七|八|九|十[二一])月/i
};
var parseMonthPatterns = {
  narrow: [/^一/i, /^二/i, /^三/i, /^四/i, /^五/i, /^六/i, /^七/i, /^八/i, /^九/i, /^十(?!(一|二))/i, /^十一/i, /^十二/i],
  any: [/^一|1/i, /^二|2/i, /^三|3/i, /^四|4/i, /^五|5/i, /^六|6/i, /^七|7/i, /^八|8/i, /^九|9/i, /^十(?!(一|二))|10/i, /^十一|11/i, /^十二|12/i]
};
var matchDayPatterns = {
  narrow: /^[一二三四五六日]/i,
  short: /^[一二三四五六日]/i,
  abbreviated: /^周[一二三四五六日]/i,
  wide: /^星期[一二三四五六日]/i
};
var parseDayPatterns = {
  any: [/日/i, /一/i, /二/i, /三/i, /四/i, /五/i, /六/i]
};
var matchDayPeriodPatterns = {
  any: /^(上午?|下午?|午夜|[中正]午|早上?|下午|晚上?|凌晨|)/i
};
var parseDayPeriodPatterns = {
  any: {
    am: /^上午?/i,
    pm: /^下午?/i,
    midnight: /^午夜/i,
    noon: /^[中正]午/i,
    morning: /^早上/i,
    afternoon: /^下午/i,
    evening: /^晚上?/i,
    night: /^凌晨/i
  }
};
var match = {
  ordinalNumber: buildMatchPatternFn({
    matchPattern: matchOrdinalNumberPattern,
    parsePattern: parseOrdinalNumberPattern,
    valueCallback: function valueCallback(value) {
      return parseInt(value, 10);
    }
  }),
  era: buildMatchFn({
    matchPatterns: matchEraPatterns,
    defaultMatchWidth: "wide",
    parsePatterns: parseEraPatterns,
    defaultParseWidth: "any"
  }),
  quarter: buildMatchFn({
    matchPatterns: matchQuarterPatterns,
    defaultMatchWidth: "wide",
    parsePatterns: parseQuarterPatterns,
    defaultParseWidth: "any",
    valueCallback: function valueCallback2(index) {
      return index + 1;
    }
  }),
  month: buildMatchFn({
    matchPatterns: matchMonthPatterns,
    defaultMatchWidth: "wide",
    parsePatterns: parseMonthPatterns,
    defaultParseWidth: "any"
  }),
  day: buildMatchFn({
    matchPatterns: matchDayPatterns,
    defaultMatchWidth: "wide",
    parsePatterns: parseDayPatterns,
    defaultParseWidth: "any"
  }),
  dayPeriod: buildMatchFn({
    matchPatterns: matchDayPeriodPatterns,
    defaultMatchWidth: "any",
    parsePatterns: parseDayPeriodPatterns,
    defaultParseWidth: "any"
  })
};
var match_default = match;

// node_modules/date-fns/esm/locale/zh-CN/index.js
var locale = {
  code: "zh-CN",
  formatDistance: formatDistance_default,
  formatLong: formatLong_default,
  formatRelative: formatRelative_default,
  localize: localize_default,
  match: match_default,
  options: {
    weekStartsOn: 1,
    firstWeekContainsDate: 4
  }
};
var zh_CN_default = locale;

// packages/auth/hooks/useFetchUsers.ts
var import_react = __toESM(require_react(), 1);
var PAGE_SIZE = 10;
function useFetchUsers() {
  const serverUrl = useAppSelector(selectRemoteServer);
  const token = useAppSelector(selectCurrentToken);
  return (0, import_react.useCallback)(
    async (page, search) => {
      if (!serverUrl || !token) {
        return null;
      }
      const path = authRoutes.users.list.createPath();
      const url = new URL(`${serverUrl}${path}`);
      url.searchParams.append("page", page.toString());
      url.searchParams.append("pageSize", PAGE_SIZE.toString());
      if (search) {
        url.searchParams.append("search", search);
      }
      try {
        const response = await fetch(url.toString(), {
          method: authRoutes.users.list.method,
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        if (!response.ok) {
          const errorMessage = `HTTP error! status: ${response.status}`;
          throw new Error(errorMessage);
        }
        const data = await response.json();
        return data;
      } catch (err) {
        throw err;
      }
    },
    [serverUrl, token]
  );
}

// packages/auth/hooks/useDeleteUser.ts
var import_react2 = __toESM(require_react(), 1);
var import_pino = __toESM(require_browser(), 1);
var logger = (0, import_pino.default)({ name: "useDeleteUser" });
function useDeleteUser(onSuccess) {
  const servers = useAppSelector(selectRemoteServers);
  const token = useAppSelector(selectCurrentToken);
  return (0, import_react2.useCallback)(
    async (userId) => {
      if (!servers.length || !token) {
        const error = new Error("Missing remote servers or token");
        logger.error({ err: error }, "Delete failed before request");
        throw error;
      }
      try {
        logger.info({ userId, primaryServer: servers[0] }, "Deleting user");
        const results = await deleteUserAcrossServers({
          servers,
          token,
          userId
        });
        const replicaFailures = results.filter((result) => !result.required && !result.ok);
        if (replicaFailures.length > 0) {
          logger.warn({ userId, results: replicaFailures }, "User deletion skipped failed replica servers");
        }
        logger.info({ userId }, "User deleted");
        onSuccess?.();
      } catch (err) {
        logger.error({ err, userId, results: err?.results }, "Delete failed");
        throw err;
      }
    },
    [servers, token, onSuccess]
  );
}

// packages/auth/hooks/useRechargeUser.ts
var import_react3 = __toESM(require_react(), 1);
var import_pino2 = __toESM(require_browser(), 1);
var logger2 = (0, import_pino2.default)({ name: "useRechargeUser" });
var RechargeError = class extends Error {
  constructor(message, cause) {
    super(message);
    this.cause = cause;
    this.name = "RechargeError";
  }
};
function useRechargeUser(onSuccess) {
  const dispatch = useAppDispatch();
  return (0, import_react3.useCallback)(
    async (toUserId, amount, reason = "admin_recharge") => {
      if (!toUserId?.trim()) {
        throw new RechargeError("Invalid target user ID");
      }
      if (typeof amount !== "number" || amount <= 0) {
        throw new RechargeError("Invalid amount");
      }
      const txId = ulid();
      logger2.debug({ toUserId, amount, txId }, "Starting recharge transaction");
      try {
        const transaction = {
          type: "transaction" /* TRANSACTION */,
          transactionType: "recharge",
          toUserId,
          // 字段名改为 toUserId
          amount,
          reason,
          timestamp: Date.now()
        };
        await dispatch(
          write({
            data: transaction,
            customKey: txId
          })
        ).unwrap();
        logger2.info({ toUserId, amount, txId }, "Recharge successful");
        onSuccess?.();
      } catch (err) {
        logger2.error(
          { err, toUserId, amount, txId },
          "Recharge transaction failed"
        );
        throw new RechargeError("\u5145\u503C\u5931\u8D25\uFF0C\u8BF7\u91CD\u8BD5", err);
      }
    },
    [dispatch, onSuccess]
  );
}

// packages/auth/hooks/useDisableUser.tsx
var import_react4 = __toESM(require_react(), 1);
var import_pino3 = __toESM(require_browser(), 1);
var logger3 = (0, import_pino3.default)({ name: "useDisableUser" });
function useDisableUser(onSuccess) {
  const serverUrl = useAppSelector(selectRemoteServer);
  const token = useAppSelector(selectCurrentToken);
  return (0, import_react4.useCallback)(
    async (userId) => {
      if (!serverUrl || !token) {
        logger3.error("Missing serverUrl or token");
        return;
      }
      try {
        const path = authRoutes.users.disable.createPath({ userId });
        const url = `${serverUrl}${path}`;
        logger3.info({ userId, url }, "Disabling user");
        const response = await fetch(url, {
          method: authRoutes.users.disable.method,
          // 假设为 POST 或 PUT，具体取决于后端定义
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
          }
        });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        logger3.info({ userId }, "User disabled");
        onSuccess?.();
      } catch (err) {
        logger3.error({ err, userId }, "Disable failed");
        throw err;
      }
    },
    [serverUrl, token, onSuccess]
  );
}

// packages/auth/hooks/useEnableUser.ts
var import_react5 = __toESM(require_react(), 1);
var import_pino4 = __toESM(require_browser(), 1);
var logger4 = (0, import_pino4.default)({ name: "useEnableUser" });
function useEnableUser(onSuccess) {
  const serverUrl = useAppSelector(selectRemoteServer);
  const token = useAppSelector(selectCurrentToken);
  return (0, import_react5.useCallback)(
    async (userId) => {
      if (!serverUrl || !token) {
        logger4.error("Missing serverUrl or token");
        return;
      }
      try {
        const path = authRoutes.users.enable.createPath({ userId });
        const url = `${serverUrl}${path}`;
        logger4.info({ userId, url }, "Enabling user");
        const response = await fetch(url, {
          method: authRoutes.users.enable.method,
          // 假设为 POST
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
          }
        });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        logger4.info({ userId }, "User enabled");
        onSuccess?.();
      } catch (err) {
        logger4.error({ err, userId }, "Enable failed");
        throw err;
      }
    },
    [serverUrl, token, onSuccess]
  );
}

// packages/auth/client/updateUserAdminPermissionsRequest.ts
var updateUserAdminPermissionsRequest = async (currentServer, token, userId, patch) => {
  const path = authRoutes.users.adminPermissions.createPath({ userId });
  return fetch(`${currentServer}${path}`, {
    method: authRoutes.users.adminPermissions.method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(patch)
  });
};
var updateUserAdminPermissionsAcrossServers = async ({
  servers,
  token,
  userId,
  patch
}) => {
  return fetchAcrossServers({
    servers,
    actionName: "update user admin permissions",
    requestBuilder: (server) => updateUserAdminPermissionsRequest(server, token, userId, patch)
  });
};

// packages/life/web/RechargeModal.tsx
var import_react6 = __toESM(require_react(), 1);
var import_jsx_runtime = __toESM(require_jsx_runtime(), 1);
var RechargeModal = ({
  isOpen,
  onClose,
  onConfirm,
  username,
  loading: externalLoading
}) => {
  const { t } = useTranslation(["translation", "chat"]);
  const [amount, setAmount] = (0, import_react6.useState)("");
  const [loading, setLoading] = (0, import_react6.useState)(false);
  const [error, setError] = (0, import_react6.useState)("");
  const creditsUnit = t("chat:creditsUnit", "credits");
  import_react6.default.useEffect(() => {
    if (!isOpen) {
      setAmount("");
      setError("");
      setLoading(false);
    }
  }, [isOpen]);
  const handleSubmit = async (e) => {
    e.preventDefault();
    const value = Number(amount);
    if (!amount || isNaN(value)) {
      setError("\u8BF7\u8F93\u5165\u6709\u6548\u91D1\u989D");
      return;
    }
    if (value <= 0) {
      setError("\u5145\u503C\u91D1\u989D\u5FC5\u987B\u5927\u4E8E0");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await onConfirm(value);
      onClose();
    } catch (err) {
      setError("\u5145\u503C\u5931\u8D25\uFF0C\u8BF7\u91CD\u8BD5");
    } finally {
      setLoading(false);
    }
  };
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
    Dialog,
    {
      isOpen,
      onClose,
      title: "\u7528\u6237\u5145\u503C",
      icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuCreditCard, { size: 16 }),
      status: "info",
      width: 440,
      actions: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          Button_default,
          {
            onClick: onClose,
            variant: "secondary",
            size: "small",
            disabled: loading || externalLoading,
            children: "\u53D6\u6D88"
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          Button_default,
          {
            type: "submit",
            form: "recharge-form",
            variant: "primary",
            size: "small",
            loading: loading || externalLoading,
            children: "\u786E\u8BA4\u5145\u503C"
          }
        )
      ] }),
      children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
        "form",
        {
          id: "recharge-form",
          onSubmit: handleSubmit,
          className: "recharge-form",
          children: [
            username && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "form-info", children: [
              "\u6B63\u5728\u4E3A\u7528\u6237 ",
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "username", children: username }),
              " \u5145\u503C"
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "form-group", children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { htmlFor: "amount", className: "form-label", children: t("recharge_amount_with_unit", "\u5145\u503C\u91D1\u989D ({{unit}})", {
                unit: creditsUnit
              }) }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "input-wrapper", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                "input",
                {
                  id: "amount",
                  className: "amount-input",
                  type: "number",
                  min: "0.01",
                  step: "0.01",
                  value: amount,
                  onChange: (e) => {
                    setAmount(e.target.value);
                    setError("");
                  },
                  placeholder: t("recharge_amount_placeholder", "\u8BF7\u8F93\u5165\u5145\u503C\u91D1\u989D"),
                  disabled: loading || externalLoading
                }
              ) }),
              error && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "error-message", children: error })
            ] })
          ]
        }
      )
    }
  );
};

// packages/auth/web/UserRechargeHistoryModal.tsx
var import_react7 = __toESM(require_react(), 1);
var import_jsx_runtime2 = __toESM(require_jsx_runtime(), 1);
var formatTimestamp = (timestamp) => {
  return new Date(timestamp).toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
};
var formatReason = (reason) => {
  const reasonMap = {
    admin_recharge: "\u7BA1\u7406\u5458\u5145\u503C",
    new_user_bonus: "\u65B0\u7528\u6237\u5956\u52B1",
    invited_signup_bonus: "\u9080\u8BF7\u6CE8\u518C\u5956\u52B1"
  };
  return reasonMap[reason] || reason || "\u5176\u4ED6";
};
var UserRechargeHistoryModal = ({
  isOpen,
  onClose,
  server,
  token,
  user
}) => {
  const [records, setRecords] = (0, import_react7.useState)([]);
  const [isLoading, setIsLoading] = (0, import_react7.useState)(false);
  const [error, setError] = (0, import_react7.useState)(null);
  const [nextCursor, setNextCursor] = (0, import_react7.useState)(null);
  const [serverTotalAmount, setServerTotalAmount] = (0, import_react7.useState)(null);
  const [serverTotalCount, setServerTotalCount] = (0, import_react7.useState)(null);
  const totalAmount = serverTotalAmount !== null ? serverTotalAmount : records.reduce((sum, record) => sum + Number(record.amount || 0), 0);
  const totalCount = serverTotalCount !== null ? serverTotalCount : records.length;
  const requestIdRef = (0, import_react7.useRef)(0);
  const abortControllerRef = (0, import_react7.useRef)(null);
  const userId = user?.id;
  const fetchRecords = (0, import_react7.useCallback)(
    async (cursor = null) => {
      if (!userId) return;
      const myRequestId = ++requestIdRef.current;
      abortControllerRef.current?.abort();
      abortControllerRef.current = new AbortController();
      const signal = abortControllerRef.current.signal;
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(
          `${server}/api/v1/users/${userId}/recharge-history`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({
              limit: 10,
              cursor
            }),
            signal
          }
        );
        if (myRequestId !== requestIdRef.current) {
          return;
        }
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(
            typeof errorData.error === "string" ? errorData.error : errorData.error?.message || "\u83B7\u53D6\u8BB0\u5F55\u5931\u8D25"
          );
        }
        const {
          data,
          nextCursor: newCursor,
          totalAmount: responseTotalAmount,
          totalCount: responseTotalCount
        } = await response.json();
        const pageData = Array.isArray(data) ? data : [];
        if (myRequestId !== requestIdRef.current) {
          return;
        }
        setRecords((prevRecords) => {
          return cursor ? [...prevRecords, ...pageData] : pageData;
        });
        setNextCursor(newCursor);
        setServerTotalAmount(typeof responseTotalAmount === "number" ? responseTotalAmount : null);
        setServerTotalCount(typeof responseTotalCount === "number" ? responseTotalCount : null);
      } catch (err) {
        if (myRequestId !== requestIdRef.current) {
          return;
        }
        if (isAbortError(err)) {
          return;
        }
        setError(err.message);
      } finally {
        if (myRequestId === requestIdRef.current) {
          setIsLoading(false);
        }
      }
    },
    [server, token, userId]
  );
  (0, import_react7.useEffect)(() => {
    if (isOpen && userId) {
      setRecords([]);
      setNextCursor(null);
      setServerTotalAmount(null);
      setServerTotalCount(null);
      setError(null);
      void fetchRecords(null);
    }
    return () => {
      abortControllerRef.current?.abort();
    };
  }, [isOpen, userId, fetchRecords]);
  const handleLoadMore = () => {
    if (nextCursor && !isLoading) {
      fetchRecords(nextCursor);
    }
  };
  const handleRetry = () => {
    setRecords([]);
    setNextCursor(null);
    setServerTotalAmount(null);
    setServerTotalCount(null);
    fetchRecords(null);
  };
  const renderContent = () => {
    if (isLoading && records.length === 0) {
      return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "recharge-history-modal__empty", children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("p", { children: "\u52A0\u8F7D\u4E2D..." }) });
    }
    if (error) {
      return /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "recharge-history-modal__error", children: [
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("p", { children: error }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(Button_default, { onClick: handleRetry, variant: "primary", size: "small", children: "\u91CD\u8BD5" })
      ] });
    }
    if (!records.length) {
      return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "recharge-history-modal__empty", children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("p", { children: "\u6682\u65E0\u5145\u503C\u8BB0\u5F55" }) });
    }
    return /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "recharge-history-modal__content", children: [
      /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("table", { className: "recharge-history-modal__table", children: [
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("thead", { children: /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("tr", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("th", { children: "\u65F6\u95F4" }),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("th", { children: "\u91D1\u989D" }),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("th", { children: "\u4E8B\u9879" }),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("th", { children: "\u72B6\u6001" })
        ] }) }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("tbody", { children: records.map((record) => /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("tr", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("td", { children: formatTimestamp(record.timestamp) }),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("td", { className: "recharge-history-modal__amount", children: [
            "+",
            formatCredits(record.amount, "\u79EF\u5206", 2)
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("td", { children: formatReason(record.reason) }),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("td", { children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
            "span",
            {
              className: `recharge-history-modal__status recharge-history-modal__status--${record.status}`,
              children: record.status === "completed" ? "\u6210\u529F" : "\u5931\u8D25"
            }
          ) })
        ] }, record.txId)) })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "recharge-history-modal__summary", children: [
        /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("span", { children: [
          "\u603B\u8BA1: ",
          totalCount,
          " \u7B14"
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("strong", { children: [
          "+",
          formatCredits(totalAmount, "\u79EF\u5206", 2)
        ] })
      ] }),
      nextCursor && /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
        Button_default,
        {
          className: "recharge-history-modal__load-more",
          onClick: handleLoadMore,
          disabled: isLoading,
          variant: "secondary",
          size: "small",
          children: isLoading ? "\u52A0\u8F7D\u4E2D..." : "\u52A0\u8F7D\u66F4\u591A"
        }
      )
    ] });
  };
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
    Dialog,
    {
      isOpen,
      onClose,
      title: user ? `${user.username} \u7684\u5145\u503C\u5386\u53F2` : "\u5145\u503C\u5386\u53F2",
      actions: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(Button_default, { onClick: onClose, variant: "secondary", size: "small", children: "\u5173\u95ED" }),
      width: 720,
      children: renderContent()
    }
  );
};

// packages/auth/web/UserPermissionsModal.tsx
var import_jsx_runtime3 = __toESM(require_jsx_runtime(), 1);
function UserPermissionsModal({
  user,
  savingPermissionKey,
  onClose,
  onToggle
}) {
  return /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
    Dialog,
    {
      isOpen: !!user,
      onClose,
      title: user ? `\u6743\u9650\u8BBE\u7F6E - ${user.username}` : "\u6743\u9650\u8BBE\u7F6E",
      status: "info",
      width: 520,
      bodyClassName: "permissions-modal-body",
      actions: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(Button_default, { variant: "secondary", onClick: onClose, children: "\u5173\u95ED" }),
      children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "permissions-list", children: ADMIN_PERMISSION_DEFINITIONS.map((permission) => {
        const enabled = user?.adminPermissions?.[permission.key] === true;
        return /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "permission-row", children: [
          /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "permission-row__copy", children: [
            /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("strong", { children: permission.label }),
            /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { children: permission.description })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
            Button_default,
            {
              variant: enabled ? "primary" : "secondary",
              size: "small",
              loading: savingPermissionKey === permission.key,
              disabled: !user || !!savingPermissionKey,
              onClick: () => user && onToggle(user, permission.key),
              children: enabled ? "\u5173\u95ED" : "\u5F00\u542F"
            }
          )
        ] }, permission.key);
      }) })
    }
  );
}

// packages/auth/web/UsersPage.tsx
var import_jsx_runtime4 = __toESM(require_jsx_runtime(), 1);
var PAGE_SIZE2 = 10;
var CONFIRM_UI_CONFIG = {
  delete: {
    title: "\u5220\u9664\u7528\u6237",
    type: "error",
    getMessage: (u) => `\u786E\u5B9A\u8981\u5220\u9664\u7528\u6237\u300C${u}\u300D\u5417\uFF1F\u6B64\u64CD\u4F5C\u65E0\u6CD5\u64A4\u9500\u3002`,
    confirmText: "\u5220\u9664"
  },
  disable: {
    title: "\u505C\u7528\u7528\u6237",
    type: "warning",
    getMessage: (u) => `\u786E\u5B9A\u8981\u505C\u7528\u7528\u6237\u300C${u}\u300D\u5417\uFF1F\u505C\u7528\u540E\u7528\u6237\u5C06\u65E0\u6CD5\u767B\u5F55\u3002`,
    confirmText: "\u505C\u7528"
  },
  enable: {
    title: "\u542F\u7528\u7528\u6237",
    type: "success",
    getMessage: (u) => `\u786E\u5B9A\u8981\u542F\u7528\u7528\u6237\u300C${u}\u300D\u5417\uFF1F\u542F\u7528\u540E\u7528\u6237\u5C06\u6062\u590D\u767B\u5F55\u6743\u9650\u3002`,
    confirmText: "\u542F\u7528"
  }
};
function UsersPage() {
  const { t } = useTranslation(["translation", "chat"]);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const currentServer = useAppSelector(selectRemoteServer);
  const servers = useAppSelector(selectRemoteServers);
  const currentToken = useAppSelector(selectCurrentToken);
  (0, import_react8.useEffect)(() => {
    if (searchParams.get("view") === "usage") {
      navigate(ADMIN_PAGE_PATHS.growthStats, { replace: true });
    }
  }, [navigate, searchParams]);
  const [searchInput, setSearchInput] = (0, import_react8.useState)(
    searchParams.get("search") || ""
  );
  const [state, setState] = (0, import_react8.useState)({
    users: [],
    loading: false,
    error: null,
    currentPage: parseInt(searchParams.get("page") || "1", 10),
    total: 0,
    totalPages: 0
  });
  const { users, loading, error, currentPage, total } = state;
  const fetchUsers = useFetchUsers();
  const handleFetch = (0, import_react8.useCallback)(
    async (page, search) => {
      if (!currentServer) {
        return;
      }
      setState((prev) => ({ ...prev, loading: true, error: null }));
      try {
        const data = await fetchUsers(page, search);
        if (!data?.list) {
          setState((prev) => ({
            ...prev,
            loading: false,
            error: "\u65E0\u6CD5\u83B7\u53D6\u6570\u636E",
            users: []
          }));
          return;
        }
        setState((prev) => ({
          ...prev,
          users: data.list,
          currentPage: page,
          total: data.total,
          totalPages: data.totalPages,
          loading: false
        }));
      } catch (err) {
        setState((prev) => ({
          ...prev,
          error: "\u52A0\u8F7D\u7528\u6237\u5931\u8D25\uFF0C\u8BF7\u91CD\u8BD5",
          loading: false,
          users: []
        }));
      }
    },
    [fetchUsers, currentServer]
  );
  (0, import_react8.useEffect)(() => {
    if (!currentServer) return;
    if (searchParams.get("view") === "usage") return;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const search = searchParams.get("search") || void 0;
    handleFetch(page, search);
  }, [currentServer, handleFetch, searchParams]);
  const handleSearch = (0, import_react8.useCallback)(() => {
    const trimmedSearch = searchInput.trim();
    setSearchParams(
      (prev) => {
        const newParams = new URLSearchParams(prev);
        if (trimmedSearch) {
          newParams.set("search", trimmedSearch);
        } else {
          newParams.delete("search");
        }
        newParams.set("page", "1");
        return newParams;
      },
      { replace: true }
    );
    setSearchInput(trimmedSearch);
  }, [searchInput, setSearchParams]);
  const handleClearSearch = (0, import_react8.useCallback)(() => {
    setSearchInput("");
    setSearchParams(
      (prev) => {
        const newParams = new URLSearchParams(prev);
        newParams.delete("search");
        newParams.set("page", "1");
        return newParams;
      },
      { replace: true }
    );
  }, [setSearchParams]);
  const [confirmModal, setConfirmModal] = (0, import_react8.useState)({});
  const [confirmLoading, setConfirmLoading] = (0, import_react8.useState)(false);
  const [permissionsUser, setPermissionsUser] = (0, import_react8.useState)(null);
  const [permissionSaving, setPermissionSaving] = (0, import_react8.useState)(null);
  const handleActionSuccess = (0, import_react8.useCallback)(() => {
    const search = searchParams.get("search") || void 0;
    handleFetch(currentPage, search);
  }, [currentPage, handleFetch, searchParams]);
  const deleteUser = useDeleteUser(handleActionSuccess);
  const disableUser = useDisableUser(handleActionSuccess);
  const enableUser = useEnableUser(handleActionSuccess);
  const handleConfirmAction = (0, import_react8.useCallback)(async () => {
    if (!confirmModal.type || !confirmModal.user) return;
    const { title } = CONFIRM_UI_CONFIG[confirmModal.type];
    setConfirmLoading(true);
    try {
      const id = confirmModal.user.id;
      switch (confirmModal.type) {
        case "delete":
          await deleteUser(id);
          break;
        case "disable":
          await disableUser(id);
          break;
        case "enable":
          await enableUser(id);
          break;
        default:
          break;
      }
      setConfirmModal({});
    } catch {
      alert(`${title}\u5931\u8D25\uFF0C\u8BF7\u91CD\u8BD5`);
    } finally {
      setConfirmLoading(false);
    }
  }, [confirmModal, deleteUser, disableUser, enableUser]);
  const [rechargeModal, setRechargeModal] = (0, import_react8.useState)({
    isOpen: false,
    userId: "",
    username: ""
  });
  const rechargeUser = useRechargeUser(() => {
    const search = searchParams.get("search") || void 0;
    handleFetch(currentPage, search);
  });
  const handleRechargeClick = (0, import_react8.useCallback)((user) => {
    setRechargeModal({
      isOpen: true,
      userId: user.id,
      username: user.username
    });
  }, []);
  const handleRechargeConfirm = (0, import_react8.useCallback)(
    async (amount, reason) => {
      try {
        await rechargeUser(rechargeModal.userId, amount, reason);
      } catch (err) {
        throw err;
      }
    },
    [rechargeModal.userId, rechargeUser]
  );
  const [rechargeHistoryUser, setRechargeHistoryUser] = (0, import_react8.useState)(null);
  const [emailModal, setEmailModal] = (0, import_react8.useState)({
    isOpen: false,
    userId: "",
    username: "",
    email: ""
  });
  const [emailSubject, setEmailSubject] = (0, import_react8.useState)("");
  const [emailBody, setEmailBody] = (0, import_react8.useState)("");
  const [emailSending, setEmailSending] = (0, import_react8.useState)(false);
  const [emailError, setEmailError] = (0, import_react8.useState)(null);
  const handleOpenEmailModal = (0, import_react8.useCallback)((user) => {
    if (!user.email) {
      alert("\u90AE\u7BB1\u5730\u5740\u4E0D\u5B58\u5728");
      return;
    }
    setEmailModal({
      isOpen: true,
      userId: user.id,
      username: user.username,
      email: user.email
    });
    setEmailSubject(`${user.username}\uFF0C\u4F60\u597D`);
    setEmailBody("");
    setEmailError(null);
  }, []);
  const handleCloseEmailModal = (0, import_react8.useCallback)(() => {
    if (emailSending) return;
    setEmailModal({
      isOpen: false,
      userId: "",
      username: "",
      email: ""
    });
    setEmailSubject("");
    setEmailBody("");
    setEmailError(null);
  }, [emailSending]);
  const handleSendEmailFromModal = (0, import_react8.useCallback)(async () => {
    const subject = emailSubject.trim();
    const body = emailBody.trim();
    if (!subject || !body) {
      setEmailError("\u8BF7\u586B\u5199\u5B8C\u6574\u7684\u4E3B\u9898\u548C\u6B63\u6587");
      return;
    }
    if (!currentServer || !currentToken) {
      setEmailError("\u9274\u6743\u5931\u8D25\uFF0C\u8BF7\u91CD\u65B0\u767B\u5F55\u540E\u91CD\u8BD5");
      return;
    }
    if (!emailModal.userId) {
      setEmailError("\u7528\u6237\u4FE1\u606F\u5F02\u5E38\uFF0C\u8BF7\u5173\u95ED\u5F39\u7A97\u540E\u91CD\u8BD5");
      return;
    }
    setEmailSending(true);
    setEmailError(null);
    try {
      const response = await fetch(
        `${currentServer}${authRoutes.users.sendEmail.createPath()}`,
        {
          method: authRoutes.users.sendEmail.method,
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${currentToken}`
          },
          body: JSON.stringify({
            subject,
            body,
            userIds: [emailModal.userId]
          })
        }
      );
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        setEmailError(result?.error || "\u53D1\u9001\u5931\u8D25\uFF0C\u8BF7\u7A0D\u540E\u91CD\u8BD5");
        return;
      }
      const sentCount = Number(result?.sentCount || 0);
      const failedCount = Number(result?.failedCount || 0);
      if (failedCount > 0) {
        const firstError = Array.isArray(result?.errors) && result.errors.length > 0 ? result.errors[0]?.error : "";
        setEmailError(
          `\u53D1\u9001\u7ED3\u679C\uFF1A\u6210\u529F ${sentCount} \u5C01\uFF0C\u5931\u8D25 ${failedCount} \u5C01${firstError ? `\uFF1B\u539F\u56E0\uFF1A${firstError}` : ""}`
        );
        return;
      }
      alert(
        `\u90AE\u4EF6\u53D1\u9001\u7ED3\u679C\uFF1A\u6210\u529F ${sentCount} \u5C01\uFF0C\u5931\u8D25 ${failedCount} \u5C01`
      );
      handleCloseEmailModal();
    } catch {
      setEmailError("\u53D1\u9001\u90AE\u4EF6\u8FC7\u7A0B\u4E2D\u9047\u5230\u7F51\u7EDC\u9519\u8BEF");
    } finally {
      setEmailSending(false);
    }
  }, [
    currentServer,
    currentToken,
    emailBody,
    emailModal.userId,
    emailSubject,
    handleCloseEmailModal
  ]);
  const handlePageChange = (0, import_react8.useCallback)(
    (newPage) => {
      setSearchParams(
        (prev) => {
          const newParams = new URLSearchParams(prev);
          newParams.set("page", newPage.toString());
          return newParams;
        },
        { replace: true }
      );
    },
    [setSearchParams]
  );
  const parseTimeValue = (time) => {
    if (time == null || time === "") return null;
    const date = typeof time === "number" ? new Date(time) : new Date(String(time));
    return Number.isNaN(date.getTime()) ? null : date;
  };
  const formatTime = (time) => {
    const date = parseTimeValue(time);
    if (!date) return "-";
    return formatDistanceToNow(date, {
      addSuffix: true,
      locale: zh_CN_default
    });
  };
  const formatEmailReach = (user) => {
    if (!user.email) return "\u65E0\u90AE\u7BB1";
    if (user.emailOptOutAll) return "\u5168\u5C40\u9000\u8BA2";
    const mutedUntilDate = parseTimeValue(user.emailMutedUntil);
    if (mutedUntilDate && mutedUntilDate.getTime() > Date.now()) {
      return `\u9759\u9ED8\u81F3:${formatTime(user.emailMutedUntil)}`;
    }
    if (Array.isArray(user.emailOptOutTags) && user.emailOptOutTags.length > 0) {
      return `\u5DF2\u9000\u8BA2\u6807\u7B7E:${user.emailOptOutTags.join(",")}`;
    }
    const welcomeStatus = user.welcomeEmailSentAt ? `\u6B22\u8FCE:${formatTime(user.welcomeEmailSentAt)}` : "\u6B22\u8FCE:\u672A\u53D1";
    const onboardingStatus = user.onboardingGuideSentAt ? `\u5F15\u5BFC:${formatTime(user.onboardingGuideSentAt)}` : "\u5F15\u5BFC:\u672A\u53D1";
    const reengagementCount = Number(user.reengagementEmailCount || 0);
    const reengagementStatus = reengagementCount > 0 ? `\u56DE\u8BBF:${reengagementCount}\u6B21${user.lastReengagementEmailAt ? `(${formatTime(user.lastReengagementEmailAt)})` : ""}` : "\u56DE\u8BBF:\u672A\u53D1";
    return `${welcomeStatus} \xB7 ${onboardingStatus} \xB7 ${reengagementStatus}`;
  };
  const handleCopyUserId = (0, import_react8.useCallback)(async (userId) => {
    try {
      await navigator.clipboard.writeText(userId);
      toast.success("\u590D\u5236 ID \u6210\u529F");
    } catch {
      toast.error("\u590D\u5236 ID \u5931\u8D25");
    }
  }, []);
  const handleToggleAdminPermission = (0, import_react8.useCallback)(
    async (user, permissionKey) => {
      if (!servers.length || !currentToken) {
        toast.error("\u9274\u6743\u5931\u8D25\uFF0C\u8BF7\u91CD\u65B0\u767B\u5F55\u540E\u91CD\u8BD5");
        return;
      }
      const permissionDefinition = ADMIN_PERMISSION_DEFINITIONS.find(
        (definition) => definition.key === permissionKey
      );
      const nextValue = user.adminPermissions?.[permissionKey] !== true;
      setPermissionSaving({ userId: user.id, permissionKey });
      try {
        const results = await updateUserAdminPermissionsAcrossServers({
          servers,
          token: currentToken,
          userId: user.id,
          patch: { [permissionKey]: nextValue }
        });
        const replicaFailures = results.filter((result) => !result.required && !result.ok);
        if (replicaFailures.length > 0) {
          toast.error("\u90E8\u5206\u8FDC\u7AEF\u670D\u52A1\u5668\u66F4\u65B0\u6743\u9650\u5931\u8D25");
        }
        setState((prev) => ({
          ...prev,
          users: prev.users.map(
            (item) => item.id === user.id ? {
              ...item,
              adminPermissions: {
                ...item.adminPermissions ?? {},
                [permissionKey]: nextValue
              }
            } : item
          )
        }));
        setPermissionsUser(
          (current) => current?.id === user.id ? {
            ...current,
            adminPermissions: {
              ...current.adminPermissions ?? {},
              [permissionKey]: nextValue
            }
          } : current
        );
        const label = permissionDefinition?.label ?? "\u7BA1\u7406";
        toast.success(nextValue ? `\u5DF2\u5F00\u542F${label}\u6743\u9650` : `\u5DF2\u5173\u95ED${label}\u6743\u9650`);
      } catch {
        toast.error("\u66F4\u65B0\u6743\u9650\u5931\u8D25\uFF0C\u8BF7\u68C0\u67E5\u7F51\u7EDC\u540E\u91CD\u8BD5");
      } finally {
        setPermissionSaving(null);
      }
    },
    [servers, currentToken]
  );
  const activeConfirmConfig = confirmModal.type ? CONFIRM_UI_CONFIG[confirmModal.type] : null;
  const getActivePermissionBadges = (user) => ADMIN_PERMISSION_DEFINITIONS.filter(
    (permission) => user.adminPermissions?.[permission.key] === true
  );
  if (!currentServer) {
    return /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { className: "no-server-container", children: /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "no-server-content", children: [
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("h2", { children: "\u672A\u9009\u62E9\u670D\u52A1\u5668" }),
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("p", { children: "\u8BF7\u5148\u9009\u62E9\u670D\u52A1\u5668\u4EE5\u67E5\u770B\u7528\u6237\u5217\u8868" })
    ] }) });
  }
  return /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "users-page", children: [
    /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("header", { className: "page-header", children: [
      /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "header-left", children: [
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("h1", { className: "page-title", children: "\u7528\u6237\u5217\u8868" }),
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { className: "title-decoration" })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
        SearchInput_default,
        {
          value: searchInput,
          onChange: setSearchInput,
          onSearch: handleSearch,
          onClear: handleClearSearch,
          placeholder: "\u641C\u7D22\u7528\u6237\u540D\u3001ID \u6216\u90AE\u7BB1...",
          className: "users-search-form"
        }
      )
    ] }),
    error && /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { className: "error-container", children: /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "error-content", children: [
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { className: "error-message", children: error }),
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
        Button_default,
        {
          onClick: () => {
            const search = searchParams.get("search") || void 0;
            handleFetch(currentPage, search);
          },
          variant: "secondary",
          size: "small",
          children: "\u91CD\u8BD5"
        }
      )
    ] }) }),
    loading ? /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { className: "loading-container", children: /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { className: "loading-content", children: /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(Button_default, { loading: true, variant: "primary", children: "\u52A0\u8F7D\u4E2D..." }) }) }) : users.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(import_jsx_runtime4.Fragment, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { className: "table-section", children: /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { className: "table-wrapper", children: /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(BaseTable, { children: [
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("thead", { children: /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(BaseTableRow, { children: [
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(BaseTableCell, { header: true, children: "\u7528\u6237\u540D" }),
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(BaseTableCell, { header: true, children: "\u90AE\u7BB1" }),
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(BaseTableCell, { header: true, children: "\u4F59\u989D" }),
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(BaseTableCell, { header: true, children: "\u6CE8\u518C\u65F6\u95F4" }),
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(BaseTableCell, { header: true, children: "\u6700\u8FD1\u6D3B\u8DC3" }),
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(BaseTableCell, { header: true, align: "right", children: "\u64CD\u4F5C" })
        ] }) }),
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("tbody", { children: users.map((user) => /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(BaseTableRow, { children: [
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(BaseTableCell, { children: /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "user-name-cell", children: [
            /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "user-name-main", children: [
              /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { className: "username", children: user.username }),
              user.isDisabled && /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { className: "disabled-badge", children: "\u5DF2\u505C\u7528" }),
              getActivePermissionBadges(user).map((permission) => /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
                "span",
                {
                  className: "admin-permission-badge",
                  children: permission.shortLabel
                },
                permission.key
              ))
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(
              "button",
              {
                type: "button",
                className: "user-id-chip",
                title: `\u70B9\u51FB\u590D\u5236\u7528\u6237ID\uFF1A${user.id}`,
                onClick: () => handleCopyUserId(user.id),
                children: [
                  "ID: ",
                  user.id
                ]
              }
            )
          ] }) }),
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(BaseTableCell, { children: /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "email-cell", children: [
            /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { className: "email-text", children: user.email || "-" }),
            /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { className: "email-meta", children: formatEmailReach(user) })
          ] }) }),
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(BaseTableCell, { children: /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { className: "balance-amount", children: formatCredits(user.balance, t("chat:creditsUnit", "credits"), 2) }) }),
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(BaseTableCell, { children: /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { className: "time-text", children: formatTime(user.createdAt) }) }),
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(BaseTableCell, { children: /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { className: "time-text", children: formatTime(user.lastActiveAt || user.lastLoginAt) }) }),
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(BaseTableCell, { align: "right", children: /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "action-buttons", children: [
            /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
              Button_default,
              {
                onClick: () => handleRechargeClick(user),
                variant: "primary",
                size: "small",
                children: "\u5145\u503C"
              }
            ),
            /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
              Button_default,
              {
                onClick: () => setRechargeHistoryUser({ id: user.id, username: user.username }),
                variant: "secondary",
                size: "small",
                children: "\u5145\u503C\u5386\u53F2"
              }
            ),
            /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
              Button_default,
              {
                onClick: () => setPermissionsUser(user),
                variant: "secondary",
                size: "small",
                children: "\u6743\u9650"
              }
            ),
            user.isDisabled ? /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
              Button_default,
              {
                onClick: () => setConfirmModal({ type: "enable", user }),
                variant: "secondary",
                size: "small",
                children: "\u542F\u7528"
              }
            ) : /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(import_jsx_runtime4.Fragment, { children: [
              /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
                Button_default,
                {
                  onClick: () => setConfirmModal({ type: "disable", user }),
                  variant: "secondary",
                  size: "small",
                  children: "\u505C\u7528"
                }
              ),
              /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
                Button_default,
                {
                  onClick: () => handleOpenEmailModal(user),
                  variant: "secondary",
                  size: "small",
                  children: "\u53D1\u90AE\u4EF6"
                }
              )
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
              Button_default,
              {
                onClick: () => setConfirmModal({ type: "delete", user }),
                variant: "danger",
                size: "small",
                children: "\u5220\u9664"
              }
            )
          ] }) })
        ] }, user.id)) })
      ] }) }) }),
      /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("footer", { className: "page-footer", children: [
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { className: "pagination-wrapper", children: /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
          Pagination,
          {
            currentPage,
            totalItems: total,
            pageSize: PAGE_SIZE2,
            onPageChange: handlePageChange
          }
        ) }),
        /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "total-info", children: [
          "\u5171 ",
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { className: "total-count", children: total }),
          " \u4E2A\u7528\u6237"
        ] })
      ] })
    ] }) : /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { className: "empty-container", children: /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "empty-content", children: [
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { className: "empty-icon", children: "\u{1F4CB}" }),
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { className: "empty-title", children: searchInput ? "\u672A\u627E\u5230\u5339\u914D\u7528\u6237" : "\u6682\u65E0\u7528\u6237\u6570\u636E" }),
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { className: "empty-description", children: searchInput ? `\u6CA1\u6709\u627E\u5230\u4E0E\u300C${searchInput}\u300D\u5339\u914D\u7684\u7528\u6237` : "\u5F53\u524D\u670D\u52A1\u5668\u8FD8\u6CA1\u6709\u7528\u6237\u6CE8\u518C" })
    ] }) }),
    activeConfirmConfig && confirmModal.user && /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
      ConfirmModal,
      {
        isOpen: true,
        onClose: () => setConfirmModal({}),
        onConfirm: handleConfirmAction,
        title: activeConfirmConfig.title,
        message: activeConfirmConfig.getMessage(
          confirmModal.user.username
        ),
        type: activeConfirmConfig.type,
        confirmText: activeConfirmConfig.confirmText,
        loading: confirmLoading
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
      UserPermissionsModal,
      {
        user: permissionsUser,
        savingPermissionKey: permissionSaving && permissionsUser && permissionSaving.userId === permissionsUser.id ? permissionSaving.permissionKey : null,
        onClose: () => setPermissionsUser(null),
        onToggle: (user, permissionKey) => void handleToggleAdminPermission(user, permissionKey)
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
      Dialog,
      {
        isOpen: emailModal.isOpen,
        onClose: handleCloseEmailModal,
        title: "\u53D1\u9001\u90AE\u4EF6",
        status: "info",
        width: 560,
        actions: /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(import_jsx_runtime4.Fragment, { children: [
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
            Button_default,
            {
              onClick: handleCloseEmailModal,
              variant: "secondary",
              size: "small",
              disabled: emailSending,
              children: "\u53D6\u6D88"
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
            Button_default,
            {
              onClick: () => void handleSendEmailFromModal(),
              variant: "primary",
              size: "small",
              loading: emailSending,
              children: "\u7ACB\u5373\u53D1\u9001"
            }
          )
        ] }),
        children: /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "send-email-modal", children: [
          /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "send-email-modal__target", children: [
            /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { className: "send-email-modal__target-name", children: emailModal.username || "-" }),
            /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { className: "send-email-modal__target-email", children: emailModal.email || "-" })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("label", { className: "send-email-modal__label", htmlFor: "send-email-subject", children: "\u90AE\u4EF6\u4E3B\u9898" }),
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
            "input",
            {
              id: "send-email-subject",
              className: "send-email-modal__input",
              type: "text",
              value: emailSubject,
              onChange: (e) => {
                setEmailSubject(e.target.value);
                setEmailError(null);
              },
              placeholder: "\u8BF7\u8F93\u5165\u90AE\u4EF6\u4E3B\u9898",
              disabled: emailSending
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("label", { className: "send-email-modal__label", htmlFor: "send-email-body", children: "\u90AE\u4EF6\u6B63\u6587" }),
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
            "textarea",
            {
              id: "send-email-body",
              className: "send-email-modal__textarea",
              value: emailBody,
              onChange: (e) => {
                setEmailBody(e.target.value);
                setEmailError(null);
              },
              placeholder: "\u8BF7\u8F93\u5165\u90AE\u4EF6\u6B63\u6587",
              rows: 8,
              disabled: emailSending
            }
          ),
          emailError && /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { className: "send-email-modal__error", children: emailError })
        ] })
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
      RechargeModal,
      {
        isOpen: rechargeModal.isOpen,
        onClose: () => setRechargeModal({ isOpen: false, userId: "", username: "" }),
        onConfirm: handleRechargeConfirm,
        username: rechargeModal.username
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
      UserRechargeHistoryModal,
      {
        isOpen: rechargeHistoryUser != null,
        onClose: () => setRechargeHistoryUser(null),
        server: currentServer,
        token: currentToken ?? "",
        user: rechargeHistoryUser
      }
    )
  ] });
}
export {
  UsersPage as default
};
