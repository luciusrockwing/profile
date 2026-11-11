import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col items-center justify-center p-4 font-mono">
      <div className="max-w-md w-full p-6 rounded-xl bg-[#090e18] border border-[#16233b] text-center space-y-4">
        <span className="text-cyan-400 text-xs tracking-widest uppercase block">
          404 // CLASSIFIED RESOURCE NOT FOUND
        </span>
        <h1 className="text-xl font-bold text-slate-100">Dossier / Entity Unavailable</h1>
        <p className="text-xs text-slate-400">
          The requested intelligence record or endpoint does not exist in this database.
        </p>
        <div className="pt-2">
          <Link
            href="/"
            className="inline-flex items-center px-4 py-2 rounded bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition-colors"
          >
            Return to Intel Platform
          </Link>
        </div>
      </div>
    </div>
  );
}
