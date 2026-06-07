import { Link } from "react-router";
import { useSelector } from "react-redux";
import { selectIsAuth } from "../../redux/features/authSlice";
import AcademicBackground from "../../components/AcademicBackground";

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
    <main className="relative min-h-screen bg-slate-950 text-slate-100 selection:bg-blue-500 selection:text-white">
      
      {/* Omni-Directional Vector Canvas Engine */}
      <AcademicBackground />

      {/* Brand Anchor Title - Top Left Margin */}
      <div className="absolute left-5 top-6 z-20 pointer-events-none select-none sm:left-8 sm:top-8">
        <h1 className="text-sm font-black tracking-widest text-white drop-shadow-[0_2px_12px_rgba(255,255,255,0.3)] uppercase sm:text-base">
          Campus Materials Portal
        </h1>
      </div>

      {/* Hero Content Block Wrapper */}
      <section className="relative z-10 border-b border-slate-900/40 py-32 text-center pointer-events-none">
        <div className="mx-auto max-w-2xl px-4 mt-6 pointer-events-auto">
          {/* Frosted glass backdrop layer preserves content readability against complex animations */}
          <div className="rounded-2xl bg-slate-950/40 backdrop-blur-md p-6 border border-slate-900/50 shadow-2xl">
            <p className="text-base text-slate-100 font-bold sm:text-lg leading-relaxed">
              Academic materials, smart planner, and real-time study tools — built explicitly for BAUST students.
            </p>
            <div className="mt-6 flex justify-center gap-3">
              {isAuth ? (
                <Link to="/dashboard" className="rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-xl shadow-blue-600/20 hover:bg-blue-500 transition-colors">
                  Go to Dashboard →
                </Link>
              ) : (
                <>
                  <Link to="/register" className="rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-xl shadow-blue-600/20 hover:bg-blue-500 transition-colors">
                    Get Started
                  </Link>
                  <Link to="/login" className="rounded-xl border border-slate-800 bg-slate-900 px-6 py-3 text-sm font-semibold text-slate-200 hover:bg-slate-800 hover:text-white transition-colors">
                    Sign In
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Static Feature Grid Display */}
      <section className="relative z-10 mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <h2 className="mb-12 text-center text-xs font-bold tracking-widest text-slate-400 uppercase drop-shadow-[0_2px_4px_rgba(2,6,23,0.9)] select-none">
          Everything you need
        </h2>
        
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ icon, title, desc }) => (
            <div 
              key={title} 
              className="rounded-2xl border border-slate-800/60 bg-slate-900/85 backdrop-blur-lg p-6 shadow-2xl transition-all duration-200 hover:border-slate-700 hover:bg-slate-900/95"
            >
              <span className="text-3xl filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">{icon}</span>
              <h3 className="mt-3 font-bold text-white text-base tracking-wide">{title}</h3>
              <p className="mt-1.5 text-sm text-slate-300 leading-relaxed font-medium">{desc}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}