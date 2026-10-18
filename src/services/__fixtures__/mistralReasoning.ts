// Shape returned by Mistral chat completions for reasoning models such as zai-glm-5-3:
// message.content is an array of chunks (thinking trace first, then the answer), not a string.
// See https://docs.mistral.ai/capabilities/reasoning ("Handling thinking chunks").
export const MISTRAL_REASONING_RESPONSE = {
  id: 'cmpl-reasoning-fixture',
  object: 'chat.completion',
  model: 'zai-glm-5-3',
  choices: [
    {
      index: 0,
      finish_reason: 'stop',
      message: {
        role: 'assistant',
        content: [
          {
            type: 'thinking',
            thinking: [{ type: 'text', text: 'The worksheet is about fractions. I will build 8 levels.' }],
          },
          { type: 'text', text: '{"meta":{"title":"Fraction' },
          { type: 'text', text: ' Frenzy"}}' },
        ],
      },
    },
  ],
};
