import { useState } from "react";
import { useDispatch } from "react-redux";
import { useNavigate, Link } from "react-router";
import toast from "react-hot-toast";
import { setCredentials } from "../../redux/features/authSlice";

export function LoginForm() {
  const dispatch  = useDispatch();
  const navigate  = useNavigate();
  const [form, setForm] = useState({ studentId: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  const handleChange = (e) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

const handleSubmit = async (e) => {
  e.preventDefault();
  setError("");
  setLoading(true);
  try {
    const res = await fetch(`${import.meta.env.VITE_API_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(form),
    });

    // 1. Safe Check: Did the backend actually return JSON?
    const contentType = res.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      throw new Error(`Server returned non-JSON response (${res.status}). Please check server logs.`);
    }

    const data = await res.json();
    
    // 2. If response status is not 2xx, throw the message from our new backend JSON structure
    if (!res.ok) {
      throw new Error(data.message || "Login failed.");
    }

    dispatch(setCredentials({ user: data.data.user, token: data.token }));
    toast.success(`Welcome back, ${data.data.user.name}!`);
    navigate("/dashboard");
  } catch (err) {
    setError(err.message);
  } finally {
    setLoading(false);
  }
};

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Student ID</label>
        <input
          name="studentId"
          value={form.studentId}
          onChange={handleChange}
          placeholder="e.g. CSE2201001"
          className="input"
          required
          autoFocus
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Password</label>
        <input
          name="password"
          type="password"
          value={form.password}
          onChange={handleChange}
          placeholder="••••••••"
          className="input"
          required
        />
      </div>
      <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-2.5">
        {loading ? "Signing in…" : "Sign In"}
      </button>
      <p className="text-center text-sm text-gray-500">
        Don't have an account?{" "}
        <Link to="/register" className="font-medium text-blue-600 hover:underline">
          Register
        </Link>
      </p>
    </form>
  );
}