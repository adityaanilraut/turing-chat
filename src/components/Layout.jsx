const Layout = ({ children }) => {
  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-start bg-terminal-black p-2 font-mono text-terminal-green sm:p-4 md:justify-center">
      <div className="scanlines" aria-hidden="true" />
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-gradient-to-b from-terminal-dim/20 to-transparent" />
      <div className="relative z-10 w-full max-w-4xl rounded-lg border border-green-800/50 bg-black/80 p-3 shadow-[0_0_20px_rgba(34,197,94,0.2)] backdrop-blur-sm sm:p-6">
        {children}
      </div>
    </main>
  );
};

export default Layout;
