export default function SubmitLoadingOverlay() {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-navy-900/95">
      <div className="relative flex h-32 w-32 items-center justify-center">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="absolute h-4 w-4 bg-gold-500"
            style={{ animation: `morph-${i} 2s infinite ease-in-out`, animationDelay: `${i * 0.2}s` }}
          />
        ))}
      </div>
      <p className="text-sm font-semibold text-white">Submitting your registration…</p>
    </div>
  );
}
