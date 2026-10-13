export const transitions: Record<string, string[]> = {
  open: ["assigned", "cancelled"],
  assigned: ["open", "in_progress", "cancelled"],
  in_progress: ["resolved", "cancelled"],
  resolved: ["closed", "in_progress"],
  closed: [],
  cancelled: ["open"],
};
export function canTransition(from: string, to: string) {
  return from === to || !!transitions[from]?.includes(to);
}
