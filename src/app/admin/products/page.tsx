import { redirect } from "next/navigation";

// Products have been merged into the Assets & Products page.
export default function AdminProductsPage() {
  redirect("/admin/assets");
}
