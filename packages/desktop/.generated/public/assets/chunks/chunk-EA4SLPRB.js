import {
  useAppDispatch
} from "/public/assets/chunks/chunk-U73LCHVO.js";
import {
  readAndWait
} from "/public/assets/chunks/chunk-RWWUEPWY.js";
import {
  require_react
} from "/public/assets/chunks/chunk-JXB3DLZU.js";
import {
  __toESM
} from "/public/assets/chunks/chunk-PKRG6ODM.js";

// packages/app/hooks.ts
var import_react = __toESM(require_react());
var toFetchError = (err) => {
  if (err instanceof Error) return err;
  if (err && typeof err === "object" && "message" in err && typeof err.message === "string" && err.message.trim().length > 0) {
    return new Error(err.message);
  }
  if (typeof err === "string" && err.trim().length > 0) {
    return new Error(err);
  }
  return new Error("Unknown error");
};
function useFetchData(dbKey) {
  const dispatch = useAppDispatch();
  const [data, setData] = (0, import_react.useState)();
  const [isLoading, setLoading] = (0, import_react.useState)(false);
  const [error, setError] = (0, import_react.useState)(null);
  (0, import_react.useEffect)(() => {
    if (!dbKey) return;
    let mounted = true;
    const getData = async () => {
      try {
        setLoading(true);
        const readAction = await dispatch(readAndWait(dbKey)).unwrap();
        if (mounted) {
          setData(readAction);
        }
      } catch (err) {
        if (mounted) {
          setError(toFetchError(err));
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };
    getData();
    return () => {
      mounted = false;
    };
  }, [dispatch, dbKey]);
  const reload = async () => {
    if (!dbKey) return;
    try {
      setLoading(true);
      const readAction = await dispatch(readAndWait(dbKey)).unwrap();
      setData(readAction);
      setError(null);
    } catch (err) {
      setError(toFetchError(err));
    } finally {
      setLoading(false);
    }
  };
  return { data, isLoading, error, reload };
}

export {
  useFetchData
};
