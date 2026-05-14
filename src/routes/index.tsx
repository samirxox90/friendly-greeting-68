import { createFileRoute, Link } from "@tanstack/react-router";
import { PfnAssetsFinder } from "@/components/pfn-assets-finder";

export const Route = createFileRoute("/")({
  component: IndexRoute,
});

function IndexRoute() {
  return (
    <>
      <div className="mx-auto flex w-full max-w-7xl justify-end px-4 pt-4 md:px-6">
        <Link
          to="/admin"
          className="rounded-md border border-input bg-secondary px-3 py-1.5 text-sm font-medium text-secondary-foreground hover:bg-accent"
        >
          Open Admin
        </Link>
      </div>
      <PfnAssetsFinder />
    </>
  );
}
