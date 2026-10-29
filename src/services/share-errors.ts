export const isShareCancellation = (error: unknown) => {
  if (typeof error !== "object" || error === null) return false;
  const candidate = error as { message?: unknown; error?: unknown };
  const message = `${candidate.message || ""} ${candidate.error || ""}`.toLowerCase();
  return message.includes("cancel") || message.includes("did not share");
};
