import {
  useIsMobile
} from "/public/assets/chunks/chunk-ZQBH52MP.js";
import "/public/assets/chunks/chunk-LKJPGMXH.js";
import {
  ADVANCED_FEATURE_MIN_BALANCE,
  GPT_PRO_REQUIRED_RECHARGE_AMOUNT
} from "/public/assets/chunks/chunk-52ICTTPO.js";
import {
  useAuth
} from "/public/assets/chunks/chunk-WT5G4HGZ.js";
import {
  useToken
} from "/public/assets/chunks/chunk-4C6PJRJA.js";
import "/public/assets/chunks/chunk-OOUNP25R.js";
import {
  useAppDispatch,
  useAppSelector
} from "/public/assets/chunks/chunk-U73LCHVO.js";
import "/public/assets/chunks/chunk-O47BZ5SQ.js";
import {
  fetchUserProfile,
  selectRemoteServer
} from "/public/assets/chunks/chunk-RWWUEPWY.js";
import "/public/assets/chunks/chunk-IJ3A6Q7E.js";
import "/public/assets/chunks/chunk-PN3BZAFX.js";
import "/public/assets/chunks/chunk-CILBJ2I2.js";
import {
  LuBadgeDollarSign,
  LuCircleAlert,
  LuCircleCheck,
  LuCopy,
  LuCreditCard,
  LuInfo,
  LuMessageCircle,
  LuSmartphone,
  LuWallet
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
import "/public/assets/chunks/chunk-VCXOIOLL.js";
import "/public/assets/chunks/chunk-AHAP23JL.js";
import {
  require_jsx_runtime
} from "/public/assets/chunks/chunk-VU4ZNPEP.js";
import {
  toErrorMessage
} from "/public/assets/chunks/chunk-3EHRYDZ6.js";
import {
  require_react
} from "/public/assets/chunks/chunk-JXB3DLZU.js";
import "/public/assets/chunks/chunk-HYYCZJXV.js";
import {
  __toESM
} from "/public/assets/chunks/chunk-PKRG6ODM.js";

// packages/app/pages/Recharge.tsx
var import_react = __toESM(require_react());

// packages/app/images/wechat.png
var wechat_default = "/public/assets/assets/wechat-VAQPALMF.png";

// packages/app/images/alipay.jpg
var alipay_default = "/public/assets/assets/alipay-UVFX5GSA.jpg";

// packages/app/pages/rechargeCheckout.ts
var getBrowserWindow = () => ({
  open: globalThis.window?.open?.bind(globalThis.window),
  assignLocation: (url) => {
    globalThis.window.location.href = url;
  }
});
var openCheckoutUrl = (checkoutUrl, browserWindow = getBrowserWindow()) => {
  const opened = browserWindow.open?.(
    checkoutUrl,
    "_blank",
    "noopener,noreferrer"
  );
  if (!opened) browserWindow.assignLocation?.(checkoutUrl);
};

// packages/app/pages/Recharge.tsx
var import_jsx_runtime = __toESM(require_jsx_runtime());
var EMAIL = "s@nolotus.com";
var ONLINE_PAYMENT_PROVIDER = {
  id: "waffo",
  name: "\u5168\u7403\u652F\u4ED8",
  configPath: "/api/payments/waffo/config",
  createOrderPath: "/api/payments/waffo/create-order",
  returnParam: "waffo"
};
var SHOW_ONLINE_PAYMENT = false;
var CRYPTO_PROVIDERS = [
  {
    id: "crypto-usdt-tron",
    name: "USDT",
    color: "#26A17B",
    configPath: "/api/payments/crypto-usdt-tron/config",
    createOrderPath: "/api/payments/crypto-usdt-tron/create-order",
    creditRateKey: "creditsPerUsdt"
  },
  {
    id: "crypto-usdc-base",
    name: "USDC",
    color: "#2775CA",
    configPath: "/api/payments/crypto-usdc-base/config",
    createOrderPath: "/api/payments/crypto-usdc-base/create-order",
    creditRateKey: "creditsPerUsdc"
  }
];
var DEFAULT_ONLINE_PAYMENT_LIMITS = {
  minCredits: 1,
  maxCredits: 1e4,
  integerCreditsOnly: true
};
var RechargePage = () => {
  const auth = useAuth();
  const dispatch = useAppDispatch();
  const server = useAppSelector(selectRemoteServer);
  const token = useToken();
  const isMobile = useIsMobile(768);
  const [paymentMethod, setPaymentMethod] = (0, import_react.useState)(
    SHOW_ONLINE_PAYMENT ? ONLINE_PAYMENT_PROVIDER.id : "wechat"
  );
  const [imageLoaded, setImageLoaded] = (0, import_react.useState)(false);
  const [onlinePaymentConfigured, setOnlinePaymentConfigured] = (0, import_react.useState)(false);
  const [onlinePaymentLimits, setOnlinePaymentLimits] = (0, import_react.useState)(
    DEFAULT_ONLINE_PAYMENT_LIMITS
  );
  const [rechargeAmount, setRechargeAmount] = (0, import_react.useState)("20");
  const [checkoutLoading, setCheckoutLoading] = (0, import_react.useState)(false);
  const [checkoutError, setCheckoutError] = (0, import_react.useState)("");
  const [cryptoConfigs, setCryptoConfigs] = (0, import_react.useState)({});
  const [cryptoPaymentDetails, setCryptoPaymentDetails] = (0, import_react.useState)({});
  const [cryptoLoading, setCryptoLoading] = (0, import_react.useState)(false);
  const [cryptoError, setCryptoError] = (0, import_react.useState)("");
  const [returnMessage, setReturnMessage] = (0, import_react.useState)("");
  (0, import_react.useEffect)(() => setImageLoaded(false), [paymentMethod]);
  (0, import_react.useEffect)(() => {
    let cancelled = false;
    const loadOnlinePaymentConfig = async () => {
      if (!SHOW_ONLINE_PAYMENT || !server) return;
      try {
        const response = await fetch(
          `${server}${ONLINE_PAYMENT_PROVIDER.configPath}`
        );
        const payload = await response.json();
        if (cancelled) return;
        const configured = Boolean(payload?.configured);
        const minCredits = Number(payload?.minCredits);
        const maxCredits = Number(payload?.maxCredits);
        setOnlinePaymentLimits({
          minCredits: Number.isInteger(minCredits) && minCredits > 0 ? minCredits : DEFAULT_ONLINE_PAYMENT_LIMITS.minCredits,
          maxCredits: Number.isInteger(maxCredits) && maxCredits > 0 ? maxCredits : DEFAULT_ONLINE_PAYMENT_LIMITS.maxCredits,
          integerCreditsOnly: payload?.integerCreditsOnly !== false
        });
        setOnlinePaymentConfigured(configured);
        if (!configured && paymentMethod === ONLINE_PAYMENT_PROVIDER.id) {
          setPaymentMethod("wechat");
        }
      } catch {
        if (!cancelled && paymentMethod === ONLINE_PAYMENT_PROVIDER.id) {
          setPaymentMethod("wechat");
        }
      }
    };
    void loadOnlinePaymentConfig();
    return () => {
      cancelled = true;
    };
  }, [server, paymentMethod]);
  (0, import_react.useEffect)(() => {
    let cancelled = false;
    const loadCryptoConfig = async () => {
      if (!server) return;
      const configs = {};
      await Promise.all(
        CRYPTO_PROVIDERS.map(async (provider) => {
          try {
            const response = await fetch(`${server}${provider.configPath}`);
            configs[provider.id] = await response.json();
          } catch {
            configs[provider.id] = null;
          }
        })
      );
      if (!cancelled) setCryptoConfigs(configs);
    };
    void loadCryptoConfig();
    return () => {
      cancelled = true;
    };
  }, [server]);
  (0, import_react.useEffect)(() => {
    const params = new URLSearchParams(window.location.search);
    const status = params.get(ONLINE_PAYMENT_PROVIDER.returnParam);
    if (!status) return;
    if (status === "success") {
      setReturnMessage("\u652F\u4ED8\u5DF2\u63D0\u4EA4\uFF0C\u5230\u8D26\u901A\u5E38\u4F1A\u5728\u56DE\u8C03\u786E\u8BA4\u540E\u81EA\u52A8\u5B8C\u6210\u3002");
      void dispatch(fetchUserProfile());
    } else if (status === "failed") {
      setReturnMessage("\u652F\u4ED8\u672A\u5B8C\u6210\uFF0C\u8BF7\u91CD\u65B0\u53D1\u8D77\u652F\u4ED8\u3002");
    } else if (status === "cancel") {
      setReturnMessage("\u5DF2\u53D6\u6D88\u672C\u6B21\u652F\u4ED8\u3002");
    }
  }, [dispatch]);
  const configuredCryptoProviders = CRYPTO_PROVIDERS.filter(
    (provider) => Boolean(cryptoConfigs[provider.id]?.configured)
  );
  const selectedCryptoProvider = CRYPTO_PROVIDERS.find(
    (provider) => provider.id === paymentMethod
  );
  const selectedCryptoConfig = selectedCryptoProvider ? cryptoConfigs[selectedCryptoProvider.id] : null;
  const selectedCryptoDetails = selectedCryptoProvider ? cryptoPaymentDetails[selectedCryptoProvider.id] : null;
  const paymentMethods = [
    ...configuredCryptoProviders.map((provider) => ({
      id: provider.id,
      name: provider.name,
      icon: LuWallet,
      color: provider.color,
      disabled: false
    })),
    ...SHOW_ONLINE_PAYMENT ? [
      {
        id: ONLINE_PAYMENT_PROVIDER.id,
        name: ONLINE_PAYMENT_PROVIDER.name,
        icon: LuCreditCard,
        color: "#2F80ED",
        disabled: !onlinePaymentConfigured
      }
    ] : [],
    { id: "wechat", name: "\u5FAE\u4FE1", icon: LuMessageCircle, color: "#07C160" },
    { id: "alipay", name: "\u652F\u4ED8\u5B9D", icon: LuWallet, color: "#1677FF" }
  ];
  const instructions = [
    { label: "\u5145\u503C\u91D1\u989D", content: "\u4EFB\u610F\u91D1\u989D" },
    {
      label: "\u5927\u989D\u5145\u503C",
      content: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_jsx_runtime.Fragment, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
        "\u5355\u7B14 \u2265 ",
        GPT_PRO_REQUIRED_RECHARGE_AMOUNT,
        " \u79EF\u5206\uFF1A\u89E3\u9501 GPT Pro \u7CFB\u5217\u4F7F\u7528\u8D44\u683C"
      ] }) }),
      highlight: true
    },
    {
      label: "\u5230\u8D26\u65F6\u95F4",
      content: "1-30 \u5206\u949F",
      note: "\u4EBA\u5DE5\u5145\u503C\uFF0C\u90E8\u5206\u60C5\u51B5\u4F1A\u5EF6\u8FDF"
    },
    { label: "\u95EE\u9898\u54A8\u8BE2", content: EMAIL }
  ];
  const isManualPayment = paymentMethod === "wechat" || paymentMethod === "alipay";
  const qrImage = paymentMethod === "wechat" ? wechat_default : alipay_default;
  const aspectRatio = paymentMethod === "wechat" ? "2/3" : "3/4";
  const paymentName = paymentMethod === "wechat" ? "\u5FAE\u4FE1\u652F\u4ED8" : "\u652F\u4ED8\u5B9D";
  const handleCreateOnlinePaymentOrder = async () => {
    const credits = Number(rechargeAmount);
    if (!Number.isFinite(credits) || !Number.isInteger(credits) || credits < onlinePaymentLimits.minCredits || credits > onlinePaymentLimits.maxCredits) {
      setCheckoutError(
        `\u8BF7\u8F93\u5165 ${onlinePaymentLimits.minCredits}-${onlinePaymentLimits.maxCredits} \u4E4B\u95F4\u7684\u6574\u6570\u79EF\u5206`
      );
      return;
    }
    if (!token) {
      setCheckoutError("\u8BF7\u5148\u767B\u5F55\u540E\u518D\u5145\u503C");
      return;
    }
    if (!server) {
      setCheckoutError("\u5F53\u524D\u670D\u52A1\u5668\u4E0D\u53EF\u7528\uFF0C\u8BF7\u7A0D\u540E\u91CD\u8BD5");
      return;
    }
    setCheckoutError("");
    setCheckoutLoading(true);
    try {
      const response = await fetch(
        `${server}${ONLINE_PAYMENT_PROVIDER.createOrderPath}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ credits })
        }
      );
      const payload = await response.json();
      const checkoutUrl = payload?.checkoutUrl || payload?.redirectUrl;
      if (!response.ok || !checkoutUrl) {
        throw new Error(
          payload?.error?.message || payload?.error || "\u521B\u5EFA\u652F\u4ED8\u8BA2\u5355\u5931\u8D25"
        );
      }
      openCheckoutUrl(checkoutUrl);
    } catch (error) {
      setCheckoutError(toErrorMessage(error));
    } finally {
      setCheckoutLoading(false);
    }
  };
  const handleCreateCryptoAddress = async () => {
    if (!selectedCryptoProvider) return;
    if (!token) {
      setCryptoError("\u8BF7\u5148\u767B\u5F55\u540E\u518D\u5145\u503C");
      return;
    }
    if (!server) {
      setCryptoError("\u5F53\u524D\u670D\u52A1\u5668\u4E0D\u53EF\u7528\uFF0C\u8BF7\u7A0D\u540E\u91CD\u8BD5");
      return;
    }
    setCryptoError("");
    setCryptoLoading(true);
    try {
      const response = await fetch(
        `${server}${selectedCryptoProvider.createOrderPath}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          }
        }
      );
      const payload = await response.json();
      if (!response.ok || !payload?.depositAddress) {
        throw new Error(
          payload?.error?.message || payload?.error || `\u521B\u5EFA ${selectedCryptoProvider.name} \u5730\u5740\u5931\u8D25`
        );
      }
      setCryptoPaymentDetails((current) => ({
        ...current,
        [selectedCryptoProvider.id]: payload
      }));
    } catch (error) {
      setCryptoError(
        error instanceof Error ? error.message : `\u521B\u5EFA ${selectedCryptoProvider.name} \u5730\u5740\u5931\u8D25`
      );
    } finally {
      setCryptoLoading(false);
    }
  };
  const handleCopyCryptoAddress = async () => {
    const address = selectedCryptoDetails?.depositAddress;
    if (!address) return;
    await navigator.clipboard?.writeText(address);
  };
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("style", { children: `
        .recharge-container {
          max-width: ${isMobile ? "100%" : "1000px"};
          margin: 0 auto;
          padding: ${isMobile ? "var(--space-6)" : "var(--space-12) var(--space-8)"};
          color: var(--text);
          animation: rechargeFadeIn 0.25s ease-out both;
        }

        @keyframes rechargeFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .page-title {
          font-size: ${isMobile ? "1.5rem" : "2rem"};
          font-weight: 700;
          color: var(--text);
          display: flex;
          align-items: center;
          gap: var(--space-3);
          margin: 0 0 var(--space-10);
          letter-spacing: -0.03em;
        }

        .content-grid {
          display: grid;
          grid-template-columns: ${isMobile ? "1fr" : "1.1fr 0.9fr"};
          gap: var(--space-8);
          align-items: start;
        }

        .card {
          background: var(--backgroundSecondary);
          border: 1px solid var(--border);
          border-radius: 24px;
          padding: ${isMobile ? "var(--space-6)" : "var(--space-10)"};
          box-shadow: 0 12px 40px rgba(0, 0, 0, 0.03), 0 1px 3px rgba(0, 0, 0, 0.02);
          position: relative;
          overflow: hidden;
        }

        /* \u652F\u4ED8\u65B9\u5F0F\u9009\u62E9\u5668 - \u62DF\u7269\u5316\u5206\u6BB5\u63A7\u4EF6 */
        .payment-tabs {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(96px, 1fr));
          gap: 6px;
          margin-bottom: var(--space-8);
          background: var(--backgroundTertiary);
          border-radius: var(--radius-xl);
          padding: 6px;
          border: 1px solid var(--border);
          box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.05);
        }

        .payment-tab {
          padding: ${isMobile ? "var(--space-3)" : "var(--space-4)"};
          background: transparent;
          border: none;
          border-radius: var(--radius-lg);
          cursor: pointer;
          transition:
            color 0.18s ease,
            background-color 0.18s ease,
            box-shadow 0.18s ease,
            transform 0.18s ease;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: var(--space-2);
          position: relative;
          color: var(--textSecondary);
          min-height: 80px;
        }

        .payment-tab:hover:not(:disabled):not(.active) {
          color: var(--text);
          background: rgba(255, 255, 255, 0.05);
        }

        .payment-tab.active {
          background: var(--backgroundSecondary);
          color: var(--text);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.05);
          transform: scale(1.02);
        }

        .payment-tab:disabled {
          opacity: 0.3;
          cursor: not-allowed;
          filter: grayscale(1);
        }

        .tab-icon {
          font-size: ${isMobile ? "1.4rem" : "1.6rem"};
          transition: transform 0.18s ease;
        }
        .payment-tab.active .tab-icon { transform: translateY(-2px); }

        .tab-name {
          font-size: 0.85rem;
          font-weight: 600;
          letter-spacing: -0.01em;
        }

        .active-indicator {
          position: absolute;
          top: 6px;
          right: 6px;
          width: 16px;
          height: 16px;
          background: var(--primary);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          animation: rechargeScaleIn 0.18s ease-out both;
        }

        @keyframes rechargeScaleIn {
          from { opacity: 0; transform: scale(0.85); }
          to { opacity: 1; transform: scale(1); }
        }

        .coming-badge {
          position: absolute;
          bottom: 6px;
          background: var(--backgroundTertiary);
          color: var(--textTertiary);
          font-size: var(--fontSize-sm);
          padding: 2px 6px;
          border-radius: var(--radius-sm);
          font-weight: 500;
          border: 1px solid var(--border);
        }

        .amount-box {
          display: grid;
          grid-template-columns: 1fr auto;
          gap: var(--space-3);
          align-items: end;
          margin-bottom: var(--space-6);
        }
        .amount-label {
          display: block;
          color: var(--textTertiary);
          font-size: 0.875rem;
          font-weight: 600;
          margin-bottom: var(--space-2);
        }
        .amount-input {
          width: 100%;
          border: 1px solid var(--border);
          background: var(--background);
          color: var(--text);
          border-radius: var(--radius-lg);
          padding: 12px 14px;
          font-size: 1rem;
          outline: none;
        }
        .amount-input:focus {
          border-color: var(--primary);
          box-shadow: 0 0 0 3px rgba(var(--primary-rgb, 47, 128, 237), 0.12);
        }
        .amount-hint {
          color: var(--textTertiary);
          font-size: 0.8rem;
          font-weight: 600;
          margin: calc(var(--space-3) * -1) 0 var(--space-5);
        }
        .crypto-panel {
          display: grid;
          gap: var(--space-5);
        }
        .crypto-address-box {
          border: 1px solid var(--border);
          border-radius: var(--radius-lg);
          background: var(--background);
          padding: var(--space-4);
        }
        .crypto-address-label {
          color: var(--textTertiary);
          font-size: 0.8rem;
          font-weight: 700;
          margin-bottom: var(--space-2);
        }
        .crypto-address-row {
          display: grid;
          grid-template-columns: 1fr auto;
          gap: var(--space-3);
          align-items: center;
        }
        .crypto-address {
          color: var(--text);
          font-family: monospace;
          font-size: 0.86rem;
          overflow-wrap: anywhere;
        }
        .copy-button {
          border: 1px solid var(--border);
          border-radius: var(--radius-md);
          background: var(--backgroundSecondary);
          color: var(--text);
          width: 40px;
          height: 40px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }
        .checkout-button {
          border: none;
          border-radius: var(--radius-lg);
          padding: 12px 18px;
          background: var(--primary);
          color: white;
          font-weight: 700;
          cursor: pointer;
          min-width: 112px;
        }
        .checkout-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .checkout-error {
          color: #FF5252;
          font-size: 0.875rem;
          font-weight: 600;
          margin-bottom: var(--space-5);
        }
        .return-message {
          border: 1px solid var(--border);
          background: var(--backgroundTertiary);
          color: var(--textSecondary);
          border-radius: var(--radius-lg);
          padding: var(--space-4);
          margin-bottom: var(--space-5);
          font-size: 0.9rem;
          font-weight: 600;
        }

        /* \u63D0\u9192\u533A\u57DF - \u4F18\u96C5\u7684\u9AD8\u4EAE */
        .notice {
          background: linear-gradient(135deg, rgba(255, 107, 107, 0.05), rgba(255, 107, 107, 0.02));
          border-left: 4px solid #FF5252;
          border-radius: var(--radius-lg);
          padding: var(--space-5);
          margin-bottom: var(--space-8);
          display: flex;
          gap: var(--space-4);
        }

        .notice-icon {
          color: #FF5252;
          flex-shrink: 0;
          margin-top: 2px;
        }

        .notice-content { flex: 1; }
        .notice-text { 
          display: block; 
          margin-bottom: var(--space-3); 
          font-weight: 500; 
          font-size: 0.95rem;
          color: var(--textSecondary);
        }
        
        .username-container {
          display: inline-flex;
          align-items: center;
          background: var(--background);
          padding: 4px 12px;
          border-radius: var(--radius-md);
          border: 1px solid var(--border);
          box-shadow: 0 2px 4px rgba(0,0,0,0.02);
          margin-left: 4px;
        }

        .notice-highlight {
          color: var(--primary);
          font-weight: 700;
          font-family: monospace;
          font-size: 1.1rem;
        }
        
        .notice-warning { 
          display: flex;
          align-items: center;
          gap: 6px;
          color: #FF5252; 
          font-size: 0.875rem; 
          font-weight: 600; 
          opacity: 0.9;
        }

        /* QR \u533A\u57DF - \u7CBE\u81F4\u5BB9\u5668\uFF1B\u5207\u6362\u65F6 skeleton \u5360\u4F4D + \u77ED opacity \u6DE1\u5165 */
        .qr-wrapper { 
          text-align: center;
          padding: var(--space-4) 0;
        }
        .qr-container {
          width: 100%;
          max-width: ${isMobile ? "240px" : "280px"};
          aspect-ratio: ${aspectRatio};
          background: white;
          border-radius: 20px;
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0,0,0,0.05);
          overflow: hidden;
          position: relative;
          margin: 0 auto;
          border: 8px solid white;
        }
        .qr-image { 
          width: 100%; 
          height: 100%; 
          object-fit: contain; 
          opacity: ${imageLoaded ? "1" : "0"}; 
          transition: opacity 0.2s ease;
          filter: contrast(1.05);
        }
        .qr-loading { 
          position: absolute; 
          top: 0; left: 0; right: 0; bottom: 0;
          background: #f8f9fa;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #adb5bd;
          font-size: 0.85rem;
        }
        .qr-tip { 
          margin-top: var(--space-6); 
          display: inline-flex; 
          align-items: center; 
          gap: 10px; 
          padding: 8px 16px;
          background: var(--backgroundTertiary);
          border-radius: 100px;
          color: var(--textSecondary); 
          font-size: 0.85rem; 
          font-weight: 500;
        }

        /* \u5145\u503C\u8BF4\u660E - \u7ED3\u6784\u5316\u5217\u8868 */
        .info-title {
          display: flex;
          align-items: center;
          gap: var(--space-2);
          margin: 0 0 var(--space-8);
          font-size: 1.1rem;
          font-weight: 700;
          color: var(--text);
        }

        .info-list { display: flex; flex-direction: column; gap: var(--space-6); }
        .info-item {
          display: grid;
          grid-template-columns: 90px 1fr;
          gap: var(--space-4);
          align-items: start;
        }
        .info-label { 
          color: var(--textTertiary); 
          font-weight: 600; 
          font-size: 0.875rem; 
          text-transform: uppercase;
          letter-spacing: 0.05em;
          padding-top: 2px;
        }
        .info-content { 
          color: var(--text); 
          font-size: 0.95rem; 
          line-height: var(--leading-normal);
          font-weight: 500;
        }
        .info-note { 
          display: block; 
          color: var(--textTertiary); 
          font-size: var(--fontSize-base); 
          margin-top: 6px;
          font-weight: 400;
        }

        .info-item-highlight {
          padding: var(--space-5);
          border-radius: var(--radius-xl);
          background: linear-gradient(to bottom right, var(--backgroundTertiary), var(--backgroundSecondary));
          border: 1px solid var(--border);
          box-shadow: 0 4px 12px rgba(0,0,0,0.02);
        }
        .info-item-highlight .info-label { color: var(--primary); }
        .info-item-highlight .info-content { color: var(--text); font-weight: 600; }

        /* \u5E95\u90E8\u89C4\u5219\u63D0\u793A */
        .rule-mini {
          margin-top: var(--space-10);
          display: flex;
          gap: var(--space-3);
          align-items: flex-start;
          padding: var(--space-5);
          border-radius: var(--radius-xl);
          background: rgba(var(--primary-rgb, 100, 100, 100), 0.03);
          color: var(--textSecondary);
          font-size: var(--fontSize-base);
          line-height: var(--leading-relaxed);
          border: 1px dashed var(--border);
        }
        .rule-mini .icon { color: var(--primary); opacity: 0.8; }

        @media (max-width: 768px) {
          .info-item {
            grid-template-columns: 1fr;
            gap: 4px;
          }
          .info-label { font-size: 0.875rem; }
          .amount-box { grid-template-columns: 1fr; }
        }

        @media (prefers-reduced-motion: reduce) {
          .recharge-container,
          .active-indicator {
            animation: none;
          }

          .payment-tab,
          .tab-icon,
          .qr-image {
            transition: none;
          }

          .payment-tab.active {
            transform: none;
          }

          .payment-tab.active .tab-icon {
            transform: none;
          }

          .qr-image {
            opacity: ${imageLoaded ? "1" : "0"};
          }
        }
      ` }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "recharge-container", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h1", { className: "page-title", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuBadgeDollarSign, { size: isMobile ? 24 : 32, "aria-hidden": "true" }),
        "\u8D26\u6237\u5145\u503C"
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "content-grid", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "card", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "payment-tabs", children: paymentMethods.map((method) => {
            const Icon = method.icon;
            const isActive = paymentMethod === method.id;
            return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
              "button",
              {
                type: "button",
                className: `payment-tab ${isActive ? "active" : ""}`,
                onClick: () => !method.disabled && setPaymentMethod(method.id),
                disabled: method.disabled,
                children: [
                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                    Icon,
                    {
                      className: "tab-icon",
                      style: { color: isActive ? method.color : void 0 },
                      "aria-hidden": "true"
                    }
                  ),
                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "tab-name", children: method.name }),
                  isActive && !method.disabled && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "active-indicator", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuCircleCheck, { size: 10, "aria-hidden": "true" }) }),
                  method.disabled && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "coming-badge", children: "\u656C\u8BF7\u671F\u5F85" })
                ]
              },
              method.id
            );
          }) }),
          returnMessage && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "return-message", children: returnMessage }),
          selectedCryptoProvider ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "crypto-panel", children: [
            !selectedCryptoDetails ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
              "button",
              {
                type: "button",
                className: "checkout-button",
                onClick: handleCreateCryptoAddress,
                disabled: cryptoLoading,
                children: cryptoLoading ? "\u521B\u5EFA\u4E2D..." : `\u751F\u6210 ${selectedCryptoProvider.name} \u5145\u503C\u5730\u5740`
              }
            ) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "crypto-address-box", children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "crypto-address-label", children: [
                selectedCryptoDetails.network,
                " ",
                selectedCryptoDetails.token,
                "\u6536\u6B3E\u5730\u5740"
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "crypto-address-row", children: [
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "crypto-address", children: selectedCryptoDetails.depositAddress }),
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                  "button",
                  {
                    type: "button",
                    className: "copy-button",
                    onClick: handleCopyCryptoAddress,
                    title: "\u590D\u5236\u5730\u5740",
                    "aria-label": "\u590D\u5236\u5730\u5740",
                    children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuCopy, { size: 18, "aria-hidden": "true" })
                  }
                )
              ] })
            ] }),
            cryptoError && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "checkout-error", children: cryptoError }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "rule-mini", style: { marginTop: 0 }, children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuInfo, { className: "icon", size: 20, "aria-hidden": "true" }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
                "\u53EA\u652F\u6301 ",
                selectedCryptoConfig?.network,
                " \u7F51\u7EDC\u5B98\u65B9",
                selectedCryptoConfig?.token,
                "\u30021 ",
                selectedCryptoConfig?.token,
                " =",
                Number(
                  selectedCryptoConfig?.[selectedCryptoProvider.creditRateKey] || 1
                ),
                " \u79EF\u5206\uFF0C\u6700\u4F4E\u81EA\u52A8\u5165\u8D26",
                Number(selectedCryptoConfig?.minCredits || 1),
                " \u79EF\u5206\u3002"
              ] })
            ] })
          ] }) : paymentMethod === ONLINE_PAYMENT_PROVIDER.id ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "amount-box", children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "amount-label", children: "\u5145\u503C\u91D1\u989D\uFF08\u79EF\u5206\uFF09" }),
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                  "input",
                  {
                    className: "amount-input",
                    type: "number",
                    min: onlinePaymentLimits.minCredits,
                    max: onlinePaymentLimits.maxCredits,
                    step: "1",
                    value: rechargeAmount,
                    onChange: (event) => {
                      setRechargeAmount(event.target.value);
                      setCheckoutError("");
                    }
                  }
                )
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                "button",
                {
                  type: "button",
                  className: "checkout-button",
                  onClick: handleCreateOnlinePaymentOrder,
                  disabled: checkoutLoading,
                  children: checkoutLoading ? "\u521B\u5EFA\u4E2D..." : "\u53BB\u652F\u4ED8"
                }
              )
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "amount-hint", children: [
              "\u5355\u7B14\u652F\u6301 ",
              onlinePaymentLimits.minCredits,
              "-",
              onlinePaymentLimits.maxCredits,
              " \u4E2A\u6574\u6570\u79EF\u5206"
            ] }),
            checkoutError && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "checkout-error", children: checkoutError }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "rule-mini", style: { marginTop: 0 }, children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuInfo, { className: "icon", size: 20, "aria-hidden": "true" }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { children: "\u5C06\u6253\u5F00 Waffo \u5B89\u5168\u6536\u94F6\u53F0\uFF0C\u53EF\u4F7F\u7528\u94F6\u884C\u5361\u3001\u94B1\u5305\u7B49\u5DF2\u5F00\u901A\u7684\u672C\u5730\u652F\u4ED8\u65B9\u5F0F\u3002\u652F\u4ED8\u6210\u529F\u540E\u81EA\u52A8\u5165\u8D26\u3002" })
            ] })
          ] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "notice", children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuCircleAlert, { size: 24, className: "notice-icon", "aria-hidden": "true" }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "notice-content", children: [
                /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: "notice-text", children: [
                  "\u8F6C\u8D26\u5907\u6CE8\u8BF7\u52A1\u5FC5\u586B\u5199\u7528\u6237\u540D\uFF1A",
                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "username-container", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "notice-highlight", children: auth.user?.username || "username" }) })
                ] }),
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "notice-warning", children: "\u672A\u586B\u5199\u5907\u6CE8\u5C06\u5BFC\u81F4\u5145\u503C\u65E0\u6CD5\u81EA\u52A8\u5230\u8D26\uFF0C\u9700\u4EBA\u5DE5\u5904\u7406" })
              ] })
            ] }),
            isManualPayment && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "qr-wrapper", children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "qr-container", children: [
                !imageLoaded && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "qr-loading", children: "\u5B89\u5168\u52A0\u8F7D\u4E2D..." }),
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                  "img",
                  {
                    src: qrImage,
                    alt: `${paymentName}\u5145\u503C\u4E8C\u7EF4\u7801`,
                    className: "qr-image",
                    onLoad: () => setImageLoaded(true)
                  }
                )
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "qr-tip", children: [
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuSmartphone, { size: 18, "aria-hidden": "true" }),
                "\u6253\u5F00",
                paymentName,
                "\u300C\u626B\u4E00\u626B\u300D\u5B8C\u6210\u652F\u4ED8"
              ] })
            ] })
          ] })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "card", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h3", { className: "info-title", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuInfo, { size: 22, "aria-hidden": "true" }),
            "\u5145\u503C\u987B\u77E5"
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "info-list", children: instructions.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
            "div",
            {
              className: `info-item ${item.highlight ? "info-item-highlight" : ""}`,
              children: [
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "info-label", children: item.label }),
                /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "info-content", children: [
                  item.content,
                  item.note && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "info-note", children: item.note })
                ] })
              ]
            },
            item.label
          )) }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "rule-mini", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuInfo, { className: "icon", size: 20, "aria-hidden": "true" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
              "\u5145\u503C\u91D1\u989D\u65E0\u9650\u5236\u3002\u5982\u9700\u5F00\u542F\u8054\u7F51\u641C\u7D22\u3001\u6587\u6863\u5206\u6790\u7B49\u9AD8\u7EA7\u529F\u80FD\uFF0C\u8BF7\u786E\u4FDD\u4F59\u989D\u8FBE\u5230 ",
              ADVANCED_FEATURE_MIN_BALANCE,
              " \u79EF\u5206\uFF1BGPT Pro \u7CFB\u5217\u9700\u8981\u5355\u7B14 ",
              GPT_PRO_REQUIRED_RECHARGE_AMOUNT,
              " \u79EF\u5206\u3002"
            ] })
          ] })
        ] })
      ] })
    ] })
  ] });
};
var Recharge_default = RechargePage;
export {
  Recharge_default as default
};
