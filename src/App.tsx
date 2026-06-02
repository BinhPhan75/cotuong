import React, { useEffect, useState, useRef } from 'react';
import { GameState, GridPosition, BoardColor, QueueItem, LivePlayer, ChatMessage, LeaderboardEntry } from './types';
import ChessBoard from './components/ChessBoard';
import DanmakuChat, { FlyingDanmakuContainer } from './components/DanmakuChat';
import LiveQueue from './components/LiveQueue';
import LiveSimulator from './components/LiveSimulator';
import Leaderboard from './components/Leaderboard';
import GiftNotification from './components/GiftNotification';
import { 
  Swords, 
  Settings, 
  Trophy, 
  Activity, 
  RefreshCcw, 
  AlertCircle, 
  Info, 
  Sparkles, 
  Undo2, 
  Compass, 
  Laptop, 
  Smartphone, 
  Clock, 
  Flame, 
  UserPlus, 
  Check, 
  UserCheck, 
  Power,
  XCircle,
  Award
} from 'lucide-react';

export default function App() {
  // Application roles and views state
  const [activeTab, setActiveTab] = useState<'arena' | 'admin' | 'leaderboard'>('arena');
  const [sessionToken, setSessionToken] = useState('');
  
  // Assigned player perspective for testing/acting of moves
  const [currentUserColor, setCurrentUserColor] = useState<BoardColor | null>(null);
  const [usernameInput, setUsernameInput] = useState('');
  const [isSelfVerified, setIsSelfVerified] = useState(false);

  // Core Game Sync States (Synchronized via Express SSE)
  const [gameState, setGameState] = useState<GameState>({
    board: Array(10).fill(null).map(() => Array(9).fill(null)),
    turn: 'red',
    activePlayers: { red: null, black: null },
    winner: null,
    isBlindActive: { red: false, black: false },
    blindTimeouts: { red: 0, black: 0 },
    settings: { turnTimeLimit: 30, automaticQueue: true, freeMoveMode: false },
    queue: [],
    chatFeed: [],
    lastMove: null
  });

  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [isEditingSettings, setIsEditingSettings] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [sseConnected, setSseConnected] = useState(false);

  // Form states for Admin start-match selects
  const [adminSelectRed, setAdminSelectRed] = useState('');
  const [adminSelectBlack, setAdminSelectBlack] = useState('');

  // Local settings copy for edits
  const [adminTurnLimit, setAdminTurnLimit] = useState(30);
  const [adminAutoQueue, setAdminAutoQueue] = useState(true);
  const [adminFreeMove, setAdminFreeMove] = useState(false);

  const boardAreaRef = useRef<HTMLDivElement>(null);

  // 1. Setup Local Session Identifier & Fetch Initial Leaderboard
  useEffect(() => {
    let token = localStorage.getItem('tiktok_xiangqi_session');
    if (!token) {
      token = 'sess_' + Math.random().toString(36).substring(2, 10);
      localStorage.setItem('tiktok_xiangqi_session', token);
    }
    setSessionToken(token);

    fetchLeaderboard();
  }, []);

  // 2. Setup Server-Sent Events (SSE) Live Feed Tunnel
  useEffect(() => {
    let eventSource: EventSource | null = null;

    function connectSSE() {
      eventSource = new EventSource('/api/events');

      eventSource.onopen = () => {
        setSseConnected(true);
        setApiError(null);
      };

      eventSource.onmessage = (event) => {
        try {
          const freshState = JSON.parse(event.data) as GameState;
          setGameState(freshState);
        } catch (err) {
          console.error("Error parsing GameState SSE event:", err);
        }
      };

      eventSource.onerror = (err) => {
        console.error("SSE connection failed. Retrying in 4 seconds:", err);
        setSseConnected(false);
        eventSource?.close();
        setTimeout(connectSSE, 4000); // Backoff retry
      };
    }

    connectSSE();

    return () => {
      eventSource?.close();
    };
  }, []);

  // Pull leaderboard statistics manually
  const fetchLeaderboard = async () => {
    try {
      const res = await fetch('/api/leaderboard');
      if (res.ok) {
        const data = await res.json();
        setLeaderboard(data);
      }
    } catch (err) {
      console.error("Failed to fetch leaderboard data", err);
    }
  };

  // Keep leaderboard synced when ván cờ finishes
  useEffect(() => {
    if (gameState.winner) {
      fetchLeaderboard();
    }
  }, [gameState.winner]);

  // Handle errors
  const triggerError = (msg: string) => {
    setApiError(msg);
    setTimeout(() => setApiError(null), 5000);
  };

  // Core actions to send moves
  const handleMakeMove = async (from: GridPosition, to: GridPosition) => {
    if (!sseConnected) {
      triggerError("Đang mất kết nối real-time. Vui lòng đợi!");
      return;
    }

    // Determine current user acting name
    let actingUser = "";
    if (currentUserColor === 'red' && gameState.activePlayers.red) {
      actingUser = gameState.activePlayers.red.username;
    } else if (currentUserColor === 'black' && gameState.activePlayers.black) {
      actingUser = gameState.activePlayers.black.username;
    } else if (gameState.settings.freeMoveMode) {
      // Admin or developer free moving - bypass restrictions utilizing current turn's active name
      actingUser = gameState.turn === 'red' 
        ? gameState.activePlayers.red?.username || "co_thu_do"
        : gameState.activePlayers.black?.username || "co_thu_den";
    } else {
      triggerError("Bạn đang ở chế độ xem (Spectator). Vui lòng chọn bên chơi Red/Black để đóng vai và di chuyển quân!");
      return;
    }

    setIsLoading(true);
    setApiError(null);

    try {
      const res = await fetch('/api/match/move', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ from, to, username: actingUser })
      });

      if (!res.ok) {
        const errJson = await res.json();
        triggerError(errJson.error || "Nước đi phạm luật cờ tướng!");
      }
    } catch (err) {
      triggerError("Không thể kết nối đến server. Vui lòng kiểm tra internet!");
    } finally {
      setIsLoading(false);
    }
  };

  // Request code for alignment code box
  const handleRequestCode = async (): Promise<string> => {
    const res = await fetch('/api/queue/request-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionToken })
    });
    const parsed = await res.json();
    return parsed.code;
  };

  // Register in temporary queue list
  const handleJoinQueue = async (username: string, nickname: string) => {
    const res = await fetch('/api/queue/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, nickname })
    });
    return await res.json();
  };

  // Withdraw queue
  const handleLeaveQueue = async (username: string) => {
    await fetch('/api/queue/leave', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username })
    });
  };

  // Simulated live event (Chat / like / gift)
  const handleSimulateEvent = async (payload: any) => {
    try {
      const res = await fetch('/api/tiktok/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      return await res.json();
    } catch (err) {
      console.error(err);
    }
  };

  // Administrative actions
  const handleAdminReset = async () => {
    await fetch('/api/admin/reset', { method: 'POST' });
  };

  const handleAdminStartMatch = async () => {
    setIsLoading(true);
    try {
      await fetch('/api/admin/start-match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          redUserId: adminSelectRed || undefined,
          blackUserId: adminSelectBlack || undefined,
        })
      });
      // Clear inputs
      setAdminSelectRed('');
      setAdminSelectBlack('');
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdminForfeit = async (winnerColor: BoardColor | 'draw') => {
    await fetch('/api/admin/declare-outcome', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ outcome: winnerColor })
    });
  };

  const handleAdminUndo = async () => {
    try {
      const res = await fetch('/api/admin/undo', { method: 'POST' });
      if (!res.ok) {
        const parsed = await res.json();
        triggerError(parsed.error || "Không thể lùi cờ!");
      }
    } catch (err) {
      triggerError("Lỗi hệ thống khi lùi cờ.");
    }
  };

  const handleAdminKick = async (color: BoardColor) => {
    await fetch('/api/admin/kick', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ color })
    });
  };

  const handleAdminSaveSettings = async () => {
    await fetch('/api/admin/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        turnTimeLimit: Number(adminTurnLimit),
        automaticQueue: adminAutoQueue,
        freeMoveMode: adminFreeMove
      })
    });
    setIsEditingSettings(false);
  };

  // Sync copy states when settings update from backend
  useEffect(() => {
    setAdminTurnLimit(gameState.settings.turnTimeLimit);
    setAdminAutoQueue(gameState.settings.automaticQueue);
    setAdminFreeMove(gameState.settings.freeMoveMode);
  }, [gameState.settings]);

  // Simulated auto-claim mechanism (Role Assign help)
  // Let user key in their custom TikTok ID so that when they are selected Red/Black, they can move directly!
  const claimActiveRole = (color: BoardColor) => {
    const player = gameState.activePlayers[color];
    if (player) {
      setCurrentUserColor(color);
      addLocalSystemMessage(`🎨 Bạn đã nhập vai làm Kỳ thủ @${player.username} (Phe ${color === 'red' ? 'ĐỎ' : 'ĐEN'}) để thi đấu & di chuyển quân!`);
    } else {
      triggerError(`Không có kỳ thủ nào chiếm vị thế phe ${color === 'red' ? 'ĐỎ' : 'ĐEN'} để nhập vai!`);
    }
  };

  const claimSpectator = () => {
    setCurrentUserColor(null);
    addLocalSystemMessage(`👁️ Đã chuyển sang chế độ Quan sát (Khán giả) tự do.`);
  };

  const addLocalSystemMessage = (text: string) => {
    // Modify client view only briefly
    setGameState(prev => ({
      ...prev,
      chatFeed: [
        ...prev.chatFeed,
        { id: `client-info-${Date.now()}`, username: "system", nickname: "Thông báo", avatar: "", text, type: "system", timestamp: Date.now() }
      ]
    }));
  };

  const activeColorPlayer = gameState.turn === 'red' ? gameState.activePlayers.red : gameState.activePlayers.black;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-pink-500 selection:text-white pb-10">
      
      {/* 🚀 FLOAT NOTIFICATION ALERTS */}
      <GiftNotification chatFeed={gameState.chatFeed} />

      {/* 🌐 NAV / HEADER BANNER */}
      <header className="bg-slate-900/80 backdrop-blur-md border-b border-slate-800 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-col md:flex-row items-center justify-between gap-3">
          
          <div className="flex items-center gap-3">
            <span className="text-3xl animate-pulse">♟️</span>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-display font-extrabold text-white text-base tracking-tight uppercase">
                  TikTok Live Xiangqi
                </h1>
                <span className="bg-rose-500/10 text-rose-400 text-[9px] font-bold px-2 py-0.5 rounded-full border border-rose-500/20 uppercase tracking-widest flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-ping" /> Real-time
                </span>
                {sseConnected ? (
                  <span className="bg-emerald-500/10 text-emerald-400 text-[9px] font-bold px-2 py-0.5 rounded-full border border-emerald-500/20">LIVE</span>
                ) : (
                  <span className="bg-red-500/10 text-red-400 text-[9px] font-bold px-2 py-0.5 rounded-full border border-red-500/20 animate-pulse">DISCONNECT</span>
                )}
              </div>
              <p className="text-[10px] text-slate-400">Đấu trường Cờ Tướng Tương Tác mạng xã hội • Đạo Cụ Quà Tặng</p>
            </div>
          </div>

          {/* VIEW SWITCHER TABS */}
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-850 gap-1 w-full md:w-auto">
            <button
              id="tab-arena-btn"
              onClick={() => setActiveTab('arena')}
              className={`flex-1 md:flex-initial flex items-center justify-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'arena' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'}`}
            >
              <Swords className="w-3.5 h-3.5" /> Kỳ đài PK
            </button>
            <button
              id="tab-admin-btn"
              onClick={() => setActiveTab('admin')}
              className={`flex-1 md:flex-initial flex items-center justify-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'admin' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'}`}
            >
              <Settings className="w-3.5 h-3.5" /> Quản trị (Admin)
            </button>
            <button
              id="tab-leaderboard-btn"
              onClick={() => setActiveTab('leaderboard')}
              className={`flex-1 md:flex-initial flex items-center justify-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'leaderboard' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'}`}
            >
              <Trophy className="w-3.5 h-3.5" /> Bảng xếp hạng
            </button>
          </div>

        </div>
      </header>

      {/* ⚠️ ERRORS AREA */}
      {apiError && (
        <div className="max-w-4xl mx-auto mt-4 px-4 w-full">
          <div className="bg-red-950/20 border border-red-900/40 rounded-xl p-3 flex items-center gap-2.5 text-xs text-red-300 animate-slide-up">
            <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
            <div className="flex-1 font-sans">{apiError}</div>
          </div>
        </div>
      )}

      {/* 🔮 MAIN MAIN CONTAINER */}
      <main className="flex-1 max-w-7xl mx-auto px-4 py-6 w-full space-y-6">

        {/* ---------------- 1. 📱 INTERACTIVE PK ARENA VIEW ---------------- */}
        {activeTab === 'arena' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            
            {/* LÈFT ZONE - PLAYING BOARD (60% equivalent on wide screen) */}
            <div className="lg:col-span-7 flex flex-col space-y-4">
              
              {/* STATUS HEADER (Player tags + countdown ticks) */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row gap-3 items-center justify-between shadow-lg">
                
                {/* Red status player summary */}
                <div className={`flex items-center gap-2.5 p-2 rounded-xl transition-all w-full md:w-[45%] ${gameState.turn === 'red' ? 'bg-red-950/20 border border-red-550/30 ring-1 ring-red-500/20 scale-102 font-bold' : 'opacity-65'}`}>
                  <div className="relative">
                    {gameState.activePlayers.red ? (
                      <img 
                        referrerPolicy="no-referrer"
                        src={gameState.activePlayers.red.avatar} 
                        alt="red" 
                        className={`w-10 h-10 rounded-full bg-slate-800 border-2 ${gameState.turn === 'red' ? 'border-red-500 animate-bounce' : 'border-slate-800'}`} 
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-slate-850 flex items-center justify-center text-slate-500">?</div>
                    )}
                    {gameState.isBlindActive.red && (
                      <span className="absolute -top-1 -right-1 text-xs bg-gray-900 border border-slate-700 px-1 rounded">🌫️</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-red-400 font-bold tracking-tight uppercase truncate">
                      {gameState.activePlayers.red ? gameState.activePlayers.red.nickname : "Chờ Kì Thủ Đỏ"}
                    </p>
                    <span className="text-[10px] text-slate-500 block leading-tight truncate">
                      {gameState.activePlayers.red ? `@${gameState.activePlayers.red.username}` : "Sử dụng mã để duyệt"}
                    </span>
                    {gameState.turn === 'red' && (
                      <span className="text-[9px] bg-red-500/10 text-red-400 px-1.5 rounded inline-block mt-0.5 animate-pulse font-mono tracking-widest font-bold">LƯỢT ĐỎ</span>
                    )}
                  </div>
                  {gameState.activePlayers.red && (
                    <div className="text-right">
                      <span className={`font-mono text-base font-bold leading-none tracking-tight ${gameState.turn === 'red' && gameState.activePlayers.red.timeLeft <= 10 ? 'text-red-500 animate-pulse' : 'text-slate-300'}`}>
                        {gameState.activePlayers.red.timeLeft}s
                      </span>
                    </div>
                  )}
                </div>

                {/* Turn separator */}
                <div className="text-center shrink-0">
                  <div className="w-7 h-7 rounded-full bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-[10px] text-indigo-400 font-bold font-mono">
                    VS
                  </div>
                </div>

                {/* Black status player summary */}
                <div className={`flex items-center gap-2.5 p-2 rounded-xl transition-all w-full md:w-[45%] ${gameState.turn === 'black' ? 'bg-slate-800/40 border border-slate-550/40 ring-1 ring-slate-500/20 scale-102 font-bold' : 'opacity-65'}`}>
                  <div className="relative">
                    {gameState.activePlayers.black ? (
                      <img 
                        referrerPolicy="no-referrer"
                        src={gameState.activePlayers.black.avatar} 
                        alt="black" 
                        className={`w-10 h-10 rounded-full bg-slate-950 border-2 ${gameState.turn === 'black' ? 'border-white animate-bounce' : 'border-slate-800'}`} 
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-slate-850 flex items-center justify-center text-slate-500">?</div>
                    )}
                    {gameState.isBlindActive.black && (
                      <span className="absolute -top-1 -right-1 text-xs bg-gray-900 border border-slate-700 px-1 rounded">🌫️</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-350 font-bold tracking-tight uppercase truncate">
                      {gameState.activePlayers.black ? gameState.activePlayers.black.nickname : "Chờ Kì Thủ Đen"}
                    </p>
                    <span className="text-[10px] text-slate-500 block leading-tight truncate">
                      {gameState.activePlayers.black ? `@${gameState.activePlayers.black.username}` : "Đợi Admin duyệt trận"}
                    </span>
                    {gameState.turn === 'black' && (
                      <span className="text-[9px] bg-slate-800 text-slate-300 px-1.5 rounded inline-block mt-0.5 animate-pulse font-mono tracking-widest font-bold border border-slate-700">LƯỢT ĐEN</span>
                    )}
                  </div>
                  {gameState.activePlayers.black && (
                    <div className="text-right">
                      <span className={`font-mono text-base font-bold leading-none tracking-tight ${gameState.turn === 'black' && gameState.activePlayers.black.timeLeft <= 10 ? 'text-red-500 animate-pulse' : 'text-slate-300'}`}>
                        {gameState.activePlayers.black.timeLeft}s
                      </span>
                    </div>
                  )}
                </div>

              </div>

              {/* CHESSBOARD GRAPHIC CONTAINER WITH SLIDING DANMAKU */}
              <div 
                ref={boardAreaRef} 
                className="relative w-full overflow-hidden"
              >
                
                {/* Real-time Flying Comments overlay directly in front of the board */}
                <FlyingDanmakuContainer chatFeed={gameState.chatFeed} />

                {/* The board itself */}
                <ChessBoard
                  board={gameState.board}
                  turn={gameState.turn}
                  currentUserColor={currentUserColor}
                  onMove={handleMakeMove}
                  lastMove={gameState.lastMove}
                  isLoading={isLoading}
                  isBlind={(currentUserColor === 'red' && gameState.isBlindActive.red) || (currentUserColor === 'black' && gameState.isBlindActive.black)}
                  freeMoveMode={gameState.settings.freeMoveMode}
                  timeLeft={activeColorPlayer?.timeLeft || 0}
                />

                {gameState.winner && (
                  <div className="absolute inset-0 z-30 bg-black/85 backdrop-blur-sm flex flex-col items-center justify-center text-center p-6 rounded-2xl animate-fade-in border-2 border-yellow-500/35">
                    <div className="inline-block p-4 rounded-full bg-yellow-500/10 text-yellow-400 mb-3 border border-yellow-500/20">
                      <Trophy className="w-12 h-12 stroke-yellow-500 fill-yellow-500/15 animate-bounce" />
                    </div>
                    <span className="text-[10px] font-mono text-yellow-500 uppercase tracking-widest font-bold">Ván đấu hoàn thành</span>
                    <h3 className="text-2xl font-display font-extrabold text-white mt-1 leading-normal">
                      PHE {gameState.winner === 'red' ? 'ĐỎ' : 'ĐEN'} THẮNG CUỘC!
                    </h3>
                    <p className="text-gray-400 text-xs mt-2 max-w-sm">
                      {gameState.winner === 'red' 
                        ? `Chúc mừng kỳ thủ ${gameState.activePlayers.red?.nickname} đã dành chiến thắng vẻ vang!`
                        : `Chúc mừng kỳ thủ ${gameState.activePlayers.black?.nickname} đã dành chiến thắng vẻ vang!`
                      }
                    </p>
                    <div className="mt-5 text-[11px] text-indigo-400 font-medium bg-indigo-950/40 border border-indigo-900/30 px-3.5 py-1.5 rounded-full animate-pulse">
                      Hệ thống tự động đổi người từ hàng chờ...
                    </div>
                  </div>
                )}
              </div>

              {/* 📲 ROLE SELECTION & DEBUG PANELS (For testing both sides) */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1">
                    🎯 CHỌN TƯ CÁCH CHƠI (TESTER ROLE SELECTION)
                  </span>
                  
                  <span className="text-[10px] text-indigo-400 bg-indigo-950/50 px-2 py-0.5 rounded border border-indigo-900/30 font-semibold uppercase font-mono">
                    Hiện tại: {currentUserColor === 'red' ? '🔴 Kỳ thủ Đỏ' : currentUserColor === 'black' ? '⚫ Kỳ thủ Đen' : '👁️ Quan sát'}
                  </span>
                </div>
                
                <p className="text-[10px] text-slate-400 leading-normal mb-1">
                  Do chạy trên môi trường giả lập dev, bạn có thể tự đổi vai trò của mình thành Kỳ thủ ĐỎ, Kỳ thủ ĐEN (để thử thách kéo cờ) hoặc làm GIÁM SÁT (Khán giả xem).
                </p>

                <div className="grid grid-cols-3 gap-2">
                  <button
                    id="claim-red-role-btn"
                    type="button"
                    onClick={() => claimActiveRole('red')}
                    className={`px-3 py-2 text-xs font-bold rounded-lg transition-all ${currentUserColor === 'red' ? 'bg-red-6500 text-white border-2 border-red-500' : 'bg-slate-950 border border-slate-850 hover:bg-slate-800 text-red-400'}`}
                  >
                    🔴 Chơi Đăng Vai ĐỎ
                  </button>
                  <button
                    id="claim-black-role-btn"
                    type="button"
                    onClick={() => claimActiveRole('black')}
                    className={`px-3 py-2 text-xs font-bold rounded-lg transition-all ${currentUserColor === 'black' ? 'bg-slate-800 text-white border-2 border-slate-400' : 'bg-slate-950 border border-slate-850 hover:bg-slate-800 text-slate-300'}`}
                  >
                    ⚫ Chơi Đăng Vai ĐEN
                  </button>
                  <button
                    id="claim-spectator-btn"
                    type="button"
                    onClick={claimSpectator}
                    className={`px-3 py-2 text-xs font-bold rounded-lg transition-all ${currentUserColor === null ? 'bg-indigo-600 text-white shadow' : 'bg-slate-950 border border-slate-850 hover:bg-slate-800 text-slate-400'}`}
                  >
                    👁️ Làm Spectator (Xem)
                  </button>
                </div>
              </div>

            </div>

            {/* RIGHT ZONE - LIVE DISCUSSION STREAM (40% equivalent on wide screen) */}
            <div className="lg:col-span-5 flex flex-col space-y-6">
              
              {/* Active Verification Registrations Screen */}
              <LiveQueue
                queue={gameState.queue}
                activePlayers={gameState.activePlayers}
                onJoinQueue={handleJoinQueue}
                onLeaveQueue={handleLeaveQueue}
                onRequestCode={handleRequestCode}
              />

              {/* Stream Chat Area with color markings */}
              <div className="h-[430px]">
                <DanmakuChat chatFeed={gameState.chatFeed} />
              </div>

            </div>

          </div>
        )}

        {/* ---------------- 2. 🖥️ ADMINISTRATIVE CONTROL SHEET ---------------- */}
        {activeTab === 'admin' && (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
            
            {/* LÈFT PANEL - CONFIGS */}
            <div className="md:col-span-7 space-y-6">
              
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
                <div className="flex items-center justify-between border-b border-slate-805 pb-3">
                  <div className="flex items-center gap-2.5">
                    <Laptop className="text-indigo-400 w-5 h-5" />
                    <div>
                      <h3 className="font-display font-bold text-sm text-white">BÀN ĐIỀU KHIỂN STREAMER</h3>
                      <p className="text-[11px] text-slate-400">Trình kiểm soát sảnh & bắt cặp trận PK</p>
                    </div>
                  </div>

                  <button
                    id="admin-reset-board-btn"
                    onClick={handleAdminReset}
                    className="bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 hover:text-white px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all"
                  >
                    <RefreshCcw className="w-3.5 h-3.5 animate-spin" /> Làm mới bàn cờ
                  </button>
                </div>

                {/* Start Match pairing panel */}
                <div className="space-y-3 bg-slate-950/60 p-4 rounded-xl border border-slate-850">
                  <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block">
                    ⚡ Duyệt bắt đầu trận đấu mới
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Red select options */}
                    <div>
                      <label className="block text-[10px] text-slate-500 font-medium mb-1">Chọn Kỳ thủ phe ĐỎ (Hàng chờ)</label>
                      <select
                        id="admin-select-red-player"
                        value={adminSelectRed}
                        onChange={(e) => setAdminSelectRed(e.target.value)}
                        className="w-full bg-slate-900 text-xs border border-slate-800 rounded-lg px-2.5 py-2 text-white focus:outline-none"
                      >
                        <option value="">-- Click chọn (Mặc định ngẫu nhiên) --</option>
                        {gameState.queue.filter(q => q.verified).map(item => (
                          <option key={`red-sel-${item.id}`} value={item.id}>
                            @{item.username} ({item.nickname})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Black select options */}
                    <div>
                      <label className="block text-[10px] text-slate-500 font-medium mb-1">Chọn Kỳ thủ phe ĐEN (Hàng chờ)</label>
                      <select
                        id="admin-select-black-player"
                        value={adminSelectBlack}
                        onChange={(e) => setAdminSelectBlack(e.target.value)}
                        className="w-full bg-slate-900 text-xs border border-slate-800 rounded-lg px-2.5 py-2 text-white focus:outline-none"
                      >
                        <option value="">-- Click chọn (Mặc định ngẫu nhiên) --</option>
                        {gameState.queue.filter(q => q.verified).map(item => (
                          <option key={`black-sel-${item.id}`} value={item.id}>
                            @{item.username} ({item.nickname})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <button
                    id="admin-start-match-btn"
                    onClick={handleAdminStartMatch}
                    disabled={isLoading}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs py-2 rounded-lg transition-all mt-2 flex items-center justify-center gap-1.5"
                  >
                    <Swords className="w-4 h-4" /> BẮT ĐẦU TRẬN ĐẤU PK ĐỜI THỰC!
                  </button>
                </div>

                {/* Settings Editor sheet */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-300 uppercase tracking-widest flex items-center gap-1.5">
                      ⚙️ THIẾT LẬP LUẬT CHƠI (SETTINGS)
                    </span>
                    {!isEditingSettings ? (
                      <button
                        id="edit-settings-btn"
                        onClick={() => setIsEditingSettings(true)}
                        className="text-[11px] text-indigo-400 hover:underline font-semibold"
                      >
                        Chỉnh sửa
                      </button>
                    ) : (
                      <div className="flex gap-2">
                        <button
                          id="save-settings-btn"
                          onClick={handleAdminSaveSettings}
                          className="text-[11px] text-emerald-400 hover:underline font-bold"
                        >
                          Lưu lại
                        </button>
                        <button
                          id="cancel-settings-btn"
                          onClick={() => {
                            setIsEditingSettings(false);
                            // revert views
                            setAdminTurnLimit(gameState.settings.turnTimeLimit);
                            setAdminAutoQueue(gameState.settings.automaticQueue);
                            setAdminFreeMove(gameState.settings.freeMoveMode);
                          }}
                          className="text-[11px] text-slate-500 hover:underline"
                        >
                          Hủy
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Settings fields */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-950/30 p-4 rounded-xl border border-slate-850">
                    
                    {/* Field 1: Timer limit */}
                    <div>
                      <label className="block text-[10px] text-slate-500 font-medium mb-1">Thời gian từng lượt suy nghĩ</label>
                      {isEditingSettings ? (
                        <select
                          id="admin-time-limit"
                          value={adminTurnLimit}
                          onChange={(e) => setAdminTurnLimit(Number(e.target.value))}
                          className="bg-slate-900 border border-slate-800 rounded px-2.5 py-1 text-xs text-white focus:outline-none w-full"
                        >
                          <option value={15}>15 giây</option>
                          <option value={30}>30 giây</option>
                          <option value={45}>45 giây</option>
                          <option value={60}>60 giây</option>
                        </select>
                      ) : (
                        <span className="text-xs font-bold text-slate-200 mt-1 block">
                          ⏱️ {gameState.settings.turnTimeLimit} giây
                        </span>
                      )}
                    </div>

                    {/* Field 2: Queue rotation */}
                    <div>
                      <label className="block text-[10px] text-slate-500 font-medium mb-1">Xoay chuyển hàng chờ tự động</label>
                      {isEditingSettings ? (
                        <div className="flex items-center gap-2 mt-1">
                          <input
                            id="admin-auto-queue-cb"
                            type="checkbox"
                            checked={adminAutoQueue}
                            onChange={(e) => setAdminAutoQueue(e.target.checked)}
                            className="w-4 h-4 bg-slate-900 rounded border-slate-800 text-indigo-600 focus:ring-0 focus:outline-none"
                          />
                          <span className="text-xs text-slate-350 font-medium">Bật tự động</span>
                        </div>
                      ) : (
                        <span className="text-xs font-bold text-slate-200 mt-1 block">
                          {gameState.settings.automaticQueue ? "✅ Đang bật (Winner đấu tiếp)" : "❌ Đang tắt"}
                        </span>
                      )}
                    </div>

                    {/* Field 3: Free move rule */}
                    <div>
                      <label className="block text-[10px] text-slate-500 font-medium mb-1">Đi cờ tự do (Free move / Thầy giáo)</label>
                      {isEditingSettings ? (
                        <div className="flex items-center gap-2 mt-1">
                          <input
                            id="admin-free-move-cb"
                            type="checkbox"
                            checked={adminFreeMove}
                            onChange={(e) => setAdminFreeMove(e.target.checked)}
                            className="w-4 h-4 bg-slate-900 rounded border-slate-800 text-indigo-600 focus:ring-0 focus:outline-none"
                          />
                          <span className="text-xs text-slate-350 font-medium">Cho phép di chuyển tự do</span>
                        </div>
                      ) : (
                        <span className="text-xs font-bold text-slate-200 mt-1 block text-amber-500">
                          {gameState.settings.freeMoveMode ? "🛡️ Đang bật (Hỗ trợ dạy học)" : "⚖️ Đang tắt (Luật chuẩn)"}
                        </span>
                      )}
                    </div>

                  </div>
                </div>

                {/* Sudden Force Outcomes Decision makers */}
                <div className="space-y-3.5 border-t border-slate-850 pt-4">
                  <span className="text-[11px] font-bold text-slate-300 uppercase tracking-widest block">
                     ⚖️ QUYẾT ĐỊNH KẾT QUẢ KHẨN CẤP (MANUAL OVERRULE)
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <button
                      id="admin-declare-red-win"
                      onClick={() => handleAdminForfeit('red')}
                      className="bg-red-950/40 hover:bg-red-900/30 text-red-400 border border-red-900/30 px-3 py-2 rounded-xl text-xs font-bold transition-all"
                    >
                      Xác nhận ĐỎ thắng 🏆
                    </button>
                    <button
                      id="admin-declare-black-win"
                      onClick={() => handleAdminForfeit('black')}
                      className="bg-slate-900 hover:bg-slate-800 text-stone-200 border border-slate-800 px-3 py-2 rounded-xl text-xs font-bold transition-all"
                    >
                      Xác nhận ĐEN thắng 🏆
                    </button>
                    <button
                      id="admin-declare-draw"
                      onClick={() => handleAdminForfeit('draw')}
                      className="bg-indigo-950/20 hover:bg-indigo-950/40 text-indigo-400 border border-indigo-900/20 px-3 py-2 rounded-xl text-xs font-bold transition-all"
                    >
                      Xác nhận HÒA cuộc 🤝
                    </button>
                  </div>
                </div>

                {/* Kick out / Substitution */}
                <div className="grid grid-cols-2 gap-3 border-t border-slate-850 pt-4">
                  <div>
                    <span className="text-[10px] font-semibold text-slate-500 block mb-1">Phe ĐỎ hiện tại</span>
                    <button
                      id="kick-red-btn"
                      onClick={() => handleAdminKick('red')}
                      disabled={!gameState.activePlayers.red}
                      className="w-full bg-slate-950 hover:bg-red-950/20 text-slate-400 hover:text-red-400 border border-slate-850 hover:border-red-900/30 py-2 rounded-lg text-xs font-bold transition-all disabled:opacity-50"
                    >
                      🚨 Trục xuất ĐỎ (Kick Red)
                    </button>
                  </div>
                  <div>
                    <span className="text-[10px] font-semibold text-slate-500 block mb-1">Phe ĐEN hiện tại</span>
                    <button
                      id="kick-black-btn"
                      onClick={() => handleAdminKick('black')}
                      disabled={!gameState.activePlayers.black}
                      className="w-full bg-slate-950 hover:bg-red-950/20 text-slate-400 hover:text-red-400 border border-slate-850 hover:border-red-900/30 py-2 rounded-lg text-xs font-bold transition-all disabled:opacity-50"
                    >
                      🚨 Trục xuất ĐEN (Kick Black)
                    </button>
                  </div>
                </div>

              </div>
            </div>

            {/* RIGHT PANEL - CHEAT CODES / EXTRA EVENTS / UNDOS */}
            <div className="md:col-span-5 space-y-6">
              
              {/* Undo action button (Hồi cờ) */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
                <div className="flex items-center gap-2.5">
                  <Undo2 className="text-yellow-500 w-5 h-5" />
                  <div>
                    <h3 className="font-display font-bold text-sm text-white">HOÀN NƯỚC CỜ (UNDO ENGINE)</h3>
                    <p className="text-[11px] text-slate-400">Cho phép quay lại nước cờ trước đó</p>
                  </div>
                </div>

                <p className="text-[10px] text-slate-400 leading-normal">
                  Chế độ này giúp kỳ thủ có thể hoàn cờ (Undo) khi tặng siêu quà hoặc nhận được phê duyệt đặc cách của Admin / Khán giả.
                </p>

                <button
                  id="admin-undo-btn"
                  onClick={handleAdminUndo}
                  className="w-full bg-gradient-to-r from-yellow-600 via-amber-600 to-amber-500 hover:brightness-110 text-slate-950 font-bold text-xs py-2.5 rounded-lg transition-all flex items-center justify-center gap-1"
                >
                  <Undo2 className="w-4 h-4 text-slate-950 font-bold" /> HỒI LẠI 1 NƯỚC (UNDO MOVE)
                </button>
              </div>

              {/* Verified queue overview for administrators */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-3">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                  DANH SÁCH DUYỆT TỰ ĐỘNG
                </h4>
                <p className="text-[10px] text-slate-400 leading-normal">
                   Kỳ thủ nhập đúng mã số 4 chữ cái ngẫu nhiên trên TikTok Live Simulator sẽ chuyển sang trạng thái "ĐÃ XÁC THỰC" và hiển thị lựa chọn ở đây.
                </p>

                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {gameState.queue.map((item) => (
                    <div key={`admin-list-${item.id}`} className="flex items-center justify-between p-2 bg-slate-950/65 rounded-lg border border-slate-850">
                      <div className="flex items-center gap-2 min-w-0">
                        <img referrerPolicy="no-referrer" src={item.avatar} alt="item" className="w-6 h-6 rounded-full bg-slate-850" />
                        <div className="min-w-0">
                          <span className="text-slate-200 text-xs font-bold block truncate">{item.nickname}</span>
                          <span className="text-slate-500 text-[9px] block truncate">@{item.username}</span>
                        </div>
                      </div>
                      <div>
                        {item.verified ? (
                          <span className="text-[8px] bg-emerald-950 text-emerald-400 border border-emerald-900/35 px-1.5 py-0.5 rounded font-bold uppercase">Verified</span>
                        ) : (
                          <span className="text-[8px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded font-bold uppercase">Awaiting Code</span>
                        )}
                      </div>
                    </div>
                  ))}
                  {gameState.queue.length === 0 && (
                     <div className="text-center py-4 text-slate-500 text-[10px] font-mono">Trống. Không có ai đang xếp hàng.</div>
                  )}
                </div>
              </div>

            </div>

          </div>
        )}

        {/* ---------------- 3. 📊 LEADERBOARD DASHBOARD VIEW ---------------- */}
        {activeTab === 'leaderboard' && (
          <div className="max-w-3xl mx-auto">
            <Leaderboard entries={leaderboard} />
          </div>
        )}

        {/* ---------------- 🔴 TIKTOK INTERACTIVE INTERACTION SIMULATOR ---------------- */}
        {/* Render fully integrated below so users can test any tab they want! */}
        <div className="border-t border-slate-850 pt-8 mt-10">
          <div className="max-w-4xl mx-auto">
            <div className="bg-slate-900/35 p-3.5 rounded-xl border border-dashed border-slate-800 flex items-center gap-2.5 mb-4 text-slate-400 text-xs leading-relaxed">
              <Info className="w-5 h-5 text-indigo-400 flex-shrink-0" />
              <div>
                <span className="font-bold text-slate-200">🔍 Hướng dẫn thử nghiệm nhanh:</span> Để bắt đầu chơi thử làm Kỳ thủ <b>ĐỎ và ĐEN</b>:
                <ol className="list-decimal pl-5 space-y-0.5 mt-1 text-[11px] text-slate-400">
                  <li>Nhấp tab <b>"Kỳ Đấu PK"</b> ➔ Click <b>"Lấy mã liên kết đấu vật"</b> dưới bảng Xác Thực để nhận mã 4 số.</li>
                  <li>Copy mã đó, cuộn xuống <b>box giả lập chat dưới đây</b> và bấm <b>Hành Động</b> (Gửi).</li>
                  <li>Hệ thống liên kết bạn vào hàng chờ.</li>
                  <li>Nhấp tab <b>"Quản trị"</b> ➔ Chọn tài khoản của bạn tại Select box Đỏ / Đen và bấm <b>"BẮT ĐẦU TRẬN ĐẤU PK ĐỜI THỰC"</b>.</li>
                  <li>Trận đấu khai cuộc! Bạn có thể click chọn vai <b>"Vai ĐỎ / Vai ĐEN"</b> ở đỉnh sảnh cờ để kéo cờ chống lại CPU hoặc tự tập luyện cả 2 bên cực vui!</li>
                </ol>
              </div>
            </div>

            <LiveSimulator 
              queue={gameState.queue}
              onSimulateEvent={handleSimulateEvent} 
            />
          </div>
        </div>

      </main>

      {/* FOOTER */}
      <footer className="mt-12 text-center text-[10px] text-slate-600 border-t border-slate-900 pt-6">
        <p>© 2026 TikTok Live Interactive Xiangqi. Hệ thống Game Cờ Tướng Tương Tác Kéo Thả Mượt Mà.</p>
        <p className="mt-1">Dành Cho OBS Studio & TikTok Live Gifting Game. Độ trễ Real-time &lt; 50ms.</p>
      </footer>

    </div>
  );
}
