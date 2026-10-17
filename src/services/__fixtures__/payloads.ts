type Difficulty = 'easy' | 'medium' | 'hard';

interface LevelSeed {
  id: number;
  difficulty: Difficulty;
  question: string;
  options: string[];
  correctAnswer: string;
  hint: string;
  explanation: string;
}

function level(
  id: number,
  difficulty: Difficulty,
  question: string,
  correctAnswer: string,
  wrongOptions: string[],
  hint: string,
  explanation: string,
): LevelSeed {
  return {
    id,
    difficulty,
    question,
    options: [correctAnswer, ...wrongOptions],
    correctAnswer,
    hint,
    explanation,
  };
}

const validPayload = {
  meta: {
    title: 'Fraction Fun',
    subject: 'Math',
    targetGrade: 'Grade 7',
    topicSummary: 'Fractions, decimals and percents',
  },
  levels: [
    level(
      1,
      'easy',
      'What is 3/4 as a decimal?',
      '0.75',
      ['0.34', '0.43', '1.34'],
      'Think of quarters of a dollar.',
      '3/4 is the same as 75 hundredths.',
    ),
    level(
      2,
      'easy',
      'Which fraction equals 1/2?',
      '2/4',
      ['3/4', '1/3', '2/3'],
      'Try folding a paper in half twice.',
      '2/4 simplifies to 1/2.',
    ),
    level(
      3,
      'medium',
      'Add 1/4 + 1/4.',
      '1/2',
      ['1/8', '2/8', '1/4'],
      'Same denominators: add the tops.',
      '1/4 + 1/4 = 2/4 = 1/2.',
    ),
    level(
      4,
      'medium',
      'Write 0.6 as a fraction in simplest form.',
      '3/5',
      ['1/6', '6/5', '5/6'],
      'Say it out loud: six tenths.',
      '0.6 is 6/10, which simplifies to 3/5.',
    ),
    level(
      5,
      'medium',
      'Multiply 1/2 × 1/3.',
      '1/6',
      ['2/3', '1/5', '3/6'],
      'Multiply tops, then bottoms.',
      '1 × 1 = 1 on top and 2 × 3 = 6 below, so 1/6.',
    ),
    level(
      6,
      'hard',
      'You eat 3 of 8 pizza slices. What fraction did you eat?',
      '3/8',
      ['8/3', '5/8', '3/5'],
      'Eaten over total.',
      '3 eaten out of 8 total is 3/8.',
    ),
    level(
      7,
      'hard',
      'Which fraction is the largest?',
      '7/8',
      ['5/8', '3/4', '2/3'],
      'Compare them all to 1.',
      '7/8 is closest to a whole.',
    ),
    level(
      8,
      'hard',
      'Convert 125% to a fraction.',
      '5/4',
      ['1/4', '25/4', '5/2'],
      'Percents are out of 100. '.repeat(17),
      '125% is 125/100, which simplifies to 5/4.',
    ),
  ],
  matchingPairs: [
    { id: 'p1', term: '1/2', match: '0.5' },
    { id: 'p2', term: '1/4', match: '0.25' },
    { id: 'p3', term: '3/4', match: '0.75' },
    { id: 'p4', term: '1/5', match: '0.2' },
    { id: 'p5', term: '1/10', match: '0.1' },
    { id: 'p6', term: '2/5', match: '0.4' },
  ],
};

export const valid: string = JSON.stringify(validPayload);

export const fencedWithProse: string =
  `Sure! Here is your worksheet as JSON.\n\n\`\`\`json\n${valid}\n\`\`\`\n\nLet me know if you would like any changes.`;

const latexPayload = {
  meta: {
    title: 'LaTeX Cleanup',
    subject: 'Math',
    targetGrade: 'Grade 7',
    topicSummary: 'Notation cleanup',
  },
  levels: [
    level(
      1,
      'easy',
      'What is $\\frac{3}{4}$ of 12?',
      '$9$',
      ['$8$', '$6$', '$3$'],
      'Find 3/4 of the total first.',
      '3/4 of 12 is 9.',
    ),
    level(
      2,
      'medium',
      'Evaluate $x^2$ when $x = 3$.',
      '9',
      ['6', '12', '27'],
      'Square means times itself.',
      '3 squared is 9.',
    ),
    level(
      3,
      'easy',
      'What is $\\sqrt{9}$?',
      '3',
      ['4.5', '81', '6'],
      'Ask: what times itself gives 9?',
      '$3 \\times 3 = 9$',
    ),
    level(
      4,
      'medium',
      'Compute $6 \\div 2$.',
      '3',
      ['4', '12', '1'],
      'Dividing by 2 halves it.',
      '6 divided by 2 is 3.',
    ),
    level(
      5,
      'medium',
      'Which decimal equals $\\frac{1}{2}$?',
      '0.5',
      ['0.2', '2.0', '1.2'],
      'Think of a half dollar.',
      '1/2 is 0.5.',
    ),
    level(
      6,
      'hard',
      'Write $\\frac{6}{8}$ in simplest form.',
      '3/4',
      ['2/3', '6/4', '1/2'],
      'Divide top and bottom by 2.',
      '6/8 simplifies to 3/4.',
    ),
  ],
  matchingPairs: [
    { id: 'p1', term: '$\\frac{1}{2}$', match: '0.5' },
    { id: 'p2', term: '$\\sqrt{4}$', match: '2' },
    { id: 'p3', term: '$\\frac{1}{4}$', match: '0.25' },
    { id: 'p4', term: '$x^2$', match: 'x squared' },
    { id: 'p5', term: '$\\frac{3}{4}$', match: '0.75' },
    { id: 'p6', term: '$\\frac{1}{10}$', match: '0.1' },
  ],
};

export const latex: string = JSON.stringify(latexPayload);

const wrongOptionCountsPayload = {
  meta: {
    title: 'Option Counts',
    subject: 'Math',
    targetGrade: 'Grade 7',
    topicSummary: 'Option repair',
  },
  levels: [
    level(1, 'easy', 'What is 2 + 2?', '4', ['3', '5'], 'Count on your fingers.', '2 plus 2 is 4.'),
    level(2, 'easy', 'What is 1 + 1?', '2', ['1', '3'], 'Start from one and count once more.', '1 plus 1 is 2.'),
    level(
      3,
      'easy',
      'What is 10 - 4?',
      '6',
      ['5', '7', '14', '4', '2'],
      'Count back 4 from 10.',
      '10 minus 4 is 6.',
    ),
    level(
      4,
      'easy',
      'What is 3 × 3?',
      '9',
      ['6', '12', '27', '3', '1'],
      'Three groups of three.',
      '3 times 3 is 9.',
    ),
    level(
      5,
      'medium',
      'What is 12 ÷ 4?',
      '3',
      ['4', '8', '2', '6', '48'],
      'How many 4s fit in 12?',
      '12 divided by 4 is 3.',
    ),
    level(
      6,
      'medium',
      'Round 7.5 to the nearest whole number.',
      '8',
      ['7', '9', '7.5', '15', '70'],
      'Half rounds up.',
      '7.5 rounds to 8.',
    ),
    level(
      7,
      'medium',
      'How many sides does a triangle have?',
      '3',
      ['4', '5', '2', '6', '1'],
      'Tri means three.',
      'A triangle has 3 sides.',
    ),
    level(
      8,
      'hard',
      'What is 25% of 40?',
      '10',
      ['5', '20', '15', '35', '100'],
      'A quarter of 40.',
      '25% of 40 is 10.',
    ),
  ],
  matchingPairs: [
    { id: 'p1', term: '2 + 2', match: '4' },
    { id: 'p2', term: '10 - 4', match: '6' },
    { id: 'p3', term: '3 × 3', match: '9' },
    { id: 'p4', term: '12 ÷ 4', match: '3' },
    { id: 'p5', term: '50% of 10', match: '5' },
    { id: 'p6', term: '25% of 8', match: '2' },
  ],
};

export const wrongOptionCounts: string = JSON.stringify(wrongOptionCountsPayload);

const correctMissingPayload = {
  meta: {
    title: 'Missing Answers',
    subject: 'General',
    targetGrade: 'Grade 7',
    topicSummary: 'Correct answer repair',
  },
  levels: [
    level(
      1,
      'easy',
      'Which planet is known as the Red Planet?',
      'Mars',
      ['Venus', 'Earth', 'Jupiter', 'Saturn'],
      'It is named after a god of war.',
      'Mars looks red because of iron dust.',
    ),
    level(
      2,
      'easy',
      'What do plants use to make food?',
      'Photosynthesis',
      ['Respiration', 'Digestion', 'Evaporation', 'Germination'],
      'It needs sunlight.',
      'Plants turn light into sugar.',
    ),
    level(
      3,
      'medium',
      'How many continents are there?',
      '7',
      ['5', '6', '8', '9'],
      'Count the big land masses.',
      'There are 7 continents.',
    ),
    level(
      4,
      'medium',
      'What is the largest ocean?',
      'Pacific Ocean',
      ['Atlantic Ocean', 'Indian Ocean', 'Arctic Ocean', 'Southern Ocean'],
      'It touches Asia and the Americas.',
      'The Pacific is the largest ocean.',
    ),
    level(
      5,
      'medium',
      'Which gas do we breathe in to live?',
      'Oxygen',
      ['Carbon dioxide', 'Nitrogen', 'Helium', 'Hydrogen'],
      'About 1 in 5 air molecules.',
      'We breathe in oxygen.',
    ),
    level(
      6,
      'hard',
      'What is 15% of 200?',
      '30',
      ['15', '20', '25', '35'],
      '10% first, then half of that.',
      '15% of 200 is 30.',
    ),
    {
      id: 7,
      difficulty: 'hard',
      question: 'Which process do plants use to make food?',
      options: ['photosynthesis', 'respiration', 'evaporation', 'germination'],
      correctAnswer: 'Photosynthesis',
      hint: 'Same word as before, watch the capital.',
      explanation: 'Plants use photosynthesis.',
    },
  ],
  matchingPairs: [
    { id: 'p1', term: 'Mars', match: 'Red Planet' },
    { id: 'p2', term: 'Earth', match: 'Blue Planet' },
    { id: 'p3', term: 'Oxygen', match: 'We breathe it' },
    { id: 'p4', term: 'Pacific Ocean', match: 'Largest ocean' },
    { id: 'p5', term: 'Continent', match: 'Big land mass' },
    { id: 'p6', term: 'Photosynthesis', match: 'Making food' },
  ],
};

export const correctMissing: string = JSON.stringify(correctMissingPayload);

const tooFewLevelsPayload = {
  meta: {
    title: 'Too Few Levels',
    subject: 'Math',
    targetGrade: 'Grade 7',
    topicSummary: 'Only four levels',
  },
  levels: [
    level(1, 'easy', 'What is 2 + 2?', '4', ['3', '5', '6'], 'Count up.', '2 plus 2 is 4.'),
    level(2, 'easy', 'What is 3 + 3?', '6', ['4', '5', '9'], 'Double three.', '3 plus 3 is 6.'),
    level(3, 'medium', 'What is 5 × 2?', '10', ['7', '12', '25'], 'Two fives.', '5 times 2 is 10.'),
    level(4, 'medium', 'What is 10 ÷ 2?', '5', ['2', '8', '20'], 'Half of ten.', '10 divided by 2 is 5.'),
  ],
  matchingPairs: [
    { id: 'p1', term: '2 + 2', match: '4' },
    { id: 'p2', term: '3 + 3', match: '6' },
    { id: 'p3', term: '5 × 2', match: '10' },
    { id: 'p4', term: '10 ÷ 2', match: '5' },
    { id: 'p5', term: '4 + 4', match: '8' },
    { id: 'p6', term: '6 + 6', match: '12' },
  ],
};

export const tooFewLevels: string = JSON.stringify(tooFewLevelsPayload);

export const garbage: string = 'not json at all';
