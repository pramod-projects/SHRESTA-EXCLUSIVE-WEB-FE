export type DeploymentMode = "DEV" | "UAT" | "PROD";

export function deploymentMode(value = process.env.SHRESTA_ENVIRONMENT_MODE): DeploymentMode {
  const normalized = (value ?? "DEV").trim().toUpperCase();
  if (normalized === "DEV" || normalized === "UAT" || normalized === "PROD") {
    return normalized;
  }
  throw new Error("SHRESTA_ENVIRONMENT_MODE must be DEV, UAT, or PROD");
}