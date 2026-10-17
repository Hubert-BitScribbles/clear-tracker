import { language } from '../i18n';

/** The privacy statement in the reader's language: public/privacy.html, or privacy-<lang>.html. */
export const privacyUrl = () => (language() === 'en' ? './privacy.html' : `./privacy-${language()}.html`);
