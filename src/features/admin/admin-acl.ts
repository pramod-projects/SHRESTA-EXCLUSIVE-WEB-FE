import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_SESSION_COOKIE, type AdminRole, type AdminSessionPayload, verifyAdminSessionToken } from "@/features/admin/admin-auth";

export type AdminModule = "overview" | "assets" | "categories" | "notifications" | "review" | "orders" | "test-users" | "users";

const KNOWN_MODULES: readonly AdminModule[] = ["overview", "assets", "categories", "notifications", "review", "orders", "test-users", "users"];

const MODULE_ACCESS: Record<AdminModule, readonly AdminRole[]> = {
  overview: ["SUPER_ADMIN", "CHANGE_MANAGER", "CHANGE_ADMIN"],
  assets: ["SUPER_ADMIN", "CHANGE_MANAGER", "CHANGE_SUBMITTER", "CHANGE_APPROVER", "CHANGE_ADMIN"],
  categories: ["SUPER_ADMIN", "CHANGE_MANAGER", "CHANGE_SUBMITTER", "CHANGE_APPROVER", "CHANGE_ADMIN"],
  notifications: ["SUPER_ADMIN", "CHANGE_MANAGER", "CHANGE_SUBMITTER", "CHANGE_APPROVER", "CHANGE_ADMIN"],
  review: ["SUPER_ADMIN", "CHANGE_MANAGER", "CHANGE_APPROVER", "CHANGE_ADMIN"],
  orders: ["SUPER_ADMIN", "CHANGE_MANAGER", "CHANGE_ADMIN"],
  "test-users": ["SUPER_ADMIN", "CHANGE_MANAGER", "CHANGE_ADMIN"],
  users: ["SUPER_ADMIN"]
};

const MODULE_PATH: Record<AdminModule, string> = {
  overview: "/admin",
  assets: "/admin/assets",
  categories: "/admin/categories",
  notifications: "/admin/configurations",
  review: "/admin/review",
  orders: "/admin/orders",
  "test-users": "/admin/test-users",
  users: "/admin/users"
};

const MODULE_LABEL: Record<AdminModule, string> = {
  overview: "Overview",
  assets: "Products",
  categories: "Categories",
  notifications: "Configurations",
  review: "Review",
  orders: "Orders",
  "test-users": "Test Users",
  users: "Admins"
};

const MODULE_PRIORITY: readonly AdminModule[] = ["overview", "assets", "categories", "notifications", "review", "orders", "test-users", "users"];

export function canAccessAdminModule(role: AdminRole, module: AdminModule): boolean {
  return MODULE_ACCESS[module].includes(role);
}

export function isAdminModule(value: string | undefined): value is AdminModule {
  if (!value) {
    return false;
  }
  return KNOWN_MODULES.includes(value as AdminModule);
}

export function adminModuleLabel(module: AdminModule): string {
  return MODULE_LABEL[module];
}

export function adminModulePath(module: AdminModule): string {
  return MODULE_PATH[module];
}

export function allowedRolesForAdminModule(module: AdminModule): readonly AdminRole[] {
  return MODULE_ACCESS[module];
}

export function visibleAdminModules(role: AdminRole): AdminModule[] {
  return MODULE_PRIORITY.filter((module) => canAccessAdminModule(role, module));
}

export function firstAdminPathForRole(role: AdminRole): string {
  const firstVisibleModule = visibleAdminModules(role)[0];
  return firstVisibleModule ? MODULE_PATH[firstVisibleModule] : "/admin-login?reason=login_required";
}

export async function requireAdminSession(): Promise<AdminSessionPayload> {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
  const session = verifyAdminSessionToken(sessionToken);
  if (!session) {
    redirect("/admin-login?reason=login_required");
  }
  return session;
}

export async function requireAdminModuleAccess(module: AdminModule): Promise<AdminSessionPayload> {
  const session = await requireAdminSession();
  if (!canAccessAdminModule(session.role, module)) {
    const fallbackPath = firstAdminPathForRole(session.role);
    const query = new URLSearchParams({
      module,
      role: session.role,
      from: adminModulePath(module),
      fallback: fallbackPath
    });
    redirect(`/admin/access-denied?${query.toString()}`);
  }
  return session;
}
