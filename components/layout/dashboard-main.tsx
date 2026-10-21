"use client";

import { motion } from "motion/react";

export function DashboardMain({ children }: { children: React.ReactNode }) {
  return (
    <motion.main
      className="h-screen flex-1 overflow-y-auto"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.main>
  );
}
