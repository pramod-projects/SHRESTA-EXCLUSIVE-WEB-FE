import { randomUUID } from "crypto";
import { createTestUserAction, deleteTestUserAction } from "@/app/admin/actions";
import { AdminApiUnavailable } from "@/components/admin/admin-api-unavailable";
import { ConfirmSubmitButton } from "@/components/admin/confirm-submit-button";
import { TestUserOtpReveal } from "@/components/admin/test-user-otp-reveal";
import { requireAdminModuleAccess } from "@/features/admin/admin-acl";
import { fetchAdminChangeRequests, fetchAdminTestUsers, type AdminChangeRequestResponse, type TestUserSummary } from "@/features/admin/admin-api";
import { nullWhenShrestaApiUnavailable } from "@/lib/api-page-fallback";

export const dynamic = "force-dynamic";

export default async function AdminTestUsersPage() {
  await requireAdminModuleAccess("test-users");

  const data = await nullWhenShrestaApiUnavailable(async () => {
    const [testUsers, pendingRequests] = await Promise.all([
      fetchAdminTestUsers(),
      fetchAdminChangeRequests("PENDING_REVIEW")
    ]);
    return { testUsers, pendingRequests };
  });
  if (!data) {
    return <AdminApiUnavailable />;
  }

  const { testUsers, pendingRequests } = data;

  const pendingCreateByEmail = new Map<string, AdminChangeRequestResponse>();
  const pendingDeleteByCustomerId = new Map<string, AdminChangeRequestResponse>();
  for (const req of pendingRequests) {
    if (req.requestType !== "test-user-management") {
      continue;
    }
    if (req.action === "CREATE") {
      pendingCreateByEmail.set(req.entityKey.toLowerCase(), req);
    } else if (req.action === "DELETE") {
      pendingDeleteByCustomerId.set(req.entityKey, req);
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 border-b border-[var(--shresta-logo-border)] pb-5 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--gold-400)]">Access Control</p>
          <h1 className="mt-2 font-serif text-4xl font-light text-[var(--shresta-logo-text)]">Test Users</h1>
          <p className="mt-2 max-w-4xl text-sm leading-6 text-[var(--shresta-logo-muted)]">
            QA customer accounts for end-to-end testing. Creates and deletes are governed — each submission enters the review queue and is applied only after approval.
          </p>
        </div>
        <div className="text-sm text-[var(--shresta-logo-muted)]">{testUsers.total} test users</div>
      </header>

      <section className="admin-panel rounded-lg p-4">
        <h2 className="font-serif text-2xl font-light text-[var(--shresta-logo-text)]">Create Test User</h2>
        <p className="mt-1 max-w-3xl text-sm leading-6 text-[var(--shresta-logo-muted)]">
          OTP will be generated on approval; reveal once from this page. It is shown exactly once and never stored or displayed again.
        </p>
        <form action={createTestUserAction} className="mt-4 grid gap-3 lg:grid-cols-4">
          <input name="idempotencyKey" type="hidden" value={randomUUID()} />
          <label className="admin-label">
            Display Name
            <input className="admin-input" name="displayName" required />
          </label>
          <label className="admin-label">
            Email
            <input className="admin-input" name="email" required type="email" />
          </label>
          <label className="admin-label">
            Mobile
            <input className="admin-input" inputMode="numeric" name="mobile" pattern="[6-9][0-9]{9}" placeholder="10-digit Indian number" title="10-digit Indian mobile number" />
          </label>
          <label className="admin-label">
            Note
            <input className="admin-input" name="note" placeholder="Why this account exists" />
          </label>
          <div className="flex items-end">
            <button className="admin-button w-full" type="submit">Submit for review</button>
          </div>
        </form>
        {pendingCreateByEmail.size > 0 ? (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--shresta-logo-muted)]">Creates pending review:</span>
            {[...pendingCreateByEmail.values()].map((req) => (
              <span
                className="rounded-full bg-[rgba(212,175,55,0.14)] px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] text-[var(--gold-600)]"
                key={req.requestKey}
                title={req.requestKey}
              >
                {req.entityKey} — create pending
              </span>
            ))}
          </div>
        ) : null}
      </section>

      <section className="admin-panel rounded-lg p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <h2 className="font-serif text-2xl font-light text-[var(--shresta-logo-text)]">Existing Test Users</h2>
          <span className="rounded-full bg-[rgba(212,175,55,0.14)] px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] text-[var(--gold-600)]">{testUsers.items.length} shown</span>
        </div>

        {testUsers.items.length === 0 ? (
          <p className="mt-5 text-sm text-[var(--shresta-logo-muted)]">No test users yet.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[960px] text-left text-sm">
              <thead className="text-xs uppercase tracking-[0.12em] text-[var(--shresta-logo-muted)]">
                <tr>
                  <th className="py-2 pr-4">Name</th>
                  <th className="py-2 pr-4">Email</th>
                  <th className="py-2 pr-4">Mobile</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 pr-4">Test Orders</th>
                  <th className="py-2 pr-4">Created At</th>
                  <th className="py-2 pr-4">OTP</th>
                  <th className="py-2 text-right">Delete</th>
                </tr>
              </thead>
              <tbody>
                {testUsers.items.map((user) => (
                  <TestUserRow
                    key={user.customerId}
                    pendingDelete={pendingDeleteByCustomerId.get(user.customerId)}
                    user={user}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function TestUserRow({ user, pendingDelete }: { user: TestUserSummary; pendingDelete?: AdminChangeRequestResponse }) {
  return (
    <tr className="border-t border-[var(--shresta-logo-border)] align-top">
      <td className="py-3 pr-4 font-medium text-[var(--shresta-logo-text)]">
        {user.displayName}
        {user.note ? <span className="mt-0.5 block text-xs font-normal text-[var(--shresta-logo-muted)]">{user.note}</span> : null}
      </td>
      <td className="py-3 pr-4 text-[var(--shresta-logo-muted)]">{user.email}</td>
      <td className="py-3 pr-4 text-[var(--shresta-logo-muted)]">{user.mobile ?? "-"}</td>
      <td className="py-3 pr-4">
        <div className="flex flex-col gap-1">
          <span className={user.active
            ? "w-fit rounded-full border border-emerald-700/35 bg-emerald-500/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] text-emerald-700"
            : "w-fit rounded-full border border-[var(--shresta-logo-border)] px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] text-[var(--shresta-logo-muted)]"}>
            {user.active ? "Active" : "Inactive"}
          </span>
          {pendingDelete ? (
            <span className="w-fit rounded-full bg-red-500/15 px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] text-red-700" title={pendingDelete.requestKey}>
              Delete pending
            </span>
          ) : null}
        </div>
      </td>
      <td className="py-3 pr-4 text-[var(--shresta-logo-muted)]">{user.testOrdersCount}</td>
      <td className="py-3 pr-4 text-[var(--shresta-logo-muted)]">{new Date(user.createdAt).toLocaleString()}</td>
      <td className="py-3 pr-4">
        {user.otpRevealed ? (
          <span className="text-xs text-[var(--shresta-logo-muted)]">Revealed</span>
        ) : (
          <TestUserOtpReveal customerId={user.customerId} />
        )}
      </td>
      <td className="py-3 text-right">
        {pendingDelete ? null : (
          <form action={deleteTestUserAction}>
            <input name="idempotencyKey" type="hidden" value={randomUUID()} />
            <input name="customerId" type="hidden" value={user.customerId} />
            <input className="admin-input mb-2 w-48" name="reason" placeholder="Reason (required)" required />
            <ConfirmSubmitButton
              className="admin-button secondary"
              message={`Warning: Deleting test user ${user.email} (${user.customerId}) permanently removes the account, sessions, and test orders on approval. Click OK to submit for review.`}
            >
              Delete
            </ConfirmSubmitButton>
          </form>
        )}
      </td>
    </tr>
  );
}
