import type { Stats } from "@/lib/types";

export default function StatsTab({ stats }: { stats: Stats | null }) {
  if (!stats) return <p className="text-sm text-navy-900/50">Loading…</p>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Groups" value={stats.groups} />
        <StatTile label="Total Attendees" value={stats.attendees} />
        <StatTile label="Paid Attendees" value={stats.paidAttendees} />
        <StatTile label="Paid Amount" value={`₱${stats.paidAmountPhp.toLocaleString()}`} />
        <StatTile label="Pending Groups" value={stats.pendingGroups} />
        <StatTile label="Rejected Groups" value={stats.rejectedGroups} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Breakdown title="By Gender" data={stats.byGender} />
        <Breakdown title="By Age Range" data={stats.byAgeRange} />
      </div>
    </div>
  );
}

function StatTile({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg border border-navy-900/10 bg-white p-4">
      <p className="text-xs font-semibold uppercase text-navy-900/40">{label}</p>
      <p className="mt-1 text-2xl font-extrabold text-navy-900">{value}</p>
    </div>
  );
}

function Breakdown({ title, data }: { title: string; data: Record<string, number> }) {
  const entries = Object.entries(data);
  return (
    <div className="rounded-lg border border-navy-900/10 bg-white p-4">
      <p className="text-sm font-bold text-navy-900">{title}</p>
      <ul className="mt-2 space-y-1 text-sm text-navy-900/70">
        {entries.length === 0 && <li>No data yet.</li>}
        {entries.map(([key, count]) => (
          <li key={key} className="flex justify-between">
            <span className="capitalize">{key}</span>
            <span className="font-semibold text-navy-900">{count}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
