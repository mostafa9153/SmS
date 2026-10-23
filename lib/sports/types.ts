export type SportsCategory = "Track" | "Field" | "Fun" | "Team";
export type SportsGender = "Boys" | "Girls" | "All";
export type ScoringType = "Metric" | "Rank_Only";
export type MeasurementUnit = "Time (s)" | "Distance (m)" | "Height (m)" | "Points" | "None";

export interface SportsEvent {
  id: string;
  academicYear: number;
  name: string;
  category: SportsCategory;
  gender: SportsGender;
  eligibleClasses: string[];
  scoringType: ScoringType;
  measurementUnit: MeasurementUnit;
  maxParticipants?: number | null;
  description?: string;
  createdAt?: string;
  participantCount?: number;
  scoredCount?: number; // participants with a recorded best score
  podiumCount?: number; // participants with a podium rank
}

export interface SportsConfig {
  maxEventsPerStudent: number; // e.g. 3 (0 = unlimited)
  enforcementMode: "warning" | "strict";
}

export const DEFAULT_SPORTS_CONFIG: SportsConfig = {
  maxEventsPerStudent: 3,
  enforcementMode: "warning",
};

export interface SportsAthlete {
  id: string;
  academicYear: number;
  studentId: string;
  chestNumber: string;
  createdAt?: string;
}

export interface SportsParticipant {
  registrationId: string;
  eventId: string;
  studentId: string;
  athleteId?: string;
  chestNumber: string;
  studentName: string;
  schoolId: string;
  presentClass: string;
  presentSection: string;
  presentRoll: number;
  gender: string;
  photoUrl?: string;
  laneOrHeat?: string;
  status: "Registered" | "Disqualified" | "DNS";
  registeredEventsCount?: number;
  enrolledEvents?: string[]; // All game names this athlete is participating in
  // Result fields if recorded
  resultId?: string;
  trial1?: string;
  trial2?: string;
  trial3?: string;
  bestScore?: string;
  rankPosition?: number | null; // 1, 2, 3
  remarks?: string;
}

export interface SportsResultEntry {
  studentId: string;
  trial1?: string;
  trial2?: string;
  trial3?: string;
  bestScore?: string;
  rankPosition?: number | null;
  remarks?: string;
}

export const PRESET_SPORTS_EVENTS: Omit<SportsEvent, "id">[] = [
  {
    academicYear: new Date().getFullYear(),
    name: "100m Sprint",
    category: "Track",
    gender: "All",
    eligibleClasses: ["V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"],
    scoringType: "Metric",
    measurementUnit: "Time (s)",
    description: "Standard 100 meters sprint track race",
  },
  {
    academicYear: new Date().getFullYear(),
    name: "200m Sprint",
    category: "Track",
    gender: "All",
    eligibleClasses: ["V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"],
    scoringType: "Metric",
    measurementUnit: "Time (s)",
    description: "200 meters sprint race",
  },
  {
    academicYear: new Date().getFullYear(),
    name: "400m Race",
    category: "Track",
    gender: "All",
    eligibleClasses: ["VII", "VIII", "IX", "X", "XI", "XII"],
    scoringType: "Metric",
    measurementUnit: "Time (s)",
    description: "One full lap track race",
  },
  {
    academicYear: new Date().getFullYear(),
    name: "800m Race",
    category: "Track",
    gender: "All",
    eligibleClasses: ["VIII", "IX", "X", "XI", "XII"],
    scoringType: "Metric",
    measurementUnit: "Time (s)",
    description: "Two lap distance race",
  },
  {
    academicYear: new Date().getFullYear(),
    name: "Long Jump",
    category: "Field",
    gender: "All",
    eligibleClasses: ["V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"],
    scoringType: "Metric",
    measurementUnit: "Distance (m)",
    description: "Standard sandpit horizontal jump with 3 trials",
  },
  {
    academicYear: new Date().getFullYear(),
    name: "High Jump",
    category: "Field",
    gender: "All",
    eligibleClasses: ["VII", "VIII", "IX", "X", "XI", "XII"],
    scoringType: "Metric",
    measurementUnit: "Height (m)",
    description: "Vertical bar jump competition",
  },
  {
    academicYear: new Date().getFullYear(),
    name: "Shot Put",
    category: "Field",
    gender: "All",
    eligibleClasses: ["VII", "VIII", "IX", "X", "XI", "XII"],
    scoringType: "Metric",
    measurementUnit: "Distance (m)",
    description: "Heavy spherical ball throw with 3 trials",
  },
  {
    academicYear: new Date().getFullYear(),
    name: "Discus Throw",
    category: "Field",
    gender: "All",
    eligibleClasses: ["IX", "X", "XI", "XII"],
    scoringType: "Metric",
    measurementUnit: "Distance (m)",
    description: "Heavy disc throw with 3 trials",
  },
  {
    academicYear: new Date().getFullYear(),
    name: "4x100m Relay",
    category: "Track",
    gender: "All",
    eligibleClasses: ["V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"],
    scoringType: "Metric",
    measurementUnit: "Time (s)",
    description: "Four-athlete baton relay",
  },
  {
    academicYear: new Date().getFullYear(),
    name: "Sack Race",
    category: "Fun",
    gender: "All",
    eligibleClasses: ["V", "VI", "VII", "VIII"],
    scoringType: "Rank_Only",
    measurementUnit: "None",
    description: "Fun race in burlap sacks",
  },
  {
    academicYear: new Date().getFullYear(),
    name: "Spoon & Marble Race",
    category: "Fun",
    gender: "All",
    eligibleClasses: ["V", "VI", "VII"],
    scoringType: "Rank_Only",
    measurementUnit: "None",
    description: "Balancing marble on a spoon held in mouth",
  },
  {
    academicYear: new Date().getFullYear(),
    name: "Tug of War",
    category: "Fun",
    gender: "All",
    eligibleClasses: ["V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"],
    scoringType: "Rank_Only",
    measurementUnit: "None",
    description: "Rope pulling team competition",
  },
];
