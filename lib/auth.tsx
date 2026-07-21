// Mock authentication (Phase 2), frontend-only.
//
// There is no Firebase Auth here — any email + a 6+ char password "works",
// and sign-up just creates a local user object. The point is to exercise the
// real navigation guard (unauthenticated users only see auth screens) without
// a backend. State is in-memory and resets on reload.

import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { AppUser } from "./types";

interface AuthContextValue {
  user: AppUser | null;
  initializing: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function fakeDelay(ms = 550) {
  return new Promise((res) => setTimeout(res, ms));
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  // No persisted session in this mock, so init is effectively immediate.
  const [initializing] = useState(false);

  const signIn = useCallback(async (email: string, password: string) => {
    const trimmed = email.trim();
    if (!/^\S+@\S+\.\S+$/.test(trimmed)) {
      throw new Error("Enter a valid email address.");
    }
    if (password.length < 6) {
      throw new Error("Password must be at least 6 characters.");
    }
    await fakeDelay();
    setUser({
      uid: "user_" + trimmed.toLowerCase(),
      name: trimmed.split("@")[0].replace(/\b\w/g, (c) => c.toUpperCase()),
      email: trimmed,
      role: "admin",
      createdAt: Date.now(),
    });
  }, []);

  const signUp = useCallback(
    async (name: string, email: string, password: string) => {
      const trimmed = email.trim();
      if (name.trim().length < 2) {
        throw new Error("Please enter your name.");
      }
      if (!/^\S+@\S+\.\S+$/.test(trimmed)) {
        throw new Error("Enter a valid email address.");
      }
      if (password.length < 6) {
        throw new Error("Password must be at least 6 characters.");
      }
      await fakeDelay();
      // In the real app this is where users/{uid} would be created in Firestore.
      setUser({
        uid: "user_" + trimmed.toLowerCase(),
        name: name.trim(),
        email: trimmed,
        role: "admin",
        createdAt: Date.now(),
      });
    },
    []
  );

  const signOut = useCallback(() => setUser(null), []);

  const value = useMemo(
    () => ({ user, initializing, signIn, signUp, signOut }),
    [user, initializing, signIn, signUp, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
