import { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { selectCurrentUser, selectToken } from "../redux/features/authSlice";

// Module-level cache — shared across all hook instances in the same session
let _cache = null;
let _cacheKey = "";

export default function useMyRoutine() {
  const user  = useSelector(selectCurrentUser);
  const token = useSelector(selectToken);

  const [routine,  setRoutine]  = useState(null);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState(null);

  useEffect(() => {
    if (!user || !token) return;

    const key = `${user.dept}-${user.level}-${user.term}-${user.session || ""}`;

    // Return cached value immediately
    if (_cacheKey === key && _cache) {
      setRoutine(_cache);
      return;
    }

    const fetchRoutine = async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          dept:  user.dept,
          level: user.level,
          term:  user.term,
        });
        if (user.session) params.set("session", user.session);

        const res = await fetch(
          `${import.meta.env.VITE_API_URL}/routine?${params}`,
          { headers: { Authorization: `Bearer ${token}` }, credentials: "include" }
        );
        const json = await res.json();
        if (res.ok && json.data) {
          _cache = json.data;
          _cacheKey = key;
          setRoutine(json.data);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchRoutine();
  }, [user?.dept, user?.level, user?.term, user?.session, token]);

  const schedule = routine?.schedule || [];

  // Helper: get today's classes
  const BAUST_DAYS = {
    0: null, 1: "Sunday", 2: "Monday", 3: "Tuesday",
    4: "Wednesday", 5: "Thursday", 6: "Saturday",
  };
  const today = BAUST_DAYS[new Date().getDay()];
  const todayClasses = today
    ? schedule.filter((e) => e.day === today)
        .sort((a, b) => a.startTime.localeCompare(b.startTime))
    : [];

  // Helper: get classes for a specific course
  const getClassesForCourse = (courseCode) =>
    schedule.filter((e) => e.courseCode === courseCode);

  // Invalidate cache (call after routine is updated)
  const invalidate = () => { _cache = null; _cacheKey = ""; };

  return { routine, schedule, loading, error, todayClasses, getClassesForCourse, invalidate };
}
