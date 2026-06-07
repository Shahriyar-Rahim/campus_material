import { Link, NavLink, useNavigate } from "react-router";
import { useDispatch, useSelector } from "react-redux";
import { selectCurrentUser, selectIsAuth, selectUserRole } from "../redux/features/authSlice";
import { logout } from "../redux/features/authSlice";
import toast from "react-hot-toast";

const ROLE_COLORS = {
  Student:    "bg-gray-100 text-gray-700",
  CR:         "bg-blue-100 text-blue-700",
  Teacher:    "bg-purple-100 text-purple-700",
  Admin:      "bg-amber-100 text-amber-700",
  SuperAdmin: "bg-red-100 text-red-700",
};

export default function NavBar() {
  const isAuth = useSelector(selectIsAuth);
  const user   = useSelector(selectCurrentUser);
  const role   = useSelector(selectUserRole);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleLogout = () => {
    dispatch(logout());
    toast.success("Logged out successfully.");
    navigate("/login");
  };

  return (
    <nav className="sticky top-0 z-50 border-b border-gray-200 bg-white/95 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 font-semibold text-gray-900">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-xs font-bold text-white">
            CMP
          </span>
          <span className="hidden sm:block">Campus Portal</span>
        </Link>

        {/* Nav links */}
        {isAuth && (
          <div className="flex items-center gap-1">
            {[
              { to: "/dashboard",  label: "Dashboard" },
              { to: "/materials",  label: "Materials" },
              { to: "/planner",    label: "Planner" },
            ].map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-blue-50 text-blue-700"
                      : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                  }`
                }
              >
                {label}
              </NavLink>
            ))}
            {["Admin", "SuperAdmin"].includes(role) && (
              <NavLink
                to="/admin"
                className={({ isActive }) =>
                  `rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                    isActive ? "bg-amber-50 text-amber-700" : "text-gray-600 hover:bg-gray-100"
                  }`
                }
              >
                Admin
              </NavLink>
            )}
          </div>
        )}

        {/* Right side */}
        <div className="flex items-center gap-2">
          {isAuth ? (
            <>
              <Link to="/profile" className="flex items-center gap-2 rounded-lg p-1 hover:bg-gray-100">
                {user?.profilePicture?.url ? (
                  <img
                    src={user.profilePicture.url}
                    alt={user.name}
                    className="h-7 w-7 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
                    {user?.name?.[0]?.toUpperCase() || "?"}
                  </div>
                )}
                <div className="hidden text-left sm:block">
                  <p className="text-xs font-medium text-gray-900 leading-tight">{user?.name}</p>
                  <span className={`badge text-[10px] ${ROLE_COLORS[role] || ""}`}>{role}</span>
                </div>
              </Link>
              <button
                onClick={handleLogout}
                className="rounded-lg px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100"
              >
                Logout
              </button>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Link to="/login"    className="btn-ghost text-sm">Login</Link>
              <Link to="/register" className="btn-primary text-sm">Register</Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
