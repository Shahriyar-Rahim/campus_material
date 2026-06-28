import { useState } from "react";
import { useDispatch } from "react-redux";
import { useNavigate, Link } from "react-router";
import toast from "react-hot-toast";
import { setCredentials } from "../../redux/features/authSlice";
import { useGetSessionsQuery } from "../../redux/api/sessionsApi";
const DEPTS = ["CSE", "EEE", "ME", "CE", "IPE", "ICT", "BBA", "ENG"];
const LEVELS = [1, 2, 3, 4];
const TERMS = [1, 2];

export function RegisterForm() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const { data: sessionsData } = useGetSessionsQuery();
  const sessions = sessionsData?.data || [];

  const [form, setForm] = useState({
    studentId: "",
    email: "",
    name: "",
    dept: "",
    level: "",
    term: "",
    session: "",
    sessionStartDate: "",
    sessionEndDate: "",
    batch: "",
    password: "",
    confirmPassword: "",
  });

  const handleChange = (e) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (form.password !== form.confirmPassword) {
      return setError("Passwords do not match.");
    }
    if (form.password.length < 8) {
      return setError("Password must be at least 8 characters.");
    }
    setLoading(true);
    try {
      const { confirmPassword, sessionStartDate, sessionEndDate, ...rest } =
        form;
      const payload = {
        ...rest,
        sessionDuration: {
          startDate: sessionStartDate || null,
          endDate: sessionEndDate || null,
        },
      };
      const res = await fetch(`${import.meta.env.VITE_API_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Registration failed.");

      dispatch(setCredentials({ user: data.data.user, token: data.token }));
      toast.success("Account created! Welcome to Campus Portal.");
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

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Student ID
          </label>
          <input
            name="studentId"
            value={form.studentId}
            onChange={handleChange}
            className="input"
            placeholder="CSE2201001"
            required
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Full Name
          </label>
          <input
            name="name"
            value={form.name}
            onChange={handleChange}
            className="input"
            placeholder="Your Name"
            required
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">
          Email
        </label>
        <input
          name="email"
          type="email"
          value={form.email}
          onChange={handleChange}
          className="input"
          placeholder="you@example.com"
          required
        />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Department
          </label>
          <select
            name="dept"
            value={form.dept}
            onChange={handleChange}
            className="input"
            required
          >
            <option value="">Select</option>
            {DEPTS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Level
          </label>
          <select
            name="level"
            value={form.level}
            onChange={handleChange}
            className="input"
            required
          >
            <option value="">–</option>
            {LEVELS.map((l) => (
              <option key={l} value={l}>
                L{l}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Term
          </label>
          <select
            name="term"
            value={form.term}
            onChange={handleChange}
            className="input"
            required
          >
            <option value="">–</option>
            {TERMS.map((t) => (
              <option key={t} value={t}>
                T{t}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Session
          </label>
          <input
            name="session"
            value={form.session}
            onChange={handleChange}
            className="input"
            placeholder="WINTER 2026"
            required
          />
        </div> */}
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Batch
          </label>
          <input
            name="batch"
            value={form.batch}
            onChange={handleChange}
            className="input"
            placeholder="58th"
            required
          />
        </div>
      </div>

      {/* Session */}
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">
          Session
        </label>
        <input
          name="session"
          value={form.session}
          onChange={handleChange}
          placeholder="e.g. Winter 2026"
          className="input"
        />
        <p className="mt-1 text-xs text-gray-400">
          The academic session you are currently enrolled in.
        </p>
      </div>

      {/* Session duration */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Session Start
          </label>
          <input
            name="sessionStartDate"
            type="date"
            value={form.sessionStartDate}
            onChange={handleChange}
            className="input"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Session End
          </label>
          <input
            name="sessionEndDate"
            type="date"
            value={form.sessionEndDate}
            onChange={handleChange}
            className="input"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Password
          </label>
          <input
            name="password"
            type="password"
            value={form.password}
            onChange={handleChange}
            className="input"
            placeholder="Min 8 chars"
            required
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Confirm Password
          </label>
          <input
            name="confirmPassword"
            type="password"
            value={form.confirmPassword}
            onChange={handleChange}
            className="input"
            placeholder="Repeat password"
            required
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="btn-primary w-full justify-center py-2.5"
      >
        {loading ? "Creating account…" : "Create Account"}
      </button>
      <p className="text-center text-sm text-gray-500">
        Already have an account?{" "}
        <Link to="/login" className="font-medium text-blue-600 hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}
