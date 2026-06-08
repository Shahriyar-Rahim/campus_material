import { useState } from "react";
import { LoginForm } from "../../components/forms/LoginForm.jsx";
import { Link } from "react-router";

export default function LoginPage() {
  const [showForgot, setShowForgot] = useState(false);
  const [forgotForm, setForgotForm] = useState({ studentId: "", email: "" });
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotMessage, setForgotMessage] = useState("");
  const [forgotError, setForgotError]     = useState("");

  const handleForgot = async (e) => {
    e.preventDefault();
    setForgotError("");
    if (!forgotForm.studentId && !forgotForm.email) {
      return setForgotError("Enter your Student ID or email.");
    }
    setForgotLoading(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(forgotForm),
      });
      const data = await res.json();
      setForgotMessage(data.message);
    } catch {
      setForgotError("Something went wrong. Please try again.");
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-56px)] items-center justify-center p-4">
      <div className="w-full max-w-md">
        {!showForgot ? (
          <>
            <div className="mb-6 text-center">
              <h1 className="text-2xl font-bold text-gray-900">Welcome back</h1>
              <p className="mt-1 text-sm text-gray-500">Sign in to Campus Materials Portal</p>
            </div>
            <div className="card p-6">
              <LoginForm />
              <div className="mt-4 text-center">
                <button
                  onClick={() => setShowForgot(true)}
                  className="text-sm text-blue-600 hover:underline"
                >
                  Forgot your password?
                </button>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="mb-6 text-center">
              <h1 className="text-2xl font-bold text-gray-900">Reset Password</h1>
              <p className="mt-1 text-sm text-gray-500">
                We'll send a reset link to your email.
              </p>
            </div>
            <div className="card p-6">
              {forgotMessage ? (
                <div className="space-y-4 text-center">
                  <span className="text-4xl">📧</span>
                  <p className="text-sm text-gray-700">{forgotMessage}</p>
                  <button
                    onClick={() => { setShowForgot(false); setForgotMessage(""); }}
                    className="text-sm text-blue-600 hover:underline"
                  >
                    ← Back to login
                  </button>
                </div>
              ) : (
                <form onSubmit={handleForgot} className="space-y-4">
                  {forgotError && (
                    <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                      {forgotError}
                    </div>
                  )}
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      Student ID
                    </label>
                    <input
                      value={forgotForm.studentId}
                      onChange={(e) => setForgotForm((f) => ({ ...f, studentId: e.target.value }))}
                      placeholder="e.g. CSE2201001"
                      className="input"
                      autoFocus
                    />
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <div className="flex-1 border-t" />
                    <span>or</span>
                    <div className="flex-1 border-t" />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Email</label>
                    <input
                      type="email"
                      value={forgotForm.email}
                      onChange={(e) => setForgotForm((f) => ({ ...f, email: e.target.value }))}
                      placeholder="you@example.com"
                      className="input"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={forgotLoading}
                    className="btn-primary w-full justify-center py-2.5"
                  >
                    {forgotLoading ? "Sending…" : "Send Reset Link"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowForgot(false)}
                    className="w-full text-center text-sm text-gray-500 hover:text-gray-700"
                  >
                    ← Back to login
                  </button>
                </form>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}