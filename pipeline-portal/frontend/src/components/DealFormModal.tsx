import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Deal, Probability } from "../types";
import { dealsApi } from "../api/deals";
import { metaApi } from "../api/meta";
import toast from "react-hot-toast";

const PROBABILITIES: Probability[] = ["SIGNED", "HIGH", "MEDIUM", "LOW"];

interface Props {
  regionId: string;
  deal?: Deal | null;
  onClose: () => void;
}

export function DealFormModal({ regionId, deal, onClose }: Props) {
  const queryClient = useQueryClient();
  const isEdit = !!deal;

  const [form, setForm] = useState({
    licenseeName: deal?.licenseeName ?? "",
    brandId: deal?.brandId ?? "",
    probability: (deal?.probability ?? "HIGH") as Probability,
    contractStartDate: deal?.contractStartDate ? deal.contractStartDate.slice(0, 10) : "",
    totalContractMg: deal?.totalContractMg ?? "",
    categoryIds: deal?.categories.map((c) => c.categoryId) ?? [],
    notes: deal?.notes ?? "",
  });

  const { data: brands = [] } = useQuery({ queryKey: ["brands"], queryFn: metaApi.brands });
  const { data: categories = [] } = useQuery({ queryKey: ["categories"], queryFn: metaApi.categories });

  const set = (field: string, value: unknown) => setForm((f) => ({ ...f, [field]: value }));

  const toggleCategory = (id: string) => {
    setForm((f) => ({
      ...f,
      categoryIds: f.categoryIds.includes(id) ? f.categoryIds.filter((c) => c !== id) : [...f.categoryIds, id],
    }));
  };

  const createMut = useMutation({
    mutationFn: () =>
      dealsApi.create({
        licenseeName: form.licenseeName,
        brandId: form.brandId,
        regionId,
        probability: form.probability,
        contractStartDate: form.contractStartDate,
        totalContractMg: Number(form.totalContractMg),
        categoryIds: form.categoryIds,
        notes: form.notes,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deals", regionId] });
      toast.success("Deal created");
      onClose();
    },
    onError: () => toast.error("Failed to create deal"),
  });

  const updateMut = useMutation({
    mutationFn: () =>
      dealsApi.update(deal!.id, {
        licenseeName: form.licenseeName,
        brandId: form.brandId,
        probability: form.probability,
        contractStartDate: form.contractStartDate,
        totalContractMg: Number(form.totalContractMg),
        categoryIds: form.categoryIds,
        notes: form.notes,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deals", regionId] });
      toast.success("Deal updated");
      onClose();
    },
    onError: () => toast.error("Failed to update deal"),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.licenseeName || !form.brandId || !form.contractStartDate || !form.totalContractMg) {
      toast.error("Please fill in all required fields");
      return;
    }
    isEdit ? updateMut.mutate() : createMut.mutate();
  };

  const isPending = createMut.isPending || updateMut.isPending;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">{isEdit ? "Edit Deal" : "New Deal"}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Licensee Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Nike GmbH or TBD – German Partner"
              value={form.licenseeName}
              onChange={(e) => set("licenseeName", e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Brand <span className="text-red-500">*</span>
              </label>
              <select
                value={form.brandId}
                onChange={(e) => set("brandId", e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="">Select brand…</option>
                {brands.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Probability</label>
              <select
                value={form.probability}
                onChange={(e) => set("probability", e.target.value as Probability)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                {PROBABILITIES.map((p) => (
                  <option key={p} value={p}>{p.charAt(0) + p.slice(1).toLowerCase()}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Contract Start <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={form.contractStartDate}
                onChange={(e) => set("contractStartDate", e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Total Contract MG <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                placeholder="0"
                value={form.totalContractMg}
                onChange={(e) => set("totalContractMg", e.target.value)}
                min="0"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Categories</label>
            <div className="flex flex-wrap gap-2">
              {categories.map((c) => {
                const selected = form.categoryIds.includes(c.id);
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => toggleCategory(c.id)}
                    className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                      selected
                        ? "bg-brand-600 text-white border-brand-600"
                        : "bg-white text-gray-600 border-gray-300 hover:border-brand-400"
                    }`}
                  >
                    {c.name}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              rows={2}
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              placeholder="Optional notes…"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 bg-brand-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-brand-700 disabled:opacity-50 transition-colors"
            >
              {isPending ? "Saving…" : isEdit ? "Save Changes" : "Create Deal"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
