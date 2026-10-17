import type { ReactNode } from 'react';
import type { Device, Platform } from '../lib/install';

export interface Article {
  id: string;
  title: string;
  keywords: string; // extra words for the search box
  body: ReactNode;
}
/** What an article may depend on: the reader's device and browser. */
export interface HelpContext {
  d: Device;
  P: Platform;
}
