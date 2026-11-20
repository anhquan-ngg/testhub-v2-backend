import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export const DIFFICULTY_LEVELS = [
  'EASY',
  'MEDIUM',
  'HARD',
  'INSUFFICIENT_DATA',
] as const;
export type DifficultyLevel = (typeof DIFFICULTY_LEVELS)[number];

export const DISCRIMINATION_LEVELS = [
  'HIGH',
  'MODERATE',
  'LOW',
  'NEGATIVE',
  'INSUFFICIENT_DATA',
] as const;
export type DiscriminationLevel = (typeof DISCRIMINATION_LEVELS)[number];

export const REVIEW_FLAGS = [
  'TOO_EASY',
  'TOO_HARD',
  'LOW_DISCRIMINATION',
  'NEGATIVE_DISCRIMINATION',
] as const;
export type ReviewFlag = (typeof REVIEW_FLAGS)[number];

export class ScoreBucketDto {
  @ApiProperty({ example: 0 })
  from: number;

  @ApiProperty({ example: 1 })
  to: number;

  @ApiProperty({ example: 4 })
  count: number;
}

export class QuestionAnalyticsDto {
  @ApiProperty()
  questionId: string;

  @ApiProperty()
  questionText: string;

  @ApiProperty()
  questionType: string;

  @ApiProperty()
  questionFormat: string;

  @ApiPropertyOptional({ nullable: true, type: String })
  chapterName: string | null;

  @ApiProperty({ description: 'Number of completed attempts containing it.' })
  attempts: number;

  @ApiProperty({ description: 'Attempts that left the question unanswered.' })
  unanswered: number;

  @ApiProperty({ description: 'Fully correct attempts.' })
  correctCount: number;

  @ApiProperty({
    nullable: true,
    type: Number,
    description: 'Difficulty index P = correct / attempts (0..1).',
  })
  difficultyIndex: number | null;

  @ApiProperty({
    nullable: true,
    type: Number,
    description: 'Average awarded score per attempt (0..1), partial credit.',
  })
  averageScore: number | null;

  @ApiProperty({ enum: DIFFICULTY_LEVELS })
  difficultyLevel: DifficultyLevel;

  @ApiProperty({
    nullable: true,
    type: Number,
    description: 'Discrimination D = P(upper 27%) - P(lower 27%).',
  })
  discriminationIndex: number | null;

  @ApiProperty({
    nullable: true,
    type: Number,
    description: 'Point-biserial correlation between item and total score.',
  })
  pointBiserial: number | null;

  @ApiProperty({ enum: DISCRIMINATION_LEVELS })
  discriminationLevel: DiscriminationLevel;

  @ApiProperty({ nullable: true, type: Number })
  upperGroupP: number | null;

  @ApiProperty({ nullable: true, type: Number })
  lowerGroupP: number | null;

  @ApiProperty({ example: 0 })
  groupSize: number;

  @ApiProperty({ enum: REVIEW_FLAGS, isArray: true })
  flags: ReviewFlag[];

  @ApiProperty()
  needsReview: boolean;
}

export class DifficultyBreakdownDto {
  @ApiProperty() easy: number;
  @ApiProperty() medium: number;
  @ApiProperty() hard: number;
  @ApiProperty() insufficientData: number;
}

export class DiscriminationBreakdownDto {
  @ApiProperty() high: number;
  @ApiProperty() moderate: number;
  @ApiProperty() low: number;
  @ApiProperty() negative: number;
  @ApiProperty() insufficientData: number;
}

export class ExamAnalyticsSummaryDto {
  @ApiProperty() submissionCount: number;
  @ApiProperty({ nullable: true, type: Number }) mean: number | null;
  @ApiProperty({ nullable: true, type: Number }) median: number | null;
  @ApiProperty({ nullable: true, type: Number }) stdDev: number | null;
  @ApiProperty({ nullable: true, type: Number }) min: number | null;
  @ApiProperty({ nullable: true, type: Number }) max: number | null;
  @ApiProperty({ type: [ScoreBucketDto] }) scoreDistribution: ScoreBucketDto[];
  @ApiProperty() questionCount: number;
  @ApiProperty({
    nullable: true,
    type: Number,
    description: 'Mean difficulty index across questions with enough data.',
  })
  averageDifficulty: number | null;
  @ApiProperty({ type: DifficultyBreakdownDto })
  difficulty: DifficultyBreakdownDto;
  @ApiProperty({ type: DiscriminationBreakdownDto })
  discrimination: DiscriminationBreakdownDto;
  @ApiProperty({ description: 'Questions flagged for review.' })
  reviewCount: number;
  @ApiProperty({ description: 'Minimum attempts for a question to be rated.' })
  minSampleSize: number;
}

export class ExamAnalyticsDto {
  @ApiProperty() examId: string;
  @ApiProperty() examTitle: string;
  @ApiProperty({ type: ExamAnalyticsSummaryDto })
  summary: ExamAnalyticsSummaryDto;
  @ApiProperty({ type: [QuestionAnalyticsDto] })
  questions: QuestionAnalyticsDto[];
}
