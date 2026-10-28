<script lang="ts">
  import reports from '#lib/data/reports-4471.json';
  import notes from '#lib/data/desk-notes.json';
  import type { Report } from '#lib/kb/causes';
  import { tenantOf } from '#lib/kb/locales';
  import { alsoIn, groupByProblem, mergedInto, mistagged, sharedSubjects, type Problem } from '#lib/kb/problems';

  // issues: the engineering ticket for each problem, by problem, with where engineering left it.
  type Issue = { href: string; state: 'open' | 'fixed' | "won't fix" };
  let { ticket, issues }: { ticket: number; issues: Partial<Record<Problem, Issue>> } = $props();

  const merged = $derived(mergedInto(reports as Report[], ticket));
  const groups = $derived(groupByProblem(merged, tenantOf, notes.oneDayMove));
  const channels = (c: Record<string, number>) =>
    Object.entries(c)
      .sort((a, b) => b[1] - a[1])
      .map(([ch, n]) => `${ch} ×${n}`)
      .join(' · ');
  const issueOf = (p: string) => issues[p as Problem];
  const number = (href: string) => href.split('/').pop();
</script>

<p class="sum">
  <strong>{merged.length}</strong> reports merged into #{ticket} ·
  <strong>{groups.length}</strong>
  {groups.length === 1 ? 'problem' : 'problems'}
</p>

<table>
  <thead>
    <tr><th>problem</th><th>reports</th><th>channels</th><th>tenants</th><th>seen</th><th>ticket · state</th></tr>
  </thead>
  <tbody>
    {#each groups as g (g.problem)}
      <tr class:open={(issueOf(g.problem)?.state ?? 'open') === 'open'}>
        <td><code>{g.problem}</code></td>
        <td>{g.reports.length}</td>
        <td class="tags">{channels(g.channels)}</td>
        <td>{g.tenants}</td>
        <td>{g.firstSeen} → {g.lastSeen}</td>
        <td>
          {#if issueOf(g.problem)}
            <a href={issueOf(g.problem)!.href}>#{number(issueOf(g.problem)!.href)}</a> · {issueOf(g.problem)!.state}
          {:else}no ticket yet{/if}
        </td>
      </tr>
    {/each}
  </tbody>
</table>

{#if alsoIn(groups, 'one-day', 'parser')}
  <p class="note">
    {alsoIn(groups, 'one-day', 'parser')} of the <code>parser</code> reports read as a one-day move: counted under
    <code>parser</code> by tenant, as the desk files them, and ticketed as <code>one-day</code>.
  </p>
{/if}

<p class="note">
  {sharedSubjects(groups)} subject lines appear under more than one problem. Intake tagged {mistagged(groups)} of
  {merged.length} reports with a cause other than their tenant's.
</p>

<style>
  .sum { font-size: 1.1rem; }
  .tags { color: var(--muted); font-size: 0.85em; }
  .note { color: var(--muted); font-size: 0.85em; }
  .open td { background: var(--warn-bg); }
  .open td:last-child { color: var(--warn); font-weight: 600; }
</style>
