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

function Protected({ children }) {
  const { isAuthed } = useAuth();
  const location = useLocation();
  // se não logado, manda pro /login guardando origem
  if (!isAuthed) return <Navigate to="/login" replace state={{ from: location }} />;
  return children;
}

function Shell({ children }) {
  const { toggle } = useTheme();
  const { isAuthed, logout } = useAuth();
  return (
    <div className="min-h-screen overflow-x-hidden">
      <Header onToggleTheme={toggle} isAuthed={isAuthed} onLogout={logout} />
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}

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

      {/* fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
