/** Separator lecturers type between a parent and a child chapter. */
export const CHAPTER_PATH_SEPARATOR = '>';

export type ChapterNode = {
  id: string;
  name: string;
  parent_id: string | null;
  order: number;
};

export type ChapterResolution =
  /** Every segment matched an existing chapter. */
  | { kind: 'existing'; chapterId: string }
  /** `names` are missing and must be created, in order, under `parentId`. */
  | { kind: 'create'; parentId: string | null; names: string[] }
  /** `segment` matched several chapters; `candidates` are their full paths. */
  | { kind: 'ambiguous'; segment: string; candidates: string[] };

const cleanSegment = (value: string) =>
  value.normalize('NFC').replace(/\s+/g, ' ').trim();

/**
 * Comparison key for chapter names: Unicode-normalized (Word may emit
 * decomposed Vietnamese), whitespace-collapsed, case-insensitive. Diacritics
 * are kept on purpose — "Hàm" and "Hãm" are different chapters.
 */
export function normalizeChapterName(value: string): string {
  return cleanSegment(value).toLocaleLowerCase('vi');
}

/** "Chương 1 >  Hàm số " → ["Chương 1", "Hàm số"]; empty segments dropped. */
export function parseChapterPath(raw: string): string[] {
  return raw.split(CHAPTER_PATH_SEPARATOR).map(cleanSegment).filter(Boolean);
}

/** Stable key identifying a path, used for de-duplication fingerprints. */
export function chapterPathKey(segments: readonly string[]): string {
  return segments.map(normalizeChapterName).join(` ${CHAPTER_PATH_SEPARATOR} `);
}

/**
 * In-memory view of one topic's chapter tree. Resolves the chapter a
 * lecturer typed in an import file: the first segment is matched anywhere
 * in the tree (so a sub-chapter can be referenced by its name alone), each
 * following segment must be a direct child of the previous one.
 */
export class ChapterTree {
  private readonly byId = new Map<string, ChapterNode>();

  constructor(nodes: readonly ChapterNode[]) {
    nodes.forEach((node) => this.add(node));
  }

  /** Registers a chapter, e.g. one just created during commit. */
  add(node: ChapterNode): void {
    this.byId.set(node.id, node);
  }

  has(id: string): boolean {
    return this.byId.has(id);
  }

  /** Full display path of a chapter, e.g. "Chương 1 > Hàm số". */
  pathOf(id: string): string {
    const names: string[] = [];
    const seen = new Set<string>();
    let current = this.byId.get(id);
    while (current && !seen.has(current.id)) {
      seen.add(current.id);
      names.unshift(current.name);
      current = current.parent_id
        ? this.byId.get(current.parent_id)
        : undefined;
    }
    return names.join(` ${CHAPTER_PATH_SEPARATOR} `);
  }

  /** Order value for a new chapter appended after its siblings. */
  nextOrder(parentId: string | null): number {
    const siblings = this.nodes().filter((node) => node.parent_id === parentId);
    return siblings.length
      ? Math.max(...siblings.map((node) => node.order)) + 1
      : 0;
  }

  resolve(segments: readonly string[]): ChapterResolution {
    if (!segments.length) {
      throw new Error('Chapter path must contain at least one segment');
    }
    const [first, ...rest] = segments;
    const roots = this.matching(this.nodes(), first);
    if (roots.length > 1) return this.ambiguous(first, roots);
    if (!roots.length) {
      return { kind: 'create', parentId: null, names: [...segments] };
    }

    let current = roots[0];
    for (let i = 0; i < rest.length; i++) {
      const children = this.matching(
        this.nodes().filter((node) => node.parent_id === current.id),
        rest[i],
      );
      if (children.length > 1) return this.ambiguous(rest[i], children);
      if (!children.length) {
        return { kind: 'create', parentId: current.id, names: rest.slice(i) };
      }
      current = children[0];
    }
    return { kind: 'existing', chapterId: current.id };
  }

  private nodes(): ChapterNode[] {
    return [...this.byId.values()];
  }

  private matching(nodes: ChapterNode[], name: string): ChapterNode[] {
    const key = normalizeChapterName(name);
    return nodes.filter((node) => normalizeChapterName(node.name) === key);
  }

  private ambiguous(
    segment: string,
    matches: ChapterNode[],
  ): ChapterResolution {
    return {
      kind: 'ambiguous',
      segment,
      candidates: matches.map((node) => this.pathOf(node.id)),
    };
  }
}
