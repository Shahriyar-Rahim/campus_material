/**
 * NextClassCountdown.jsx
 * Reusable countdown widget for the next/ongoing class.
 * Used in DashboardPage and FolderView (filtered to specific course).
 *
 * Props:
 *   schedule     — array of routine entries
 *   courseCode   — optional: if provided, only shows classes for this course
 *   compact      — bool: compact one-line mode for FolderView
 */

import { useState, useEffect } from "react";
import { cn } from "../utils/cn";

const BAUST_DAYS = {
  0: null,          // Sunday in JS = no match (Friday = holiday for BAUST)
  1: "Sunday",
  2: "Monday",
  3: "Tuesday",
  4: "Wednesday",
  5: "Thursday",
  6: "Saturday",
};

const timeToMins = (t) => {
  if (!t) return 0;
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};

const fmtTime = (t) => {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return `${h12}:${String(m).padStart(2, "0")} ${period}`;
};

const formatCountdown = (mins) => {
  if (mins <= 0) return "now";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
};

export default function NextClassCountdown({ schedule = [], courseCode = null, compact = false }) {
  const [state, setState] = useState({ type: null, entry: null, minsLeft: 0 });

  useEffect(() => {
    const compute = () => {
      const today = BAUST_DAYS[new Date().getDay()];
      if (!today) {
        setState({ type: "holiday", entry: null, minsLeft: 0 });
        return;
      }

      const now = new Date().getHours() * 60 + new Date().getMinutes();

      // Filter by courseCode if provided
      const filtered = courseCode
        ? schedule.filter((e) => e.courseCode === courseCode)
        : schedule;

      const todayEntries = filtered
        .filter((e) => e.day === today)
        .sort((a, b) => timeToMins(a.startTime) - timeToMins(b.startTime));

      // Check for ongoing class
      const ongoing = todayEntries.find(
        (e) => timeToMins(e.startTime) <= now && timeToMins(e.endTime) > now
      );

      if (ongoing) {
        setState({
          type: "ongoing",
          entry: ongoing,
          minsLeft: timeToMins(ongoing.endTime) - now,
        });
        return;
      }

      // Check for upcoming class today
      const upcoming = todayEntries.find((e) => timeToMins(e.startTime) > now);
      if (upcoming) {
        setState({
          type: "upcoming",
          entry: upcoming,
          minsLeft: timeToMins(upcoming.startTime) - now,
        });
        return;
      }

      // No more today — find next class on coming days
      const dayOrder = ["Saturday","Sunday","Monday","Tuesday","Wednesday","Thursday"];
      const todayIdx = dayOrder.indexOf(today);

      for (let i = 1; i <= 6; i++) {
        const nextDay = dayOrder[(todayIdx + i) % dayOrder.length];
        const nextEntries = filtered
          .filter((e) => e.day === nextDay)
          .sort((a, b) => timeToMins(a.startTime) - timeToMins(b.startTime));
        if (nextEntries.length > 0) {
          setState({ type: "next-day", entry: { ...nextEntries[0], day: nextDay }, minsLeft: 0 });
          return;
        }
      }

      setState({ type: "none", entry: null, minsLeft: 0 });
    };

    compute();
    const id = setInterval(compute, 30000); // update every 30s
    return () => clearInterval(id);
  }, [schedule, courseCode]);

  const { type, entry, minsLeft } = state;

  if (!type || type === "none") return null;
  if (type === "holiday") {
    if (compact) return null;
    return (
      <div className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-xs text-gray-400">
        🏖 No classes today (Friday)
      </div>
    );
  }

  // ── Compact mode (for FolderView header) ─────────────────────────────────
  if (compact) {
    if (!entry) return null;
    const isOngoing = type === "ongoing";
    return (
      <div className={cn(
        "flex items-center gap-2 rounded-lg border px-3 py-2 text-xs",
        isOngoing
          ? "border-green-200 bg-green-50 text-green-800"
          : "border-blue-100 bg-blue-50 text-blue-800"
      )}>
        <span>{isOngoing ? "🏫" : "⏰"}</span>
        <span className="font-medium">
          {isOngoing ? "Class now" : type === "next-day" ? `Next: ${entry.day}` : "Next class"}
        </span>
        <span className="text-gray-500">
          {entry.courseCode}
          {entry.room && ` · Room ${entry.room}`}
          {" · "}{fmtTime(entry.startTime)}
          {type === "ongoing" && ` (ends in ${formatCountdown(minsLeft)})`}
          {type === "upcoming" && ` (in ${formatCountdown(minsLeft)})`}
        </span>
      </div>
    );
  }

  // ── Full mode (for Dashboard) ─────────────────────────────────────────────
  const isOngoing  = type === "ongoing";
  const isNextDay  = type === "next-day";

  const bgClass = isOngoing
    ? "border-green-200 bg-gradient-to-r from-green-50 to-emerald-50"
    : "border-blue-100 bg-gradient-to-r from-blue-50 to-sky-50";

  const iconBg = isOngoing ? "bg-green-100" : "bg-blue-100";
  const textColor = isOngoing ? "text-green-700" : "text-blue-700";
  const labelColor = isOngoing ? "text-green-600" : "text-blue-500";

  return (
    <div className={cn("flex items-center gap-4 rounded-xl border px-5 py-4 shadow-sm", bgClass)}>
      {/* Icon */}
      <div className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-2xl", iconBg)}>
        {isOngoing ? "🏫" : isNextDay ? "📅" : "⏰"}
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <p className={cn("text-xs font-bold uppercase tracking-wider", labelColor)}>
          {isOngoing ? "Currently in class" : isNextDay ? `Next class · ${entry.day}` : "Next class today"}
        </p>
        <p className="mt-0.5 font-bold text-gray-900 text-base leading-tight">
          {entry.courseCode}
          {entry.courseName && (
            <span className="ml-2 text-sm font-normal text-gray-500">{entry.courseName}</span>
          )}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-gray-500">
          <span>{fmtTime(entry.startTime)} – {fmtTime(entry.endTime)}</span>
          {entry.room && <span>· Room {entry.room}</span>}
          {entry.teacherName && <span>· {entry.teacherName}</span>}
          {entry.type && (
            <span className={cn(
              "rounded-full px-2 py-0.5 text-[10px] font-medium",
              entry.type === "Lab" ? "bg-green-100 text-green-700" :
              entry.type === "Tutorial" ? "bg-purple-100 text-purple-700" :
              "bg-blue-100 text-blue-700"
            )}>
              {entry.type}
            </span>
          )}
        </div>
      </div>

      {/* Countdown pill */}
      {!isNextDay && (
        <div className={cn(
          "shrink-0 rounded-xl px-4 py-3 text-center min-w-[80px]",
          isOngoing ? "bg-green-100" : "bg-blue-100"
        )}>
          <p className={cn("text-2xl font-black leading-none", textColor)}>
            {formatCountdown(minsLeft)}
          </p>
          <p className="mt-1 text-[10px] text-gray-500">
            {isOngoing ? "remaining" : "until start"}
          </p>
        </div>
      )}
    </div>
  );
}
