import { useState } from "react";
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

  // State to manage the mobile menu drawer open/close
  const [isOpen, setIsOpen] = useState(false);

  const handleLogout = () => {
    setIsOpen(false);
    dispatch(logout());
    toast.success("Logged out successfully.");
    navigate("/login");
  };

  const navLinks = [
    { to: "/dashboard", label: "Dashboard" },
    { to: "/materials", label: "Materials" },
    { to: "/planner",   label: "Planner" },
     ...( ["CR","Teacher","Admin","SuperAdmin"].includes(role)
    ? [{ to: "/routine", label: "Routine" }]
    : []
  ),
  ];

  const showAdminLink = ["Admin", "SuperAdmin"].includes(role);

  return (
    <nav className="sticky top-0 z-50 border-b border-gray-200 bg-white/95 backdrop-blur-sm">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex h-14 items-center justify-between">
          
          {/* Left Side: Logo & Desktop Links */}
          <div className="flex items-center gap-6">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2 font-semibold text-gray-900">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-xs font-bold text-white">
                CMP
              </span>
              <span className="hidden sm:block">Campus Portal</span>
            </Link>

            {/* Desktop Navigation Links (Hidden on mobile, flex on MD screens and up) */}
            {isAuth && (
              <div className="hidden md:flex items-center gap-1">
                {navLinks.map(({ to, label }) => (
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
                {showAdminLink && (
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
          </div>

          {/* Right Side: Profile Actions & Mobile Menu Toggle */}
          <div className="flex items-center gap-2">
            {isAuth ? (
              <>
                {/* Profile Link (Visible on all screens) */}
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
                  <div className="hidden sm:block text-left">
                    <p className="text-xs font-medium text-gray-900 leading-tight">{user?.name}</p>
                    <span className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold ${ROLE_COLORS[role] || ""}`}>{role}</span>
                  </div>
                </Link>

                {/* Logout Button (Hidden on Mobile, handled inside menu instead) */}
                <button
                  onClick={handleLogout}
                  className="hidden md:block rounded-lg px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100"
                >
                  Logout
                </button>
              </>
            ) : (
              <div className="hidden md:flex items-center gap-2">
                <Link to="/login"    className="btn-ghost text-sm">Login</Link>
                <Link to="/register" className="btn-primary text-sm">Register</Link>
              </div>
            )}

            {/* Mobile Menu Button Hamburger (Visible only on mobile/tablet) */}
            <button
              onClick={() => setIsOpen(!isOpen)}
              type="button"
              className="inline-flex items-center justify-center rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 focus:outline-none md:hidden"
              aria-controls="mobile-menu"
              aria-expanded={isOpen}
            >
              <span className="sr-only">Open main menu</span>
              {isOpen ? (
                // "X" Close Icon
                <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                // Hamburger Menu Icon
                <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Dropdown Drawer (Only displays when open and controlled by screens < md) */}
      {isOpen && (
        <div className="md:hidden border-t border-gray-200 bg-white px-4 py-2 space-y-1 shadow-lg transition-all" id="mobile-menu">
          {isAuth ? (
            <>
              {navLinks.map(({ to, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  onClick={() => setIsOpen(false)}
                  className={({ isActive }) =>
                    `block rounded-lg px-3 py-2 text-base font-medium ${
                      isActive ? "bg-blue-50 text-blue-700" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                    }`
                  }
                >
                  {label}
                </NavLink>
              ))}
              {showAdminLink && (
                <NavLink
                  to="/admin"
                  onClick={() => setIsOpen(false)}
                  className={({ isActive }) =>
                    `block rounded-lg px-3 py-2 text-base font-medium ${
                      isActive ? "bg-amber-50 text-amber-700" : "text-gray-600 hover:bg-gray-50"
                    }`
                  }
                >
                  Admin
                </NavLink>
              )}
              <hr className="my-2 border-gray-200" />
              <button
                onClick={handleLogout}
                className="block w-full text-left rounded-lg px-3 py-2 text-base font-medium text-red-600 hover:bg-red-50"
              >
                Logout
              </button>
            </>
          ) : (
            <div className="pt-2 pb-3 space-y-2">
              <Link
                to="/login"
                onClick={() => setIsOpen(false)}
                className="block text-center rounded-lg border border-gray-200 px-4 py-2 text-base font-medium text-gray-700 hover:bg-gray-50"
              >
                Login
              </Link>
              <Link
                to="/register"
                onClick={() => setIsOpen(false)}
                className="block text-center rounded-lg bg-blue-600 px-4 py-2 text-base font-medium text-white hover:bg-blue-700"
              >
                Register
              </Link>
            </div>
          )}
        </div>
      )}
    </nav>
  );
}