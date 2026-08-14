export interface Category {
  id: string;
  label: string;
  emoji: string;
  description: string;
}

export const CATEGORIES: Category[] = [
  { id: 'numbers',     label: 'Numbers',          emoji: '🔢', description: 'Count from 1 to 20' },
  { id: 'colors',      label: 'Colors',            emoji: '🎨', description: 'Basic colors' },
  { id: 'greetings',   label: 'Greetings',         emoji: '👋', description: 'Common greetings and phrases' },
  { id: 'animals',     label: 'Animals',           emoji: '🐾', description: 'Common animals' },
  { id: 'food',        label: 'Food',              emoji: '🍕', description: 'Common foods' },
  { id: 'body_parts',  label: 'Body Parts',        emoji: '👁️',  description: 'Parts of the human body' },
  { id: 'family',      label: 'Family',            emoji: '👨‍👩‍👧',  description: 'Family members' },
  { id: 'weather',     label: 'Weather',           emoji: '⛅', description: 'Weather and climate' },
  { id: 'nature',      label: 'Nature',            emoji: '🌲', description: 'Nature and the outdoors' },
  { id: 'house',       label: 'Home',              emoji: '🏠', description: 'Rooms and furniture' },
  { id: 'clothing',    label: 'Clothing',          emoji: '👕', description: 'Clothes and accessories' },
  { id: 'sports',      label: 'Sports',            emoji: '⚽', description: 'Sports and activities' },
  { id: 'school',      label: 'School',            emoji: '📚', description: 'School and learning' },
  { id: 'work',        label: 'Work & Jobs',       emoji: '💼', description: 'Professions and jobs' },
  { id: 'time',        label: 'Time & Days',       emoji: '🕐', description: 'Days of the week and times' },
  { id: 'emotions',    label: 'Emotions',          emoji: '😊', description: 'Feelings and emotions' },
  { id: 'drinks',      label: 'Drinks',            emoji: '🥤', description: 'Beverages' },
  { id: 'vegetables',  label: 'Fruits & Veggies',  emoji: '🥦', description: 'Fruits and vegetables' },
  { id: 'travel',      label: 'Travel',            emoji: '✈️', description: 'Travel and transportation' },
  { id: 'technology',  label: 'Technology',        emoji: '💻', description: 'Tech and gadgets' },
];

export const ALL_CATEGORY_IDS = CATEGORIES.map((c) => c.id);

export function getCategoryMeta(id: string): Category | undefined {
  return CATEGORIES.find((c) => c.id === id);
}
