// L’aide en français (« vous »). Same articles, ids, order and device-specific
// parts as en.tsx; the wording follows src/i18n/glossary-fr.md. Quebec's
// differences (fin de semaine, courriel) are handled with `quebec`.

import { Link } from 'react-router-dom';
import { installGuide } from '../components/InstallSteps';
import { BROWSER_NAMES, canPromptInstall, installKeepsOwnRecord, isIos, OS_NAMES } from '../lib/install';
import { privacyUrl } from '../lib/privacy';
import { locale } from '../i18n';
import { Contact, SoundTest } from './parts';
import type { Article, HelpContext } from './types';

export function articles({ d, P }: HelpContext): Article[] {
  const quebec = locale() === 'fr-CA';
  const sp = ' '; // before « : » and the like
  return [
  {
    id: 'start', title: 'Noter vos jours', keywords: 'toucher calendrier sans alcool un peu modéré beaucoup niveau non noté passé modifier verre standard unité taille',
    body: (
      <>
        <p>Touchez un jour pour le sélectionner, puis touchez-le à nouveau pour le noter. Chaque toucher passe au niveau suivant{sp}:</p>
        <ul>
          <li><strong>Sans alcool</strong> – aucun verre</li>
          <li><strong>Un peu</strong> – 1–2 verres</li>
          <li><strong>Modéré</strong> – 3–4 verres</li>
          <li><strong>Beaucoup</strong> – 5 ou plus</li>
          <li>puis retour à <strong>non noté</strong>.</li>
        </ul>
        <p>Ce qui compte comme un verre varie d’un pays à l’autre, et l’app ne compte pas les tailles. Si cela vous aide à noter de la même façon à chaque fois, les <Link to="/settings/resources#drink">Ressources d’aide</Link> renvoient au guide de votre pays quand il en existe un.</p>
        <p>Vous pouvez noter ou modifier les jours passés à tout moment{sp}; utilisez les flèches pour changer de mois. Les jours à venir ne peuvent pas être notés. Un jour que vous ne notez pas reste simplement non noté{sp}: rien ne suppose qu’il était sans alcool, ni le contraire.</p>
      </>
    ),
  },
  {
    id: 'intention', title: 'Votre intention', keywords: 'objectif but semaine hebdomadaire atteinte dépassée modifier lundi avant commencé rattraper passé',
    body: (
      <>
        <p>Votre intention est le nombre de jours sans alcool que vous visez chaque semaine, de 1 à 7. Boire moins et arrêter complètement sont deux voies valables.</p>
        <p>Si vous buvez beaucoup chaque jour, arrêter brusquement peut être dangereux. Parlez-en d’abord à un médecin, ou à l’une des lignes des <Link to="/settings/resources">Ressources d’aide</Link>.</p>
        <p>Les semaines vont du lundi au dimanche. Une semaine est <strong>atteinte</strong> quand ses jours sans alcool atteignent votre intention, et <strong>dépassée</strong> quand ils la dépassent.</p>
        <p>Si vous modifiez votre intention, elle s’applique à cette semaine si rien n’y est encore noté, sinon à partir du lundi suivant. Les semaines passées gardent toujours l’intention en vigueur à ce moment-là.</p>
        <p>Les semaines avant votre première intention – des jours notés après coup, d’avant vos débuts – comptent comme jours notés, mais ne sont pas mesurées comme atteintes ou manquées.</p>
      </>
    ),
  },
  {
    id: 'trends', title: 'Tendances et bilans', keywords: 'graphique mois année bilan rapport pdf partager imprimer comparer non noté premier mois jours manquants',
    body: (
      <>
        <p><strong>Tendances</strong> montre une année, ou toute la période, les jours sans alcool d’abord{sp}: l’année en un coup d’œil (jours sans alcool, semaines atteintes, jours notés et le total de chaque niveau), les jours sans alcool mois par mois, les semaines selon l’intention, le jour de la semaine – puis, pour le contexte, des estimations des verres par semaine et des économies. Touchez un mois, un jour ou une semaine pour voir ses détails en dessous.</p>
        <p>Les <strong>bilans</strong> font le point sur un mois ou une année, à garder ou à partager – avec un conseiller ou un médecin, si vous le souhaitez. Choisissez ce qui est inclus – pour une vue plus longue, les jours sans alcool et les verres mois par mois sur la dernière année –, puis «{sp}Partager ou enregistrer en PDF{sp}»{P === 'ios' ? ' et touchez Partager dans l’aperçu d’impression' : P === 'android' ? ', et choisissez « Enregistrer au format PDF » comme imprimante' : ''}.</p>
        <p>Les comparaisons avec une période précédente n’apparaissent que si cette période a été suivie depuis son début, pour qu’un mois suivi en partie ne fasse jamais paraître un autre meilleur ou pire.</p>
        <p><strong>Pourquoi mon premier mois n’affiche-t-il aucun jour non noté{sp}?</strong> Le suivi compte à partir du premier jour que vous avez noté. Les jours d’avant précèdent vos débuts{sp}: ce ne sont pas des jours manqués, ils n’apparaissent donc pas comme non notés. Si vous notez plus tard des jours antérieurs, le début recule avec eux.</p>
      </>
    ),
  },
  {
    id: 'estimates', title: 'Comment fonctionnent les estimations', keywords: 'verres économies argent point de départ prix fourchette calcul estimation 3 premiers mois',
    body: (
      <>
        <p>Chaque niveau correspond à une fourchette de verres – Un peu 1–2, Modéré 3–4, Beaucoup 5 ou plus. Pour estimer les verres par semaine, chaque jour noté compte au milieu de sa fourchette{sp}: Un peu comme 1,5, Modéré comme 3,5. Beaucoup n’a pas de plafond{sp}: il compte donc comme 5, son minimum – une période avec un jour «{sp}Beaucoup{sp}» peut être plus élevée que ne le montre l’estimation.</p>
        <p>Le même chiffre est utilisé partout – en un coup d’œil, mois par mois, dans les comparaisons et les bilans – pour qu’un mois se lise toujours de la même façon. Seuls les jours notés comptent.</p>
        <p>Les <strong>économies</strong> comparent votre consommation à un point de départ – les verres par semaine avant le suivi – à votre prix par verre. Saisissez vous-même ce point de départ, ou mesurez-le d’après vos 3 premiers mois de suivi (un mois de défi choisi est exclu). Les périodes au-dessus du point de départ sont montrées honnêtement.</p>
      </>
    ),
  },
  {
    id: 'milestones', title: 'Étapes et défis', keywords: 'badge obtenue prochaines défi week-end fin de semaine semaine mois tout ou rien',
    body: (
      <>
        <p>Les étapes gardent la trace de ce que vous avez accompli, ce n’est pas un score. Une étape obtenue le reste, même si vous changez d’intention. <strong>Prochaines étapes</strong> montre les trois dont vous êtes le plus proche{sp}; <strong>Obtenues</strong> les liste par mois.</p>
        <p>Les <strong>défis</strong> sont facultatifs et c’est tout ou rien. {quebec ? 'Une fin de semaine' : 'Un week-end'} ou une semaine sans alcool commence comme une intention{sp}: la période en cours si rien n’y est encore noté, sinon la suivante, et ne compte qu’à partir de là. Un mois sans alcool choisi demande que chaque jour soit noté sans alcool{sp}; les jours oubliés peuvent être notés après coup, mais un jour avec alcool y met fin – discrètement, sans message.</p>
      </>
    ),
  },
  {
    id: 'backups', title: 'Sauvegardes', keywords: 'sauvegarde sauvegarder restaurer export import phrase secrète mot de passe fichier chiffré perdu',
    body: (
      <>
        <p>Votre suivi n’existe que dans ce navigateur{sp}: une sauvegarde en est donc la seule copie ailleurs. <strong>Sauvegarder</strong> crée un fichier chiffré de vos jours, intentions et réglages, et vous choisissez où le garder – {P === 'ios' ? 'Fichiers, iCloud Drive ou un autre appareil' : P === 'android' ? `Google Drive, Fichiers, ou par ${quebec ? 'courriel' : 'e-mail'} à vous-même` : 'votre navigateur demande où l’enregistrer, ou le place dans Téléchargements'}.</p>
        <p>Votre phrase secrète doit compter au moins 8 caractères et ne peut pas être récupérée{sp}: sans elle, la sauvegarde ne peut pas être ouverte. Conservez-la en lieu sûr.</p>
        <p><strong>Restaurer</strong> remplace tout ce qui se trouve sur cet appareil par le contenu de la sauvegarde, après vous avoir montré ce qu’elle contient. Le Journal vous rappelle de sauvegarder 30 jours après votre dernière sauvegarde.</p>
      </>
    ),
  },
  {
    id: 'install', title: 'Installer et utiliser hors ligne', keywords: 'écran d’accueil dock ajouter installer hors ligne safari chrome edge firefox android iphone mac stockage sept jours mise à jour',
    body: (
      <>
        {(() => {
          const g = installGuide(d, canPromptInstall());
          return (
            <>
              <p><strong>Sur {d.os === 'other' ? 'cet appareil' : `votre ${OS_NAMES[d.os]}`}, dans {d.browser === 'other' ? 'ce navigateur' : BROWSER_NAMES[d.browser]}{sp}:</strong> {g.why}</p>
              {g.steps.length > 0 ? (
                <ul>{g.steps.map((st, k) => <li key={k}>{st}</li>)}</ul>
              ) : (
                <p>Utilisez le bouton <strong>Installer</strong> que propose votre navigateur (au premier lancement, ou l’icône d’installation dans la barre d’adresse).</p>
              )}
              {g.note && <p>{g.note}</p>}
            </>
          );
        })()}
        {installKeepsOwnRecord(d) && (
          <p>Comme l’app installée a son propre suivi, les jours notés dans le navigateur ne la suivent pas d’eux-mêmes{sp}: sauvegardez dans l’un et restaurez dans l’autre.{isIos(d) ? ' Vous ne trouvez pas l’app ? Balayez vers le bas depuis le milieu de l’écran d’accueil et cherchez « Clear Tracker ».' : ' Vous ne la trouvez pas ? Cherchez « Clear Tracker » avec Spotlight.'}</p>
        )}
        <p><strong>Autres appareils{sp}:</strong> iPhone et iPad – Partager, puis Sur l’écran d’accueil (dans n’importe quel navigateur{sp}; l’app de l’écran d’accueil a son propre suivi). Android – menu ⋮ de Chrome, Installer l’application. Mac avec Safari – Fichier → Ajouter au Dock (son propre suivi). Chrome ou Edge sur un ordinateur – Installer, depuis la barre d’adresse ou le menu (le même suivi que le navigateur). Chaque appareil a son propre suivi.</p>
        <p>Les mises à jour arrivent automatiquement{sp}; vous verrez peut-être la nouvelle version à la prochaine ouverture de l’app.</p>
      </>
    ),
  },
  {
    id: 'privacy', title: 'Confidentialité', keywords: 'données privé compte cloud pistage publicité partager rgpd',
    body: (
      <>
        <p>Tout ce que vous notez reste sur cet appareil. Il n’y a ni compte ni cloud, et rien n’est envoyé à bitScribbles ni à personne. Il n’y a pas de publicité.</p>
        <p>Les sauvegardes sont chiffrées, et vous décidez où elles vont. Si vous nous écrivez, bitScribbles ne reçoit que ce que vous écrivez – et, pour un signalement de problème, les détails techniques que vous voyez avant l’envoi, qui n’incluent jamais votre suivi.</p>
        <p>La <a href={privacyUrl()} target="_blank" rel="noopener">politique de confidentialité</a> complète dit la même chose, un peu plus en détail.</p>
      </>
    ),
  },
  {
    id: 'sounds', title: 'Sons', keywords: 'audio son tonalité silencieux volume multimédia musique ne fonctionne pas',
    body: (
      <>
        <p>Chaque niveau a son propre son quand vous notez un jour{sp}; vous pouvez les désactiver dans les Réglages.{P === 'ios' ? ' Sur iPhone, ils suivent le bouton silencieux et se jouent par-dessus la musique sans l’interrompre.' : P === 'android' ? ' Sur Android, ils suivent le volume multimédia.' : ''}</p>
        <p>Si les sons s’arrêtent, le toucher suivant les rétablit généralement{sp}; sinon, fermez et rouvrez l’app. Pour vérifier{sp}:</p>
        <SoundTest />
      </>
    ),
  },
  {
    id: 'accessibility', title: 'Accessibilité', keywords: 'voiceover lecteur d’écran clavier contraste animation zoom',
    body: (
      <>
        <ul>
          <li><strong>VoiceOver et clavier{sp}:</strong> chaque commande est étiquetée{sp}; chaque jour du calendrier annonce sa date et son niveau{sp}; les graphiques fonctionnent comme des curseurs (balayez vers le haut ou le bas, ou utilisez les touches fléchées), avec les détails en dessous.</li>
          <li><strong>Contraste élevé</strong> (Réglages){sp}: texte et bordures plus marqués, et repères du calendrier plus grands.</li>
          <li><strong>Clair et sombre</strong> suivent votre appareil, ou choisissez dans les Réglages. La réduction des animations est respectée.</li>
          <li>Pour agrandir le texte, utilisez le zoom de votre navigateur.</li>
        </ul>
      </>
    ),
  },
  {
    id: 'troubleshooting', title: 'En cas de problème', keywords: 'problème manquant disparu perdu données mauvaise date fuseau horaire bogue bug',
    body: (
      <>
        <p><strong>Mes jours ont disparu.</strong> {installKeepsOwnRecord(d) ? `${isIos(d) ? 'L’app de l’écran d’accueil' : 'L’app du Dock'} et le navigateur ont des suivis séparés – vérifiez que vous êtes dans le même qu’avant. ` : 'Vérifiez que vous utilisez le même navigateur, sur le même appareil, qu’avant. '}Effacer les données de sites de votre navigateur{P === 'android' ? ' (ou le stockage de Chrome dans les réglages d’Android)' : ''} efface le suivi{sp}; restaurez-le à partir d’une sauvegarde.</p>
        <p><strong>Les dates semblent fausses.</strong> Clear Tracker utilise la date et le fuseau horaire de votre appareil.</p>
        <p><strong>Autre chose.</strong> Merci de le signaler ci-dessous.</p>
      </>
    ),
  },
  { id: 'contact', title: 'Contact et commentaires', keywords: 'e-mail courriel commentaire signaler problème bogue aide suggestion', body: <Contact /> },
];
}
