// Interest topics offered during onboarding. Every AI generation themes its
// content around the learner's picks, so labels double as prompt vocabulary.
export interface InterestOption {
  id: string;
  label: string;
  emoji: string;
}

export const INTEREST_OPTIONS: InterestOption[] = [
  { id: 'travel', label: 'Travel & Adventure', emoji: '✈️' },
  { id: 'food', label: 'Food & Cooking', emoji: '🍜' },
  { id: 'business', label: 'Business & Work', emoji: '💼' },
  { id: 'movies', label: 'Movies & Series', emoji: '🎬' },
  { id: 'music', label: 'Music', emoji: '🎵' },
  { id: 'sports', label: 'Sports & Fitness', emoji: '⚽' },
  { id: 'gaming', label: 'Gaming', emoji: '🎮' },
  { id: 'tech', label: 'Technology & Science', emoji: '🔬' },
  { id: 'art', label: 'Art & Design', emoji: '🎨' },
  { id: 'books', label: 'Books & Stories', emoji: '📚' },
  { id: 'history', label: 'History & Culture', emoji: '🏛️' },
  { id: 'nature', label: 'Nature & Animals', emoji: '🌿' },
  { id: 'fashion', label: 'Fashion & Style', emoji: '👗' },
  { id: 'family', label: 'Family & Daily Life', emoji: '🏡' },
  { id: 'social', label: 'Making Friends', emoji: '💬' },
];

export const MIN_INTERESTS = 3;
