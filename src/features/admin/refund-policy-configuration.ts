import type { AdminChangeRequestCreatePayload } from "@/features/admin/admin-api";

export type RefundPolicyConfiguration = {
  policyKey: string;
  eligibilityDays: number;
  version: number;
  updatedBy: string | null;
  updateReason: string | null;
  updatedAt: string;
};

export function buildRefundPolicyChangeRequest(input: {
  eligibilityDays: number;
  actor: string;
  reason: string;
}): AdminChangeRequestCreatePayload {
  const actor = input.actor.trim();
  const reason = input.reason.trim();
  if (!Number.isInteger(input.eligibilityDays) || input.eligibilityDays < 0 || input.eligibilityDays > 365) {
    throw new Error("Refund eligibility days must be a whole number between 0 and 365.");
  }
  if (!reason) {
    throw new Error("A reason is required before this change can be submitted for review.");
  }
  if (!actor) {
    throw new Error("The submitting admin could not be identified.");
  }

  return {
    requestType: "configuration-refund-policy",
    entityType: "refund-policy-configuration",
    entityKey: "CUSTOMER_REFUND",
    action: "UPDATE",
    submittedBy: actor,
    payload: { eligibilityDays: input.eligibilityDays, actor, reason }
  };
}