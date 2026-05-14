import { createFileRoute, Link } from "@tanstack/react-router";
import { PfnAdminPanel } from "@/components/pfn-admin-panel";

export const Route = createFileRoute("/admin")({
  component: AdminRoute,
  head: () => ({
    meta: [
      { title: "PFN Admin Panel" },
      { name: "description", content: "Manage PFN finder templates, link patterns, and access codes." },
    ],
  }),
});

function AdminRoute() {
  return (
    <>
      <div className="mx-auto flex w-full max-w-7xl justify-end px-4 pt-4 md:px-6">
        <Link
          to="/"
          className="rounded-md border border-input bg-secondary px-3 py-1.5 text-sm font-medium text-secondary-foreground hover:bg-accent"
        >
          Back to Finder
        </Link>
      </div>
      <PfnAdminPanel />
    </>
  );
}
