// 200 common English words for the typing test
const WORDS = [
  'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'it',
  'for', 'not', 'on', 'with', 'he', 'as', 'you', 'do', 'at', 'this',
  'but', 'his', 'by', 'from', 'they', 'we', 'say', 'her', 'she', 'or',
  'an', 'will', 'my', 'one', 'all', 'would', 'there', 'their', 'what',
  'so', 'up', 'out', 'if', 'about', 'who', 'get', 'which', 'go', 'me',
  'when', 'make', 'can', 'like', 'time', 'no', 'just', 'him', 'know',
  'take', 'people', 'into', 'year', 'your', 'good', 'some', 'could',
  'them', 'see', 'other', 'than', 'then', 'now', 'look', 'only', 'come',
  'its', 'over', 'think', 'also', 'back', 'after', 'use', 'two', 'how',
  'our', 'work', 'first', 'well', 'way', 'even', 'new', 'want', 'because',
  'any', 'these', 'give', 'day', 'most', 'us', 'great', 'between', 'need',
  'large', 'often', 'hand', 'high', 'place', 'hold', 'turn', 'were', 'main',
  'move', 'live', 'where', 'much', 'before', 'line', 'right', 'too', 'mean',
  'old', 'while', 'life', 'might', 'next', 'sound', 'below', 'saw', 'something',
  'thought', 'both', 'few', 'those', 'always', 'show', 'large', 'often', 'together',
  'ask', 'world', 'going', 'want', 'school', 'important', 'until', 'form', 'food',
  'keep', 'children', 'feet', 'land', 'side', 'without', 'once', 'animal', 'every',
  'near', 'sentence', 'set', 'three', 'never', 'end', 'done', 'open', 'seem',
  'together', 'next', 'white', 'children', 'begin', 'got', 'walk', 'example',
  'ease', 'paper', 'group', 'always', 'music', 'those', 'both', 'mark', 'book',
  'letter', 'until', 'mile', 'river', 'car', 'feet', 'care', 'second', 'enough',
  'plain', 'girl', 'usual', 'young', 'ready', 'above', 'ever', 'red', 'list',
  'though', 'feel', 'talk', 'bird', 'soon', 'body', 'dog', 'family', 'direct',
  'pose', 'leave', 'song', 'measure', 'door', 'product', 'black', 'short', 'numeral',
];

export function generateWordList(count: number = 100): string[] {
  const result: string[] = [];
  for (let i = 0; i < count; i++) {
    result.push(WORDS[Math.floor(Math.random() * WORDS.length)]);
  }
  return result;
}

export const TEST_DURATION = 30;          // har bir urinish — 30 soniya (monkeytype style)
export const TYPING_PHASE_DURATION = 300; // umumiy typing fazasi — 5 daqiqa (sahifaga kirgandan)
