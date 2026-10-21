import Link from "next/link";

export default function GuideNotFound() {
  return (
    <div className="mx-auto max-w-lg space-y-4 px-4 py-16 text-center">
      <h1 className="text-xl font-semibold">No guide at this link</h1>
      <p className="text-muted-foreground">
        It may have been generated under a different slug, or not generated yet.
      </p>
      <Link href="/" className="underline underline-offset-2">
        Generate it, or browse the library
      </Link>
    </div>
  );
}
