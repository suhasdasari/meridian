import { createFileRoute } from "@tanstack/react-router";
import { DeskApp } from "@/components/desk/app";
import { getDesk } from "@/lib/news/api";

export const Route = createFileRoute("/")({
  loader: () => getDesk({ data: { country: "WORLD" } }),
  component: Home,
  pendingComponent: DeskPending,
});

function Home() {
  const data = Route.useLoaderData();
  return <DeskApp initial={data} />;
}

function DeskPending() {
  return (
    <main className="flex min-h-dvh flex-col bg-bg px-6 py-10 text-fg">
      <p className="font-display text-3xl font-medium">Meridian</p>
      <p className="mt-2 font-mono text-xs tracking-kicker text-muted uppercase">
        Opening the world desk
      </p>
    </main>
  );
}
