import { COUNTRIES, PROVINCES, UK_NATIONS, type Region } from '../lib/regions';

/** Country, plus province or territory for Canada and nation for the UK. Shared by Settings and onboarding. */
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
      {region.country === 'uk' && (
        <label className="st-field">
          <span className="st-field-label">Nation</span>
          <select className="st-select" value={region.nation ?? 'eng'} onChange={(e) => onChange({ ...region, nation: e.target.value })}>
            {UK_NATIONS.map((n) => <option key={n.key} value={n.key}>{n.label}</option>)}
          </select>
        </label>
      )}
    </>
  );
}
