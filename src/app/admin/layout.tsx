import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft, ClipboardCheck, FolderTree, Images, LayoutDashboard, PackageCheck } from "lucide-react";

const navItems = [
  {
    href: "/admin",
    label: "Overview",
    description: "Health, fields, actions",
    Icon: LayoutDashboard
  },
  {
    href: "/admin/assets",
    label: "Products",
    description: "Media, images, product catalog",
    Icon: Images
  },
  {
    href: "/admin/categories",
    label: "Categories",
    description: "Taxonomy, filters, tax",
    Icon: FolderTree
  },
  {
    href: "/admin/review",
    label: "Review",
    description: "Approve or reject changes",
    Icon: ClipboardCheck
  },
  {
    href: "/admin/orders",
    label: "Orders",
    description: "Track and update fulfillment",
    Icon: PackageCheck
  }
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <main className="admin-shell min-h-screen text-[var(--shresta-logo-text)]">
      <div className="mx-auto flex min-h-screen max-w-[1600px] min-w-0 flex-col lg:flex-row">
        <aside className="min-w-0 overflow-hidden border-b border-[var(--shresta-logo-border)] bg-[var(--shresta-logo-bg)] px-4 py-4 lg:sticky lg:top-0 lg:min-h-screen lg:w-72 lg:border-b-0 lg:border-r lg:px-5">
          <Link className="block" href="/admin">
            <span className="font-serif text-3xl font-light text-[var(--shresta-logo-text)]">SHRESTA</span>
            <span className="mt-1 block text-xs font-bold uppercase tracking-[0.16em] text-[var(--gold-400)]">Admin Console</span>
          </Link>
          <nav className="-mx-4 mt-6 flex max-w-[100vw] gap-2 overflow-x-auto px-4 pb-1 text-sm [scrollbar-width:none] lg:mx-0 lg:max-w-none lg:flex-col lg:overflow-visible lg:px-0 lg:pb-0 [&::-webkit-scrollbar]:hidden">
            {navItems.map(({ description, href, Icon, label }) => (
              <Link className="group flex min-w-[8.5rem] shrink-0 items-center gap-2 rounded-lg border border-transparent px-3 py-3 text-[var(--shresta-logo-muted)] hover:border-[rgba(212,175,55,0.22)] hover:bg-[rgba(212,175,55,0.12)] hover:text-[var(--gold-600)] sm:min-w-[11rem] sm:gap-3 lg:min-w-0 lg:shrink" href={href} key={href}>
                <span className="grid size-9 place-items-center rounded-lg border border-[rgba(212,175,55,0.18)] bg-[rgba(212,175,55,0.08)] text-[var(--gold-600)] sm:size-10">
                  <Icon aria-hidden="true" size={18} />
                </span>
                <span className="min-w-0">
                  <span className="block font-semibold text-[var(--shresta-logo-text)]">{label}</span>
                  <span className="mt-1 hidden text-xs text-[var(--shresta-logo-muted)] sm:block">{description}</span>
                </span>
              </Link>
            ))}
          </nav>
          <Link className="mt-6 hidden items-center gap-2 rounded-lg border border-[var(--shresta-logo-border)] px-3 py-3 text-sm text-[var(--shresta-logo-muted)] hover:border-[rgba(212,175,55,0.22)] hover:text-[var(--gold-600)] lg:flex" href="/">
            <ArrowLeft aria-hidden="true" size={16} />
            Customer storefront
          </Link>
        </aside>
        <section className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8 xl:px-10">{children}</section>
      </div>
    </main>
  );
}
