import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AppState } from "react-native";
import { Data, finishExpired, initialData, parseStoredData } from "./model";

const KEY = "momentum.v1";
type Store = {
  data: Data;
  ready: boolean;
  error: string;
  update: (fn: (d: Data) => Data) => Promise<void>;
  retry: () => void;
  dismissError: () => void;
};
const Context = createContext<Store | null>(null);
export function MomentumProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState(initialData);
  const current = useRef(data);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const queue = useRef(Promise.resolve());
  const load = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(KEY);
      const next = raw ? finishExpired(parseStoredData(raw)) : initialData();
      // Keep the storage key stable across versions. Persist migrations and any
      // session completed while the app was closed before accepting new edits.
      if (raw) {
        const encoded = JSON.stringify(next);
        if (encoded !== raw) await AsyncStorage.setItem(KEY, encoded);
      }
      current.current = next;
      setData(next);
      setReady(true);
      setError("");
    } catch {
      setError(
        "Your saved data could not be opened. It has not been overwritten. Check device storage and retry.",
      );
    }
  }, []);
  useEffect(() => {
    // AsyncStorage resolves before load updates state; this is external storage synchronization.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);
  const update = useCallback((fn: (d: Data) => Data) => {
    const operation = queue.current.then(async () => {
      const next = fn(current.current);
      if (next === current.current) return;
      await AsyncStorage.setItem(KEY, JSON.stringify(next));
      current.current = next;
      setData(next);
      setError("");
    });
    queue.current = operation.catch(() => {
      setError(
        "That change could not be saved. Please check device storage and try again.",
      );
    });
    return operation;
  }, []);
  useEffect(() => {
    if (!ready) return;
    const check = () => {
      if (current.current.active && current.current.active.end <= Date.now())
        void update((d) => finishExpired(d)).catch(() => {});
    };
    check();
    const timer = setInterval(check, 1000);
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") check();
    });
    return () => {
      clearInterval(timer);
      subscription.remove();
    };
  }, [ready, update]);
  return (
    <Context.Provider
      value={{
        data,
        ready,
        error,
        update,
        retry: () => {
          void load();
        },
        dismissError: () => setError(""),
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useMomentum() {
  const context = useContext(Context);
  if (!context) throw new Error("Missing MomentumProvider");
  return context;
}
