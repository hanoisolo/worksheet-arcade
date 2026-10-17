import type { Page } from '@playwright/test';

export const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

export const GEMINI_ROUTE = '**/v1beta/models/*:generateContent';

export const PAYLOAD = {
  meta: {
    title: 'Water Cycle Quest',
    subject: 'Science',
    targetGrade: 'Grade 7',
    topicSummary: 'How water moves.',
  },
  levels: [
    {
      id: 1,
      difficulty: 'easy',
      question: 'What process turns liquid water into water vapor?',
      options: ['Evaporation', 'Condensation', 'Precipitation', 'Collection'],
      correctAnswer: 'Evaporation',
      hint: 'The sun heats water in oceans and lakes.',
      explanation: 'Evaporation happens when heat from the sun turns liquid water into water vapor.',
    },
    {
      id: 2,
      difficulty: 'easy',
      question: 'What is it called when water vapor cools into liquid droplets?',
      options: ['Condensation', 'Evaporation', 'Transpiration', 'Infiltration'],
      correctAnswer: 'Condensation',
      hint: 'Think of droplets forming on a cold glass.',
      explanation: 'Condensation occurs when water vapor cools and changes back into liquid droplets.',
    },
    {
      id: 3,
      difficulty: 'medium',
      question: 'Which of these is NOT a form of precipitation?',
      options: ['Evaporation', 'Rain', 'Snow', 'Hail'],
      correctAnswer: 'Evaporation',
      hint: 'Precipitation falls from the sky.',
      explanation: 'Precipitation includes rain, snow, sleet, and hail; evaporation is water rising as vapor.',
    },
    {
      id: 4,
      difficulty: 'medium',
      question: 'What is the main energy source that powers the water cycle?',
      options: ['The sun', 'The moon', 'Wind', 'Gravity'],
      correctAnswer: 'The sun',
      hint: 'It heats water and drives evaporation.',
      explanation: 'Solar energy evaporates water and keeps the whole cycle moving.',
    },
    {
      id: 5,
      difficulty: 'hard',
      question: 'What is transpiration?',
      options: [
        'Water vapor released by plants',
        'Water soaking into the soil',
        'Water flowing in rivers',
        'Dew freezing overnight',
      ],
      correctAnswer: 'Water vapor released by plants',
      hint: 'Plants release water through their leaves.',
      explanation: 'Transpiration is the release of water vapor from plant leaves into the air.',
    },
    {
      id: 6,
      difficulty: 'hard',
      question: 'What do we call water that flows over land into streams and rivers?',
      options: ['Runoff', 'Sublimation', 'Accumulation', 'Percolation'],
      correctAnswer: 'Runoff',
      hint: 'It moves across the ground after rain.',
      explanation: 'Runoff is rain or snowmelt that flows over the land surface into streams and rivers.',
    },
  ],
  matchingPairs: [
    { id: 'p1', term: 'Evaporation', match: 'Liquid water becomes vapor' },
    { id: 'p2', term: 'Condensation', match: 'Vapor becomes liquid droplets' },
    { id: 'p3', term: 'Precipitation', match: 'Rain, snow, sleet, or hail falls' },
    { id: 'p4', term: 'Collection', match: 'Water gathers in oceans, lakes, and rivers' },
    { id: 'p5', term: 'Transpiration', match: 'Plants release water vapor' },
    { id: 'p6', term: 'Runoff', match: 'Water flows over land into streams' },
  ],
};

export function geminiBody() {
  return {
    candidates: [
      {
        content: {
          parts: [{ text: JSON.stringify(PAYLOAD) }],
        },
      },
    ],
  };
}

export async function withKey(page: Page) {
  await page.addInitScript(() => {
    sessionStorage.setItem('wa.key.gemini', 'test-key');
    localStorage.setItem('wa.provider', 'gemini');
  });
}

export async function uploadPng(page: Page, name = 'sheet.png') {
  await page.getByTestId('file-input').setInputFiles({
    name,
    mimeType: 'image/png',
    buffer: PNG,
  });
}
