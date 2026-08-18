import { useState, useEffect } from "react";
import { useAppDispatch } from "./store";
import { read, readAndWait } from "database/dbSlice";

const toFetchError = (err: unknown): Error => {
  if (err instanceof Error) return err;
  if (
    err &&
    typeof err === "object" &&
    "message" in err &&
    typeof (err as { message?: unknown }).message === "string" &&
    (err as { message: string }).message.trim().length > 0
  ) {
    return new Error((err as { message: string }).message);
  }
  if (typeof err === "string" && err.trim().length > 0) {
    return new Error(err);
  }
  return new Error("Unknown error");
};

export function useFetchData<T>(dbKey: string | null | undefined) {
  const dispatch = useAppDispatch();
  const [data, setData] = useState<T | undefined>();
  const [isLoading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
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
