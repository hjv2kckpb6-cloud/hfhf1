// Types for the Famille Meay application

export interface User {
  steamId: string;
  username: string;
  avatar: string;
  grade: string;
  isFamilyMember: boolean;
  status: 'active' | 'inactive';
  hoursPlayedMonth: number;
  hoursPlayedWeek: number;
  joinedAt: string;
  lastLogin: string;
}

export interface Grade {
  id: string;
  name: string;
  color: string;
  permissions: Permission[];
  autoKickPoints: number;
  isFamilyMember: boolean;
}

export interface Permission {
  id: string;
  name: string;
  description: string;
  granted: boolean;
}

export interface Application {
  id: string;
  applicantName: string;
  applicantSteamId: string;
  applicantAvatar: string;
  motivation: string;
  whyJoin: string;
  status: 'pending' | 'accepted' | 'rejected';
  votes: Vote[];
  createdAt: string;
  decidedAt?: string;
  decidedBy?: string;
}

export interface Vote {
  voterId: string;
  voterName: string;
  vote: 'accept' | 'reject';
  comment?: string;
  timestamp: string;
}

export interface Sanction {
  id: string;
  targetId: string;
  targetName: string;
  issuerId: string;
  issuerName: string;
  type: 'oral_warning' | 'written_warning' | 'banishment';
  points: number;
  reason: string;
  createdAt: string;
}

export interface Notification {
  id: string;
  type: 'application' | 'vote' | 'decision' | 'grade_change' | 'announcement' | 'purge_reminder';
  title: string;
  message: string;
  read: boolean;
  timestamp: string;
  link?: string;
}

export interface Log {
  id: string;
  userId: string;
  userName: string;
  action: string;
  details: string;
  timestamp: string;
}

export interface FamilyMessage {
  id: string;
  type: 'auto' | 'manual' | 'announcement';
  content: string;
  author?: string;
  timestamp: string;
}

export interface TrustedPerson {
  id: string;
  name: string;
  steamId: string;
  addedBy: string;
  addedAt: string;
  note?: string;
}

export interface AvoidedPerson {
  id: string;
  name: string;
  steamId: string;
  addedBy: string;
  addedAt: string;
  reason: string;
}

export interface SteamPlayer {
  steamid: string;
  communityvisibilitystate: number;
  profilestate: number;
  personaname: string;
  profileurl: string;
  avatar: string;
  avatarmedium: string;
  avatarfull: string;
  avatarhash: string;
  lastlogoff: number;
  personastate: number;
  commentpermission: number;
}

export interface SteamSession {
  session_time: number;
  start: string;
  end: string;
}

export interface Server {
  id: number;
  name: string;
  players: number;
  max_players: number;
  address: string;
  map: string;
  gamemode: string;
}

export interface PurgeVote {
  id: string;
  month: number;
  year: number;
  votes: {
    userId: string;
    userName: string;
    present: boolean;
    timestamp: string;
  }[];
}
