import { Piece, ChessBoardState, GridPosition, BoardColor } from '../types';

export function createInitialBoard(): ChessBoardState {
  const board: ChessBoardState = Array(10)
    .fill(null)
    .map(() => Array(9).fill(null));

  // Initialize Black pieces (row 0 to 4)
  board[0][0] = { id: 'B-R1', type: 'R', color: 'black', label: '車', nameVi: 'Xe' };
  board[0][1] = { id: 'B-H1', type: 'H', color: 'black', label: '馬', nameVi: 'Mã' };
  board[0][2] = { id: 'B-E1', type: 'E', color: 'black', label: '象', nameVi: 'Tượng' };
  board[0][3] = { id: 'B-A1', type: 'A', color: 'black', label: '士', nameVi: 'Sĩ' };
  board[0][4] = { id: 'B-K',  type: 'K', color: 'black', label: '將', nameVi: 'Tướng' };
  board[0][5] = { id: 'B-A2', type: 'A', color: 'black', label: '士', nameVi: 'Sĩ' };
  board[0][6] = { id: 'B-E2', type: 'E', color: 'black', label: '象', nameVi: 'Tượng' };
  board[0][7] = { id: 'B-H2', type: 'H', color: 'black', label: '馬', nameVi: 'Mã' };
  board[0][8] = { id: 'B-R2', type: 'R', color: 'black', label: '車', nameVi: 'Xe' };

  board[2][1] = { id: 'B-C1', type: 'C', color: 'black', label: '砲', nameVi: 'Pháo' };
  board[2][7] = { id: 'B-C2', type: 'C', color: 'black', label: '砲', nameVi: 'Pháo' };

  board[3][0] = { id: 'B-P1', type: 'P', color: 'black', label: '卒', nameVi: 'Tốt' };
  board[3][2] = { id: 'B-P2', type: 'P', color: 'black', label: '卒', nameVi: 'Tốt' };
  board[3][4] = { id: 'B-P3', type: 'P', color: 'black', label: '卒', nameVi: 'Tốt' };
  board[3][6] = { id: 'B-P4', type: 'P', color: 'black', label: '卒', nameVi: 'Tốt' };
  board[3][8] = { id: 'B-P5', type: 'P', color: 'black', label: '卒', nameVi: 'Tốt' };

  // Initialize Red pieces (row 5 to 9)
  board[9][0] = { id: 'R-R1', type: 'R', color: 'red', label: '俥', nameVi: 'Xe' };
  board[9][1] = { id: 'R-H1', type: 'H', color: 'red', label: '傌', nameVi: 'Mã' };
  board[9][2] = { id: 'R-E1', type: 'E', color: 'red', label: '相', nameVi: 'Tượng' };
  board[9][3] = { id: 'R-A1', type: 'A', color: 'red', label: '仕', nameVi: 'Sĩ' };
  board[9][4] = { id: 'R-K',  type: 'K', color: 'red', label: '帥', nameVi: 'Tướng' };
  board[9][5] = { id: 'R-A2', type: 'A', color: 'red', label: '仕', nameVi: 'Sĩ' };
  board[9][6] = { id: 'R-E2', type: 'E', color: 'red', label: '相', nameVi: 'Tượng' };
  board[9][7] = { id: 'R-H2', type: 'H', color: 'red', label: '傌', nameVi: 'Mã' };
  board[9][8] = { id: 'R-R2', type: 'R', color: 'red', label: '俥', nameVi: 'Xe' };

  board[7][1] = { id: 'R-C1', type: 'C', color: 'red', label: '炮', nameVi: 'Pháo' };
  board[7][7] = { id: 'R-C2', type: 'C', color: 'red', label: '炮', nameVi: 'Pháo' };

  board[6][0] = { id: 'R-P1', type: 'P', color: 'red', label: '兵', nameVi: 'Tốt' };
  board[6][2] = { id: 'R-P2', type: 'P', color: 'red', label: '兵', nameVi: 'Tốt' };
  board[6][4] = { id: 'R-P3', type: 'P', color: 'red', label: '兵', nameVi: 'Tốt' };
  board[6][6] = { id: 'R-P4', type: 'P', color: 'red', label: '兵', nameVi: 'Tốt' };
  board[6][8] = { id: 'R-P5', type: 'P', color: 'red', label: '兵', nameVi: 'Tốt' };

  return board;
}

export function isValidXiangqiMove(
  from: GridPosition,
  to: GridPosition,
  board: ChessBoardState,
  freeMoveMode: boolean = false
): { isValid: boolean; error: string | null } {
  if (freeMoveMode) {
    return { isValid: true, error: null };
  }

  // Bounds check
  if (from.r < 0 || from.r > 9 || from.c < 0 || from.c > 8 ||
      to.r < 0 || to.r > 9 || to.c < 0 || to.c > 8) {
    return { isValid: false, error: 'Vị trí nằm ngoài bàn cờ!' };
  }

  // Same square check
  if (from.r === to.r && from.c === to.c) {
    return { isValid: false, error: 'Không di chuyển!' };
  }

  const piece = board[from.r][from.c];
  if (!piece) {
    return { isValid: false, error: 'Không có quân cờ ở vị trí bắt đầu!' };
  }

  const targetPiece = board[to.r][to.c];
  if (targetPiece && targetPiece.color === piece.color) {
    return { isValid: false, error: 'Không thể ăn quân cờ cùng màu!' };
  }

  const dr = to.r - from.r;
  const dc = to.c - from.c;
  const absDr = Math.abs(dr);
  const absDc = Math.abs(dc);

  switch (piece.type) {
    case 'K': { // Tướng (King)
      // Must stay in palace
      const isRed = piece.color === 'red';
      const rMin = isRed ? 7 : 0;
      const rMax = isRed ? 9 : 2;
      const cMin = 3;
      const cMax = 5;

      if (to.c < cMin || to.c > cMax || to.r < rMin || to.r > rMax) {
        return { isValid: false, error: 'Tướng không được ra khỏi cung!' };
      }

      // Orthogonal 1 space
      if (!((absDr === 1 && absDc === 0) || (absDr === 0 && absDc === 1))) {
        return { isValid: false, error: 'Tướng chỉ có thể đi ngang hoặc dọc 1 ô!' };
      }
      break;
    }

    case 'A': { // Sĩ (Advisor)
      // Must stay in palace
      const isRed = piece.color === 'red';
      const rMin = isRed ? 7 : 0;
      const rMax = isRed ? 9 : 2;
      const cMin = 3;
      const cMax = 5;

      if (to.c < cMin || to.c > cMax || to.r < rMin || to.r > rMax) {
        return { isValid: false, error: 'Sĩ không được ra khỏi cung!' };
      }

      // Diagonal 1 space
      if (absDr !== 1 || absDc !== 1) {
        return { isValid: false, error: 'Sĩ chỉ được đi chéo 1 ô!' };
      }
      break;
    }

    case 'E': { // Tượng (Elephant)
      // Cannot cross river
      const isRed = piece.color === 'red';
      if (isRed && to.r < 5) {
        return { isValid: false, error: 'Tượng đỏ không được qua sông!' };
      }
      if (!isRed && to.r > 4) {
        return { isValid: false, error: 'Tượng đen không được qua sông!' };
      }

      // Diagonal 2 spaces
      if (absDr !== 2 || absDc !== 2) {
        return { isValid: false, error: 'Tượng phải đi chéo đúng 2 ô!' };
      }

      // Blocked elephant ("mắt tượng")
      const blockR = from.r + dr / 2;
      const blockC = from.c + dc / 2;
      if (board[blockR][blockC] !== null) {
        return { isValid: false, error: 'Tượng bị cản (mắt tượng bị chặn)!' };
      }
      break;
    }

    case 'H': { // Mã (Horse)
      // L shape
      if (!((absDr === 2 && absDc === 1) || (absDr === 1 && absDc === 2))) {
        return { isValid: false, error: 'Mã phải di chuyển theo hình chữ L!' };
      }

      // Check elbow block ("cản mã")
      if (absDr === 2) {
        const stepR = from.r + dr / 2;
        if (board[stepR][from.c] !== null) {
          return { isValid: false, error: 'Mã bị cản chân!' };
        }
      } else {
        const stepC = from.c + dc / 2;
        if (board[from.r][stepC] !== null) {
          return { isValid: false, error: 'Mã bị cản chân!' };
        }
      }
      break;
    }

    case 'R': { // Xe (Rook)
      // Must be straight line
      if (dr !== 0 && dc !== 0) {
        return { isValid: false, error: 'Xe chỉ đi thẳng hàng ngang hoặc dọc!' };
      }

      // Check obstacles
      const stepR = dr === 0 ? 0 : Math.sign(dr);
      const stepC = dc === 0 ? 0 : Math.sign(dc);
      let currR = from.r + stepR;
      let currC = from.c + stepC;

      while (currR !== to.r || currC !== to.c) {
        if (board[currR][currC] !== null) {
          return { isValid: false, error: 'Xe bị chặn đường bởi quân cờ khác!' };
        }
        currR += stepR;
        currC += stepC;
      }
      break;
    }

    case 'C': { // Pháo (Cannon)
      // Must be straight line
      if (dr !== 0 && dc !== 0) {
        return { isValid: false, error: 'Pháo chỉ đi thẳng hàng ngang hoặc dọc!' };
      }

      const stepR = dr === 0 ? 0 : Math.sign(dr);
      const stepC = dc === 0 ? 0 : Math.sign(dc);
      let currR = from.r + stepR;
      let currC = from.c + stepC;
      let count = 0;

      while (currR !== to.r || currC !== to.c) {
        if (board[currR][currC] !== null) {
          count++;
        }
        currR += stepR;
        currC += stepC;
      }

      if (targetPiece) {
        // Capturing: needs exactly 1 obstacle in the middle
        if (count !== 1) {
          return { isValid: false, error: 'Pháo bắn phải nhảy qua đúng 1 quân cờ làm ngòi!' };
        }
      } else {
        // Normal move: must be 0 obstacles
        if (count !== 0) {
          return { isValid: false, error: 'Pháo di chuyển bình thường không được có chướng ngại vật!' };
        }
      }
      break;
    }

    case 'P': { // Tốt (Pawn / Soldier)
      const isRed = piece.color === 'red';
      const forwardDir = isRed ? -1 : 1;
      const crossedRiver = isRed ? (from.r < 5) : (from.r > 4);

      if (dr === forwardDir && dc === 0) {
        // Move forward 1 space is always fine
        break;
      } else if (crossedRiver && dr === 0 && absDc === 1) {
        // Horizontal moves allowed after crossing the river
        break;
      } else {
        if (!crossedRiver && dr === 0 && absDc === 1) {
          return { isValid: false, error: 'Tốt chưa qua sông không đi ngang được!' };
        }
        if (dr === -forwardDir) {
          return { isValid: false, error: 'Tốt không thể đi lùi!' };
        }
        return { isValid: false, error: 'Nước đi không hợp lệ cho quân Tốt!' };
      }
    }
  }

  // General face-to-face King check after making the move
  // Clone the board and place the piece to examine hypothetical state
  const tempBoard = board.map(row => [...row]);
  tempBoard[to.r][to.c] = piece;
  tempBoard[from.r][from.c] = null;

  // Find Kings
  let blackKingPos: GridPosition | null = null;
  let redKingPos: GridPosition | null = null;

  for (let r = 0; r < 10; r++) {
    for (let c = 0; c < 9; c++) {
      const p = tempBoard[r][c];
      if (p && p.type === 'K') {
        if (p.color === 'black') blackKingPos = { r, c };
        else redKingPos = { r, c };
      }
    }
  }

  if (blackKingPos && redKingPos && blackKingPos.c === redKingPos.c) {
    // Kings are in same column, check if there's any blocker
    let blockerFound = false;
    const col = blackKingPos.c;
    const startR = Math.min(blackKingPos.r, redKingPos.r) + 1;
    const endR = Math.max(blackKingPos.r, redKingPos.r);
    for (let r = startR; r < endR; r++) {
      if (tempBoard[r][col] !== null) {
        blockerFound = true;
        break;
      }
    }
    if (!blockerFound) {
      return { isValid: false, error: 'Lỗi lộ diện Tướng: Hai Tướng không được đối diện trực tiếp!' };
    }
  }

  return { isValid: true, error: null };
}

export function isKingInCheck(color: BoardColor, board: ChessBoardState): boolean {
  // Find king
  let kingPos: GridPosition | null = null;
  for (let r = 0; r < 10; r++) {
    for (let c = 0; c < 9; c++) {
      const p = board[r][c];
      if (p && p.type === 'K' && p.color === color) {
        kingPos = { r, c };
        break;
      }
    }
    if (kingPos) break;
  }

  if (!kingPos) return false;

  const opponentColor = color === 'red' ? 'black' : 'red';

  // Check if any opponent piece can move to kingPos
  for (let r = 0; r < 10; r++) {
    for (let c = 0; c < 9; c++) {
      const p = board[r][c];
      if (p && p.color === opponentColor) {
        const { isValid } = isValidXiangqiMove({ r, c }, kingPos, board, false);
        if (isValid) {
          return true;
        }
      }
    }
  }

  return false;
}
