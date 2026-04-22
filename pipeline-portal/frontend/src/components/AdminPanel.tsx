import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { metaApi } from "../api/meta";
import toast from "react-hot-toast";

type Tab = "users" | "brands" | "categories" | "regions" | "snapshots";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h3 className="font-semibold text-gray-800 mb-4">{title}</h3>
      {children}
    </div>
  );
}

export function AdminPanel() {
  const [tab, setTab] = useState<Tab>("users");
  const tabs: { id: Tab; label: string }[] = [
    { id: "users", label: "Users" },
    { id: "brands", label: "Brands" },
    { id: "categories", label: "Categories" },
    { id: "regions", label: "Regions" },
    { id: "snapshots", label: "Snapshots" },
  ];

  return (
    <div className="p-4 max-w-screen-2xl mx-auto">
      <h2 className="text-xl font-bold text-gray-900 mb-4">Admin</h2>
      <div className="flex gap-1 border-b border-gray-200 mb-6">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === t.id ? "border-brand-600 text-brand-600" : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tab === "users" && <UsersTab />}
      {tab === "brands" && <SimpleListTab kind="brands" />}
      {tab === "categories" && <SimpleListTab kind="categories" />}
      {tab === "regions" && <RegionsTab />}
      {tab === "snapshots" && <SnapshotsTab />}
    </div>
  );
}

type UserRecord = {
  id: string;
  name: string;
  email: string;
  role: string;
  userRegions: { region: { id: string; name: string } }[];
};

type RegionRecord = { id: string; name: string; currency: string };

function RegionEditor({ user, regions }: { user: UserRecord; regions: RegionRecord[] }) {
  const qc = useQueryClient();
  const assigned = new Set(user.userRegions.map((ur) => ur.region.id));

  const assignMut = useMutation({
    mutationFn: (regionId: string) => metaApi.assignUserToRegion(regionId, user.id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-users"] }); toast.success("Region assigned"); },
    onError: () => toast.error("Failed to assign region"),
  });

  const removeMut = useMutation({
    mutationFn: (regionId: string) => metaApi.removeUserFromRegion(regionId, user.id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-users"] }); toast.success("Region removed"); },
    onError: () => toast.error("Failed to remove region"),
  });

  const toggle = (regionId: string) => {
    if (assigned.has(regionId)) removeMut.mutate(regionId);
    else assignMut.mutate(regionId);
  };

  const busy = assignMut.isPending || removeMut.isPending;

  return (
    <div className="flex flex-wrap gap-1.5">
      {regions.map((r) => {
        const active = assigned.has(r.id);
        return (
          <button
            key={r.id}
            onClick={() => toggle(r.id)}
            disabled={busy}
            title={active ? `Remove ${r.name}` : `Assign ${r.name}`}
            className={`text-xs px-2 py-0.5 rounded-full border font-medium transition-colors disabled:opacity-50 ${
              active
                ? "bg-brand-600 text-white border-brand-600 hover:bg-rose-500 hover:border-rose-500"
                : "bg-white text-gray-500 border-gray-300 hover:border-brand-400 hover:text-brand-600"
            }`}
          >
            {active ? "✓ " : "+ "}{r.name}
          </button>
        );
      })}
      {regions.length === 0 && <span className="text-xs text-gray-400">No regions available</span>}
    </div>
  );
}

function UsersTab() {
  const qc = useQueryClient();
  const { data: users = [] } = useQuery({ queryKey: ["admin-users"], queryFn: metaApi.adminUsers });
  const { data: regions = [] } = useQuery({ queryKey: ["regions"], queryFn: metaApi.regions });
  const [form, setForm] = useState({ email: "", name: "", password: "", role: "USER", regionIds: [] as string[] });

  const toggleRegion = (id: string) =>
    setForm((p) => ({
      ...p,
      regionIds: p.regionIds.includes(id) ? p.regionIds.filter((r) => r !== id) : [...p.regionIds, id],
    }));

  const createMut = useMutation({
    mutationFn: async () => {
      const user = await metaApi.createUser({ email: form.email, name: form.name, password: form.password, role: form.role });
      await Promise.all(form.regionIds.map((rId) => metaApi.assignUserToRegion(rId, user.id)));
      return user;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("User created");
      setForm({ email: "", name: "", password: "", role: "USER", regionIds: [] });
    },
    onError: () => toast.error("Failed to create user"),
  });

  return (
    <div className="space-y-6">
      <Section title="Create User">
        <div className="grid grid-cols-2 gap-3 mb-3">
          {(["name", "email", "password"] as const).map((f) => (
            <input
              key={f}
              type={f === "password" ? "password" : "text"}
              placeholder={f.charAt(0).toUpperCase() + f.slice(1)}
              value={form[f]}
              onChange={(e) => setForm((p) => ({ ...p, [f]: e.target.value }))}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          ))}
          <select
            value={form.role}
            onChange={(e) => setForm((p) => ({ ...p, role: e.target.value }))}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="USER">User</option>
            <option value="ADMIN">Admin</option>
          </select>
        </div>

        <div className="mb-3">
          <p className="text-xs font-medium text-gray-600 mb-2">Assign Regions</p>
          <div className="flex flex-wrap gap-2">
            {(regions as RegionRecord[]).map((r) => {
              const selected = form.regionIds.includes(r.id);
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => toggleRegion(r.id)}
                  className={`text-xs px-3 py-1 rounded-full border font-medium transition-colors ${
                    selected
                      ? "bg-brand-600 text-white border-brand-600"
                      : "bg-white text-gray-500 border-gray-300 hover:border-brand-400"
                  }`}
                >
                  {selected ? "✓ " : ""}{r.name} <span className="font-mono opacity-70">({r.currency})</span>
                </button>
              );
            })}
          </div>
        </div>

        <button
          onClick={() => createMut.mutate()}
          disabled={createMut.isPending || !form.email || !form.name || !form.password}
          className="bg-brand-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-brand-700 disabled:opacity-50"
        >
          {createMut.isPending ? "Creating…" : "Create User"}
        </button>
      </Section>

      <Section title="All Users">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-gray-500 uppercase border-b border-gray-200">
              {["Name", "Email", "Role", "Regions (click to toggle)"].map((h) => (
                <th key={h} className="pb-2 pr-4 font-semibold">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(users as UserRecord[]).map((u) => (
              <tr key={u.id} className="border-b border-gray-100 align-top">
                <td className="py-3 pr-4 font-medium whitespace-nowrap">{u.name}</td>
                <td className="py-3 pr-4 text-gray-500 whitespace-nowrap">{u.email}</td>
                <td className="py-3 pr-4 whitespace-nowrap">
                  <span className={`text-xs px-2 py-0.5 rounded font-medium ${u.role === "ADMIN" ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-600"}`}>
                    {u.role}
                  </span>
                </td>
                <td className="py-3">
                  <RegionEditor user={u} regions={regions as RegionRecord[]} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>
    </div>
  );
}

function SimpleListTab({ kind }: { kind: "brands" | "categories" }) {
  const qc = useQueryClient();
  const fn = kind === "brands" ? metaApi.brands : metaApi.categories;
  const createFn = kind === "brands" ? metaApi.createBrand : metaApi.createCategory;
  const { data: items = [] } = useQuery({ queryKey: [kind], queryFn: fn });
  const [name, setName] = useState("");

  const createMut = useMutation({
    mutationFn: () => createFn(name),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [kind] }); toast.success(`${kind === "brands" ? "Brand" : "Category"} created`); setName(""); },
    onError: () => toast.error("Failed"),
  });

  return (
    <Section title={kind.charAt(0).toUpperCase() + kind.slice(1)}>
      <div className="flex gap-2 mb-4">
        <input
          type="text"
          placeholder={`New ${kind === "brands" ? "brand" : "category"} name…`}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && name && createMut.mutate()}
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
        <button
          onClick={() => createMut.mutate()}
          disabled={!name || createMut.isPending}
          className="bg-brand-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-brand-700 disabled:opacity-50"
        >
          Add
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {(items as { id: string; name: string }[]).map((item) => (
          <span key={item.id} className="bg-gray-100 text-gray-700 text-sm px-3 py-1.5 rounded-full border border-gray-200">{item.name}</span>
        ))}
      </div>
    </Section>
  );
}

function RegionsTab() {
  const qc = useQueryClient();
  const { data: regions = [] } = useQuery({ queryKey: ["regions"], queryFn: metaApi.regions });
  const [form, setForm] = useState({ name: "", currency: "" });

  const createMut = useMutation({
    mutationFn: () => metaApi.createRegion(form.name, form.currency),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["regions"] }); toast.success("Region created"); setForm({ name: "", currency: "" }); },
    onError: () => toast.error("Failed to create region"),
  });

  return (
    <Section title="Regions">
      <div className="flex gap-2 mb-4">
        <input type="text" placeholder="Region name (e.g. SEA)" value={form.name} onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))} className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
        <input type="text" placeholder="Currency (e.g. SGD)" value={form.currency} onChange={(e) => setForm(p => ({ ...p, currency: e.target.value.toUpperCase() }))} className="w-28 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" maxLength={3} />
        <button onClick={() => createMut.mutate()} disabled={!form.name || !form.currency || createMut.isPending} className="bg-brand-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-brand-700 disabled:opacity-50">Add</button>
      </div>
      <div className="space-y-2">
        {(regions as { id: string; name: string; currency: string }[]).map((r) => (
          <div key={r.id} className="flex items-center gap-3 py-2 border-b border-gray-100">
            <span className="font-medium text-sm text-gray-800">{r.name}</span>
            <span className="text-xs font-mono bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{r.currency}</span>
          </div>
        ))}
      </div>
    </Section>
  );
}

function SnapshotsTab() {
  const qc = useQueryClient();
  const { data: regions = [] } = useQuery({ queryKey: ["regions"], queryFn: metaApi.regions });
  const [regionId, setRegionId] = useState("");
  const [snapName, setSnapName] = useState("");

  const { data: snapshots = [] } = useQuery({
    queryKey: ["snapshots", regionId],
    queryFn: () => metaApi.snapshots(regionId),
    enabled: !!regionId,
  });

  const createMut = useMutation({
    mutationFn: () => metaApi.createSnapshot(regionId, snapName),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["snapshots", regionId] }); toast.success("Snapshot created"); setSnapName(""); },
    onError: () => toast.error("Failed to create snapshot"),
  });

  return (
    <div className="space-y-6">
      <Section title="Create Manual Snapshot">
        <div className="flex gap-2 mb-2">
          <select value={regionId} onChange={(e) => setRegionId(e.target.value)} className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
            <option value="">Select region…</option>
            {(regions as { id: string; name: string }[]).map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
          <input type="text" placeholder="Snapshot name…" value={snapName} onChange={(e) => setSnapName(e.target.value)} className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
          <button onClick={() => createMut.mutate()} disabled={!regionId || !snapName || createMut.isPending} className="bg-brand-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-brand-700 disabled:opacity-50">{createMut.isPending ? "…" : "Create"}</button>
        </div>
      </Section>
      {regionId && (
        <Section title="Snapshot History">
          <div className="space-y-2">
            {(snapshots as { id: string; name: string; type: string; createdAt: string; createdBy: { name: string } }[]).map((s) => (
              <div key={s.id} className="flex items-center gap-3 py-2 border-b border-gray-100 text-sm">
                <span className={`text-xs px-2 py-0.5 rounded font-medium ${s.type === "MANUAL" ? "bg-purple-100 text-purple-700" : s.type === "WEEKLY" ? "bg-blue-100 text-blue-700" : "bg-green-100 text-green-700"}`}>{s.type}</span>
                <span className="font-medium text-gray-800">{s.name}</span>
                <span className="text-gray-400 text-xs ml-auto">{new Date(s.createdAt).toLocaleString()} · {s.createdBy.name}</span>
              </div>
            ))}
            {snapshots.length === 0 && <p className="text-sm text-gray-400">No snapshots for this region yet.</p>}
          </div>
        </Section>
      )}
    </div>
  );
}
