"use client";

import { createContext, useContext, useMemo, useEffect, useState } from "react";

const STORAGE_KEY = "ai-health-auth";
const SessionContext = createContext(null);

export function SessionProvider({ children }) {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);

    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setToken(parsed.token || null);
        setUser(parsed.user || null);
      } catch (error) {
        window.localStorage.removeItem(STORAGE_KEY);
      }
    }

    setIsReady(true);
  }, []);

  const value = useMemo(
    () => ({
      token,
      user,
      isReady,
      saveSession(nextToken, nextUser) {
        setToken(nextToken);
        setUser(nextUser);
        window.localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({ token: nextToken, user: nextUser })
        );
      },
      clearSession() {
        setToken(null);
        setUser(null);
        window.localStorage.removeItem(STORAGE_KEY);
      },
    }),
    [isReady, token, user]
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const context = useContext(SessionContext);

  if (!context) {
    throw new Error("useSession must be used within SessionProvider");
  }

  return context;
}
