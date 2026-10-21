import Link from "next/link";
import { ShieldCheck, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Landing() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <div className="flex size-14 items-center justify-center rounded-xl bg-primary text-primary-foreground">
        <ShieldCheck className="size-7" />
      </div>
      <h1 className="mt-6 text-4xl font-semibold tracking-tight">AuthPilot</h1>
      <p className="mt-3 max-w-md text-muted-foreground">
        Verdict-first guides for setting up and getting approved for an OAuth app with any provider -- how long
        until you can launch, and what will block you, with every claim backed by evidence.
      </p>
      <Button size="lg" className="mt-8" nativeButton={false} render={<Link href="/dashboard" />}>
        Start
        <ArrowRight className="size-4" />
      </Button>
    </div>
  );
}
