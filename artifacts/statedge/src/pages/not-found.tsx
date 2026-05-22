export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#020617]">
      <div className="text-center space-y-3">
        <p className="text-6xl font-bold text-slate-700">404</p>
        <p className="text-slate-400">Página não encontrada</p>
        <a href="/" className="text-cyan-400 text-sm underline">Voltar ao dashboard</a>
      </div>
    </div>
  );
}
