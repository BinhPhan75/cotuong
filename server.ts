import express from "express";
import path from "path";
import { 
  GameState, 
  ChessBoardState, 
  GridPosition, 
  BoardColor, 
  LivePlayer, 
  QueueItem, 
  ChatMessage, 
  TikTokUser 
} from "./src/types";
import { createInitialBoard, isValidXiangqiMove, isKingInCheck } from "./src/utils/xiangqiRules";

const app = express();
const PORT = 3000;

app.use(express.json());

// In-Memory Database / Store
let leaderboard: TikTokUser[] = [
  { username: "pro_ky_thu", nickname: "Vua Cờ Hải Phòng 🇻🇳", avatar: "https://api.dicebear.com/7.x/adventurer/svg?seed=Felix", elo: 1850, wins: 120, losses: 45, streak: 7 },
  { username: "co_thu_tiktok", nickname: "Cờ Thủ Gạ Kèo 🎯", avatar: "https://api.dicebear.com/7.x/adventurer/svg?seed=Anya", elo: 1620, wins: 85, losses: 60, streak: 3 },
  { username: "gia_cat_luong", nickname: "Gia Cát Khổng Minh 🌾", avatar: "https://api.dicebear.com/7.x/adventurer/svg?seed=Cody", elo: 1510, wins: 42, losses: 35, streak: 1 },
  { username: "le_binh_co", nickname: "Bình Lê Kỳ Nghệ ♟️", avatar: "https://api.dicebear.com/7.x/adventurer/svg?seed=Buster", elo: 1420, wins: 23, losses: 18, streak: 0 }
];

// Generate simple 4 digit numeric codes
const pendingVerifications = new Map<string, string>(); // code -> socket/session reference ID (we can use simple tracking)

// Game State History (for Undos)
let boardHistory: ChessBoardState[] = [];
let turnHistory: BoardColor[] = [];

// Base Game State
let state: GameState = {
  board: createInitialBoard(),
  turn: "red",
  activePlayers: {
    red: null,
    black: null,
  },
  winner: null,
  isBlindActive: {
    red: false,
    black: false,
  },
  blindTimeouts: {
    red: 0,
    black: 0,
  },
  settings: {
    turnTimeLimit: 30,
    automaticQueue: true,
    freeMoveMode: false,
  },
  queue: [
    { id: "q1", username: "quan_co_viet", nickname: "Quân Cờ Việt 🇻🇳", avatar: "https://api.dicebear.com/7.x/adventurer/svg?seed=Jack", joinedAt: Date.now() - 600000, verified: true },
    { id: "q2", username: "toan_khanh", nickname: "Khánh Toàn Hoạt Bát", avatar: "https://api.dicebear.com/7.x/adventurer/svg?seed=Bear", joinedAt: Date.now() - 300000, verified: true }
  ],
  chatFeed: [
    { id: "sys1", username: "system", nickname: "Hệ thống", avatar: "", text: "Hệ thống Cờ Tướng TikTok Live sẵn sàng. Vui lòng kết nối tài khoản hoặc bắt đầu giả lập live chat để tham gia!", type: "system", timestamp: Date.now() }
  ],
  lastMove: null,
};

// SSE Client Connections list
let sseClients: express.Response[] = [];

// Helper to push update to all players
function broadcastState() {
  const payload = JSON.stringify(state);
  sseClients.forEach((client) => {
    client.write(`data: ${payload}\n\n`);
  });
}

// Add system message to feed
function addSystemMessage(text: string, type: 'system' | 'gift' | 'chat' = 'system') {
  const msg: ChatMessage = {
    id: `msg-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    username: "system",
    nickname: "Hệ thống",
    avatar: "",
    text,
    type,
    timestamp: Date.now()
  };
  state.chatFeed.push(msg);
  if (state.chatFeed.length > 80) state.chatFeed.shift();
}

// Helper to update ELO and historical stats
function resolveGameStats(winnerColor: BoardColor | 'draw') {
  const redPlayer = state.activePlayers.red;
  const blackPlayer = state.activePlayers.black;

  if (!redPlayer || !blackPlayer) return;

  // Find users in leaderboard
  let redUser = leaderboard.find(u => u.username === redPlayer.username);
  let blackUser = leaderboard.find(u => u.username === blackPlayer.username);

  // If not found, add them
  if (!redUser) {
    redUser = { username: redPlayer.username, nickname: redPlayer.nickname, avatar: redPlayer.avatar, elo: 1200, wins: 0, losses: 0, streak: 0 };
    leaderboard.push(redUser);
  }
  if (!blackUser) {
    blackUser = { username: blackPlayer.username, nickname: blackPlayer.nickname, avatar: blackPlayer.avatar, elo: 1200, wins: 0, losses: 0, streak: 0 };
    leaderboard.push(blackUser);
  }

  const redElo = redUser.elo;
  const blackElo = blackUser.elo;

  // Calculate Simple Expected Probability (ELO formula)
  const ea = 1 / (1 + Math.pow(10, (blackElo - redElo) / 400));
  const eb = 1 / (1 + Math.pow(10, (redElo - blackElo) / 400));

  let sa = 0.5; // red score
  let sb = 0.5; // black score

  if (winnerColor === 'red') {
    sa = 1; sb = 0;
    redUser.wins += 1;
    redUser.streak += 1;
    blackUser.losses += 1;
    blackUser.streak = 0;
  } else if (winnerColor === 'black') {
    sa = 0; sb = 1;
    blackUser.wins += 1;
    blackUser.streak += 1;
    redUser.losses += 1;
    redUser.streak = 0;
  } else {
    // Draw
    redUser.streak = 0;
    blackUser.streak = 0;
  }

  // Factor K = 32
  const k = 32;
  redUser.elo = Math.round(redElo + k * (sa - ea));
  blackUser.elo = Math.round(blackElo + k * (sb - eb));

  // Limit floors
  if (redUser.elo < 800) redUser.elo = 800;
  if (blackUser.elo < 800) blackUser.elo = 800;

  // Update original references back
  leaderboard = leaderboard.map(u => {
    if (u.username === redPlayer!.username) return redUser!;
    if (u.username === blackPlayer!.username) return blackUser!;
    return u;
  }).sort((a, b) => b.elo - a.elo); // sort by ELO descending
}

// Tick Game Timers every second
setInterval(() => {
  let changed = false;

  // Blind timeouts check
  const now = Date.now();
  if (state.isBlindActive.red && now > state.blindTimeouts.red) {
    state.isBlindActive.red = false;
    addSystemMessage("☀️ Đạo cụ Mù sương đã hết tác dụng với phe Đỏ. Bàn cờ hiển thị bình thường!");
    changed = true;
  }
  if (state.isBlindActive.black && now > state.blindTimeouts.black) {
    state.isBlindActive.black = false;
    addSystemMessage("☀️ Đạo cụ Mù sương đã hết tác dụng với phe Đen. Bàn cờ hiển thị bình thường!");
    changed = true;
  }

  // Match active countdown check
  if (state.activePlayers.red && state.activePlayers.black && !state.winner) {
    const activeColor = state.turn;
    const player = state.activePlayers[activeColor];
    if (player) {
      player.timeLeft -= 1;
      changed = true;

      if (player.timeLeft <= 0) {
        // Timeout!
        const winningColor: BoardColor = activeColor === 'red' ? 'black' : 'red';
        state.winner = winningColor;
        const winnerNickname = winningColor === 'red' ? state.activePlayers.red!.nickname : state.activePlayers.black!.nickname;
        const loserNickname = activeColor === 'red' ? state.activePlayers.red!.nickname : state.activePlayers.black!.nickname;

        addSystemMessage(`⏰ Kỳ thủ ${loserNickname} (${activeColor === 'red' ? 'Đỏ' : 'Đen'}) đã hết thời gian suy nghĩ!`);
        addSystemMessage(`🏆 Kỳ thủ ${winnerNickname} (${winningColor === 'red' ? 'Đỏ' : 'Đen'}) dành chiến thắng chung cuộc! 🎉`, 'gift');
        
        resolveGameStats(winningColor);

        // Auto rotation from queue if set
        if (state.settings.automaticQueue) {
          // Keep winner on board, rotate loser
          setTimeout(() => {
            rotateLoserAndQueue(activeColor);
          }, 3500);
        }
      }
    }
  }

  if (changed || state.activePlayers.red || state.activePlayers.black) {
    broadcastState();
  }
}, 1000);

// Helper to rotate the loser out of the board and set someone from the queue
function rotateLoserAndQueue(loserColor: BoardColor) {
  const loserPlayer = state.activePlayers[loserColor];
  // Add loser back to queue bottom if they are still connected/validated
  if (loserPlayer) {
    state.queue.push({
      id: `q-${Date.now()}`,
      username: loserPlayer.username,
      nickname: loserPlayer.nickname,
      avatar: loserPlayer.avatar,
      joinedAt: Date.now(),
      verified: true
    });
    addSystemMessage(`👉 Kỳ thủ ${loserPlayer.nickname} rời bàn cờ và quay lại cuối hàng đợi.`);
  }

  // Clear that slot
  state.activePlayers[loserColor] = null;
  state.winner = null;

  // Reset Board & History
  state.board = createInitialBoard();
  state.turn = "red"; // Red starts
  state.lastMove = null;
  boardHistory = [];
  turnHistory = [];

  // Poll first verified person from queue
  const nextIndex = state.queue.findIndex(item => item.verified);
  if (nextIndex !== -1) {
    const nextPlayer = state.queue.splice(nextIndex, 1)[0];
    state.activePlayers[loserColor] = {
      username: nextPlayer.username,
      nickname: nextPlayer.nickname,
      avatar: nextPlayer.avatar,
      color: loserColor,
      timeLeft: state.settings.turnTimeLimit,
      connected: true,
      score: 0
    };
    addSystemMessage(`⚔️ Kỳ thủ mới ${nextPlayer.nickname} thế chỗ phe ${loserColor === 'red' ? 'ĐỎ' : 'ĐEN'}! Bắt đầu ván mới!`);
  }

  // Reset timers for both players
  if (state.activePlayers.red) state.activePlayers.red.timeLeft = state.settings.turnTimeLimit;
  if (state.activePlayers.black) state.activePlayers.black.timeLeft = state.settings.turnTimeLimit;

  broadcastState();
}

// API: Server-Sent Events Endpoint
app.get("/api/events", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");

  res.write(`data: ${JSON.stringify(state)}\n\n`);
  sseClients.push(res);

  req.on("close", () => {
    sseClients = sseClients.filter((client) => client !== res);
  });
});

// API: Get Current Game State
app.get("/api/state", (req, res) => {
  res.json(state);
});

// API: Request code for TikTok association
app.post("/api/queue/request-code", (req, res) => {
  // Generate random 4-digit code
  const code = String(Math.floor(1000 + Math.random() * 9000));
  const { sessionToken } = req.body; // Client session identifier

  if (sessionToken) {
    pendingVerifications.set(code, sessionToken);
  }

  // Create or update temporary queue card
  res.json({ code });
});

// API: Move Piece
app.post("/api/match/move", (req, res) => {
  const { from, to, username } = req.body as { from: GridPosition; to: GridPosition; username: string };

  if (state.winner) {
    return res.status(400).json({ error: "Trận đấu đã kết thúc!" });
  }

  const redPlayer = state.activePlayers.red;
  const blackPlayer = state.activePlayers.black;

  if (!redPlayer || !blackPlayer) {
    return res.status(400).json({ error: "Chưa đủ 2 kỳ thủ tham gia thi đấu!" });
  }

  // Determine active color
  const activeColor = state.turn;
  const activeUser = activeColor === 'red' ? redPlayer : blackPlayer;

  if (activeUser.username !== username) {
    return res.status(400).json({ error: `Không phải lượt của bạn! Lượt hiện tại là phe ${activeColor === 'red' ? 'Đỏ' : 'Đen'} (${activeUser.nickname})` });
  }

  const piece = state.board[from.r][from.c];
  if (!piece) {
    return res.status(400).json({ error: "Không tìm thấy quân cờ ở vị trí xuất phát!" });
  }

  if (piece.color !== activeColor) {
    return res.status(400).json({ error: "Thao tác lỗi: Bạn chỉ được di chuyển quân cờ bên mình!" });
  }

  // Verify moves
  const moveCheck = isValidXiangqiMove(from, to, state.board, state.settings.freeMoveMode);
  if (!moveCheck.isValid) {
    return res.status(400).json({ error: moveCheck.error || "Nước đi phạm luật cờ tướng!" });
  }

  // Push history before executing move
  boardHistory.push(state.board.map(row => [...row]));
  turnHistory.push(state.turn);

  const targetPiece = state.board[to.r][to.c];
  
  // Execute move
  state.board[to.r][to.c] = piece;
  state.board[from.r][from.c] = null;
  state.lastMove = { from, to, piece };

  // Write chat or logs for eaters
  if (targetPiece) {
    addSystemMessage(`⚔️ [${activeColor === 'red' ? 'Đất Đỏ' : 'Huyền Đen'}] quân ${piece.nameVi} (${piece.label}) đã ĂN quân ${targetPiece.nameVi} (${targetPiece.label}) của đối thủ!`, 'chat');
  }

  // Winner condition: If King is captured
  if (targetPiece && targetPiece.type === 'K') {
    state.winner = activeColor;
    addSystemMessage(`🏆 KHÁNH THÀNH TRẬN ĐẤU: Kỳ thủ ${activeUser.nickname} (${activeColor === 'red' ? 'Đỏ' : 'Đen'}) đã ăn được Tướng đối phương và dành CHIẾN THẮNG! 🎉`, 'gift');
    resolveGameStats(activeColor);

    if (state.settings.automaticQueue) {
      setTimeout(() => {
        rotateLoserAndQueue(activeColor === 'red' ? 'black' : 'red');
      }, 3500);
    }
  } else {
    // Check if the opponent king is in check
    const opponentColor = activeColor === 'red' ? 'black' : 'red';
    const isCheck = isKingInCheck(opponentColor, state.board);
    if (isCheck) {
      const opponentName = opponentColor === 'red' ? redPlayer.nickname : blackPlayer.nickname;
      addSystemMessage(`⚠️ CHIẾU TƯỚNG! Quân kỳ của ${opponentName} đang bị đe dọa trực tiếp!`, 'chat');
    }

    // Toggle turn
    state.turn = opponentColor;
    // Reset timer
    state.activePlayers[opponentColor]!.timeLeft = state.settings.turnTimeLimit;
  }

  broadcastState();
  res.json({ success: true });
});

// API: TikTok Simulated Actions (Trigger simulated comments, gifts, or hearts)
app.post("/api/tiktok/simulate", (req, res) => {
  const { eventType, username, nickname, text, giftName, count } = req.body;

  const validUsername = String(username || "tiktok_viewer").trim().toLowerCase();
  const validNickname = String(nickname || "Khán giả Live").trim();
  const avatarIndex = Math.floor(Math.random() * 100) + 1;
  const avatar = `https://api.dicebear.com/7.x/adventurer/svg?seed=${validUsername}`;

  if (eventType === "chat" || !eventType) {
    // Standard chat message
    const cleanText = String(text).trim();
    const chatMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      username: validUsername,
      nickname: validNickname,
      avatar,
      text: cleanText,
      type: "chat",
      timestamp: Date.now()
    };
    state.chatFeed.push(chatMsg);
    if (state.chatFeed.length > 80) state.chatFeed.shift();

    // Check if someone is chatting a code for verification
    if (/^\d{4}$/.test(cleanText)) {
      // Find matches in verifications queue
      const codeMatched = cleanText;
      if (pendingVerifications.has(codeMatched)) {
        pendingVerifications.delete(codeMatched);

        // Add to queue as verified player
        const existsInQueueIdx = state.queue.findIndex(item => item.username === validUsername);
        if (existsInQueueIdx === -1) {
          state.queue.push({
            id: `q-${Date.now()}`,
            username: validUsername,
            nickname: validNickname,
            avatar,
            joinedAt: Date.now(),
            verified: true
          });
          addSystemMessage(`✅ Xác thực thành lập: @${validUsername} (${validNickname}) liên kết thành công mã ${codeMatched} và xếp vào hàng đợi!`);
        } else {
          state.queue[existsInQueueIdx].verified = true;
          addSystemMessage(`✅ Xác thực thành lập: @${validUsername} đã được định danh, sẵn sàng trong hàng đợi!`);
        }
      }
    }

  } else if (eventType === "like") {
    // Spark hearts
    const likeCount = Number(count) || 1;
    const chatMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      username: validUsername,
      nickname: validNickname,
      avatar,
      text: `❤️ Đã thả ${likeCount} tim cho Livestream!`,
      type: "chat",
      timestamp: Date.now()
    };
    state.chatFeed.push(chatMsg);
    if (state.chatFeed.length > 80) state.chatFeed.shift();

  } else if (eventType === "gift") {
    // Virtual gifts logic!
    const giftCount = Number(count) || 1;
    const gName = String(giftName).toLowerCase();

    // Log gift message to viewer
    const giftLabel = gName === 'rose' || gName === 'ball' ? 'nhỏ' : (gName === 'sunglasses' || gName === 'ring' ? 'vừa' : 'lớn');
    let vnGiftName = "Quà tặng";
    if (gName === 'rose') vnGiftName = "Hoa Hồng 🌹";
    else if (gName === 'ball') vnGiftName = "Quả Bóng ⚽";
    else if (gName === 'sunglasses') vnGiftName = "Kính Mát 😎";
    else if (gName === 'ring') vnGiftName = "Chiếc Nhẫn 💍";
    else if (gName === 'crown') vnGiftName = "Vương Miện 👑";
    else if (gName === 'lion') vnGiftName = "Sư Tử Kiêu Hãnh 🦁";

    const chatMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      username: validUsername,
      nickname: validNickname,
      avatar,
      text: `🎁 Đã tặng ${giftCount} x ${vnGiftName}!`,
      type: "gift",
      giftName: vnGiftName,
      giftCount,
      timestamp: Date.now()
    };
    state.chatFeed.push(chatMsg);
    if (state.chatFeed.length > 80) state.chatFeed.shift();

    // Apply interactive buffs/debuffs on game!
    const redPlayer = state.activePlayers.red;
    const blackPlayer = state.activePlayers.black;

    // Check if the user is sponsoring a specific active side.
    // In our UI, simulate buttons can choose "Buff Phe Đỏ" or "Buff Phe Đen"
    const sponsorSide = req.body.sponsorSide as BoardColor || (Math.random() > 0.5 ? 'red' : 'black');
    const targetPlayer = state.activePlayers[sponsorSide];
    const opponentSide = sponsorSide === 'red' ? 'black' : 'red';
    const opponentPlayer = state.activePlayers[opponentSide];

    if (gName === 'rose' || gName === 'ball') {
      // Small gift -> +15s turn thinking time
      if (targetPlayer) {
        targetPlayer.timeLeft = Math.min(targetPlayer.timeLeft + 15, state.settings.turnTimeLimit + 30);
        addSystemMessage(`⚡ Đạo cụ [NƯỚC TĂNG LỰC]: @${validNickname} buff +15s cho kỳ thủ phe ${sponsorSide === 'red' ? 'ĐỎ' : 'ĐEN'} (${targetPlayer.nickname})!`);
      } else {
        addSystemMessage(`👉 @${validNickname} gửi tặng ${vnGiftName} để cổ vũ giải bóng!`);
      }
    } 
    else if (gName === 'sunglasses' || gName === 'ring') {
      // Medium gift -> Obscure/Blind opponent screen for 10 seconds
      if (opponentPlayer) {
        state.isBlindActive[opponentSide] = true;
        state.blindTimeouts[opponentSide] = Date.now() + 12000; // 12 seconds buffer
        addSystemMessage(`💨 Đạo cụ [MÙ SƯƠNG]: @${validNickname} ném khối sương mù che mắt đối thủ phe ${opponentSide === 'red' ? 'ĐỎ' : 'ĐEN'} (${opponentPlayer.nickname}) trong 10 giây!`);
      } else {
        addSystemMessage(`👉 @${validNickname} gửi tặng ${vnGiftName} sang trọng!`);
      }
    } 
    else if (gName === 'crown' || gName === 'lion') {
      // Large gift -> Admin can trigger undo or user votes to kick (Undo added immediately in this simulated context if they wish, or let player have 1 undo right!)
      if (targetPlayer) {
        addSystemMessage(`🌟 SIÊU QUÀ [${vnGiftName.toUpperCase()}]: @${validNickname} tài trợ kỳ thủ phe ${sponsorSide === 'red' ? 'ĐỎ' : 'ĐEN'} (${targetPlayer.nickname})! Kích hoạt quyền HỒI NƯỚC CỜ (Undo) hoặc Bỏ phiếu phế truất!`);
      } else {
        addSystemMessage(`👉 Siêu quà ${vnGiftName} rực cháy từ @${validNickname}!`);
      }
    }
  }

  broadcastState();
  res.json({ success: true });
});

// API: Admin Setup / Start Match manually
app.post("/api/admin/start-match", (req, res) => {
  const { redUserId, blackUserId } = req.body;

  let redUser: QueueItem | undefined;
  let blackUser: QueueItem | undefined;

  if (redUserId) {
    const rIdx = state.queue.findIndex(q => q.id === redUserId);
    if (rIdx !== -1) {
      redUser = state.queue.splice(rIdx, 1)[0];
    }
  }
  if (blackUserId) {
    const bIdx = state.queue.findIndex(q => q.id === blackUserId);
    if (bIdx !== -1) {
      blackUser = state.queue.splice(bIdx, 1)[0];
    }
  }

  // Create active players. Fallback if not provided but queue holds items
  if (!redUser && state.queue.length > 0) {
    redUser = state.queue.shift();
  }
  if (!blackUser && state.queue.length > 0) {
    blackUser = state.queue.shift();
  }

  if (redUser) {
    state.activePlayers.red = {
      username: redUser.username,
      nickname: redUser.nickname,
      avatar: redUser.avatar,
      color: 'red',
      timeLeft: state.settings.turnTimeLimit,
      connected: true,
      score: 0
    };
  } else if (!state.activePlayers.red) {
    // Add default CPU or mock if queue empty to make app playable right away
    state.activePlayers.red = {
      username: "co_thu_do",
      nickname: "Lão Kỳ Thủ Đỏ 🔴",
      avatar: "https://api.dicebear.com/7.x/adventurer/svg?seed=CpuRed",
      color: 'red',
      timeLeft: state.settings.turnTimeLimit,
      connected: true,
      score: 0
    };
  }

  if (blackUser) {
    state.activePlayers.black = {
      username: blackUser.username,
      nickname: blackUser.nickname,
      avatar: blackUser.avatar,
      color: 'black',
      timeLeft: state.settings.turnTimeLimit,
      connected: true,
      score: 0
    };
  } else if (!state.activePlayers.black) {
    state.activePlayers.black = {
      username: "co_thu_den",
      nickname: "Cao Thủ Bóng Đêm ⚫",
      avatar: "https://api.dicebear.com/7.x/adventurer/svg?seed=CpuBlack",
      color: 'black',
      timeLeft: state.settings.turnTimeLimit,
      connected: true,
      score: 0
    };
  }

  // Reset Board State
  state.board = createInitialBoard();
  state.turn = "red";
  state.winner = null;
  state.lastMove = null;
  state.isBlindActive = { red: false, black: false };
  boardHistory = [];
  turnHistory = [];

  addSystemMessage("⚔️ TRẬN ĐẤU MỚI BẮT ĐẦU: Phe ĐỎ di chuyển trước! Chúc các kỳ thủ thi đấu sòng phẳng!");
  broadcastState();
  res.json({ success: true });
});

// API: Admin Reset board and histories
app.post("/api/admin/reset", (req, res) => {
  state.board = createInitialBoard();
  state.turn = "red";
  state.winner = null;
  state.lastMove = null;
  state.isBlindActive = { red: false, black: false };
  boardHistory = [];
  turnHistory = [];

  if (state.activePlayers.red) state.activePlayers.red.timeLeft = state.settings.turnTimeLimit;
  if (state.activePlayers.black) state.activePlayers.black.timeLeft = state.settings.turnTimeLimit;

  addSystemMessage("⚙️ Admin đã cài đặt lại (Reset) bàn cờ về vị trí xuất phát!");
  broadcastState();
  res.json({ success: true });
});

// API: Admin Forfeit current active turn or end Match with manual draw
app.post("/api/admin/declare-outcome", (req, res) => {
  const { outcome } = req.body as { outcome: BoardColor | 'draw' };

  state.winner = outcome;
  if (outcome === 'draw') {
    addSystemMessage("🤝 Admin phán quyết: Trận đấu kết thúc với kết quả HÒA cuộc!");
    resolveGameStats('draw');
  } else {
    const winnerName = outcome === 'red' ? state.activePlayers.red?.nickname : state.activePlayers.black?.nickname;
    addSystemMessage(`🏆 Admin phán quyết: Chiến thắng thuộc về phe ${outcome.toUpperCase()} (${winnerName})!`);
    resolveGameStats(outcome);
  }

  if (state.settings.automaticQueue) {
    setTimeout(() => {
      rotateLoserAndQueue(outcome === 'red' ? 'black' : 'red');
    }, 4000);
  }

  broadcastState();
  res.json({ success: true });
});

// API: Admin Update settings
app.post("/api/admin/settings", (req, res) => {
  const { turnTimeLimit, automaticQueue, freeMoveMode } = req.body;
  if (typeof turnTimeLimit === "number") state.settings.turnTimeLimit = turnTimeLimit;
  if (typeof automaticQueue === "boolean") state.settings.automaticQueue = automaticQueue;
  if (typeof freeMoveMode === "boolean") state.settings.freeMoveMode = freeMoveMode;

  addSystemMessage(`⚙️ Hệ thống cập nhật: Thời gian lượt = ${state.settings.turnTimeLimit}s | Tự động đổi hàng đợi = ${state.settings.automaticQueue ? 'BẬT' : 'TẮT'} | Chế độ đi tự do = ${state.settings.freeMoveMode ? 'BẬT' : 'TẮT'}`);
  broadcastState();
  res.json({ success: true });
});

// API: Admin Force Kick a player
app.post("/api/admin/kick", (req, res) => {
  const { color } = req.body as { color: BoardColor };
  const target = state.activePlayers[color];
  if (target) {
    addSystemMessage(`🚨 Admin quyết định khẩn cấp: Trục xuất (Kick) kỳ thủ @${target.username} (${target.nickname}) ra khỏi phòng!`);
    state.activePlayers[color] = null;
    
    // Switch turn / reset
    state.winner = null;
    state.board = createInitialBoard();
    state.turn = "red";
    state.lastMove = null;
    boardHistory = [];
    turnHistory = [];

    // Draw someone from queue to substitute instantly
    const nextIndex = state.queue.findIndex(item => item.verified);
    if (nextIndex !== -1) {
      const nextPlayer = state.queue.splice(nextIndex, 1)[0];
      state.activePlayers[color] = {
        username: nextPlayer.username,
        nickname: nextPlayer.nickname,
        avatar: nextPlayer.avatar,
        color,
        timeLeft: state.settings.turnTimeLimit,
        connected: true,
        score: 0
      };
      addSystemMessage(`⚔️ Kỳ thủ @${nextPlayer.username} đã nhanh chóng gia nhập thế chỗ trống phe ${color === 'red' ? 'ĐỎ' : 'ĐEN'}!`);
    }
    
    broadcastState();
    res.json({ success: true });
  } else {
    res.status(400).json({ error: "Không có kỳ thủ nào ở phe được chọn!" });
  }
});

// API: Admin / Sponsoring User triggers UNDO ("Hồi cờ")
app.post("/api/admin/undo", (req, res) => {
  if (boardHistory.length > 0) {
    const prevBoard = boardHistory.pop();
    const prevTurn = turnHistory.pop();

    if (prevBoard && prevTurn) {
      state.board = prevBoard;
      state.turn = prevTurn;
      state.winner = null;
      state.lastMove = null;
      
      // Reset current active player timer to full
      if (state.activePlayers[prevTurn]) {
        state.activePlayers[prevTurn]!.timeLeft = state.settings.turnTimeLimit;
      }

      addSystemMessage("↩️ HỒI CỜ THÀNH CÔNG: Trận đấu đã được quay trở về nước đi trước đó!");
      broadcastState();
      return res.json({ success: true });
    }
  }
  res.status(400).json({ error: "Không tìm thấy lịch sử nước đi trước để Hồi cờ!" });
});

// API: Get Latest Leaderboard
app.get("/api/leaderboard", (req, res) => {
  const ranked = leaderboard.map((user, idx) => ({
    ...user,
    rank: idx + 1
  }));
  res.json(ranked);
});

// API: Manual additions to Queue (Web player click)
app.post("/api/queue/join", (req, res) => {
  const { username, nickname } = req.body;
  if (!username) return res.status(400).json({ error: "Username is required" });

  const cleanUsername = String(username).trim().toLowerCase();
  const cleanNickname = String(nickname || username).trim();
  const avatar = `https://api.dicebear.com/7.x/adventurer/svg?seed=${cleanUsername}`;

  // Check if already in queue
  const exists = state.queue.find(q => q.username === cleanUsername);
  if (exists) {
    return res.json({ success: true, message: "Đã có trong hàng đợi", item: exists });
  }

  const newItem: QueueItem = {
    id: `q-${Date.now()}`,
    username: cleanUsername,
    nickname: cleanNickname,
    avatar,
    joinedAt: Date.now(),
    verified: false // Must chat random code on TikTok simulator to verify!
  };

  state.queue.push(newItem);
  broadcastState();

  res.json({ success: true, item: newItem });
});

// API: Remove from queue
app.post("/api/queue/leave", (req, res) => {
  const { username } = req.body;
  state.queue = state.queue.filter(q => q.username !== username);
  addSystemMessage(`🚶 Người chơi @${username} đã rời hàng đợi.`);
  broadcastState();
  res.json({ success: true });
});

// START EXPRESS/VITE ENGINE LAYER
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  if (process.env.NODE_ENV !== "production" || !process.env.VERCEL) {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`TikTok Xiangqi Server running on http://localhost:${PORT}`);
    });
  }
}

startServer();

export default app;
