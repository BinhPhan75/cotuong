export type BoardColor = 'red' | 'black';

export type PieceType = 'R' | 'H' | 'E' | 'A' | 'K' | 'C' | 'P'; 
// R: Rook (Xe), H: Horse (Mã), E: Elephant (Tượng), A: Advisor (Sĩ), K: King (Tướng), C: Cannon (Pháo), P: Pawn (Tốt)

export interface Piece {
  id: string;
  type: PieceType;
  color: BoardColor;
  label: string; // Standard Chinese glyph e.g. '車'
  nameVi: string; // 'Xe', 'Pháo', 'Mã'
}

export type GridPosition = {
  r: number; // 0 to 9 index (row)
  c: number; // 0 to 8 index (column)
};

export type ChessBoardState = (Piece | null)[][];

export interface LivePlayer {
  username: string;
  nickname: string;
  avatar: string;
  color: BoardColor | null;
  timeLeft: number; // remaining seconds
  connected: boolean;
  score: number;
}

export interface QueueItem {
  id: string;
  username: string;
  nickname: string;
  avatar: string;
  joinedAt: number;
  code?: string; // Verification 4-digit code
  verified: boolean;
}

export interface TikTokUser {
  username: string;
  nickname: string;
  avatar: string;
  elo: number;
  wins: number;
  losses: number;
  streak: number;
}

export interface LeaderboardEntry extends TikTokUser {
  rank: number;
}

export interface ChatMessage {
  id: string;
  username: string;
  nickname: string;
  avatar: string;
  text: string;
  type: 'chat' | 'system' | 'gift';
  giftName?: string;
  giftCount?: number;
  timestamp: number;
}

export interface GameSettings {
  turnTimeLimit: number; // e.g. 30, 45, 60 seconds
  automaticQueue: boolean;
  freeMoveMode: boolean; // Overrule standard chess movement constraint for demo/mentoring
}

export interface GameState {
  board: ChessBoardState;
  turn: BoardColor;
  activePlayers: {
    red: LivePlayer | null;
    black: LivePlayer | null;
  };
  winner: BoardColor | 'draw' | null;
  isBlindActive: {
    red: boolean; // Is Red blinded (cannot see or board obscured for 10s)
    black: boolean; // Is Black blinded
  };
  blindTimeouts: {
    red: number; // timestamp when blind ends
    black: number;
  };
  settings: GameSettings;
  queue: QueueItem[];
  chatFeed: ChatMessage[];
  lastMove: {
    from: GridPosition;
    to: GridPosition;
    piece: Piece;
  } | null;
}
