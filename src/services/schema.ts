/**
 * Provider schemas for the GamePayload shape (src/types/game.ts).
 *
 * openaiSchema()/mistralSchema(): strict JSON Schema — every object has
 * additionalProperties:false and required lists ALL of its properties.
 *
 * geminiSchema(): OpenAPI 3.0 schema subset — only type ('object'|'array'|
 * 'string'|'integer'), properties, required, enum, items, minItems, maxItems.
 * No additionalProperties, no $schema.
 */

type JsonSchema = Record<string, unknown>;

interface ArraySchema extends JsonSchema {
  type: 'array';
  items: JsonSchema;
  minItems: number;
  maxItems: number;
}

const DIFFICULTY_ENUM = ['easy', 'medium', 'hard'];

function strictObject(properties: Record<string, JsonSchema>): JsonSchema {
  return {
    type: 'object',
    properties,
    required: Object.keys(properties),
    additionalProperties: false,
  };
}

function strictArray(items: JsonSchema, minItems: number, maxItems: number): ArraySchema {
  return { type: 'array', items, minItems, maxItems };
}

function openapiObject(properties: Record<string, JsonSchema>, required: string[]): JsonSchema {
  return { type: 'object', properties, required };
}

function openapiArray(items: JsonSchema, minItems: number, maxItems: number): JsonSchema {
  return { type: 'array', items, minItems, maxItems };
}

/** Strict JSON Schema (OpenAI / Mistral structured-output style). */
function strictSchema(): JsonSchema {
  const levelSchema = strictObject({
    id: { type: 'integer' },
    difficulty: { type: 'string', enum: DIFFICULTY_ENUM },
    question: { type: 'string' },
    options: strictArray({ type: 'string' }, 4, 4),
    correctAnswer: { type: 'string' },
    hint: { type: 'string' },
    explanation: { type: 'string' },
  });

  const pairSchema = strictObject({
    id: { type: 'string' },
    term: { type: 'string' },
    match: { type: 'string' },
  });

  return strictObject({
    meta: strictObject({
      title: { type: 'string' },
      subject: { type: 'string' },
      targetGrade: { type: 'string' },
      topicSummary: { type: 'string' },
    }),
    levels: strictArray(levelSchema, 6, 10),
    matchingPairs: strictArray(pairSchema, 6, 8),
  });
}

/** OpenAPI 3.0 subset (Gemini responseSchema style). */
function openapiSchema(): JsonSchema {
  const levelSchema = openapiObject(
    {
      id: { type: 'integer' },
      difficulty: { type: 'string', enum: DIFFICULTY_ENUM },
      question: { type: 'string' },
      options: openapiArray({ type: 'string' }, 4, 4),
      correctAnswer: { type: 'string' },
      hint: { type: 'string' },
      explanation: { type: 'string' },
    },
    ['id', 'difficulty', 'question', 'options', 'correctAnswer', 'hint', 'explanation'],
  );

  const pairSchema = openapiObject(
    {
      id: { type: 'string' },
      term: { type: 'string' },
      match: { type: 'string' },
    },
    ['id', 'term', 'match'],
  );

  return openapiObject(
    {
      meta: openapiObject(
        {
          title: { type: 'string' },
          subject: { type: 'string' },
          targetGrade: { type: 'string' },
          topicSummary: { type: 'string' },
        },
        ['title', 'subject', 'targetGrade', 'topicSummary'],
      ),
      levels: openapiArray(levelSchema, 6, 10),
      matchingPairs: openapiArray(pairSchema, 6, 8),
    },
    ['meta', 'levels', 'matchingPairs'],
  );
}

export function openaiSchema(): JsonSchema {
  return strictSchema();
}

export function mistralSchema(): JsonSchema {
  return strictSchema();
}

export function geminiSchema(): JsonSchema {
  return openapiSchema();
}
