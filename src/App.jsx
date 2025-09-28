// src/App.jsx
import { useEffect, useState } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import useTheme from "@/hooks/useTheme";
import useAuth from "@/hooks/useAuth";
import Header from "@/components/Header";
import HealthCard from "@/components/Cards/HealthCard";
import HeartbeatCard from "@/components/Cards/HeartbeatCard";
import RefreshCard from "@/components/Cards/RefreshCard";
import EventLog from "@/components/EventLog";
import AdminNeural from "@/pages/AdminNeural";
import Login from "@/pages/Login";
import CacheSyncPage from "@/pages/CacheSyncPage";
import AdminConfig from "@/pages/AdminConfig";

// apenas para exibir/confirmar o modal pós-login
import TokenModal from "@/components/TokenModal";
import { confirmSavedToken } from "@/lib/adminApi";

/* --------------------------------
 * ROTA PROTEGIDA
 * -------------------------------- */
function Protected({ children }) {
  const { isAuthed } = useAuth();
  const location = useLocation();
  if (!isAuthed) return <Navigate to="/login" replace state={{ from: location }} />;
  return children;
}

/* --------------------------------
 * SHELL (abre modal somente se houver token no localStorage)
 * -------------------------------- */
function Shell({ children }) {
  const { toggle } = useTheme();
  const { isAuthed, logout } = useAuth();

  const [tokenModalOpen, setTokenModalOpen] = useState(false);
  const [freshToken, setFreshToken] = useState("");

  useEffect(() => {
    if (!isAuthed) return;
    const t = localStorage.getItem("frontisp_fresh_token");
    if (t) {
      setFreshToken(t);
      setTokenModalOpen(true);
    }
  }, [isAuthed]);

  return (
    <div className="min-h-screen overflow-x-hidden">
      <Header onToggleTheme={toggle} isAuthed={isAuthed} onLogout={logout} />
      <main className="mx-auto max-w-6xl px-4 py-6 pb-24 md:pb-6">{children}</main>

      <TokenModal
        open={tokenModalOpen}
        token={freshToken}
        onClose={async () => {
          try { await confirmSavedToken(); } catch {}
          setTokenModalOpen(false);
          setFreshToken("");
          localStorage.removeItem("frontisp_fresh_token");
        }}
      />
    </div>
  );
}

/* --------------------------------
 * DASHBOARD & VISION
 * -------------------------------- */
function Dashboard() {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <HealthCard />
      <RefreshCard />
      <HeartbeatCard />
      <div className="md:col-span-2"><EventLog /></div>
    </div>
  );
}

function Vision() {
  return <AdminNeural />;
}

/* --------------------------------
 * APP ROUTER
 * -------------------------------- */
export default function App() {
  return (
    <Routes>
      {/* público */}
      <Route path="/login" element={<Login />} />

      {/* privado */}
      <Route
        path="/"
        element={
          <Protected>
            <Shell><Dashboard /></Shell>
          </Protected>
        }
      />
      <Route
        path="/vision"
        element={
          <Protected>
            <Shell><Vision /></Shell>
          </Protected>
        }
      />
      <Route
        path="/cache"
        element={
          <Protected>
            <Shell><CacheSyncPage /></Shell>
          </Protected>
        }
      />
      {/* Config */}
      <Route
        path="/config"
        element={
          <Protected>
            <Shell><AdminConfig /></Shell>
          </Protected>
        }
      />

      {/* fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
