import { Link } from "react-router";
export default function NotFoundPage() {
  return (
    <div className="flex min-h-[calc(100vh-56px)] flex-col items-center justify-center gap-4 p-4 text-center">
      <span className="text-7xl font-bold text-gray-200">404</span>
      <h1 className="text-2xl font-bold text-gray-900">Page not found</h1>
      <p className="text-gray-500">The page you're looking for doesn't exist.</p>
      <Link to="/" className="btn-primary">Back to Home</Link>
    </div>
  );
}
