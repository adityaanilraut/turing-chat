import React from 'react';
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from 'framer-motion';

const ThoughtBubble = ({ thought, isVisible }) => {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="my-2 p-3 bg-zinc-900/80 border-l-2 border-green-500 font-mono text-xs text-green-300/70 overflow-hidden"
        >
          <div className="flex items-center gap-2 mb-1">
            <span className="animate-pulse">●</span>
            <span className="uppercase tracking-widest text-[10px] font-bold">Bot_Process_Log</span>
          </div>
          <p className="italic">
            {thought || "Analyzing vector space..."}
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ThoughtBubble;
