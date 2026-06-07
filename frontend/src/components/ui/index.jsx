export function ErrorComp({ message = "Something went wrong.", onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-red-100 bg-red-50 p-8 text-center">
      <span className="text-4xl">⚠️</span>
      <p className="mt-3 font-medium text-red-700">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
        >
          Try again
        </button>
      )}
    </div>
  );
}

export function NoData({ icon = "📭", title = "Nothing here yet.", subtitle, action }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 bg-gray-50 p-10 text-center">
      <span className="text-4xl">{icon}</span>
      <p className="mt-3 font-medium text-gray-700">{title}</p>
      {subtitle && <p className="mt-1 text-sm text-gray-500">{subtitle}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}


export function LoadingSpinner({ fullPage = false, size = "md" }) {
  const sizes = { sm: "h-4 w-4", md: "h-8 w-8", lg: "h-12 w-12" };
  const spinner = (
    <div
      className={`${sizes[size]} animate-spin rounded-full border-4 border-blue-200 border-t-blue-600`}
    />
  );
  if (fullPage) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm">
        {spinner}
      </div>
    );
  }
  return <div className="flex items-center justify-center p-6">{spinner}</div>;
}

export function Badge({ label, variant = "default" }) {
  const variants = {
    default: "bg-gray-100 text-gray-700",
    blue:    "bg-blue-100 text-blue-700",
    green:   "bg-green-100 text-green-700",
    amber:   "bg-amber-100 text-amber-700",
    red:     "bg-red-100 text-red-700",
    purple:  "bg-purple-100 text-purple-700",
  };
  return (
    <span className={`badge ${variants[variant] || variants.default}`}>{label}</span>
  );
}
