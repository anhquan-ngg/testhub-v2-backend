import { randomUUID } from 'node:crypto';
import {
  freezeMatrix,
  planMatrixSchema,
  PlanMatrix,
  topologicalNodes,
} from './knowledge-plan.contract';

const units = [{ kind: 'PAGE' as const, position: 1 }];
function matrix(): PlanMatrix {
  const node = {
    id: randomUUID(),
    parent_id: null,
    name: 'Stacks',
    source_units: units,
  };
  return {
    nodes: [node],
    rows: [
      {
        id: randomUUID(),
        node_id: node.id,
        objective: 'Explain LIFO',
        question_type: 'SINGLE_CHOICE',
        source_units: units,
        counts: { KNOWLEDGE: 1, UNDERSTANDING: 2, APPLYING: 0, ADVANCED: 0 },
      },
    ],
  };
}
describe('Knowledge matrix invariants', () => {
  it('freezes separate cognitive cells and server-side chapter assignments', () => {
    const value = matrix();
    const frozen = freezeMatrix(randomUUID(), 3, value);
    expect(
      frozen.items.map((item) => [
        item.node_id,
        item.question_format,
        item.count,
      ]),
    ).toEqual([
      [value.nodes[0].id, 'KNOWLEDGE', 1],
      [value.nodes[0].id, 'UNDERSTANDING', 2],
    ]);
  });
  it('rejects cycles, orphan nodes, duplicate sibling names and excess counts', () => {
    const value = matrix();
    value.nodes[0].parent_id = value.nodes[0].id;
    expect(planMatrixSchema.safeParse(value).success).toBe(false);
    value.nodes[0].parent_id = randomUUID();
    expect(planMatrixSchema.safeParse(value).success).toBe(false);
    value.nodes[0].parent_id = null;
    value.nodes.push({ ...value.nodes[0], id: randomUUID(), name: ' STACKS ' });
    expect(planMatrixSchema.safeParse(value).success).toBe(false);
    value.nodes.pop();
    value.rows[0].counts.ADVANCED = 20;
    expect(planMatrixSchema.safeParse(value).success).toBe(false);
  });
  it.each([null, 'child'])(
    'rejects normalized sibling names with distinct IDs under %s',
    (parent) => {
      const value = matrix();
      const parentId = parent ? value.nodes[0].id : null;
      if (!parent) value.nodes[0].name = 'Khái niệm cơ bản';
      else
        value.nodes.push({
          ...value.nodes[0],
          id: randomUUID(),
          parent_id: parentId,
          name: 'Khái niệm cơ bản',
        });
      value.nodes.push({
        ...value.nodes[0],
        id: randomUUID(),
        parent_id: parentId,
        name: '  KHÁI   NIỆM CƠ BẢN  '.normalize('NFD'),
      });
      const result = planMatrixSchema.safeParse(value);
      expect(result.success).toBe(false);
      if (!result.success)
        expect(result.error.issues).toEqual([
          expect.objectContaining({
            message: 'Duplicate sibling chapter name',
            path: ['nodes', value.nodes.length - 1, 'name'],
          }),
        ]);
    },
  );
  it('allows equal normalized names under different parents and preserves accents', () => {
    const value = matrix();
    const otherParent = { ...value.nodes[0], id: randomUUID(), name: 'Queues' };
    value.nodes.push(otherParent);
    value.nodes.push(
      {
        ...value.nodes[0],
        id: randomUUID(),
        parent_id: value.nodes[0].id,
        name: 'Cơ bản',
      },
      {
        ...value.nodes[0],
        id: randomUUID(),
        parent_id: otherParent.id,
        name: ' CƠ BẢN ',
      },
      {
        ...value.nodes[0],
        id: randomUUID(),
        parent_id: otherParent.id,
        name: 'Co ban',
      },
    );
    expect(planMatrixSchema.safeParse(value).success).toBe(true);
  });
  it('sorts deep trees iteratively without a depth limit', () => {
    const nodes = Array.from({ length: 1000 }, (_, index) => ({
      id: randomUUID(),
      name: `Node ${index}`,
      parent_id: null as string | null,
      source_units: units,
    }));
    nodes.forEach((node, index) => {
      node.parent_id = index ? nodes[index - 1].id : null;
    });
    expect(topologicalNodes(nodes.reverse())).toHaveLength(1000);
  });
});
