import { Routes, Route, Navigate } from "react-router";
import { useSelector } from "react-redux";
import { selectIsAuth } from "../src/redux/features/authSlice.js";

import PrivateRoute from "../src/routes/PrivateRoute.jsx";
import NavBar from "../src/components/NavBar.jsx";

// Pages
import HomePage        from "../src/pages/Home/HomePage.jsx";
import LoginPage       from "../src/pages/Auth/LoginPage.jsx";
import RegisterPage    from "../src/pages/Auth/RegisterPage.jsx";
import DashboardPage   from "../src/pages/Dashboard/DashboardPage.jsx";
import MaterialsPage   from "../src/pages/Dashboard/MaterialsPage.jsx";
import PlannerPage     from "../src/pages/Dashboard/PlannerPage.jsx";
import AdminPage       from "../src/pages/Admin/AdminPage.jsx";
import ProfilePage     from "../src/pages/Dashboard/ProfilePage.jsx";
import UnauthorizedPage from "../src/pages/Auth/UnauthorizedPage.jsx";
import NotFoundPage    from "../src/pages/Home/NotFoundPage.jsx";

export default function App() {
  const isAuth = useSelector(selectIsAuth);

  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar />
      <Routes>
        {/* Public */}
        <Route path="/"         element={<HomePage />} />
        <Route path="/login"    element={isAuth ? <Navigate to="/dashboard" replace /> : <LoginPage />} />
        <Route path="/register" element={isAuth ? <Navigate to="/dashboard" replace /> : <RegisterPage />} />
        <Route path="/unauthorized" element={<UnauthorizedPage />} />

        {/* Protected — any authenticated user */}
        <Route element={<PrivateRoute />}>
          <Route path="/dashboard"              element={<DashboardPage />} />
          <Route path="/materials"              element={<MaterialsPage />} />
          <Route path="/materials/:courseCode"  element={<MaterialsPage />} />
          <Route path="/planner"                element={<PlannerPage />} />
          <Route path="/profile"                element={<ProfilePage />} />
        </Route>

        {/* Protected — Admin / SuperAdmin only */}
        <Route element={<PrivateRoute roles={["Admin", "SuperAdmin"]} />}>
          <Route path="/admin/*" element={<AdminPage />} />
        </Route>

        {/* 404 */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </div>
  );
}
