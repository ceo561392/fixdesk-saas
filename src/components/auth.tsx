import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { api, send } from "../lib/api";
import type { User } from "../types";
interface Auth {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}
const Context = createContext<Auth | null>(null);
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    api<User>("/auth/me")
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
    const expired = () => setUser(null);
    window.addEventListener("session-expired", expired);
    return () => window.removeEventListener("session-expired", expired);
  }, []);
  const login = async (email: string, password: string) => {
    await send("/auth/login", "POST", { email, password });
    setUser(await api<User>("/auth/me"));
  };
  const logout = async () => {
    await send("/auth/logout", "POST");
    setUser(null);
  };
  return (
    <Context.Provider value={{ user, loading, login, logout }}>
      {children}
    </Context.Provider>
  );
}
export function useAuth() {
  const value = useContext(Context);
  if (!value) throw new Error("AuthProvider missing");
  return value;
}
