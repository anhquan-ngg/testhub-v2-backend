import {
  ChapterTree,
  chapterPathKey,
  normalizeChapterName,
  parseChapterPath,
} from './chapter-path.resolver';

const tree = () =>
  new ChapterTree([
    { id: 'c1', name: 'Chương 1', parent_id: null, order: 0 },
    { id: 'c2', name: 'Chương 2', parent_id: null, order: 3 },
    { id: 'c1-1', name: 'Hàm số', parent_id: 'c1', order: 0 },
    { id: 'c1-2', name: 'Bài tập', parent_id: 'c1', order: 1 },
    { id: 'c2-1', name: 'Bài tập', parent_id: 'c2', order: 0 },
  ]);

describe('chapter path resolver', () => {
  it('parses paths and trims whitespace', () => {
    expect(parseChapterPath('  Chương 1 >   Hàm   số > ')).toEqual([
      'Chương 1',
      'Hàm số',
    ]);
  });

  it('compares case-insensitively and across Unicode forms, keeping diacritics', () => {
    expect(normalizeChapterName('HÀM SỐ')).toBe(normalizeChapterName('hàm số'));
    expect(normalizeChapterName('Hàm số'.normalize('NFD'))).toBe(
      normalizeChapterName('Hàm số'),
    );
    expect(normalizeChapterName('Ham so')).not.toBe(
      normalizeChapterName('Hàm số'),
    );
    expect(chapterPathKey(['Chương 1', 'HÀM SỐ'])).toBe(
      chapterPathKey(['chương 1', 'hàm số']),
    );
  });

  it('matches a sub-chapter by its name alone', () => {
    expect(tree().resolve(['hàm số'])).toEqual({
      kind: 'existing',
      chapterId: 'c1-1',
    });
  });

  it('matches a full path', () => {
    expect(tree().resolve(['Chương 2', 'Bài tập'])).toEqual({
      kind: 'existing',
      chapterId: 'c2-1',
    });
  });

  it('reports ambiguity with the full candidate paths', () => {
    expect(tree().resolve(['Bài tập'])).toEqual({
      kind: 'ambiguous',
      segment: 'Bài tập',
      candidates: ['Chương 1 > Bài tập', 'Chương 2 > Bài tập'],
    });
  });

  it('creates missing segments under the deepest existing chapter', () => {
    expect(tree().resolve(['Chương 1', 'Đạo hàm', 'Ứng dụng'])).toEqual({
      kind: 'create',
      parentId: 'c1',
      names: ['Đạo hàm', 'Ứng dụng'],
    });
  });

  it('creates an unknown chapter at the root', () => {
    expect(tree().resolve(['Tích phân'])).toEqual({
      kind: 'create',
      parentId: null,
      names: ['Tích phân'],
    });
  });

  it('sees chapters added after construction and orders new siblings last', () => {
    const t = tree();
    expect(t.nextOrder(null)).toBe(4);
    expect(t.nextOrder('c2-1')).toBe(0);
    t.add({ id: 'new', name: 'Tích phân', parent_id: null, order: 4 });
    expect(t.resolve(['tích phân'])).toEqual({
      kind: 'existing',
      chapterId: 'new',
    });
    expect(t.pathOf('c1-1')).toBe('Chương 1 > Hàm số');
  });
});
