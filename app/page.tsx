"use client";

import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { ShieldCheck, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { runDoorTransition } from "@/lib/door-transition";

const container = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.09, delayChildren: 0.1 },
  },
};

const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const } },
};

export default function Landing() {
  const router = useRouter();

  function handleStart() {
    runDoorTransition(() => router.push("/dashboard"));
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 text-center">
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.2 }}
      >
        <div className="absolute left-1/2 top-1/3 size-[32rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/10 blur-3xl" />
      </motion.div>

      <motion.div variants={container} initial="hidden" animate="show" className="flex flex-col items-center">
        <motion.div
          variants={item}
          className="flex size-14 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/20"
        >
          <ShieldCheck className="size-7" />
        </motion.div>
        <motion.h1 variants={item} className="mt-6 text-6xl font-semibold tracking-tight">
          AuthPilot
        </motion.h1>
        <motion.p variants={item} className="mt-3 max-w-md text-muted-foreground">
          Verdict-first guides for setting up and getting approved for an OAuth app with any provider.
        </motion.p>
        <motion.div variants={item} className="mt-8 w-full max-w-xs">
          <Button
            size="lg"
            onClick={handleStart}
            className="group h-14 w-full gap-2 rounded-none text-base shadow-md shadow-primary/25 transition-shadow hover:shadow-lg hover:shadow-primary/35 active:scale-[0.98]"
          >
            Start
            <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" />
          </Button>
        </motion.div>
      </motion.div>
    </div>
  );
}
