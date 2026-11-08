import { existsSync, readFileSync } from 'fs';

jest.mock('fs', () => ({
  ...jest.requireActual<typeof import('fs')>('fs'),
  existsSync: jest.fn(),
  readFileSync: jest.fn(),
}));

const exists = jest.mocked(existsSync);
const read = jest.mocked(readFileSync);

/** Load a fresh font CSS cache for each failure scenario. */
function loadFonts() {
  let fonts: typeof import('./report-fonts') | undefined;
  jest.isolateModules(() => {
    fonts =
      jest.requireActual<typeof import('./report-fonts')>('./report-fonts');
  });
  if (!fonts) throw new Error('Font module not loaded');
  return fonts.getInterFontFaceCss;
}

describe('Report font subset failures', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    exists.mockReturnValue(true);
    read.mockImplementation(() => Buffer.from('font'));
  });

  it.each(['vietnamese', 'latin-ext', 'latin'])(
    'skips only the unreadable %s subset and caches successful subsets',
    (failedSubset) => {
      read.mockImplementation((path) => {
        if (String(path).endsWith(`inter-${failedSubset}.woff2`))
          throw new Error('unreadable font');
        return Buffer.from(String(path));
      });
      const getCss = loadFonts();
      const css = getCss();
      expect(css.match(/@font-face/g)).toHaveLength(2);
      for (const subset of ['vietnamese', 'latin-ext', 'latin']) {
        const call = read.mock.calls.find(([path]) =>
          String(path).endsWith(`inter-${subset}.woff2`),
        );
        expect(call).toBeDefined();
        const encoded = Buffer.from(String(call?.[0])).toString('base64');
        if (subset === failedSubset) expect(css).not.toContain(encoded);
        else expect(css).toContain(encoded);
      }
      expect(getCss()).toBe(css);
      expect(read).toHaveBeenCalledTimes(3);
    },
  );

  it('returns empty CSS when every subset fails to read', () => {
    read.mockImplementation(() => {
      throw new Error('unreadable font');
    });
    expect(loadFonts()()).toBe('\n\n');
    expect(read).toHaveBeenCalledTimes(3);
  });

  it('does not read missing subset files', () => {
    exists.mockReturnValue(false);
    expect(loadFonts()().trim()).toBe('');
    expect(read).not.toHaveBeenCalled();
  });
});
