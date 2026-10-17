import { describe, expect, it } from 'vitest';
import { buildPrompt } from './prompt';
import { geminiSchema, mistralSchema, openaiSchema } from './schema';

type Node = Record<string, unknown>;

function isPlainObject(value: unknown): value is Node {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Collect every schema node reachable from root (arrays via items, objects via properties). */
function walk(root: Node): Node[] {
  const seen: Node[] = [];
  const stack: Node[] = [root];
  while (stack.length > 0) {
    const node = stack.pop() as Node;
    seen.push(node);
    if (node.type === 'array' && isPlainObject(node.items)) {
      stack.push(node.items as Node);
    } else if (node.type === 'object' && isPlainObject(node.properties)) {
      for (const child of Object.values(node.properties as Node)) {
        if (isPlainObject(child)) stack.push(child as Node);
      }
    }
  }
  return seen;
}

describe('openaiSchema / mistralSchema (strict JSON Schema)', () => {
  for (const [name, schema] of [
    ['openaiSchema', openaiSchema],
    ['mistralSchema', mistralSchema],
  ] as const) {
    it(`${name}: every object is strict (additionalProperties:false, required = all properties)`, () => {
      const objects = walk(schema()).filter((n) => n.type === 'object');
      expect(objects.length).toBeGreaterThan(0);
      for (const obj of objects) {
        const properties = obj.properties as Node | undefined;
        expect(properties).toBeDefined();
        expect(obj.additionalProperties).toBe(false);
        expect(obj.required).toEqual(Object.keys(properties as Node));
      }
    });

    it(`${name}: array sizes — levels 6–10, matchingPairs 6–8, options 4–4`, () => {
      const schemaObj = schema();
      const root = schemaObj.properties as Node;
      const levels = (root.levels as Node).items as Node;
      const levelProps = levels.properties as Node;
      const options = levelProps.options as Node;

      expect(root.levels).toMatchObject({ minItems: 6, maxItems: 10 });
      expect(root.matchingPairs).toMatchObject({ minItems: 6, maxItems: 8 });
      expect(options).toMatchObject({ minItems: 4, maxItems: 4, items: { type: 'string' } });
      expect(levelProps.difficulty).toMatchObject({ enum: ['easy', 'medium', 'hard'] });
    });
  }
});

describe('geminiSchema (OpenAPI subset)', () => {
  it('contains no additionalProperties or $schema anywhere', () => {
    for (const node of walk(geminiSchema())) {
      expect(node).not.toHaveProperty('additionalProperties');
      expect(node).not.toHaveProperty('$schema');
    }
  });

  it('only uses allowed keys and allowed type values', () => {
    const allowedKeys = new Set(['type', 'properties', 'required', 'enum', 'items', 'minItems', 'maxItems']);
    const allowedTypes = new Set(['object', 'array', 'string', 'integer']);
    for (const node of walk(geminiSchema())) {
      for (const key of Object.keys(node)) {
        expect(allowedKeys.has(key)).toBe(true);
      }
      if (node.type !== undefined) {
        expect(allowedTypes.has(node.type as string)).toBe(true);
      }
    }
  });

  it('array sizes — levels 6–10, matchingPairs 6–8, options 4–4', () => {
    const root = (geminiSchema().properties as Node);
    const levels = (root.levels as Node).items as Node;
    const levelProps = levels.properties as Node;
    const options = levelProps.options as Node;

    expect(root.levels).toMatchObject({ minItems: 6, maxItems: 10 });
    expect(root.matchingPairs).toMatchObject({ minItems: 6, maxItems: 8 });
    expect(options).toMatchObject({ minItems: 4, maxItems: 4, items: { type: 'string' } });
    expect(levelProps.difficulty).toMatchObject({ enum: ['easy', 'medium', 'hard'] });
  });
});

describe('buildPrompt', () => {
  it('contains the never-LaTeX rule and core shape rules', () => {
    const prompt = buildPrompt();
    expect(prompt).toMatch(/never use latex/i);
    expect(prompt).toMatch(/grade 7/i);
    expect(prompt).toMatch(/exactly 4 options/i);
    expect(prompt).toMatch(/6 to 10 levels/i);
    expect(prompt).toMatch(/6 to 8 matchingPairs/i);
    expect(prompt).toMatch(/without giving the answer away/i);
    expect(prompt).toMatch(/1-2 sentences/i);
    expect(prompt).toMatch(/JSON object ONLY/i);
  });

  it('appends the feedback line when feedback is given', () => {
    const feedback = 'only 3 options in level 2; correctAnswer missing from options';
    const prompt = buildPrompt(feedback);
    expect(prompt).toContain('Your previous answer had these problems: ' + feedback);
    expect(prompt).toContain('Fix them and reply with the full corrected JSON.');
    expect(prompt).toMatch(/never use latex/i);
  });

  it('returns the base prompt when feedback is empty or undefined', () => {
    expect(buildPrompt()).toBe(buildPrompt(''));
    expect(buildPrompt()).not.toContain('Your previous answer');
  });
});
