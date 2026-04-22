import { Region } from "../types";

interface Props {
  regions: Region[];
  activeRegionId: string;
  onSelect: (regionId: string) => void;
}

export function RegionTabs({ regions, activeRegionId, onSelect }: Props) {
  return (
    <div className="border-b border-gray-200 bg-white">
      <div className="max-w-screen-2xl mx-auto px-4">
        <nav className="flex gap-1 -mb-px overflow-x-auto" aria-label="Regions">
          {regions.map((region) => {
            const active = region.id === activeRegionId;
            return (
              <button
                key={region.id}
                onClick={() => onSelect(region.id)}
                className={`
                  flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors
                  ${active
                    ? "border-brand-600 text-brand-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }
                `}
              >
                <span>{region.name}</span>
                <span className={`text-xs px-1.5 py-0.5 rounded font-mono ${active ? "bg-brand-100 text-brand-700" : "bg-gray-100 text-gray-500"}`}>
                  {region.currency}
                </span>
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
