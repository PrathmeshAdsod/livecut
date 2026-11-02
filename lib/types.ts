export type RoundStatus =
  | "draft"
  | "open"
  | "paused"
  | "closed"
  | "revealing"
  | "completed";
export type Creator = {
  id: string;
  login: string;
  name: string;
  avatar: string;
  demo: number;
};
export type Round = {
  id: string;
  creatorId: string;
  creatorName?: string;
  title: string;
  context: string;
  clipType: string;
  clipUrl: string;
  mode: string;
  duration: number;
  limit: number;
  status: RoundStatus;
  created: number;
  ends: number | null;
  remaining: number | null;
  overlayToken?: string;
  revealId: string | null;
  winnerId: string | null;
  shortlistSource: string | null;
  shortlistNote: string | null;
  aiCalls: number;
  revision: number;
  count?: number;
  realCount?: number;
  demo?: number;
};
export type Entry = {
  id: string;
  roundId: string;
  nickname: string;
  mode: string;
  headline: string;
  detail: string;
  status: "pending" | "approved" | "rejected";
  synthetic: number;
  suggested: number;
  reason: string | null;
  created: number;
};
export type RoundData = {
  round: Round;
  entries: Entry[];
  mine: Entry[];
  owner: boolean;
};
