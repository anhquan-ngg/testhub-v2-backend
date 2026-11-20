import {
  classifyDifficulty,
  classifyDiscrimination,
  computeExamAnalytics,
  deriveFlags,
  median,
  standardDeviation,
} from './exam-analytics.calc';

const meta = (id: string) => ({
  questionId: id,
  questionText: id,
  questionType: 'SINGLE_CHOICE',
  questionFormat: 'KNOWLEDGE',
  chapterName: 'Ch1',
});

describe('exam-analytics.calc', () => {
  it('computes median and standard deviation', () => {
    expect(median([1, 3, 2])).toBe(2);
    expect(median([1, 2, 3, 4])).toBe(2.5);
    expect(median([])).toBeNull();
    expect(standardDeviation([2, 4, 4, 4, 5, 5, 7, 9])).toBeCloseTo(2);
  });

  it('classifies difficulty and discrimination', () => {
    expect(classifyDifficulty(0.9, 30)).toBe('EASY');
    expect(classifyDifficulty(0.5, 30)).toBe('MEDIUM');
    expect(classifyDifficulty(0.1, 30)).toBe('HARD');
    expect(classifyDifficulty(0.5, 3)).toBe('INSUFFICIENT_DATA');
    expect(classifyDiscrimination(0.5)).toBe('HIGH');
    expect(classifyDiscrimination(0.3)).toBe('MODERATE');
    expect(classifyDiscrimination(0.05)).toBe('LOW');
    expect(classifyDiscrimination(-0.2)).toBe('NEGATIVE');
    expect(classifyDiscrimination(null)).toBe('INSUFFICIENT_DATA');
  });

  it('derives review flags', () => {
    expect(deriveFlags('EASY', 'LOW')).toEqual([
      'LOW_DISCRIMINATION',
      'TOO_EASY',
    ]);
    expect(deriveFlags('HARD', 'NEGATIVE')).toEqual([
      'NEGATIVE_DISCRIMINATION',
      'TOO_HARD',
    ]);
    expect(deriveFlags('MEDIUM', 'HIGH')).toEqual([]);
  });

  it('computes P, D and flags for a 40-student exam', () => {
    // Student i has total score i/4 (0..9.75); ranking is by index.
    const attempts = Array.from({ length: 40 }, (_, i) => ({
      submissionId: `s${String(i).padStart(2, '0')}`,
      totalScore: i / 4,
    }));
    const responses = attempts.flatMap((a, i) => {
      const strong = i >= 20;
      const rows = [
        // qGood: strong students correct, weak wrong -> P=0.5, high D
        { q: 'qGood', ok: strong },
        // qEasy: everyone correct -> P=1, D=0
        { q: 'qEasy', ok: true },
        // qHard: nobody correct -> P=0, D=0
        { q: 'qHard', ok: false },
        // qBad: weak correct, strong wrong -> negative D
        { q: 'qBad', ok: !strong },
      ];
      return rows.map((r) => ({
        submissionId: a.submissionId,
        questionId: r.q,
        score: r.ok ? 1 : 0,
        isCorrect: r.ok,
        answered: true,
      }));
    });

    const { summary, questions } = computeExamAnalytics({
      attempts,
      responses,
      questions: ['qGood', 'qEasy', 'qHard', 'qBad'].map(meta),
    });
    const byId = Object.fromEntries(questions.map((q) => [q.questionId, q]));

    expect(summary.submissionCount).toBe(40);
    expect(summary.mean).toBeCloseTo(4.88, 2);
    expect(summary.scoreDistribution.reduce((s, b) => s + b.count, 0)).toBe(40);

    expect(byId.qGood.difficultyIndex).toBe(0.5);
    expect(byId.qGood.discriminationIndex).toBe(1);
    expect(byId.qGood.needsReview).toBe(false);

    expect(byId.qEasy.difficultyLevel).toBe('EASY');
    expect(byId.qEasy.discriminationIndex).toBe(0);
    expect(byId.qEasy.flags).toEqual(['LOW_DISCRIMINATION', 'TOO_EASY']);

    expect(byId.qHard.difficultyLevel).toBe('HARD');
    expect(byId.qHard.flags).toContain('TOO_HARD');

    expect(byId.qBad.discriminationIndex).toBe(-1);
    expect(byId.qBad.flags).toContain('NEGATIVE_DISCRIMINATION');

    expect(summary.reviewCount).toBe(3);
    expect(summary.difficulty).toMatchObject({ easy: 1, medium: 2, hard: 1 });
    expect(summary.discrimination.high).toBe(1);
    expect(summary.discrimination.negative).toBe(1);
  });

  it('marks small samples as insufficient data', () => {
    const attempts = [
      { submissionId: 'a', totalScore: 8 },
      { submissionId: 'b', totalScore: 2 },
    ];
    const { questions, summary } = computeExamAnalytics({
      attempts,
      responses: attempts.map((a) => ({
        submissionId: a.submissionId,
        questionId: 'q1',
        score: 1,
        isCorrect: true,
        answered: true,
      })),
      questions: [meta('q1')],
    });
    expect(questions[0].difficultyLevel).toBe('INSUFFICIENT_DATA');
    expect(questions[0].discriminationIndex).toBeNull();
    expect(summary.reviewCount).toBe(0);
  });

  it('handles an exam without submissions', () => {
    const { summary, questions } = computeExamAnalytics({
      attempts: [],
      responses: [],
      questions: [meta('q1')],
    });
    expect(summary.mean).toBeNull();
    expect(questions[0].attempts).toBe(0);
    expect(questions[0].difficultyIndex).toBeNull();
  });
});
