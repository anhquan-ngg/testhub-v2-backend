import type {
  DifficultyLevel,
  DiscriminationLevel,
  ExamAnalyticsSummaryDto,
  QuestionAnalyticsDto,
  ReviewFlag,
  ScoreBucketDto,
} from './dto/exam-analytics.dto';

/** Minimum completed attempts for a question to be rated. */
export const MIN_SAMPLE_SIZE = 10;
/** Share of attempts used for the upper and lower comparison groups. */
export const GROUP_RATIO = 0.27;
/** P at or above this value is Easy; at or below HARD_MAX it is Hard. */
export const EASY_MIN = 0.8;
export const HARD_MAX = 0.3;
/** D thresholds: >= HIGH is high, >= LOW is moderate, below is low. */
export const DISCRIMINATION_HIGH = 0.4;
export const DISCRIMINATION_LOW = 0.2;
/** Exam scores are on a 0-10 scale. */
export const MAX_EXAM_SCORE = 10;

export type AttemptInput = {
  submissionId: string;
  totalScore: number;
};

export type ItemResponseInput = {
  submissionId: string;
  questionId: string;
  /** Awarded score, 0..1. */
  score: number;
  isCorrect: boolean;
  answered: boolean;
};

export type QuestionMetaInput = {
  questionId: string;
  questionText: string;
  questionType: string;
  questionFormat: string;
  chapterName: string | null;
};

export type ExamAnalyticsResult = {
  summary: ExamAnalyticsSummaryDto;
  questions: QuestionAnalyticsDto[];
};

const round = (value: number, digits = 4): number => {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
};

const mean = (values: number[]): number | null =>
  values.length
    ? values.reduce((sum, value) => sum + value, 0) / values.length
    : null;

/** Median of a numeric list, or null when empty. */
export function median(values: number[]): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/** Population standard deviation, or null when empty. */
export function standardDeviation(values: number[]): number | null {
  const avg = mean(values);
  if (avg === null) return null;
  const variance =
    values.reduce((sum, value) => sum + (value - avg) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

/** Pearson correlation; null when either series has no variance. */
export function pearson(xs: number[], ys: number[]): number | null {
  if (xs.length < 2 || xs.length !== ys.length) return null;
  const mx = mean(xs) as number;
  const my = mean(ys) as number;
  let cov = 0;
  let vx = 0;
  let vy = 0;
  for (let i = 0; i < xs.length; i++) {
    cov += (xs[i] - mx) * (ys[i] - my);
    vx += (xs[i] - mx) ** 2;
    vy += (ys[i] - my) ** 2;
  }
  if (vx === 0 || vy === 0) return null;
  return cov / Math.sqrt(vx * vy);
}

/** Classifies the difficulty index P. */
export function classifyDifficulty(
  p: number | null,
  attempts: number,
): DifficultyLevel {
  if (p === null || attempts < MIN_SAMPLE_SIZE) return 'INSUFFICIENT_DATA';
  if (p >= EASY_MIN) return 'EASY';
  if (p <= HARD_MAX) return 'HARD';
  return 'MEDIUM';
}

/** Classifies the discrimination index D. */
export function classifyDiscrimination(d: number | null): DiscriminationLevel {
  if (d === null) return 'INSUFFICIENT_DATA';
  if (d < 0) return 'NEGATIVE';
  if (d < DISCRIMINATION_LOW) return 'LOW';
  if (d < DISCRIMINATION_HIGH) return 'MODERATE';
  return 'HIGH';
}

/** Derives the review flags from the difficulty and discrimination results. */
export function deriveFlags(
  difficulty: DifficultyLevel,
  discrimination: DiscriminationLevel,
): ReviewFlag[] {
  const flags: ReviewFlag[] = [];
  if (discrimination === 'NEGATIVE') flags.push('NEGATIVE_DISCRIMINATION');
  if (discrimination === 'LOW') flags.push('LOW_DISCRIMINATION');
  const weak = discrimination === 'NEGATIVE' || discrimination === 'LOW';
  if (weak && difficulty === 'EASY') flags.push('TOO_EASY');
  if (weak && difficulty === 'HARD') flags.push('TOO_HARD');
  return flags;
}

/** Builds 10 equal score buckets over the 0-10 scale (last one inclusive). */
export function buildScoreDistribution(scores: number[]): ScoreBucketDto[] {
  const buckets: ScoreBucketDto[] = Array.from({ length: 10 }, (_, index) => ({
    from: index,
    to: index + 1,
    count: 0,
  }));
  for (const score of scores) {
    const clamped = Math.min(Math.max(score, 0), MAX_EXAM_SCORE);
    const index = Math.min(Math.floor(clamped), buckets.length - 1);
    buckets[index].count++;
  }
  return buckets;
}

/**
 * Computes exam-level statistics and per-question difficulty (P) and
 * discrimination (D, upper/lower 27% of total score) from completed attempts.
 */
export function computeExamAnalytics(input: {
  attempts: AttemptInput[];
  responses: ItemResponseInput[];
  questions: QuestionMetaInput[];
}): ExamAnalyticsResult {
  const { attempts, responses, questions } = input;
  const scores = attempts.map((attempt) => attempt.totalScore);
  const totalBySubmission = new Map(
    attempts.map((attempt) => [attempt.submissionId, attempt.totalScore]),
  );

  const groupSize = Math.max(1, Math.ceil(attempts.length * GROUP_RATIO));
  const ranked = [...attempts].sort(
    (a, b) =>
      b.totalScore - a.totalScore ||
      a.submissionId.localeCompare(b.submissionId),
  );
  const upperIds = new Set(
    ranked.slice(0, groupSize).map((attempt) => attempt.submissionId),
  );
  const lowerIds = new Set(
    ranked.slice(-groupSize).map((attempt) => attempt.submissionId),
  );

  const byQuestion = new Map<string, ItemResponseInput[]>();
  for (const response of responses) {
    if (!totalBySubmission.has(response.submissionId)) continue;
    const list = byQuestion.get(response.questionId) ?? [];
    list.push(response);
    byQuestion.set(response.questionId, list);
  }

  const questionResults: QuestionAnalyticsDto[] = questions.map((meta) => {
    const items = byQuestion.get(meta.questionId) ?? [];
    const count = items.length;
    const correctCount = items.filter((item) => item.isCorrect).length;
    const p = count ? correctCount / count : null;
    const averageScore = count
      ? (mean(items.map((i) => i.score)) as number)
      : null;
    const difficultyLevel = classifyDifficulty(p, count);

    const upper = items.filter((item) => upperIds.has(item.submissionId));
    const lower = items.filter((item) => lowerIds.has(item.submissionId));
    const enough =
      count >= MIN_SAMPLE_SIZE &&
      upper.length > 0 &&
      lower.length > 0 &&
      attempts.length >= 2 * groupSize;
    const upperP = upper.length
      ? upper.filter((i) => i.isCorrect).length / upper.length
      : null;
    const lowerP = lower.length
      ? lower.filter((i) => i.isCorrect).length / lower.length
      : null;
    const d =
      enough && upperP !== null && lowerP !== null ? upperP - lowerP : null;
    const pointBiserial = enough
      ? pearson(
          items.map((i) => (i.isCorrect ? 1 : 0)),
          items.map((i) => totalBySubmission.get(i.submissionId) as number),
        )
      : null;

    const discriminationLevel = classifyDiscrimination(d);
    const flags =
      difficultyLevel === 'INSUFFICIENT_DATA'
        ? []
        : deriveFlags(difficultyLevel, discriminationLevel);

    return {
      ...meta,
      attempts: count,
      unanswered: items.filter((item) => !item.answered).length,
      correctCount,
      difficultyIndex: p === null ? null : round(p),
      averageScore: averageScore === null ? null : round(averageScore),
      difficultyLevel,
      discriminationIndex: d === null ? null : round(d),
      pointBiserial: pointBiserial === null ? null : round(pointBiserial),
      discriminationLevel,
      upperGroupP: upperP === null ? null : round(upperP),
      lowerGroupP: lowerP === null ? null : round(lowerP),
      groupSize: enough ? Math.min(upper.length, lower.length) : 0,
      flags,
      needsReview: flags.length > 0,
    };
  });

  const countBy = <T extends string>(values: T[], key: T) =>
    values.filter((value) => value === key).length;
  const difficultyLevels = questionResults.map((q) => q.difficultyLevel);
  const discriminationLevels = questionResults.map(
    (q) => q.discriminationLevel,
  );
  const ratedP = questionResults
    .filter((q) => q.difficultyLevel !== 'INSUFFICIENT_DATA')
    .map((q) => q.difficultyIndex as number);
  const averageDifficulty = mean(ratedP);
  const examMean = mean(scores);
  const examStd = standardDeviation(scores);
  const examMedian = median(scores);

  return {
    summary: {
      submissionCount: attempts.length,
      mean: examMean === null ? null : round(examMean, 2),
      median: examMedian === null ? null : round(examMedian, 2),
      stdDev: examStd === null ? null : round(examStd, 2),
      min: scores.length ? Math.min(...scores) : null,
      max: scores.length ? Math.max(...scores) : null,
      scoreDistribution: buildScoreDistribution(scores),
      questionCount: questions.length,
      averageDifficulty:
        averageDifficulty === null ? null : round(averageDifficulty),
      difficulty: {
        easy: countBy(difficultyLevels, 'EASY'),
        medium: countBy(difficultyLevels, 'MEDIUM'),
        hard: countBy(difficultyLevels, 'HARD'),
        insufficientData: countBy(difficultyLevels, 'INSUFFICIENT_DATA'),
      },
      discrimination: {
        high: countBy(discriminationLevels, 'HIGH'),
        moderate: countBy(discriminationLevels, 'MODERATE'),
        low: countBy(discriminationLevels, 'LOW'),
        negative: countBy(discriminationLevels, 'NEGATIVE'),
        insufficientData: countBy(discriminationLevels, 'INSUFFICIENT_DATA'),
      },
      reviewCount: questionResults.filter((q) => q.needsReview).length,
      minSampleSize: MIN_SAMPLE_SIZE,
    },
    questions: questionResults,
  };
}
