
export interface WordExample {
  arabic: string;
  english: string;
  position: 'beginning' | 'middle' | 'end';
}

export interface LetterContent {
  letter: string;
  name: string;
  story: string;
  storyTitle: string;
  words: WordExample[];
  funFact?: string;
  videoUri?: string;
}

export enum AppState {
  MENU = 'MENU',
  LEARN = 'LEARN',
}

// Standard Arabic Alphabet (Abjad)
export const ARABIC_LETTERS = [
  'أ', 'ب', 'ت', 'ث', 'ج', 'ح', 'خ', 
  'د', 'ذ', 'ر', 'ز', 'س', 'ش', 'ص', 
  'ض', 'ط', 'ظ', 'ع', 'غ', 'ف', 'ق', 
  'ك', 'ل', 'م', 'ن', 'ه', 'و', 'ي'
];
