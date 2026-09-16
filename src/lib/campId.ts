export function formatCampId(campNumber: number): string {
  return `Camp-${String(campNumber).padStart(3, "0")}`;
}
