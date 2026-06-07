import { Navigate, Outlet, useLocation } from "react-router";
import { useSelector } from "react-redux";
import { selectIsAuth, selectAuthLoading, selectUserRole } from "../redux/features/authSlice";

export default function PrivateRoute({ roles = [] }) {
  const isAuth   = useSelector(selectIsAuth);
  const isLoading = useSelector(selectAuthLoading);
  const role     = useSelector(selectUserRole);
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  if (!isAuth) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (roles.length > 0 && !roles.includes(role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <Outlet />;
}
