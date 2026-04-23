import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "react-hot-toast";
import { Login } from "./pages/Login";
import { Pipeline } from "./pages/Pipeline";
import { Dashboard } from "./pages/Dashboard";
import { useAuthStore } from "./store/authStore";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false },
  },
});

function DefaultRedirect() {
  const { user } = useAuthStore();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === "DASHBOARD") return <Navigate to="/dashboard" replace />;
  return <Navigate to="/pipeline" replace />;
}

function PipelineRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuthStore();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === "DASHBOARD") return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

function DashboardRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuthStore();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== "ADMIN" && user.role !== "DASHBOARD") return <Navigate to="/pipeline" replace />;
  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuthStore();
  if (!user) return <>{children}</>;
  if (user.role === "DASHBOARD") return <Navigate to="/dashboard" replace />;
  return <Navigate to="/pipeline" replace />;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
          <Route path="/pipeline" element={<PipelineRoute><Pipeline /></PipelineRoute>} />
          <Route path="/dashboard" element={<DashboardRoute><Dashboard /></DashboardRoute>} />
          <Route path="/" element={<DefaultRedirect />} />
          <Route path="*" element={<DefaultRedirect />} />
        </Routes>
      </BrowserRouter>
      <Toaster position="top-right" toastOptions={{ duration: 3000 }} />
    </QueryClientProvider>
  );
}
