import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { authApi } from "../api/auth";
import { useAuthStore } from "../store/authStore";
import toast from "react-hot-toast";

export function Login() {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { user, token } = await authApi.login(email, password);
      setAuth(user, token);
      navigate("/");
    } catch {
      toast.error("Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-900 to-brand-700 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-white/10 text-white text-2xl font-bold mb-4">
            BP
          </div>
          <h1 className="text-2xl font-bold text-white">Business Pipeline</h1>
          <p className="text-blue-200 text-sm mt-1">Sign in to manage your pipeline</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-2xl p-8 space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              required
              autoFocus
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 transition"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 transition"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brand-600 text-white rounded-lg py-2.5 text-sm font-semibold hover:bg-brand-700 disabled:opacity-60 transition-colors"
          >
            {loading ? "Signing in…" : "Sign In"}
          </button>

          <div className="pt-2 text-xs text-gray-400 space-y-1 border-t border-gray-100">
            <p className="font-medium text-gray-500 mb-2">Demo accounts:</p>
            <p><span className="font-mono">admin@pipeline.com</span> / admin123 <span className="text-amber-600 font-medium">(Admin)</span></p>
            <p><span className="font-mono">alice@pipeline.com</span> / user123 <span className="text-blue-600 font-medium">(EMEA + APAC)</span></p>
            <p><span className="font-mono">bob@pipeline.com</span> / user123 <span className="text-blue-600 font-medium">(North America)</span></p>
          </div>
        </form>
      </div>
    </div>
  );
}
