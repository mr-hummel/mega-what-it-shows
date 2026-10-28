// The problems inside one merged ticket, counted the desk's way: every report under the cause its tenant gives
// it (causes.ts), and the reports the desk read as a one-day move (desk-notes.json) as a problem of their own,
// still counted under the cause they are filed under.
import { groupByCause, uniqueById, type Cause, type Report, type Tenant } from '#lib/kb/causes';

export type Problem = Cause | 'one-day';

export type ProblemGroup = {
  problem: Problem | 'unplaced';
  reports: Report[];
  tenants: number;
  channels: Record<string, number>;
  firstSeen: string;
  lastSeen: string;
};

export function mergedInto(reports: Report[], ticket: number): Report[] {
  return uniqueById(reports).filter((r) => r.mergedInto === ticket);
}

function summary(problem: ProblemGroup['problem'], rs: Report[]): ProblemGroup {
  const days = rs.map((r) => r.receivedAt.slice(0, 10)).sort();
  return {
    problem,
    reports: rs,
    tenants: new Set(rs.map((r) => r.tenant)).size,
    channels: rs.reduce<Record<string, number>>((n, r) => ({ ...n, [r.channel]: (n[r.channel] ?? 0) + 1 }), {}),
    firstSeen: days[0],
    lastSeen: days[days.length - 1],
  };
}

export function groupByProblem(
  reports: Report[],
  tenantOf: (r: Report) => Tenant | undefined,
  oneDayMove: readonly string[],
): ProblemGroup[] {
  const groups = groupByCause(reports, tenantOf).map((g) => summary(g.cause, g.reports));
  const moved = reports.filter((r) => oneDayMove.includes(r.id));
  return moved.length ? [...groups, summary('one-day', moved)] : groups;
}

// How many reports of one problem are also counted under another.
export function alsoIn(groups: ProblemGroup[], problem: Problem, other: Problem): number {
  const ids = new Set(groups.find((g) => g.problem === other)?.reports.map((r) => r.id));
  return groups.find((g) => g.problem === problem)?.reports.filter((r) => ids.has(r.id)).length ?? 0;
}

// Subject lines that turn up under more than one cause: why merging on subject (decision 0001) put them together.
export function sharedSubjects(groups: ProblemGroup[]): number {
  const seen = new Map<string, Set<ProblemGroup['problem']>>();
  for (const g of groups)
    for (const r of g.reports) {
      const s = r.subject.toLowerCase().replace(/[^\p{L}\p{N} ]/gu, '').trim();
      seen.set(s, (seen.get(s) ?? new Set()).add(g.problem));
    }
  return [...seen.values()].filter((ps) => ps.size > 1).length;
}

// Reports intake tagged with a cause other than the one their tenant gives them.
export function mistagged(groups: ProblemGroup[]): number {
  return groups
    .filter((g) => g.problem !== 'one-day')
    .reduce((n, g) => n + g.reports.filter((r) => r.meta.intakeTag !== g.problem).length, 0);
}
