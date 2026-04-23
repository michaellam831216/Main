import { authApi } from "../api/auth";
import { useAuthStore } from "../store/authStore";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

export function Header() {
  const { user, clearAuth } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await authApi.logout().catch(() => {});
    clearAuth();
    navigate("/login");
    toast.success("Logged out");
  };

  return (
    <header className="bg-brand-900 text-white shadow-md">
      <div className="max-w-screen-2xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-brand-500 flex items-center justify-center font-bold text-sm">BP</div>
          <span className="font-semibold text-lg tracking-tight">Business Pipeline</span>
        </div>
        <div className="flex items-center gap-4">
          {user?.role === "ADMIN" && (
            <>
              <span className="text-xs font-semibold bg-amber-500 text-white px-2 py-0.5 rounded">ADMIN</span>
              <button
                onClick={() => navigate("/dashboard")}
                className="text-xs text-blue-200 hover:text-white border border-blue-700 hover:border-blue-400 px-3 py-1 rounded transition-colors"
              >
                Dashboard
              </button>
            </>
          )}
          <span className="text-sm text-blue-200">{user?.name}</span>
          <button
            onClick={handleLogout}
            className="text-sm text-blue-300 hover:text-white transition-colors px-3 py-1 rounded hover:bg-brand-700"
          >
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}
