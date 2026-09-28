import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ChaptersRepository } from './chapters.repository';
import { ChaptersService } from './chapters.service';

const owner = { id: 'owner', isAdmin: false };
const stranger = { id: 'stranger', isAdmin: false };
const admin = { id: 'admin', isAdmin: true };

// Tree in topic t1 (owned by `owner`): root → child → grandchild
const chapters: Record<
  string,
  { id: string; topic_id: string; parent_id: string | null }
> = {
  root: { id: 'root', topic_id: 't1', parent_id: null },
  child: { id: 'child', topic_id: 't1', parent_id: 'root' },
  grandchild: { id: 'grandchild', topic_id: 't1', parent_id: 'child' },
  other: { id: 'other', topic_id: 't2', parent_id: null },
};
const topics: Record<string, { id: string; created_by: string }> = {
  t1: { id: 't1', created_by: 'owner' },
  t2: { id: 't2', created_by: 'stranger' },
};

function setup() {
  const repo = {
    create: jest.fn().mockResolvedValue({ id: 'new' }),
    update: jest.fn().mockResolvedValue({ id: 'updated' }),
    softDelete: jest
      .fn()
      .mockResolvedValue({ chapters: { count: 1 }, questions: { count: 0 } }),
    findMany: jest.fn().mockResolvedValue({ data: [] }),
    findTopic: jest.fn((id: string) => Promise.resolve(topics[id] ?? null)),
    findParentCandidate: jest.fn((id: string) =>
      Promise.resolve(chapters[id] ?? null),
    ),
    // Mirrors the repository's owner scope: only t1 chapters are owner's.
    findById: jest.fn((id: string, _isAdmin: boolean, ownerId?: string) => {
      const chapter = chapters[id];
      if (!chapter) return Promise.resolve(null);
      const topic = topics[chapter.topic_id];
      return Promise.resolve(
        !ownerId || topic.created_by === ownerId ? chapter : null,
      );
    }),
  };
  const service = new ChaptersService(repo as unknown as ChaptersRepository);
  return { repo, service };
}

describe('ChaptersService ownership', () => {
  it('scopes listing to the caller, but not for admins', async () => {
    const { repo, service } = setup();
    await service.findAll({ topic_id: 't2' }, owner);
    expect(repo.findMany).toHaveBeenLastCalledWith(
      { topic_id: 't2' },
      false,
      'owner',
    );
    await service.findAll({}, admin);
    expect(repo.findMany).toHaveBeenLastCalledWith({}, true, undefined);
  });

  it("hides other lecturers' chapters as not found", async () => {
    const { repo, service } = setup();
    await expect(service.findOne('root', stranger)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    await expect(
      service.update('root', { name: 'x' }, stranger),
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.remove('root', stranger)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(repo.update).not.toHaveBeenCalled();
    expect(repo.softDelete).not.toHaveBeenCalled();
    await expect(service.findOne('root', admin)).resolves.toBeTruthy();
  });

  it("refuses to create a chapter in someone else's topic", async () => {
    const { repo, service } = setup();
    await expect(
      service.create({ topic_id: 't1', name: 'x', order: 0 }, stranger),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(
      service.create({ topic_id: 'missing', name: 'x', order: 0 }, owner),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(repo.create).not.toHaveBeenCalled();
    await service.create({ topic_id: 't1', name: 'x', order: 0 }, owner);
    await service.create({ topic_id: 't1', name: 'x', order: 0 }, admin);
    expect(repo.create).toHaveBeenCalledTimes(2);
  });

  it('requires the parent to be in the same topic', async () => {
    const { service } = setup();
    await expect(
      service.create(
        { topic_id: 't1', parent_id: 'other', name: 'x', order: 0 },
        owner,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.create(
        { topic_id: 't1', parent_id: 'child', name: 'x', order: 0 },
        owner,
      ),
    ).resolves.toEqual({ id: 'new' });
  });

  it('refuses to move a chapter into another user topic', async () => {
    const { service } = setup();
    await expect(
      service.update('root', { topic_id: 't2' }, owner),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('prevents moving a chapter under itself or its descendant', async () => {
    const { repo, service } = setup();
    await expect(
      service.update('root', { parent_id: 'root' }, owner),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.update('root', { parent_id: 'grandchild' }, owner),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(repo.update).not.toHaveBeenCalled();
    await expect(
      service.update('grandchild', { parent_id: 'root', name: 'y' }, owner),
    ).resolves.toEqual({ id: 'updated' });
  });
});
