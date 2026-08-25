import { buildRefundPolicyChangeRequest } from "@/features/admin/refund-policy-configuration";

describe("refund policy configuration", () => {
  it("builds an audited approval request", () => {
    expect(buildRefundPolicyChangeRequest({
      eligibilityDays: 7,
      actor: " admin@shresta.in ",
      reason: " Extend for festive season "
    })).toEqual({
      requestType: "configuration-refund-policy",
      entityType: "refund-policy-configuration",
      entityKey: "CUSTOMER_REFUND",
      action: "UPDATE",
      submittedBy: "admin@shresta.in",
      payload: {
        eligibilityDays: 7,
        actor: "admin@shresta.in",
        reason: "Extend for festive season"
      }
    });
  });

  it.each([-1, 1.5, 366, Number.NaN])("rejects invalid eligibility days: %s", (eligibilityDays) => {
    expect(() => buildRefundPolicyChangeRequest({
      eligibilityDays,
      actor: "admin@shresta.in",
      reason: "Invalid request"
    })).toThrow("whole number between 0 and 365");
  });
});