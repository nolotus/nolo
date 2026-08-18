import {
  resolvePreferredAuthLocale
} from "/public/assets/chunks/chunk-5WJ7RXPI.js";
import {
  useNavigate,
  useSearchParams
} from "/public/assets/chunks/chunk-BELEJNOF.js";
import {
  useAppDispatch
} from "/public/assets/chunks/chunk-U73LCHVO.js";
import {
  signUp
} from "/public/assets/chunks/chunk-RWWUEPWY.js";
import {
  useTranslation
} from "/public/assets/chunks/chunk-UWXJIOEO.js";
import {
  require_react
} from "/public/assets/chunks/chunk-JXB3DLZU.js";
import {
  __toESM
} from "/public/assets/chunks/chunk-PKRG6ODM.js";

// packages/auth/web/useRegister.ts
var import_react = __toESM(require_react(), 1);
var useRegister = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const dispatch = useAppDispatch();
  const { t, i18n } = useTranslation();
  const [error, setError] = (0, import_react.useState)(null);
  const returnTo = searchParams.get("returnTo") || "";
  const safeReturnTo = returnTo.startsWith("/") && !returnTo.startsWith("//") ? returnTo : "/";
  const handleRegister = async (data) => {
    setError(null);
    try {
      const locale = resolvePreferredAuthLocale(navigator.language, [i18n.language]);
      const result = await dispatch(signUp({ ...data, locale })).unwrap();
      if (result.token) {
        navigate(safeReturnTo);
      }
    } catch (err) {
      console.error("Register error:", err);
      const errorMessage = err?.message || err;
      setError(
        typeof errorMessage === "string" ? errorMessage : t("networkError")
      );
    }
  };
  return { handleRegister, error };
};
var useRegister_default = useRegister;

export {
  useRegister_default
};
