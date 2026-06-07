import { Link } from "react-router";
export default function UnauthorizedPage() {
  return (
    <div className="flex min-h-[calc(100vh-56px)] flex-col items-center justify-center gap-4 p-4 text-center">
      <span className="text-6xl">🚫</span>
      <h1 className="text-2xl font-bold text-gray-900">Access Denied</h1>
      <p className="text-gray-500">You don't have permission to view this page.</p>
      <Link to="/dashboard" className="btn-primary">Back to Dashboard</Link>
    </div>
  );
}
