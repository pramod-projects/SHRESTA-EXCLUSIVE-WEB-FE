import type { AdminChangeRequestCreatePayload } from "@/features/admin/admin-api";

export const NOTIFICATION_TYPES = [
  "OTP",
  "EMAIL_VERIFICATION",
  "PASSWORD_RESET",
  "ACCOUNT_SECURITY",
  "ORDER_CONFIRMATION",
  "ORDER_CANCELLED",
  "ORDER_SHIPPED",
  "ORDER_OUT_FOR_DELIVERY",
  "ORDER_DELIVERED",
  "PAYMENT_SUCCESS",
  "PAYMENT_FAILED",
  "REFUND_INITIATED",
  "REFUND_COMPLETED"
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export type NotificationConfiguration = {
  type: NotificationType;
  enabled: boolean;
  productionLocked: boolean;
  version: number;
  updatedBy: string | null;
  updateReason: string | null;
  updatedAt: string;
};

export function notificationTypeLabel(type: NotificationType): string {
  return type.toLowerCase().split("_").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}

export function buildNotificationConfigurationChangeRequest(input: {
  type: NotificationType;
  enabled: boolean;
  productionLocked: boolean;
  actor: string;
  reason: string;
}): AdminChangeRequestCreatePayload {
  const reason = input.reason.trim();
  const actor = input.actor.trim();
  if (!reason) {
    throw new Error("A reason is required before this change can be submitted for review.");
  }
  if (!actor) {
    throw new Error("The submitting admin could not be identified.");
  }
  if (input.productionLocked && !input.enabled) {
    throw new Error(`${notificationTypeLabel(input.type)} is production-locked and cannot be disabled.`);
  }

  return {
    requestType: "notification-configuration",
    entityType: "notification-configuration",
    entityKey: input.type,
    action: "UPDATE",
    submittedBy: actor,
    payload: {
      type: input.type,
      enabled: input.enabled,
      actor,
      reason
    }
  };
}