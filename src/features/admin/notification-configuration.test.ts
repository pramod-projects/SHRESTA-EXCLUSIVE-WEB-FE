import {
  buildNotificationConfigurationChangeRequest,
  NOTIFICATION_TYPES,
  notificationTypeLabel
} from "@/features/admin/notification-configuration";

describe("notification configuration", () => {
  it("defines every backend notification type independently", () => {
    expect(NOTIFICATION_TYPES).toHaveLength(13);
    expect(new Set(NOTIFICATION_TYPES).size).toBe(13);
    expect(NOTIFICATION_TYPES).toContain("ACCOUNT_SECURITY");
    expect(NOTIFICATION_TYPES).toContain("REFUND_COMPLETED");
  });

  it("builds the exact governed update request payload", () => {
    expect(buildNotificationConfigurationChangeRequest({
      type: "ORDER_SHIPPED",
      enabled: false,
      productionLocked: false,
      actor: " admin@example.com ",
      reason: " Pause while carrier links are repaired "
    })).toEqual({
      requestType: "notification-configuration",
      entityType: "notification-configuration",
      entityKey: "ORDER_SHIPPED",
      action: "UPDATE",
      submittedBy: "admin@example.com",
      payload: {
        type: "ORDER_SHIPPED",
        enabled: false,
        actor: "admin@example.com",
        reason: "Pause while carrier links are repaired"
      }
    });
  });

  it("requires a reason", () => {
    expect(() => buildNotificationConfigurationChangeRequest({
      type: "PAYMENT_FAILED",
      enabled: true,
      productionLocked: false,
      actor: "admin@example.com",
      reason: "  "
    })).toThrow("A reason is required");
  });

  it("rejects disabling a production-locked security notification", () => {
    expect(() => buildNotificationConfigurationChangeRequest({
      type: "PASSWORD_RESET",
      enabled: false,
      productionLocked: true,
      actor: "admin@example.com",
      reason: "Disable it"
    })).toThrow(`${notificationTypeLabel("PASSWORD_RESET")} is production-locked and cannot be disabled.`);
  });
});