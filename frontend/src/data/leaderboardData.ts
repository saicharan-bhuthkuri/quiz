import { LeaderboardEntry, LiveFeedItem, Testimonial, PricingPlan } from '../types/index.ts';

export const leaderboardEntries: LeaderboardEntry[] = [
  {
    rank: 1,
    name: 'Elena Rostova',
    handle: '@elena_quantum',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80',
    xp: 48920,
    streak: 42,
    badge: 'Grandmaster Engineer',
    specialty: 'Quantum & Systems',
    trend: 'same'
  },
  {
    rank: 2,
    name: 'Devon Vance',
    handle: '@devon_arch',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120&q=80',
    xp: 46150,
    streak: 29,
    badge: 'Silicon Architect',
    specialty: 'VLSI & RISC-V',
    trend: 'up'
  },
  {
    rank: 3,
    name: 'Aisha Patel',
    handle: '@aisha_ai',
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=120&q=80',
    xp: 43800,
    streak: 35,
    badge: 'Neural Pioneer',
    specialty: 'LLMs & Diffusion',
    trend: 'up'
  },
  {
    rank: 4,
    name: 'Marcus Chen',
    handle: '@marcus_ctrl',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=120&q=80',
    xp: 41200,
    streak: 18,
    badge: 'Robotics Savant',
    specialty: 'SLAM & Control',
    trend: 'down'
  },
  {
    rank: 5,
    name: 'Sofia Al-Mansoor',
    handle: '@sofia_cloud',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=120&q=80',
    xp: 39950,
    streak: 24,
    badge: 'Cloud Principal',
    specialty: 'Distributed Raft',
    trend: 'up'
  }
];

export const liveFeedItems: LiveFeedItem[] = [
  {
    id: 'feed-1',
    userName: 'Kaelen Miller',
    userAvatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=80&q=80',
    action: 'Solved Master Challenge "Cache Coherence MESI Protocol"',
    domainBadge: 'Computer Systems',
    pointsEarned: 240,
    timestamp: 'Just now'
  },
  {
    id: 'feed-2',
    userName: 'Priya Sharma',
    userAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=80&q=80',
    action: 'Earned 10-Day Streak in Deep Learning Realm',
    domainBadge: 'AI & Data',
    pointsEarned: 150,
    timestamp: '2m ago'
  },
  {
    id: 'feed-3',
    userName: 'Lucas Weber',
    userAvatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=80&q=80',
    action: 'Defeated Rival in 1v1 Live Arena Duel (98% Speed)',
    domainBadge: 'VLSI Circuit',
    pointsEarned: 310,
    timestamp: '4m ago'
  },
  {
    id: 'feed-4',
    userName: 'Zoe Thorne',
    userAvatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=80&q=80',
    action: 'Unlocked "Transformer Maestro" Engineering Credential',
    domainBadge: 'AI Certification',
    pointsEarned: 500,
    timestamp: '6m ago'
  }
];

export const testimonials: Testimonial[] = [
  {
    name: 'David K., Staff Engineer',
    role: 'Staff Infrastructure Engineer',
    company: 'Ex-Google Cloud',
    avatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=120&q=80',
    quote: 'Engiverse’s distributed systems questions test real production failure modes, not just memorized syntax. It sharpened my system architecture mental model significantly.',
    rating: 5,
    highlight: 'Real production depth'
  },
  {
    name: 'Maya Lin, Robotics Researcher',
    role: 'Perception Engineer',
    company: 'Autonomous Robotics Lab',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=120&q=80',
    quote: 'The interactive 1v1 arena turns hardcore engineering concepts into an addictive daily habit. Our whole research team competes on the weekly Engiverse leaderboard.',
    rating: 5,
    highlight: 'Addictive competitive learning'
  },
  {
    name: 'Tariq Rahman, EE Graduate',
    role: 'Hardware Design Associate',
    company: 'Semiconductor Labs',
    avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=120&q=80',
    quote: 'The CMOS and FPGA quizzes were directly relevant to my silicon design interviews. The step-by-step circuit explanations were clearer than any textbook.',
    rating: 5,
    highlight: 'Direct interview preparation'
  }
];

export const pricingPlans: PricingPlan[] = [
  {
    id: 'free',
    name: 'Cadet Explorer',
    badge: 'Free Forever',
    priceMonthly: 0,
    priceAnnual: 0,
    description: 'Perfect for engineering students and curious minds starting their journey.',
    features: [
      '5 Daily quiz challenges across all 6 realms',
      'Basic performance scorecards',
      'Community leaderboard ranking',
      'Discussion forum access',
      'Standard diagnostic test'
    ],
    ctaText: 'Start Learning Free',
    popular: false
  },
  {
    id: 'pro',
    name: 'Pro Engineer',
    badge: 'Most Popular',
    priceMonthly: 12,
    priceAnnual: 9,
    description: 'For engineers, interview candidates, and high achievers aiming for mastery.',
    features: [
      'Unlimited quiz challenges & speed drills',
      'Live 1v1 Arena Duels with global rankings',
      'Deep step-by-step circuit & algorithm visualizers',
      'Verified digital LinkedIn skill badges',
      'AI-powered personalized weak spot diagnostics',
      'Offline challenge exports & PDF reports'
    ],
    ctaText: 'Unlock Pro Access',
    popular: true
  },
  {
    id: 'team',
    name: 'Campus & Teams',
    badge: 'For Universities & Orgs',
    priceMonthly: 29,
    priceAnnual: 24,
    description: 'Custom question banks, student cohort tracking, and competitive hackathon modes.',
    features: [
      'Everything in Pro for up to 25 members',
      'Custom university/company private leaderboards',
      'Instructor analytics dashboard & exports',
      'Custom internal quiz creation tool',
      'Dedicated engineering advisor support'
    ],
    ctaText: 'Contact Campus Team',
    popular: false
  }
];
