// Hilfe auf Deutsch („Sie“). Same articles, ids, order and device-specific
// parts as en.tsx; the wording follows src/i18n/glossary-de.md.

import { Link } from 'react-router-dom';
import { installGuide } from '../components/InstallSteps';
import { BROWSER_NAMES, canPromptInstall, installKeepsOwnRecord, isIos, OS_NAMES } from '../lib/install';
import { privacyUrl } from '../lib/privacy';
import { Contact, SoundTest } from './parts';
import type { Article, HelpContext } from './types';

export function articles({ d, P }: HelpContext): Article[] {
  return [
  {
    id: 'start', title: 'Tage eintragen', keywords: 'tippen kalender alkoholfrei wenig mäßig viel stufe nicht eingetragen vergangen ändern bearbeiten standardglas glas größe',
    body: (
      <>
        <p>Tippen Sie auf einen Tag, um ihn auszuwählen, und noch einmal, um ihn einzutragen. Jedes Tippen geht zur nächsten Stufe:</p>
        <ul>
          <li><strong>Alkoholfrei</strong> – keine Gläser</li>
          <li><strong>Wenig</strong> – 1–2 Gläser</li>
          <li><strong>Mäßig</strong> – 3–4 Gläser</li>
          <li><strong>Viel</strong> – 5 oder mehr</li>
          <li>dann zurück zu <strong>nicht eingetragen</strong>.</li>
        </ul>
        <p>Was als ein Glas zählt, ist von Land zu Land verschieden, und die App zählt keine Größen. Wenn es Ihnen hilft, jedes Mal gleich einzutragen, finden Sie unter <Link to="/settings/resources#drink">Hilfsangebote</Link> den Leitfaden Ihres Landes, sofern es einen gibt.</p>
        <p>Vergangene Tage können Sie jederzeit eintragen oder ändern; mit den Pfeilen wechseln Sie den Monat. Zukünftige Tage lassen sich nicht eintragen. Ein Tag, den Sie nicht eintragen, bleibt einfach offen: Die App nimmt weder an, dass er alkoholfrei war, noch das Gegenteil.</p>
      </>
    ),
  },
  {
    id: 'intention', title: 'Ihr Vorhaben', keywords: 'vorsatz ziel woche wöchentlich erreicht übertroffen ändern montag vorher nachtragen vergangen',
    body: (
      <>
        <p>Ihr Vorhaben ist die Zahl der alkoholfreien Tage pro Woche, die Sie sich vornehmen, von 1 bis 7. Weniger trinken und ganz aufhören sind beides gute Wege.</p>
        <p>Wenn Sie jeden Tag viel trinken, kann plötzliches Aufhören gefährlich sein. Sprechen Sie zuerst mit einer Ärztin oder einem Arzt oder mit einer der Stellen unter <Link to="/settings/resources">Hilfsangebote</Link>.</p>
        <p>Wochen gehen von Montag bis Sonntag. Eine Woche ist <strong>erreicht</strong>, wenn ihre alkoholfreien Tage Ihr Vorhaben erreichen, und <strong>übertroffen</strong>, wenn es mehr sind.</p>
        <p>Ändern Sie Ihr Vorhaben, gilt es schon für diese Woche, solange darin noch nichts eingetragen ist, sonst ab dem nächsten Montag. Vergangene Wochen behalten immer das Vorhaben, das damals galt.</p>
        <p>Wochen vor Ihrem ersten Vorhaben – Tage, die Sie für die Zeit davor nachgetragen haben – zählen als eingetragene Tage, werden aber nicht als erreicht oder verpasst gewertet.</p>
      </>
    ),
  },
  {
    id: 'trends', title: 'Trends und Berichte', keywords: 'diagramm monat jahr rückblick bericht pdf teilen drucken vergleich nicht eingetragen erster monat fehlende tage',
    body: (
      <>
        <p><strong>Trends</strong> zeigt ein Jahr oder die gesamte Zeit, alkoholfreie Tage zuerst: das Jahr auf einen Blick (alkoholfreie Tage, erreichte Wochen, eingetragene Tage und die Summe jeder Stufe), alkoholfreie Tage Monat für Monat, Wochen nach Vorhaben, die Wochentage – dann, zur Einordnung, Schätzungen der Gläser pro Woche und der Ersparnis. Tippen Sie auf einen Monat, einen Tag oder eine Woche, um darunter die Details zu sehen.</p>
        <p><strong>Berichte</strong> sind ein Rückblick auf einen Monat oder ein Jahr, zum Aufheben oder Teilen – etwa mit einer Beraterin, einem Berater oder Ihrer Ärztin, wenn Sie möchten. Wählen Sie den Inhalt aus, dann „Teilen oder als PDF sichern“{P === 'ios' ? ' und in der Druckvorschau auf Teilen tippen' : P === 'android' ? ' und „Als PDF speichern“ als Drucker wählen' : ''}.</p>
        <p>Vergleiche mit einem früheren Zeitraum erscheinen nur, wenn dieser Zeitraum von Anfang an erfasst wurde. So lässt ein nur teilweise erfasster Monat einen anderen nie besser oder schlechter aussehen.</p>
        <p><strong>Warum zeigt mein erster Monat keine offenen Tage?</strong> Gezählt wird ab dem ersten Tag, den Sie eingetragen haben. Die Tage davor lagen vor Ihrem Start und gelten nicht als verpasst, daher erscheinen sie nicht als nicht eingetragen. Tragen Sie später frühere Tage nach, rückt der Start mit.</p>
      </>
    ),
  },
  {
    id: 'estimates', title: 'Wie die Schätzungen funktionieren', keywords: 'gläser ersparnis geld ausgangswert preis bereich berechnet schätzung erste 3 monate',
    body: (
      <>
        <p>Jede Stufe steht für einen Bereich – Wenig für 1–2 Gläser, Mäßig für 3–4, Viel für 5 oder mehr. Für die Gläser pro Woche zählt jeder eingetragene Tag mit der Mitte seines Bereichs: Wenig als 1,5, Mäßig als 3,5. Viel hat keine Obergrenze und zählt daher als 5, der Mindestwert – ein Zeitraum mit einem Tag „Viel“ kann also höher liegen als geschätzt.</p>
        <p>Überall wird derselbe Wert verwendet – auf einen Blick, Monat für Monat, in Vergleichen und Berichten –, ein Monat liest sich also immer gleich. Es zählen nur eingetragene Tage.</p>
        <p>Die <strong>Ersparnis</strong> vergleicht Ihr Trinken mit einem Ausgangswert – Gläser pro Woche vor dem Festhalten – zu Ihrem Preis pro Glas. Den Ausgangswert geben Sie selbst ein oder lassen ihn aus Ihren ersten 3 Monaten messen (ein gewählter Herausforderungs-Monat zählt dabei nicht). Zeiträume über dem Ausgangswert werden ehrlich gezeigt.</p>
      </>
    ),
  },
  {
    id: 'milestones', title: 'Meilensteine und Herausforderungen', keywords: 'abzeichen erreicht als nächstes herausforderung wochenende woche monat ganz oder gar nicht',
    body: (
      <>
        <p>Meilensteine halten fest, was Sie geschafft haben – sie sind keine Punktzahl. Ein erreichter Meilenstein bleibt erreicht, auch wenn Sie Ihr Vorhaben ändern. <strong>Als Nächstes</strong> zeigt die drei, denen Sie am nächsten sind; <strong>Erreicht</strong> listet sie nach Monat.</p>
        <p><strong>Herausforderungen</strong> sind freiwillig und gelten ganz oder gar nicht. Ein alkoholfreies Wochenende oder eine alkoholfreie Woche beginnt wie ein Vorhaben: der laufende Zeitraum, wenn darin noch nichts eingetragen ist, sonst der nächste, und zählt erst ab dann. Ein gewählter alkoholfreier Monat braucht jeden Tag als alkoholfrei eingetragen; vergessene Tage lassen sich nachtragen, aber ein Tag mit Alkohol beendet ihn – still, ohne Meldung.</p>
      </>
    ),
  },
  {
    id: 'backups', title: 'Backups', keywords: 'backup sichern sicherung wiederherstellen export import passphrase passwort kennwort datei verschlüsselt verloren',
    body: (
      <>
        <p>Ihre Einträge gibt es nur in diesem Browser; ein Backup ist daher die einzige Kopie an einem anderen Ort. <strong>Sichern</strong> erstellt eine verschlüsselte Datei mit Ihren Tagen, Vorhaben und Einstellungen, und Sie wählen, wo Sie sie aufbewahren – {P === 'ios' ? 'Dateien, iCloud Drive oder ein anderes Gerät' : P === 'android' ? 'Google Drive, Dateien oder per E-Mail an sich selbst' : 'Ihr Browser fragt, wo sie gespeichert werden soll, oder legt sie unter Downloads ab'}.</p>
        <p>Ihre Passphrase braucht mindestens 8 Zeichen und lässt sich nicht wiederherstellen: Ohne sie kann das Backup nicht geöffnet werden. Bewahren Sie sie sicher auf.</p>
        <p><strong>Wiederherstellen</strong> ersetzt alles auf diesem Gerät durch den Inhalt des Backups, nachdem es Ihnen gezeigt hat, was darin ist. Der Check-in erinnert Sie 30 Tage nach Ihrem letzten Backup an ein neues.</p>
      </>
    ),
  },
  {
    id: 'install', title: 'Installieren und offline nutzen', keywords: 'home-bildschirm startbildschirm dock hinzufügen installieren offline safari chrome edge firefox android iphone mac speicher sieben tage update',
    body: (
      <>
        {(() => {
          const g = installGuide(d, canPromptInstall());
          return (
            <>
              <p><strong>Auf {d.os === 'other' ? 'diesem Gerät' : `Ihrem ${OS_NAMES[d.os]}`}, in {d.browser === 'other' ? 'diesem Browser' : BROWSER_NAMES[d.browser]}:</strong> {g.why}</p>
              {g.steps.length > 0 ? (
                <ul>{g.steps.map((st, k) => <li key={k}>{st}</li>)}</ul>
              ) : (
                <p>Nutzen Sie die Schaltfläche <strong>Installieren</strong>, die Ihr Browser anbietet (beim ersten Start oder als Symbol in der Adressleiste).</p>
              )}
              {g.note && <p>{g.note}</p>}
            </>
          );
        })()}
        {installKeepsOwnRecord(d) && (
          <p>Weil die installierte App eigene Einträge hat, wandern im Browser eingetragene Tage nicht von selbst hinüber: Sichern Sie im einen und stellen Sie im anderen wieder her.{isIos(d) ? ' App nicht gefunden? Wischen Sie auf dem Home-Bildschirm von der Mitte nach unten und suchen Sie nach „Clear Tracker“.' : ' Nicht gefunden? Suchen Sie mit Spotlight nach „Clear Tracker“.'}</p>
        )}
        <p><strong>Andere Geräte:</strong> iPhone und iPad – Teilen, dann Zum Home-Bildschirm (in jedem Browser; die App auf dem Home-Bildschirm hat eigene Einträge). Android – im ⋮-Menü von Chrome „App installieren“. Mac mit Safari – Ablage → Zum Dock hinzufügen (eigene Einträge). Chrome oder Edge auf einem Computer – Installieren, über die Adressleiste oder das Menü (dieselben Einträge wie im Browser). Jedes Gerät hat eigene Einträge.</p>
        <p>Updates kommen automatisch; die neue Version sehen Sie eventuell beim nächsten Öffnen der App.</p>
      </>
    ),
  },
  {
    id: 'privacy', title: 'Datenschutz', keywords: 'daten privat konto cloud tracking werbung teilen dsgvo',
    body: (
      <>
        <p>Alles, was Sie eintragen, bleibt auf diesem Gerät. Es gibt kein Konto und keine Cloud, und nichts wird an bitScribbles oder sonst jemanden gesendet. Es gibt keine Werbung.</p>
        <p>Backups sind verschlüsselt, und Sie entscheiden, wohin sie gehen. Wenn Sie uns per E-Mail Rückmeldung geben, erhält bitScribbles nur, was Sie schreiben – und bei einem Problembericht die technischen Angaben, die Sie vor dem Senden sehen und die nie Ihre Einträge enthalten.</p>
        <p>Die vollständige <a href={privacyUrl()} target="_blank" rel="noopener">Datenschutzerklärung</a> sagt dasselbe, etwas ausführlicher.</p>
      </>
    ),
  },
  {
    id: 'sounds', title: 'Klänge', keywords: 'ton töne klang stummschalter lautstärke medien musik funktioniert nicht',
    body: (
      <>
        <p>Jede Stufe hat einen eigenen Ton, wenn Sie einen Tag eintragen; in den Einstellungen können Sie sie ausschalten.{P === 'ios' ? ' Auf dem iPhone richten sie sich nach dem Stummschalter und spielen neben Musik, ohne sie anzuhalten.' : P === 'android' ? ' Auf Android spielen sie in Ihrer Medienlautstärke.' : ''}</p>
        <p>Wenn die Töne verstummen, bringt meist das nächste Tippen sie zurück; sonst schließen Sie die App und öffnen sie neu. Zum Prüfen:</p>
        <SoundTest />
      </>
    ),
  },
  {
    id: 'accessibility', title: 'Barrierefreiheit', keywords: 'voiceover screenreader tastatur kontrast bewegung zoom',
    body: (
      <>
        <ul>
          <li><strong>VoiceOver und Tastatur:</strong> Jedes Bedienelement ist beschriftet; jeder Kalendertag nennt Datum und Stufe; die Diagramme funktionieren wie Schieberegler (nach oben oder unten wischen oder die Pfeiltasten nutzen), mit Details darunter.</li>
          <li><strong>Hoher Kontrast</strong> (Einstellungen): kräftigere Schrift und Rahmen und größere Kalendermarkierungen.</li>
          <li><strong>Hell und dunkel</strong> folgen Ihrem Gerät, oder Sie wählen in den Einstellungen. Reduzierte Bewegung wird berücksichtigt.</li>
          <li>Für größere Schrift nutzen Sie den Zoom Ihres Browsers.</li>
        </ul>
      </>
    ),
  },
  {
    id: 'troubleshooting', title: 'Wenn etwas nicht stimmt', keywords: 'problem fehlt weg verloren daten falsches datum zeitzone fehler',
    body: (
      <>
        <p><strong>Meine Tage fehlen.</strong> {installKeepsOwnRecord(d) ? `${isIos(d) ? 'Die App auf dem Home-Bildschirm' : 'Die Dock-App'} und der Browser haben getrennte Einträge – prüfen Sie, ob Sie in derselben wie zuvor sind. ` : 'Prüfen Sie, ob Sie denselben Browser auf demselben Gerät wie zuvor verwenden. '}Wenn Sie die Websitedaten Ihres Browsers löschen{P === 'android' ? ' (oder den Speicher von Chrome in den Android-Einstellungen)' : ''}, sind die Einträge weg; stellen Sie sie aus einem Backup wieder her.</p>
        <p><strong>Das Datum stimmt nicht.</strong> Clear Tracker verwendet Datum und Zeitzone Ihres Geräts.</p>
        <p><strong>Etwas anderes.</strong> Bitte melden Sie es unten.</p>
      </>
    ),
  },
  { id: 'contact', title: 'Kontakt und Rückmeldung', keywords: 'email e-mail rückmeldung feedback problem melden fehler support vorschlag', body: <Contact /> },
];
}
