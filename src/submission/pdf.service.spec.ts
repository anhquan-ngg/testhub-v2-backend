import { NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { S3Service } from '../s3/s3.service';
import { PdfService } from './pdf.service';
import type { SubmissionPdfView } from './submission-pdf.template';

type PdfInternals = {
  buildSubmissionView: (...args: unknown[]) => Promise<SubmissionPdfView>;
  renderPdf: (
    html: string,
    footerLabel: string,
    extraHosts: string[],
  ) => Promise<Buffer>;
};

function deferred<T>() {
  // The Promise executor synchronously initializes both callbacks before return.
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

const view: SubmissionPdfView = {
  examTitle: 'Exam',
  topicName: 'Topic',
  isPractice: false,
  totalScore: '0.00',
  timeTaken: '0',
  status: 'Submitted',
  totalQuestions: 0,
  staffView: false,
  showQuestions: true,
  student: { fullName: 'Student', email: '' },
  submissionId: 'submission',
  submittedAt: 'N/A',
  questions: [],
};

const flush = () => new Promise<void>((resolve) => setImmediate(resolve));

describe('PdfService submission PDF admission', () => {
  const pdf = Buffer.from('pdf');
  let pending: Promise<Buffer>[];
  let release: Array<() => void>;
  let findFirst: jest.Mock;
  let getBoundedObject: jest.Mock;
  let service: PdfService;
  let internals: PdfInternals;

  beforeEach(() => {
    pending = [];
    release = [];
    findFirst = jest.fn().mockResolvedValue({ id: 'submission' });
    getBoundedObject = jest.fn().mockResolvedValue(Buffer.from('image'));
    service = new PdfService(
      { submission: { findFirst } } as unknown as PrismaService,
      { getBoundedObject } as unknown as S3Service,
    );
    internals = service as unknown as PdfInternals;
    jest.spyOn(internals, 'renderPdf').mockResolvedValue(pdf);
  });

  afterEach(async () => {
    release.forEach((resolve) => resolve());
    await Promise.allSettled(pending);
    jest.restoreAllMocks();
  });

  function request(target = service) {
    const result = target.generateSubmissionPdf('submission', {
      showQuestions: true,
      staffView: false,
    });
    pending.push(result);
    void result.catch(() => undefined);
    return result;
  }

  function hold<T>(value: T) {
    const gate = deferred<T>();
    release.push(() => gate.resolve(value));
    return gate;
  }

  it('prepares S3 images while render slots are full and does not reserve a render slot while downloading', async () => {
    const renders = [hold(pdf), hold(pdf)];
    const render = jest
      .spyOn(internals, 'renderPdf')
      .mockImplementationOnce(() => renders[0].promise)
      .mockImplementationOnce(() => renders[1].promise);
    const prepare = jest
      .spyOn(internals, 'buildSubmissionView')
      .mockResolvedValue(view);
    void request();
    void request();
    await flush();
    expect(render).toHaveBeenCalledTimes(2);

    prepare.mockRestore();
    findFirst.mockResolvedValue({
      id: 'submission',
      exam: { title: 'Exam', mode: 'MANUAL', _count: { questions: 1 } },
      student: { full_name: 'Student', email: '' },
      status: 'SUBMITTED',
      total_score: null,
      start_time: new Date(0),
      end_time: null,
      questions: [
        {
          question: {
            question_text: 'Question',
            question_type: 'ESSAY',
            options: null,
            correct_answer: null,
            files: [
              {
                file: {
                  id: 'image',
                  name: 'image.png',
                  type: 'IMAGE',
                  s3_key: 'image-key',
                  url: '',
                },
              },
            ],
          },
          options: null,
          is_correct: false,
          score: null,
          answer: null,
        },
      ],
    });
    const image = hold(Buffer.from('image'));
    getBoundedObject.mockReturnValue(image.promise);
    void request();
    await flush();
    expect(getBoundedObject).toHaveBeenCalledWith('image-key', 5 * 1024 * 1024);

    jest.spyOn(internals, 'buildSubmissionView').mockResolvedValue(view);
    void request();
    await flush();
    expect(render).toHaveBeenCalledTimes(2);
    renders[0].resolve(pdf);
    await flush();
    expect(render).toHaveBeenCalledTimes(3);
    expect(getBoundedObject).toHaveBeenCalledTimes(1);
    image.resolve(Buffer.from('image'));
    await flush();
    expect(render).toHaveBeenCalledTimes(4);
    expect(render.mock.calls[3][0]).toContain('data:image/png;base64,aW1hZ2U=');
  });

  it('bounds preparation to two active requests and four waiters across service instances', async () => {
    const gate = hold(view);
    const prepare = jest
      .spyOn(internals, 'buildSubmissionView')
      .mockReturnValue(gate.promise);
    const other = new PdfService(
      { submission: { findFirst } } as unknown as PrismaService,
      {} as S3Service,
    );
    const otherPrepare = jest
      .spyOn(other as unknown as PdfInternals, 'buildSubmissionView')
      .mockReturnValue(gate.promise);
    jest
      .spyOn(other as unknown as PdfInternals, 'renderPdf')
      .mockResolvedValue(pdf);
    for (let index = 0; index < 6; index++) void request();
    await flush();
    expect(prepare).toHaveBeenCalledTimes(2);
    await expect(request(other)).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
    expect(otherPrepare).not.toHaveBeenCalled();
    expect(internals.renderPdf).not.toHaveBeenCalled();
    gate.resolve(view);
    await Promise.all(pending.slice(0, 6));
    expect(prepare).toHaveBeenCalledTimes(6);
    await expect(request(other)).resolves.toEqual(pdf);
  });

  it('preserves two active renders and four render waiters after preparation finishes', async () => {
    const gate = hold(pdf);
    const prepare = jest
      .spyOn(internals, 'buildSubmissionView')
      .mockResolvedValue(view);
    const render = jest
      .spyOn(internals, 'renderPdf')
      .mockReturnValue(gate.promise);
    for (let index = 0; index < 6; index++) void request();
    await flush();
    expect(prepare).toHaveBeenCalledTimes(6);
    expect(render).toHaveBeenCalledTimes(2);
    await expect(request()).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(prepare).toHaveBeenCalledTimes(7);
    gate.resolve(pdf);
    await Promise.all(pending.slice(0, 6));
    expect(render).toHaveBeenCalledTimes(6);
    await expect(request()).resolves.toEqual(pdf);
  });

  it('releases a preparation permit after failure and wakes a queued request', async () => {
    const first = hold(view);
    const second = hold(view);
    const prepare = jest
      .spyOn(internals, 'buildSubmissionView')
      .mockImplementationOnce(() => first.promise)
      .mockImplementationOnce(() => second.promise)
      .mockResolvedValue(view);
    const failed = request();
    void request();
    const queued = request();
    await flush();
    expect(prepare).toHaveBeenCalledTimes(2);
    first.reject(new Error('preparation failed'));
    await expect(failed).rejects.toThrow('preparation failed');
    await expect(queued).resolves.toEqual(pdf);
    expect(prepare).toHaveBeenCalledTimes(3);
    expect(internals.renderPdf).toHaveBeenCalledTimes(1);
  });

  it('releases a render permit after failure and wakes a queued render', async () => {
    jest.spyOn(internals, 'buildSubmissionView').mockResolvedValue(view);
    const first = hold(pdf);
    const second = hold(pdf);
    const render = jest
      .spyOn(internals, 'renderPdf')
      .mockImplementationOnce(() => first.promise)
      .mockImplementationOnce(() => second.promise)
      .mockResolvedValue(pdf);
    const failed = request();
    void request();
    const queued = request();
    await flush();
    expect(render).toHaveBeenCalledTimes(2);
    first.reject(new Error('render failed'));
    await expect(failed).rejects.toThrow('render failed');
    await expect(queued).resolves.toEqual(pdf);
    expect(render).toHaveBeenCalledTimes(3);
  });

  it('retains not-found behavior without preparing or rendering', async () => {
    findFirst.mockResolvedValue(null);
    const prepare = jest.spyOn(internals, 'buildSubmissionView');
    await expect(request()).rejects.toBeInstanceOf(NotFoundException);
    expect(prepare).not.toHaveBeenCalled();
    expect(internals.renderPdf).not.toHaveBeenCalled();
  });
});
