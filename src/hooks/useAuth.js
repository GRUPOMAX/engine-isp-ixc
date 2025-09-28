// src/hooks/useAuth.js
import { useEffect, useState } from "react";

function readSession() {
  try {
    const raw = localStorage.getItem("frontisp_auth");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export default function useAuth() {
  const [session, setSession] = useState(readSession());

  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === "frontisp_auth") setSession(readSession());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  function login(payload) {
    localStorage.setItem("frontisp_auth", JSON.stringify(payload));
    setSession(payload);
  }

  function logout() {
    localStorage.removeItem("frontisp_auth");
    setSession(null);
    window.location.assign("/login");
  }

  return { session, isAuthed: !!session, login, logout };
}
