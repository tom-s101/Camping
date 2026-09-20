"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Registration, Stats } from "@/lib/types";
import { exportRegistrationsToCsv } from "@/lib/exportCsv";
import RegistrationCard from "./RegistrationCard";
import StatsTab from "./StatsTab";

type Tab = "registrations" | "rejected" | "stats";

export default function DashboardApp() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("registrations");
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [stats, setStats] = useState<Stats | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // With polling, refresh-on-focus, and post-action refreshes all hitting
  // this endpoint, multiple requests can be in flight at once and are NOT
  // guaranteed to resolve in the order they were sent. Without a guard, an
  // older request issued before a delete can resolve after the newer
  // post-delete refresh and silently overwrite the correct state with the
  // stale one -- reintroducing an already-deleted row into the list. This
  // counter makes only the most-recently-*issued* request allowed to update
  // state, so a stale response can never win regardless of resolve order.
  const registrationsRequestIdRef = useRef(0);

  // A "silent" fetch keeps the list in sync with what's actually in Supabase
  // (e.g. a registration another admin, or another tab, just deleted)
  // without flashing the loading state or surfacing transient poll errors.
  async function fetchRegistrations(q: string, options?: { silent?: boolean }) {
    const silent = options?.silent ?? false;
    const requestId = ++registrationsRequestIdRef.current;
    if (!silent) {
      setLoading(true);
      setLoadError(null);
    }
    try {
      const res = await fetch(`/api/admin/registrations?q=${encodeURIComponent(q)}`, { cache: "no-store" });
      if (!res.ok) throw new Error((await res.json().catch(() => null))?.error ?? "Request failed.");
      const body = await res.json();
      if (requestId !== registrationsRequestIdRef.current) return;
      setRegistrations(body.registrations);
    } catch (err) {
      if (requestId !== registrationsRequestIdRef.current) return;
      if (!silent) setLoadError(err instanceof Error ? err.message : "Could not load registrations.");
    } finally {
      if (requestId === registrationsRequestIdRef.current && !silent) setLoading(false);
    }
  }

  useEffect(() => {
    const timeout = setTimeout(() => fetchRegistrations(query), 300);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const statsRequestIdRef = useRef(0);

  async function fetchStats(options?: { silent?: boolean }) {
    const requestId = ++statsRequestIdRef.current;
    try {
      const res = await fetch("/api/admin/stats", { cache: "no-store" });
      if (!res.ok) throw new Error("Request failed.");
      const body = await res.json();
      if (requestId !== statsRequestIdRef.current) return;
      setStats(body);
    } catch {
      if (requestId !== statsRequestIdRef.current) return;
      if (!options?.silent) setLoadError("Could not load stats.");
    }
  }

  useEffect(() => {
    if (tab === "stats") fetchStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  // Keep every open dashboard converged on the backend: poll in the
  // background, and refresh immediately when the tab regains focus, so a
  // deletion made elsewhere (another tab, another admin) doesn't keep
  // showing here as a ghost registration.
  useEffect(() => {
    const interval = setInterval(() => {
      fetchRegistrations(query, { silent: true });
      if (tab === "stats") fetchStats({ silent: true });
    }, 5000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, tab]);

  useEffect(() => {
    function handleVisibility() {
      if (document.visibilityState === "visible") {
        fetchRegistrations(query, { silent: true });
        if (tab === "stats") fetchStats({ silent: true });
      }
    }
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, tab]);

  async function handleReview(id: string, action: "approve" | "reject") {
    try {
      const res = await fetch(`/api/admin/registrations/${id}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) throw new Error("Request failed.");
      await fetchRegistrations(query);
      if (tab === "stats") await fetchStats();
    } catch {
      setLoadError(`Could not ${action} that registration. Please try again.`);
    }
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/admin/registrations/${id}`, { method: "DELETE" });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(body?.error ? `${body.error} (HTTP ${res.status})` : `Request failed (HTTP ${res.status}).`);
      }
    } catch (err) {
      setLoadError(
        `Could not delete that registration: ${err instanceof Error ? err.message : "Unknown error. Please try again."}`
      );
      return;
    }
    // The row is confirmed deleted on the server at this point. Remove it
    // locally right away, then reconcile with the server silently so a
    // flaky follow-up refresh is never mistaken for a failed delete.
    setRegistrations((prev) => prev.filter((r) => r.id !== id));
    await fetchRegistrations(query, { silent: true });
    if (tab === "stats") await fetchStats({ silent: true });
  }

  const rejected = useMemo(() => registrations.filter((r) => r.payment_status === "rejected"), [registrations]);

  async function handleLogout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/dashboard/login");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-cream">
      <header className="bg-navy-900 px-4 py-4 text-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <h1 className="text-lg font-bold">Camp Registration Dashboard</h1>
          <button type="button" onClick={handleLogout} className="text-sm font-semibold text-white/70 hover:text-white">
            Log out
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 py-6">
        <div className="flex items-center justify-between gap-3 border-b border-navy-900/10 pb-2">
          <nav className="flex gap-2">
            <TabButton active={tab === "registrations"} onClick={() => setTab("registrations")}>
              All Registrations
            </TabButton>
            <TabButton active={tab === "rejected"} onClick={() => setTab("rejected")}>
              Rejected Payments ({rejected.length})
            </TabButton>
            <TabButton active={tab === "stats"} onClick={() => setTab("stats")}>
              Stats
            </TabButton>
          </nav>
          <button
            type="button"
            disabled={registrations.length === 0}
            onClick={() => exportRegistrationsToCsv(registrations)}
            className="shrink-0 rounded-md bg-gold-600 px-3 py-2 text-xs font-bold uppercase tracking-wide text-white hover:bg-gold-500 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Export to Excel
          </button>
        </div>

        {loadError && (
          <div className="mt-4 rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
            {loadError}
          </div>
        )}

        <div className="mt-6">
          {tab === "registrations" && (
            <div>
              <input
                type="search"
                placeholder="Search by name, email, or phone…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="mb-4 w-full rounded-md border border-navy-900/20 px-3 py-2.5 text-sm focus:border-gold-600 focus:outline-none focus:ring-1 focus:ring-gold-600"
              />
              {loading ? (
                <p className="text-sm text-navy-900/50">Loading…</p>
              ) : registrations.length === 0 ? (
                <p className="text-sm text-navy-900/50">No registrations found.</p>
              ) : (
                <div className="space-y-3">
                  {registrations.map((r) => (
                    <RegistrationCard
                      key={r.id}
                      registration={r}
                      onReview={handleReview}
                      onDelete={handleDelete}
                      onPreviewImage={setPreviewImage}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === "rejected" && (
            <div className="space-y-3">
              {rejected.length === 0 ? (
                <p className="text-sm text-navy-900/50">No rejected payments.</p>
              ) : (
                rejected.map((r) => (
                  <RegistrationCard
                    key={r.id}
                    registration={r}
                    onReview={handleReview}
                    onDelete={handleDelete}
                    onPreviewImage={setPreviewImage}
                  />
                ))
              )}
            </div>
          )}

          {tab === "stats" && <StatsTab stats={stats} />}
        </div>
      </div>

      {previewImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setPreviewImage(null)}
        >
          <button
            type="button"
            onClick={() => setPreviewImage(null)}
            className="absolute right-4 top-4 rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/20"
          >
            Close
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewImage}
            alt="Payment proof, full size"
            className="max-h-full max-w-full rounded-lg object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`border-b-2 px-3 py-2 text-sm font-semibold ${
        active ? "border-gold-600 text-navy-900" : "border-transparent text-navy-900/50"
      }`}
    >
      {children}
    </button>
  );
}
