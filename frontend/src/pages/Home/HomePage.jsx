import { Link } from "react-router";
import { useSelector } from "react-redux";
import { selectIsAuth } from "../../redux/features/authSlice";

const FEATURES = [
  { icon: "📂", title: "Organised Materials", desc: "Mid, Final, RIB, Notices — all in one inbox-style folder view per course." },
  { icon: "📅", title: "Daily Planner",       desc: "Merge your personal tasks with your class routine into one draggable timeline." },
  { icon: "👥", title: "Study Buddy",          desc: "See who's studying the same material right now and send them a nudge." },
  { icon: "🔒", title: "Role-based Access",   desc: "Students, CRs, Teachers, and Admins each have the right permissions." },
  { icon: "⚡", title: "Real-time Updates",   desc: "Socket.io presence and instant nudge notifications — no refresh needed." },
  { icon: "☁️", title: "Cloud Storage",       desc: "All files on Supabase Storage with upload throttling to prevent abuse." },
];

export default function HomePage() {
  const isAuth = useSelector(selectIsAuth);
  return (
    <main>
      {/* Hero */}
      <section className="border-b border-gray-100 bg-gradient-to-br from-blue-50 to-white py-20 text-center">
        <div className="mx-auto max-w-2xl px-4">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
            Campus Materials Portal
          </h1>
          <p className="mt-4 text-lg text-gray-500">
            Academic materials, smart planner, and real-time study tools — built for BAUST students.
          </p>
          <div className="mt-8 flex justify-center gap-3">
            {isAuth ? (
              <Link to="/dashboard" className="btn-primary px-6 py-3 text-base">Go to Dashboard →</Link>
            ) : (
              <>
                <Link to="/register" className="btn-primary px-6 py-3 text-base">Get Started</Link>
                <Link to="/login"    className="btn-ghost   px-6 py-3 text-base">Sign In</Link>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <h2 className="mb-10 text-center text-2xl font-semibold text-gray-900">Everything you need</h2>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ icon, title, desc }) => (
            <div key={title} className="card p-6">
              <span className="text-3xl">{icon}</span>
              <h3 className="mt-3 font-semibold text-gray-900">{title}</h3>
              <p className="mt-1 text-sm text-gray-500 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
