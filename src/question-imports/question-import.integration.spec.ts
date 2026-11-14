import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { QuestionImportSourceType } from '@prisma/client';
import {
  QUESTION_IMPORT_MAX_FILE_SIZE,
  QUESTION_IMPORT_MIME_TYPES,
} from './question-import.constants';
import type { ImportQuestionData } from './question-import.types';
import {
  startImportApplication,
  startImportDatabase,
} from './testing/import-api.harness';

type ReviewRow = {
  id: string;
  source_code: string;
  status: string;
  data: ImportQuestionData;
  errors: string[];
  assets: Array<{ id: string; view_url: string }>;
};
type CreatedImport = {
  import: { id: string; status: string };
  upload_url: string;
};

const expected = [
  {
    code: 'Q001',
    text: 'Đồ thị trong hình biểu diễn hàm số nào?',
    type: 'SINGLE_CHOICE',
    format: 'KNOWLEDGE',
    options: [
      { text: 'y = 2x + 1', isCorrect: true },
      { text: 'y = x - 1', isCorrect: false },
      { text: 'y = -2x + 1', isCorrect: false },
      { text: 'y = 2x - 1', isCorrect: false },
    ],
    answer: null,
    chapter: 'Hàm số',
    parent: 'Chương 1',
  },
  {
    code: 'Q002',
    text: 'Những số nào dưới đây là số nguyên tố?',
    type: 'MULTIPLE_CHOICE',
    format: 'UNDERSTANDING',
    options: [
      { text: '2', isCorrect: true },
      { text: '4', isCorrect: false },
      { text: '5', isCorrect: true },
      { text: '9', isCorrect: false },
    ],
    answer: null,
    chapter: 'Số học',
    parent: null,
  },
  {
    code: 'Q003',
    text: 'Giải phương trình $2x + 4 = 10$.',
    type: 'ESSAY',
    format: 'APPLYING',
    options: null,
    answer: 'x = 3',
    chapter: 'Phương trình',
    parent: 'Chương 2',
  },
];

(process.env.TESTHUB_IMPORT_INTEGRATION === '1' ? describe : describe.skip)(
  'Question import API (real disposable PostgreSQL)',
  () => {
    let db: Awaited<ReturnType<typeof startImportDatabase>>;
    let api: Awaited<ReturnType<typeof startImportApplication>>;
    beforeAll(async () => {
      db = await startImportDatabase();
    }, 120_000);
    beforeEach(async () => {
      api = await startImportApplication(db.prisma);
    });
    afterEach(async () => {
      await api?.close();
    });
    afterAll(async () => {
      await db?.close();
    }, 30_000);

    it('allows loopback browser ports but not lookalike or external CORS origins', async () => {
      for (const origin of [
        'http://127.0.0.1:53845',
        'http://localhost:53845',
        'http://localhost:3000',
      ]) {
        const response = await request(api.baseUrl)
          .options('/question-imports/cors/items/cors')
          .set('Origin', origin)
          .set('Access-Control-Request-Method', 'PATCH')
          .set('Access-Control-Request-Headers', 'content-type')
          .expect(204);
        expect(response.headers['access-control-allow-origin']).toBe(origin);
        expect(response.headers['access-control-allow-credentials']).toBe(
          'true',
        );
        expect(response.headers['access-control-allow-methods']).toContain(
          'PATCH',
        );
        expect(response.headers['access-control-allow-headers']).toBe(
          'content-type',
        );
      }
      for (const origin of [
        'http://localhost.example.invalid:53845',
        'http://127.0.0.1.example.invalid:53845',
        'http://example.invalid:53845',
      ]) {
        const response = await request(api.baseUrl)
          .get('/topics')
          .set('Origin', origin)
          .expect(200);
        expect(response.headers['access-control-allow-origin']).toBeUndefined();
      }
    });

    const http = () => request(api.baseUrl);
    const fixture = (
      type: QuestionImportSourceType,
      name = 'question-import-template',
    ) =>
      readFile(
        join(__dirname, 'parsers', 'fixtures', `${name}.${type.toLowerCase()}`),
      );
    const counts = async () => ({
      questions: await db.prisma.question.count({
        where: { chapter: { topic_id: api.topic.id } },
      }),
      chapters: await db.prisma.chapter.count({
        where: { topic_id: api.topic.id },
      }),
      files: await db.prisma.file.count({ where: { uploaded_by: api.owner } }),
    });
    async function create(
      type: QuestionImportSourceType = 'XLSX',
      overrides: Record<string, unknown> = {},
      name?: string,
    ) {
      const bytes = await fixture(type, name);
      const response = await http()
        .post('/question-imports')
        .send({
          topic_id: api.topic.id,
          default_chapter_id: api.chapter.id,
          source_type: type,
          file_name: `fixture.${type.toLowerCase()}`,
          mime_type: QUESTION_IMPORT_MIME_TYPES[type],
          size: bytes.length,
          ...overrides,
        })
        .expect(201);
      const created = response.body as CreatedImport;
      expect(created.import.status).toBe('UPLOADING');
      expect(created.import).not.toHaveProperty('source_s3_key');
      return { ...created, bytes };
    }
    async function upload(
      created: Awaited<ReturnType<typeof create>>,
      bytes = created.bytes,
    ) {
      await request(created.upload_url)
        .put('')
        .set('Content-Type', 'application/octet-stream')
        .send(bytes)
        .expect(200);
      await http()
        .post(`/question-imports/${created.import.id}/complete`)
        .expect(201)
        .expect(({ body }: { body: { status: string } }) =>
          expect(body.status).toBe('QUEUED'),
        );
      expect(api.pending).toContain(created.import.id);
    }
    async function review(
      type: QuestionImportSourceType = 'XLSX',
      overrides: Record<string, unknown> = {},
      name?: string,
    ) {
      const created = await create(type, overrides, name);
      await upload(created);
      await api.service.processImport(created.import.id);
      const response = await http()
        .get(`/question-imports/${created.import.id}/items?limit=100`)
        .expect(200);
      const rows = (response.body as { data: ReviewRow[] }).data;
      return { ...created, rows };
    }
    const commit = (id: string, body: Record<string, unknown> = {}) =>
      http().post(`/question-imports/${id}/commit`).send(body);
    const edit = (
      id: string,
      row: ReviewRow,
      overrides: Record<string, unknown>,
    ) =>
      http()
        .patch(`/question-imports/${id}/items/${row.id}`)
        .send({
          chapter_name: row.data.chapterPath?.join(' > '),
          question_text: row.data.questionText,
          question_type: row.data.questionType,
          question_format: row.data.questionFormat,
          options: row.data.options,
          correct_answer: row.data.correctAnswer ?? undefined,
          ...overrides,
        });

    it.each(['DOCX', 'XLSX'] as const)(
      '%s create/upload/process/review/commit persists exact questions, answers, chapters and images',
      async (type) => {
        const result = await review(type);
        expect(await counts()).toEqual({ questions: 0, chapters: 1, files: 0 });
        expect(result.rows).toHaveLength(3);
        expect(result.rows.map((row) => row.status)).toEqual([
          'VALID',
          'VALID',
          'VALID',
        ]);
        for (const [index, row] of result.rows.entries()) {
          expect(row.source_code).toBe(expected[index].code);
          expect(row.data.questionText).toBe(expected[index].text);
          expect(
            row.data.options.map(({ text, isCorrect }) => ({
              text,
              isCorrect,
            })),
          ).toEqual(expected[index].options ?? []);
        }
        const response = await commit(result.import.id).expect(201);
        expect(response.body).toMatchObject({
          status: 'COMPLETED',
          committed_items: 3,
          skipped_items: 0,
        });
        const items = await db.prisma.questionImportItem.findMany({
          where: { import_id: result.import.id },
          orderBy: { source_index: 'asc' },
          include: {
            question: {
              include: {
                chapter: { include: { parent: true } },
                files: { include: { file: true } },
              },
            },
          },
        });
        for (const [index, item] of items.entries()) {
          const want = expected[index];
          const saved = item.question;
          expect(saved).not.toBeNull();
          if (!saved) throw new Error('Missing persisted question');
          expect(saved).toMatchObject({
            question_text: want.text,
            question_type: want.type,
            question_format: want.format,
            correct_answer: want.answer,
          });
          expect(
            saved.options === null
              ? null
              : (JSON.parse(saved.options) as unknown),
          ).toEqual(want.options);
          expect(saved.chapter.name).toBe(want.chapter);
          expect(saved.chapter.parent?.name ?? null).toBe(want.parent);
          expect(item.status).toBe('COMMITTED');
          const persistedApi = await http()
            .get(`/questions/${saved.id}`)
            .expect(200);
          expect(persistedApi.body).toMatchObject({
            id: saved.id,
            question_text: want.text,
            correct_answer: want.answer,
          });
          expect(saved.files.length).toBe(index === 0 ? 1 : 0);
          for (const { file } of saved.files) {
            expect(file).toMatchObject({
              status: 'ACTIVE',
              type: 'IMAGE',
              uploaded_by: api.owner,
            });
            expect(file.s3_key).toMatch(/^questions\//);
            const bytes = api.storage.objects.get(file.s3_key ?? '');
            expect(bytes?.subarray(0, 8)).toEqual(
              Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
            );
          }
        }
        expect(
          [...api.storage.objects.keys()].every(
            (key) => !key.startsWith('question-imports/'),
          ),
        ).toBe(true);
        await commit(result.import.id).expect(409);
        expect((await counts()).questions).toBe(3);
      },
    );

    const validCases = (['DOCX', 'XLSX'] as const).flatMap((type) =>
      [
        'mixed',
        'single',
        'blank-row',
        'long-rich',
        'duplicate-questions',
        'multiple-images',
      ].map((name) => ({ type, name })),
    );
    it.each(validCases)(
      '$type $name fixture saves independently authored expected content and ordered image bytes',
      async ({ type, name }) => {
        const specification = JSON.parse(
          await readFile(
            join(__dirname, 'parsers', 'fixtures', 'import-expected.json'),
            'utf8',
          ),
        ) as {
          questions: Array<
            ImportQuestionData & {
              sourceCode: string;
              chapterName: string;
              imageCount: number;
            }
          >;
        };
        let wanted = specification.questions.map((question) => ({
          ...question,
        }));
        if (name === 'single') wanted = wanted.slice(0, 1);
        if (name === 'duplicate-questions') wanted.push({ ...wanted[2] });
        if (name === 'multiple-images') wanted[0].imageCount = 2;
        if (name === 'long-rich')
          wanted[0].questionText +=
            '\n' +
            'Nội dung dài — giữ nguyên dấu tiếng Việt. '.repeat(250).trimEnd();
        const result = await review(type, {}, name);
        expect(result.rows).toHaveLength(wanted.length);
        const stagedImages = new Map<string, Buffer[]>();
        for (const [index, row] of result.rows.entries()) {
          const want = wanted[index];
          expect(row).toMatchObject({
            status: 'VALID',
            errors: [],
            data: {
              questionText: want.questionText,
              questionType: want.questionType,
              questionFormat: want.questionFormat,
              options: want.options,
              correctAnswer: want.correctAnswer ?? null,
            },
          });
          expect(row.assets).toHaveLength(want.imageCount);
          const assets = await db.prisma.questionImportAsset.findMany({
            where: { item_id: row.id },
            orderBy: { order: 'asc' },
          });
          stagedImages.set(
            row.id,
            assets.map((asset) =>
              Buffer.from(api.storage.objects.get(asset.temp_s3_key) ?? []),
            ),
          );
        }
        await commit(result.import.id, { duplicate_policy: 'CREATE' }).expect(
          201,
        );
        for (const [index, row] of result.rows.entries()) {
          const want = wanted[index];
          const saved = await db.prisma.questionImportItem.findUniqueOrThrow({
            where: { id: row.id },
            include: {
              question: {
                include: {
                  chapter: { include: { parent: true } },
                  files: { orderBy: { order: 'asc' }, include: { file: true } },
                },
              },
            },
          });
          expect(saved.question).not.toBeNull();
          if (!saved.question)
            throw new Error('Missing persisted matrix question');
          const question = saved.question;
          expect(question).toMatchObject({
            question_text: want.questionText,
            question_type: want.questionType,
            question_format: want.questionFormat,
            correct_answer: want.correctAnswer ?? null,
          });
          expect(
            question.options === null
              ? []
              : (JSON.parse(question.options) as unknown),
          ).toEqual(
            want.options.map(({ text, isCorrect }) => ({ text, isCorrect })),
          );
          expect(
            `${question.chapter.parent?.name} > ${question.chapter.name}`,
          ).toBe(want.chapterName);
          expect(question.files).toHaveLength(want.imageCount);
          for (const [imageIndex, relation] of question.files.entries()) {
            expect(relation.order).toBe(imageIndex);
            expect(api.storage.objects.get(relation.file.s3_key ?? '')).toEqual(
              stagedImages.get(row.id)?.[imageIndex],
            );
          }
        }
        expect((await counts()).questions).toBe(wanted.length);
      },
    );

    const invalidCases = (['DOCX', 'XLSX'] as const).flatMap((type) =>
      [
        'unknown-answer',
        'missing-answer-option',
        'no-answer',
        'invalid-type',
        'incomplete-row',
      ].map((name) => ({ type, name })),
    );
    it.each(invalidCases)(
      '$type $name keeps bad rows invalid, blocks explicit selection and permits valid rows',
      async ({ type, name }) => {
        const result = await review(type, {}, name);
        expect(result.rows.map((row) => row.status)).toEqual(
          name === 'incomplete-row'
            ? ['VALID', 'VALID', 'VALID', 'INVALID']
            : ['INVALID', 'VALID', 'VALID'],
        );
        const invalid = result.rows[name === 'incomplete-row' ? 3 : 0];
        expect(invalid.errors.length).toBeGreaterThan(0);
        if (name === 'unknown-answer' || name === 'missing-answer-option') {
          expect(invalid.errors.join(' ')).toContain('correct_keys');
        }
        await commit(result.import.id, {
          item_ids: result.rows.map((row) => row.id),
        }).expect(400);
        expect((await counts()).questions).toBe(0);
        await commit(result.import.id, {
          item_ids: result.rows
            .filter((row) => row.status === 'VALID')
            .map((row) => row.id),
        }).expect(201);
        expect((await counts()).questions).toBe(
          name === 'incomplete-row' ? 3 : 2,
        );
        expect(
          (
            await db.prisma.questionImportItem.findUniqueOrThrow({
              where: { id: invalid.id },
            })
          ).question_id,
        ).toBeNull();
      },
    );

    it('explicit review correction clears parser errors and preserves the corrected answer in PostgreSQL', async () => {
      const result = await review('XLSX', {}, 'unknown-answer');
      expect(result.rows[0].status).toBe('INVALID');
      await edit(result.import.id, result.rows[0], {
        options: [
          { key: 'A', text: 'Wrong', isCorrect: false },
          { key: 'C', text: 'Verified', isCorrect: true },
        ],
      })
        .expect(200)
        .expect(({ body }: { body: ReviewRow }) =>
          expect(body).toMatchObject({ status: 'VALID', errors: [] }),
        );
      await commit(result.import.id, { item_ids: [result.rows[0].id] }).expect(
        201,
      );
      const saved = await db.prisma.question.findFirstOrThrow({
        where: { chapter: { topic_id: api.topic.id } },
      });
      expect(JSON.parse(saved.options ?? '[]') as unknown).toEqual([
        { text: 'Wrong', isCorrect: false },
        { text: 'Verified', isCorrect: true },
      ]);
    });

    const failedCases = (['DOCX', 'XLSX'] as const).flatMap((type) =>
      ['duplicate-field', 'missing-header', 'corrupt', 'empty'].map((name) => ({
        type,
        name,
      })),
    );
    it.each(failedCases)(
      '$type $name fails processing durably with no bank writes',
      async ({ type, name }) => {
        const result = await create(type, {}, name);
        await upload(result);
        await expect(
          api.service.processImport(result.import.id),
        ).rejects.toThrow();
        expect(
          (
            await db.prisma.questionImport.findUniqueOrThrow({
              where: { id: result.import.id },
            })
          ).status,
        ).toBe('FAILED');
        expect(await counts()).toEqual({ questions: 0, chapters: 1, files: 0 });
        await commit(result.import.id).expect(409);
      },
    );

    it('rejects an explicit empty selection rather than importing every valid row', async () => {
      const result = await review();
      await commit(result.import.id, { item_ids: [] }).expect(400);
      expect(await counts()).toEqual({ questions: 0, chapters: 1, files: 0 });
      expect(
        (
          await db.prisma.questionImport.findUniqueOrThrow({
            where: { id: result.import.id },
          })
        ).status,
      ).toBe('REVIEW_REQUIRED');
    });

    it('rejects invalid/missing selections, accepts a corrected row, and persists only selected rows', async () => {
      const result = await review();
      const row = result.rows[2];
      await edit(result.import.id, row, { correct_answer: '' })
        .expect(200)
        .expect(({ body }: { body: ReviewRow }) =>
          expect(body.status).toBe('INVALID'),
        );
      await commit(result.import.id, {
        item_ids: [result.rows[0].id, row.id],
      }).expect(400);
      await commit(result.import.id, { item_ids: [randomUUID()] }).expect(400);
      expect((await counts()).questions).toBe(0);
      await edit(result.import.id, row, {
        correct_answer: 'x = 3 (verified)',
        chapter_name: 'Reviewed > Algebra',
      }).expect(200);
      const response = await commit(result.import.id, {
        item_ids: [row.id],
      }).expect(201);
      expect(response.body).toMatchObject({
        committed_items: 1,
        valid_items: 3,
        invalid_items: 0,
      });
      const saved = await db.prisma.question.findFirstOrThrow({
        where: { chapter: { topic_id: api.topic.id } },
        include: { chapter: true },
      });
      expect(saved).toMatchObject({
        correct_answer: 'x = 3 (verified)',
        question_type: 'ESSAY',
        options: null,
      });
      expect(saved.chapter.name).toBe('Algebra');
      expect(await counts()).toEqual({ questions: 1, chapters: 3, files: 0 });
      expect(api.storage.objects.size).toBe(0);
    });

    it('commits valid selected rows while leaving invalid rows unsaved', async () => {
      const result = await review();
      await edit(result.import.id, result.rows[2], {
        correct_answer: '',
      }).expect(200);
      await commit(result.import.id, { item_ids: [result.rows[1].id] }).expect(
        201,
      );
      const rows = await db.prisma.questionImportItem.findMany({
        where: { import_id: result.import.id },
        orderBy: { source_index: 'asc' },
      });
      expect(rows.map((row) => row.status)).toEqual([
        'VALID',
        'COMMITTED',
        'INVALID',
      ]);
      expect(rows.filter((row) => row.question_id !== null)).toHaveLength(1);
      expect((await counts()).questions).toBe(1);
    });

    it('cancel removes staging objects without creating questions, files or new chapters', async () => {
      const result = await review('DOCX');
      expect(api.storage.objects.size).toBeGreaterThan(1);
      await http().delete(`/question-imports/${result.import.id}`).expect(200);
      await commit(result.import.id).expect(409);
      expect(api.storage.objects.size).toBe(0);
      expect(await counts()).toEqual({ questions: 0, chapters: 1, files: 0 });
    });

    it('SKIP detects already persisted duplicates using exact content/options/answers', async () => {
      const first = await review();
      await commit(first.import.id).expect(201);
      const second = await review('DOCX');
      await commit(second.import.id, { duplicate_policy: 'SKIP' })
        .expect(201)
        .expect(({ body }: { body: unknown }) =>
          expect(body).toMatchObject({ committed_items: 0, skipped_items: 3 }),
        );
      expect(await counts()).toEqual({ questions: 3, chapters: 6, files: 1 });
      expect(
        await db.prisma.questionImportItem.count({
          where: {
            import_id: second.import.id,
            status: 'SKIPPED',
            question_id: null,
          },
        }),
      ).toBe(3);
    });

    it('SKIP detects repeated rows within the same new chapter path', async () => {
      const result = await review();
      const first = result.rows[0];
      await edit(result.import.id, result.rows[1], {
        chapter_name: first.data.chapterPath?.join(' > '),
        question_text: first.data.questionText,
        question_type: first.data.questionType,
        question_format: first.data.questionFormat,
        options: first.data.options,
      }).expect(200);
      await commit(result.import.id, { duplicate_policy: 'SKIP' })
        .expect(201)
        .expect(({ body }: { body: unknown }) =>
          expect(body).toMatchObject({ committed_items: 2, skipped_items: 1 }),
        );
      expect((await counts()).questions).toBe(2);
    });

    it.each([false, true])(
      'rolls back a real database failure and can retry (cleanup outage=%s)',
      async (cleanupOutage) => {
        const result = await review();
        // Fail the LAST transaction write, after questions, chapters and images were inserted.
        await db.pool.query(
          `ALTER TABLE question_imports ADD CONSTRAINT import_test_fail_finalize CHECK (id <> '${result.import.id}'::uuid OR status <> 'COMPLETED')`,
        );
        api.storage.failPermanentRemoval = cleanupOutage;
        try {
          await commit(result.import.id).expect(500);
          expect(await counts()).toEqual({
            questions: 0,
            chapters: 1,
            files: 0,
          });
          const savedImport = await db.prisma.questionImport.findUniqueOrThrow({
            where: { id: result.import.id },
          });
          expect(savedImport.status).toBe('REVIEW_REQUIRED');
          expect(
            await db.prisma.questionImportItem.count({
              where: {
                import_id: result.import.id,
                question_id: { not: null },
              },
            }),
          ).toBe(0);
          expect(
            await db.prisma.questionImportAsset.count({
              where: {
                item: { import_id: result.import.id },
                file_id: { not: null },
              },
            }),
          ).toBe(0);
        } finally {
          api.storage.failPermanentRemoval = false;
          await db.pool.query(
            'ALTER TABLE question_imports DROP CONSTRAINT import_test_fail_finalize',
          );
        }
        await commit(result.import.id).expect(201);
        expect(await counts()).toEqual({ questions: 3, chapters: 6, files: 1 });
      },
    );

    it('fences concurrent commits and cancellation while a commit owns the claim', async () => {
      const result = await review();
      let release: () => void = () => undefined;
      let arrived: () => void = () => undefined;
      const blocked = new Promise<void>((resolve) => {
        release = resolve;
      });
      const copying = new Promise<void>((resolve) => {
        arrived = resolve;
      });
      api.storage.beforeCopy = async () => {
        arrived();
        await blocked;
      };
      const first = commit(result.import.id).then((response) => response);
      try {
        await copying;
        await commit(result.import.id).expect(409);
        await http()
          .delete(`/question-imports/${result.import.id}`)
          .expect(409);
      } finally {
        release();
      }
      expect((await first).status).toBe(201);
      expect((await counts()).questions).toBe(3);
      expect(api.storage.copies).toHaveLength(1);
    });

    it('attaches to an existing MANUAL exam via the real exam service/repository in the commit transaction', async () => {
      const exam = await db.prisma.exam.create({
        data: {
          lecturer_id: api.owner,
          topic_id: api.topic.id,
          title: 'Synthetic MANUAL exam',
          mode: 'MANUAL',
          duration: 60,
          exam_start_time: new Date('2030-01-01T00:00:00Z'),
          exam_end_time: new Date('2030-01-01T02:00:00Z'),
        },
      });
      const result = await review('DOCX', { exam_id: exam.id });
      await commit(result.import.id, {
        item_ids: [result.rows[0].id, result.rows[2].id],
      }).expect(201);
      const links = await db.prisma.examQuestions.findMany({
        where: { exam_id: exam.id },
        include: { question: true },
      });
      expect(links.map((link) => link.question.question_text).sort()).toEqual(
        [expected[0].text, expected[2].text].sort(),
      );
      const response = await http().get(`/exams/${exam.id}`).expect(200);
      expect(
        (response.body as { questions: unknown[] }).questions,
      ).toHaveLength(2);
    });

    it('rejects non-MANUAL exam attachment before staging any import', async () => {
      const exam = await db.prisma.exam.create({
        data: {
          lecturer_id: api.owner,
          topic_id: api.topic.id,
          title: 'Synthetic random exam',
          mode: 'RANDOM_N',
          sample_size: 1,
          duration: 60,
          exam_start_time: new Date('2030-01-01T00:00:00Z'),
          exam_end_time: new Date('2030-01-01T02:00:00Z'),
        },
      });
      const bytes = await fixture('XLSX');
      await http()
        .post('/question-imports')
        .send({
          topic_id: api.topic.id,
          exam_id: exam.id,
          source_type: 'XLSX',
          file_name: 'fixture.xlsx',
          mime_type: QUESTION_IMPORT_MIME_TYPES.XLSX,
          size: bytes.length,
        })
        .expect(400);
      expect(
        await db.prisma.questionImport.count({
          where: { created_by: api.owner },
        }),
      ).toBe(0);
    });

    it('validates metadata, role, owner, missing uploads, and malformed IDs at HTTP boundaries', async () => {
      const bytes = await fixture('XLSX');
      const body = {
        topic_id: api.topic.id,
        source_type: 'XLSX',
        file_name: 'fixture.xlsx',
        mime_type: QUESTION_IMPORT_MIME_TYPES.XLSX,
        size: bytes.length,
      };
      for (const override of [
        { size: 0 },
        { size: QUESTION_IMPORT_MAX_FILE_SIZE + 1 },
        { mime_type: 'text/plain' },
        { file_name: 'fixture.docx' },
        { source_type: 'PDF' },
      ]) {
        await http()
          .post('/question-imports')
          .send({ ...body, ...override })
          .expect(400);
      }
      await http()
        .post('/question-imports')
        .set('x-test-role', 'STUDENT')
        .send(body)
        .expect(403);
      await http()
        .post('/question-imports')
        .set('x-test-actor', api.foreign)
        .send(body)
        .expect(403);
      const created = await create();
      await http()
        .post(`/question-imports/${created.import.id}/complete`)
        .expect(400);
      await http()
        .get(`/question-imports/${created.import.id}`)
        .set('x-test-actor', api.foreign)
        .expect(404);
      await http().get('/question-imports/not-a-uuid').expect(400);
      expect(await counts()).toEqual({ questions: 0, chapters: 1, files: 0 });
    });

    it.each(['signature', 'size', 'type'] as const)(
      'marks a malformed %s upload FAILED and never creates bank data',
      async (mode) => {
        const created = await create();
        const bytes =
          mode === 'signature'
            ? Buffer.alloc(created.bytes.length, 65)
            : mode === 'size'
              ? created.bytes.subarray(0, -1)
              : await fixture('DOCX');
        if (mode === 'type')
          await db.prisma.questionImport.update({
            where: { id: created.import.id },
            data: { source_size: bytes.length },
          });
        await upload(created, bytes);
        await expect(
          api.service.processImport(created.import.id),
        ).rejects.toThrow();
        const result = await http()
          .get(`/question-imports/${created.import.id}`)
          .expect(200);
        expect(result.body).toMatchObject({ status: 'FAILED', total_items: 0 });
        expect(await counts()).toEqual({ questions: 0, chapters: 1, files: 0 });
        await commit(created.import.id).expect(409);
      },
    );
  },
);
