import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

const INTER_SUBSETS = [
  {
    file: 'inter-vietnamese.woff2',
    range:
      'U+102-103, U+110-111, U+128-129, U+168-169, U+1A0-1A1, U+1AF-1B0, U+300-301, U+303-304, U+308-309, U+323, U+329, U+1EA0-1EF9, U+20AB',
  },
  {
    file: 'inter-latin-ext.woff2',
    range:
      'U+100-2BA, U+2BD-2C5, U+2C7-2CC, U+2CE-2D7, U+2DD-2FF, U+304, U+308, U+329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C0, U+2113, U+2C60-2C7F, U+A720-A7FF',
  },
  {
    file: 'inter-latin.woff2',
    range:
      'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD',
  },
];

let cachedCss: string | null = null;

/**
 * Builds self-contained `@font-face` rules for the Inter variable font used by
 * the web app, embedded as data URIs so Chromium needs no network or system font.
 * Skips missing or unreadable subsets while retaining every readable font.
 */
export function getInterFontFaceCss(): string {
  if (cachedCss !== null) return cachedCss;

  cachedCss = INTER_SUBSETS.map(({ file, range }) => {
    const path = join(__dirname, 'fonts', file);
    if (!existsSync(path)) return '';
    try {
      const data = readFileSync(path).toString('base64');
      return `@font-face { font-family: 'Inter'; font-style: normal; font-weight: 100 900; font-display: block; src: url(data:font/woff2;base64,${data}) format('woff2'); unicode-range: ${range}; }`;
    } catch {
      return '';
    }
  }).join('\n');

  return cachedCss;
}
