


export function isSubSubFullyAllotted(sub: { periods: number; assignedPeriods: number }): boolean {
  return sub.assignedPeriods >= sub.periods;
}
