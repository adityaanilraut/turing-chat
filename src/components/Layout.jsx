import React from 'react';

const Layout = ({ children }) => {
  return (
    <div className="min-h-screen bg-terminal-black text-terminal-green font-mono p-4 flex flex-col items-center justify-center relative overflow-hidden">
      <div className="scanlines" />
      <div className="absolute inset-0 bg-gradient-to-b from-terminal-dim/20 to-transparent pointer-events-none" />
      <div className="max-w-4xl w-full z-10 glass-panel border border-green-800/50 bg-black/80 rounded-lg shadow-[0_0_20px_rgba(34,197,94,0.2)] p-6 backdrop-blur-sm relative">
         {children}
      </div>
    </div>
  );
};

export default Layout;
