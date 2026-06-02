import React, { useState } from 'react';
import { ChessBoardState, GridPosition, Piece, BoardColor } from '../types';
import { isValidXiangqiMove } from '../utils/xiangqiRules';
import { ShieldAlert, Sparkles } from 'lucide-react';

interface ChessBoardProps {
  board: ChessBoardState;
  turn: BoardColor;
  currentUserColor: BoardColor | null;
  onMove: (from: GridPosition, to: GridPosition) => void;
  lastMove: { from: GridPosition; to: GridPosition; piece: Piece } | null;
  isLoading: boolean;
  isBlind: boolean;
  freeMoveMode: boolean;
  timeLeft: number;
}

export default function ChessBoard({
  board,
  turn,
  currentUserColor,
  onMove,
  lastMove,
  isLoading,
  isBlind,
  freeMoveMode,
  timeLeft
}: ChessBoardProps) {
  const [selectedPos, setSelectedPos] = useState<GridPosition | null>(null);

  // Determine selectable and destination squares
  const selectedPiece = selectedPos ? board[selectedPos.r][selectedPos.c] : null;

  // Track valid destinations for the currently selected piece
  const getValidDestinations = (): GridPosition[] => {
    if (!selectedPos || !selectedPiece) return [];
    
    // If not our turn, no valid moves shown
    if (currentUserColor && currentUserColor !== turn && !freeMoveMode) return [];

    const validPositions: GridPosition[] = [];
    for (let r = 0; r < 10; r++) {
      for (let c = 0; c < 9; c++) {
        const check = isValidXiangqiMove(selectedPos, { r, c }, board, freeMoveMode);
        if (check.isValid) {
          validPositions.push({ r, c });
        }
      }
    }
    return validPositions;
  };

  const validTargets = getValidDestinations();

  const handleCellClick = (r: number, c: number) => {
    if (isLoading) return;

    const clickedPiece = board[r][c];

    // Case 1: Selecting our own piece
    if (clickedPiece && (clickedPiece.color === turn || freeMoveMode)) {
      // If we clicked on already selected, toggle it
      if (selectedPos && selectedPos.r === r && selectedPos.c === c) {
        setSelectedPos(null);
      } else {
        // Only allow select if they match the assigned player color OR freeMove state OR spectator debug
        if (!currentUserColor || currentUserColor === clickedPiece.color || freeMoveMode) {
          setSelectedPos({ r, c });
        }
      }
      return;
    }

    // Case 2: Clicking target destination
    if (selectedPos) {
      const isTargetValid = validTargets.some(t => t.r === r && t.c === c);
      if (isTargetValid) {
        onMove(selectedPos, { r, c });
        setSelectedPos(null);
      } else {
        // Clicked invalid target, reset selection
        setSelectedPos(null);
      }
    }
  };

  const isSelected = (r: number, c: number) => {
    return selectedPos !== null && selectedPos.r === r && selectedPos.c === c;
  };

  const isValidTarget = (r: number, c: number) => {
    return validTargets.some(t => t.r === r && t.c === c);
  };

  const isLastMoveSrc = (r: number, c: number) => {
    return lastMove !== null && lastMove.from.r === r && lastMove.from.c === c;
  };

  const isLastMoveDest = (r: number, c: number) => {
    return lastMove !== null && lastMove.to.r === r && lastMove.to.c === c;
  };

  return (
    <div className="relative w-full aspect-[9/10] bg-[#f7eedc] rounded-2xl shadow-2xl p-4 border-4 border-amber-800 selection:bg-transparent overflow-hidden">
      
      {/* 🌫️ BLIND STATE OVERLAY */}
      {isBlind && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-gray-900/90 backdrop-blur-md transition-all duration-500 text-center p-6">
          <div className="w-16 h-16 rounded-full bg-orange-600/20 flex items-center justify-center mb-4 border border-orange-500 animate-pulse">
            <ShieldAlert className="w-8 h-8 text-orange-500 animate-bounce" />
          </div>
          <h3 className="text-xl font-bold text-orange-400 mb-2 font-sans tracking-tight">🌫️ HIỆU ỨNG MÙ SƯƠNG!</h3>
          <p className="text-gray-300 text-xs max-w-sm mb-4 leading-relaxed font-sans">
            Đối thủ đã thả làn khói sương che khuất tầm nhìn của ván cờ này trong 10 giây! Nhớ vị trí từng quân và di chuyển bình thường nếu tự tin!
          </p>
          <div className="px-3 py-1 bg-gray-800 text-orange-400 font-mono text-sm rounded border border-orange-500/20">
            Trạng thái mù: <span className="font-bold underline text-base">ĐANG HOẠT ĐỘNG</span>
          </div>
        </div>
      )}

      {/* Grid Canvas Lines Layer */}
      <div className="absolute inset-4 pointer-events-none border-2 border-stone-800">
        
        {/* Draw chess rows and cols */}
        {/* Horizontal Lines */}
        {Array(10).fill(null).map((_, i) => (
          <div 
            key={`row-${i}`} 
            className="absolute left-0 right-0 h-[1px] bg-stone-700/80" 
            style={{ top: `${(i / 9) * 100}%` }}
          />
        ))}

        {/* Vertical Lines (Divided by the center River) */}
        {Array(9).fill(null).map((_, i) => (
          <React.Fragment key={`col-frag-${i}`}>
            {/* Top Grid (Rows 0 to 4) */}
            <div 
              className="absolute bg-stone-700/80" 
              style={{ 
                left: `${(i / 8) * 100}%`, 
                top: '0%', 
                bottom: '55.55%', 
                width: '1px' 
              }}
            />
            {/* Bottom Grid (Rows 5 to 9) */}
            <div 
              className="absolute bg-stone-700/80" 
              style={{ 
                left: `${(i / 8) * 100}%`, 
                top: '44.44%', 
                bottom: '0%', 
                width: '1px' 
              }}
            />
          </React.Fragment>
        ))}

        {/* Palaces (X Diagonals) */}
        {/* Black Palace: row 0, col 3 to row 2, col 5 */}
        <svg className="absolute inset-0 w-full h-full opacity-60">
          {/* Top Palace */}
          <line x1="37.5%" y1="0%" x2="62.5%" y2="22.22%" stroke="#444" strokeWidth="1.5" />
          <line x1="62.5%" y1="0%" x2="37.5%" y2="22.22%" stroke="#444" strokeWidth="1.5" />
          
          {/* Bottom Palace */}
          <line x1="37.5%" y1="77.77%" x2="62.5%" y2="100%" stroke="#444" strokeWidth="1.5" />
          <line x1="62.5%" y1="77.77%" x2="37.5%" y2="100%" stroke="#444" strokeWidth="1.5" />
        </svg>

        {/* River Label */}
        <div className="absolute top-[44.44%] bottom-[55.55%] left-[2%] right-[2%] flex items-center justify-between px-12 z-0 font-sans text-stone-700 font-semibold text-xs md:text-sm tracking-widest pointer-events-none uppercase">
          <span> Sở Hà - 楚河</span>
          <span> Hán Giới - 漢界</span>
        </div>
      </div>

      {/* Interactive Cells and Pieces Grid */}
      <div className="relative w-full h-full grid grid-cols-9 grid-rows-10 z-10">
        {Array(10).fill(null).map((_, r) => (
          Array(9).fill(null).map((_, c) => {
            const p = board[r][c];
            const isSel = isSelected(r, c);
            const isTarget = isValidTarget(r, c);
            const isSrcMove = isLastMoveSrc(r, c);
            const isDestMove = isLastMoveDest(r, c);

            return (
              <div
                key={`${r}-${c}`}
                id={`cell-${r}-${c}`}
                onClick={() => handleCellClick(r, c)}
                className="relative flex items-center justify-center cursor-pointer group transition-all duration-150"
              >
                {/* Last Move Markers */}
                {isSrcMove && (
                  <div className="absolute w-8 h-8 rounded-full border-2 border-dashed border-sky-400 bg-sky-200/20 animate-pulse pointer-events-none" />
                )}
                {isDestMove && (
                  <div className="absolute w-9 h-9 rounded-full border-2 border-stone-800 bg-amber-500/10 pointer-events-none" />
                )}

                {/* Valid Destination Indicator */}
                {isTarget && (
                  <div className="absolute w-4 h-4 rounded-full bg-emerald-500/80 border border-white shadow-md hover:scale-125 transition-transform duration-100 animate-ping" />
                )}
                {isTarget && (
                  <div className="absolute w-3 h-3 rounded-full bg-emerald-500 shadow-sm border border-white" />
                )}

                {/* Chess Piece Render */}
                {p && (
                  <div
                    className={`
                      relative w-[85%] aspect-square rounded-full flex flex-col items-center justify-center shadow-lg transform active:scale-95 transition-all duration-150
                      ${isSel ? 'ring-4 ring-offset-2 ring-emerald-500 scale-110 z-20 shadow-xl' : 'hover:scale-105'}
                      ${p.color === 'red' 
                        ? 'bg-[#faf6f1] border-3 border-amber-600 text-red-600 shadow-red-900/10' 
                        : 'bg-[#faf6f1] border-3 border-neutral-700 text-stone-900 shadow-stone-900/20'}
                    `}
                  >
                    {/* Ring-inner accent */}
                    <div className={`absolute inset-[2px] rounded-full border border-dashed ${p.color === 'red' ? 'border-red-300' : 'border-stone-400'}`} />

                    {/* Chinese glyph label */}
                    <span className="text-xl md:text-2xl font-bold font-serif leading-none tracking-tight select-none">
                      {p.label}
                    </span>

                    {/* Vietnamese sub-label */}
                    <span 
                      className={`
                        text-[8px] md:text-[9px] -mt-0.5 leading-none font-medium select-none uppercase tracking-tighter
                        ${p.color === 'red' ? 'text-red-500' : 'text-stone-500'}
                      `}
                    >
                      {p.nameVi}
                    </span>

                    {/* Quick indicator if is King */}
                    {p.type === 'K' && (
                      <span className="absolute -top-1 -right-1 text-yellow-500">
                        <Sparkles className="w-3 h-3 fill-yellow-500" />
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })
        ))}
      </div>
    </div>
  );
}
