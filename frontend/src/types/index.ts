export type Difficulty = 'Beginner' | 'Intermediate' | 'Advanced' | 'Master';

export interface QuizQuestion {
  id: string;
  domain: string;
  domainName: string;
  difficulty: Difficulty;
  question: string;
  codeSnippet?: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  hint: string;
  xpReward: number;
}

export interface DomainCategory {
  id: string;
  name: string;
  slug: string;
  icon: string;
  accentColor: string;
  badge: string;
  description: string;
  questionCount: number;
  activeLearners: string;
  difficulty: Difficulty;
  popularTopics: string[];
  sampleQuestion?: QuizQuestion;
}

export interface LeaderboardEntry {
  rank: number;
  name: string;
  handle: string;
  avatar: string;
  xp: number;
  streak: number;
  badge: string;
  specialty: string;
  trend: 'up' | 'down' | 'same';
}

export interface LiveFeedItem {
  id: string;
  userName: string;
  userAvatar: string;
  action: string;
  domainBadge: string;
  pointsEarned: number;
  timestamp: string;
}

export interface Testimonial {
  name: string;
  role: string;
  company: string;
  avatar: string;
  quote: string;
  rating: number;
  highlight: string;
}

export interface PricingPlan {
  id: string;
  name: string;
  badge?: string;
  priceMonthly: number;
  priceAnnual: number;
  description: string;
  features: string[];
  ctaText: string;
  popular?: boolean;
}
