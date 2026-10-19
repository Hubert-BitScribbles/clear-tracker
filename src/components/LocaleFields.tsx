import { useEffect, useState } from 'react';
import { language, LANGUAGES, pickLanguage, rich, t } from '../i18n';
import { getSetting, setSetting } from '../data/database';
import { chooseLanguage, LANGUAGE_KEY } from '../lib/language';
import { regionLabel, type Region } from '../lib/regions';
import { RegionFields } from './RegionFields';

const deviceLanguages = () => (navigator.languages?.length ? navigator.languages : [navigator.language]);

/**
 * "Language: English · Region: Canada · British Columbia — Not right? Change":
 * what the app guessed from the device's language and time zone, with a way to
 * change both, like the device line above it in onboarding. Changing the
 * language reloads the app in it (the region is saved first, so it survives).
 */
export function LocaleFields({ region, onChange }: { region: Region; onChange: (r: Region) => void }) {
  const [open, setOpen] = useState(false);
  const [chosen, setChosen] = useState('auto');
  useEffect(() => {
    getSetting(LANGUAGE_KEY, 'auto').then(setChosen);
  }, []);
  const name = LANGUAGES.find((l) => l.code === language())?.name ?? '';
  const auto = LANGUAGES.find((l) => l.code === pickLanguage('auto', deviceLanguages()))!;
  return (
    <div className="dv">
      <p className="dv-line" aria-live="polite">
        {rich('locale.line', { language: name, region: regionLabel(region), b1: (c) => <strong lang={language()}>{c}</strong>, b2: (c) => <strong>{c}</strong> })}{' '}
        <button type="button" className="dv-change" aria-expanded={open} aria-label={open ? undefined : t('locale.changeLabel')} onClick={() => setOpen((v) => !v)}>
          {open ? t('device.done') : t('device.change')}
        </button>
      </p>
      {open && (
        <div className="dv-fields">
          <label className="st-field">
            <span className="st-field-label">{t('settings.languageLabel')}</span>
            <select
              className="st-select"
              value={chosen}
              onChange={async (e) => {
                const code = e.target.value; // read now: the controlled select snaps back while we wait
                await setSetting('region', JSON.stringify(region)); // keep the region chosen here
                await chooseLanguage(code);
              }}
            >
              <option value="auto">{t('settings.languageAuto', { language: auto.name })}</option>
              {LANGUAGES.map((l) => <option key={l.code} value={l.code} lang={l.code}>{l.name}</option>)}
            </select>
          </label>
          <RegionFields region={region} onChange={onChange} />
          <p className="dv-note">{t('locale.regionWhy')}</p>
        </div>
      )}
    </div>
  );
}
