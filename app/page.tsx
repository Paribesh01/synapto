import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth/server";
import { Button } from "@/components/ui/button";

export default async function Home() {
  const session = await getServerSession();
  if (session) redirect("/chat");

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-5xl px-6 py-20">
        <div className="space-y-6">
          <p className="inline-flex items-center rounded-full border px-3 py-1 text-xs text-muted-foreground">
            Connect your apps. Chat in one place.
          </p>
          <h1 className="text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
            The all‑in‑one chat app that can actually do things.
          </h1>
          <p className="max-w-2xl text-pretty text-lg text-muted-foreground">
            InteliBridge is a ChatGPT‑style assistant where users can securely connect
            external apps—starting with Google Calendar—and execute actions
            through a clean connector system.
          </p>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link href="/login">Get Started</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/register">Create account</Link>
            </Button>
          </div>
        </div>

        <div className="mt-14 grid gap-6 md:grid-cols-3">
          <div className="rounded-xl border bg-card p-5">
            <p className="text-sm font-medium">Chat UI</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Familiar, fast, streaming responses with message persistence.
            </p>
          </div>
          <div className="rounded-xl border bg-card p-5">
            <p className="text-sm font-medium">App Connectors</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Add new integrations by implementing one interface + registering
              it.
            </p>
          </div>
          <div className="rounded-xl border bg-card p-5">
            <p className="text-sm font-medium">Production‑ready</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Better Auth + Prisma + Postgres with clear layering.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
