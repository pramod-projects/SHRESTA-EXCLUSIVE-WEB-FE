import {
  adminModulePath,
  canAccessAdminModule,
  visibleAdminModules
} from "@/features/admin/admin-acl";

describe("admin configuration module ACL", () => {
  it.each(["SUPER_ADMIN", "CHANGE_MANAGER", "CHANGE_SUBMITTER", "CHANGE_APPROVER", "CHANGE_ADMIN"] as const)(
    "allows %s to access configurations",
    (role) => {
      expect(canAccessAdminModule(role, "notifications")).toBe(true);
      expect(visibleAdminModules(role)).toContain("notifications");
    }
  );

  it("routes the configuration module to its renamed admin page", () => {
    expect(adminModulePath("notifications")).toBe("/admin/configurations");
  });
});