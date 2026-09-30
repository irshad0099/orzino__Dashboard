"use client";
import { useCallback, useEffect, useState } from "react";

type State<T> =
  | { token: string; status: "ready"; data: T }
  | { token: string; status: "error"; message: string };

export type ApiData<T> =
  | { status: "loading" }
  | { status: "ready"; data: T }
  | { status: "error"; message: string };

/**
 * Loads data from an async function and re-loads when `key` changes or `reload()` is called.
 * `loading` is derived (result token !== current token), so no setState runs synchronously
 * inside the effect.
 */
export function useApiData<T>(load: () => Promise<T>, key: string): ApiData<T> & { reload: () => void } {
  const [nonce, setNonce] = useState(0);
  const [state, setState] = useState<State<T> | null>(null);
  const token = `${key}#${nonce}`;

  useEffect(() => {
    let cancelled = false;
    load()
      .then((data) => {
        if (!cancelled) setState({ token, status: "ready", data });
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setState({
            token,
            status: "error",
            message: error instanceof Error ? error.message : "Something went wrong. Please try again.",
          });
        }
      });
    return () => {
      cancelled = true;
    };
    // `load` is recreated every render; the token captures when a re-load is actually wanted.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  if (!state || state.token !== token) return { status: "loading", reload };
  return { ...state, reload };
}
