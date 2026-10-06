import { COUNTRIES, PROVINCES, type Region } from '../lib/regions';

/** Country, and province or territory for Canada. Shared by Settings and onboarding. */
export function RegionFields({ region, onChange }: { region: Region; onChange: (r: Region) => void }) {
  return (
    <>
      <label className="st-field">
        <span className="st-field-label">Country</span>
        <select className="st-select" value={region.country} onChange={(e) => onChange({ ...region, country: e.target.value })}>
          {COUNTRIES.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
        </select>
      </label>
      {region.country === 'ca' && (
        <label className="st-field">
          <span className="st-field-label">Province or territory</span>
          <select className="st-select" value={region.province} onChange={(e) => onChange({ ...region, province: e.target.value })}>
            {PROVINCES.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
          </select>
        </label>
      )}
    </>
  );
}
