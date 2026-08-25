import { createAdminUser, deleteAdminUser, fetchAdminUsers, type AdminRole } from "@/features/admin/admin-api";
import { requireAdminModuleAccess } from "@/features/admin/admin-acl";
import { ConfirmSubmitButton } from "@/components/admin/confirm-submit-button";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";

const ROLES: AdminRole[] = ["CHANGE_MANAGER", "CHANGE_APPROVER", "CHANGE_SUBMITTER", "CHANGE_ADMIN"];

async function createAdminUserAction(formData: FormData): Promise<void> {
  "use server";

  await requireAdminModuleAccess("users");

  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const role = String(formData.get("role") ?? "").trim().toUpperCase() as AdminRole;

  await createAdminUser({ email, password, role });
  revalidatePath("/admin/users");
}

async function deleteAdminUserAction(formData: FormData): Promise<void> {
  "use server";

  await requireAdminModuleAccess("users");

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email) {
    throw new Error("Admin email is required for delete.");
  }

  await deleteAdminUser(email);
  revalidatePath("/admin/users");
}

export default async function AdminUsersPage() {
  const session = await requireAdminModuleAccess("users");

  const users = await fetchAdminUsers();
  const bootstrapEmail = "pramod.works.on.projects@gmail.com";

  return (
    <div className="space-y-6">
      <header className="border-b border-[var(--shresta-logo-border)] pb-5">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--gold-400)]">Access Control</p>
        <h1 className="mt-2 font-serif text-4xl font-light text-[var(--shresta-logo-text)]">Admin Users</h1>
        <p className="mt-2 max-w-4xl text-sm leading-6 text-[var(--shresta-logo-muted)]">
          The bootstrap admin is available in every environment and remains the only super admin. Use this panel to create additional admins with scoped ACL roles.
        </p>
      </header>

      <section className="admin-panel rounded-lg p-4">
        <h2 className="font-serif text-2xl font-light text-[var(--shresta-logo-text)]">Create Admin</h2>
        <form action={createAdminUserAction} className="mt-4 grid gap-3 lg:grid-cols-4">
          <label className="admin-label">
            Email
            <input className="admin-input" name="email" required type="email" />
          </label>
          <label className="admin-label">
            Password
            <input className="admin-input" name="password" required type="password" />
          </label>
          <label className="admin-label">
            Role
            <select className="admin-input" defaultValue="CHANGE_SUBMITTER" name="role" required>
              {ROLES.map((role) => (
                <option key={role} value={role}>{role}</option>
              ))}
            </select>
          </label>
          <div className="flex items-end">
            <button className="admin-button w-full" type="submit">Create admin</button>
          </div>
        </form>
      </section>

      <section className="admin-panel rounded-lg p-4">
        <h2 className="font-serif text-2xl font-light text-[var(--shresta-logo-text)]">Existing Admins</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="text-xs uppercase tracking-[0.12em] text-[var(--shresta-logo-muted)]">
              <tr>
                <th className="py-2 pr-4">Email</th>
                <th className="py-2 pr-4">Role</th>
                <th className="py-2 pr-4">Active</th>
                <th className="py-2 pr-4">Created By</th>
                <th className="py-2">Created At</th>
                <th className="py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                (() => {
                  const normalizedEmail = user.email.trim().toLowerCase();
                  const isSelf = normalizedEmail === session.email.trim().toLowerCase();
                  const isBootstrap = bootstrapEmail.length > 0 && normalizedEmail === bootstrapEmail;
                  const canDelete = !isSelf && !isBootstrap;
                  const blockedReason = isBootstrap
                    ? "Only this account can stay SUPER_ADMIN"
                    : "You cannot delete your own logged-in admin";

                  return (
                <tr className="border-t border-[var(--shresta-logo-border)]" key={user.email}>
                  <td className="py-3 pr-4 font-medium text-[var(--shresta-logo-text)]">{user.email}</td>
                  <td className="py-3 pr-4 text-[var(--gold-700)]">{user.role}</td>
                  <td className="py-3 pr-4 text-[var(--shresta-logo-muted)]">{user.active ? "Yes" : "No"}</td>
                  <td className="py-3 pr-4 text-[var(--shresta-logo-muted)]">{user.createdByEmail ?? "-"}</td>
                  <td className="py-3 text-[var(--shresta-logo-muted)]">{new Date(user.createdAt).toLocaleString()}</td>
                  <td className="py-3 text-right">
                    <form action={deleteAdminUserAction}>
                      <input name="email" type="hidden" value={user.email} />
                      <ConfirmSubmitButton
                        className="admin-button secondary"
                        disabled={!canDelete}
                        message={`Warning: You are deleting admin user ${user.email}. This action cannot be undone. Click OK to proceed.`}
                        title={canDelete ? "Delete admin" : blockedReason}
                      >
                        Delete
                      </ConfirmSubmitButton>
                    </form>
                    {!canDelete ? <span className="mt-1 block text-xs text-[var(--shresta-logo-muted)]">{blockedReason}</span> : null}
                  </td>
                </tr>
                  );
                })()
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
