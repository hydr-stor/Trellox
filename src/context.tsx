import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { api } from "./api";
import type { Profile } from "./types";
const Auth = createContext<{
  profile: Profile | null;
  loading: boolean;
  refresh: () => Promise<void>;
}>({ profile: null, loading: true, refresh: async () => {} });
export function AuthProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null),
    [loading, setLoading] = useState(true);
  async function refresh() {
    try {
      setProfile(await api<Profile>("/auth/me"));
    } catch {
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void refresh();
  }, []);
  return (
    <Auth.Provider value={{ profile, loading, refresh }}>
      {children}
    </Auth.Provider>
  );
}
export const useAuth = () => useContext(Auth);
export function useTheme() {
  const [dark, setDark] = useState(
    () => localStorage.getItem("riwaq-theme") === "dark",
  );
  useEffect(() => {
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    localStorage.setItem("riwaq-theme", dark ? "dark" : "light");
  }, [dark]);
  return { dark, toggle: () => setDark((v) => !v) };
}
