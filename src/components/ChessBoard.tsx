import React, { useState } from 'react';
import { ChessBoardState, GridPosition, Piece, BoardColor, BoardStyleSettings } from '../types';
import { isValidXiangqiMove } from '../utils/xiangqiRules';
import { ShieldAlert, Sparkles } from 'lucide-react';

// @ts-ignore
import bancotuong from '../assets/bancotuong.png';
// @ts-ignore
import quancotuong from '../assets/quancotuong.png';

// Import all 14 chess piece assets statically to ensure proper Vite bundling
// @ts-ignore
import maden from '../assets/maden.png';
// @ts-ignore
import mado from '../assets/mado.png';
// @ts-ignore
import phaoden from '../assets/phaoden.png';
// @ts-ignore
import phaodo from '../assets/phaodo.png';
// @ts-ignore
import siden from '../assets/siden.png';
// @ts-ignore
import sido from '../assets/sido.png';
// @ts-ignore
import totden from '../assets/totden.png';
// @ts-ignore
import totdo from '../assets/totdo.png';
// @ts-ignore
import tuong1den from '../assets/tuong1den.png';
// @ts-ignore
import tuong1do from '../assets/tuong1do.png';
// @ts-ignore
import tuongden from '../assets/tuongden.png';
// @ts-ignore
import tuongdo from '../assets/tuongdo.png';
// @ts-ignore
import xeden from '../assets/xeden.png';
// @ts-ignore
import xedo from '../assets/xedo.png';

const localPieceImages: Record<string, string> = {
  'black-K': tuongden,
  'red-K': tuongdo,
  'black-A': siden,
  'red-A': sido,
  'black-E': tuong1den,
  'red-E': tuong1do,
  'black-H': maden,
  'red-H': mado,
  'black-R': xeden,
  'red-R': xedo,
  'black-C': phaoden,
  'red-C': phaodo,
  'black-P': totden,
  'red-P': totdo,
};

const pieceFileNames: Record<string, string> = {
  'black-K': 'tuongden.png',
  'red-K': 'tuongdo.png',
  'black-A': 'siden.png',
  'red-A': 'sido.png',
  'black-E': 'tuong1den.png',
  'red-E': 'tuong1do.png',
  'black-H': 'maden.png',
  'red-H': 'mado.png',
  'black-R': 'xeden.png',
  'red-R': 'xedo.png',
  'black-C': 'phaoden.png',
  'red-C': 'phaodo.png',
  'black-P': 'totden.png',
  'red-P': 'totdo.png',
};

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
  styleSettings: BoardStyleSettings;
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
  timeLeft,
  styleSettings
}: ChessBoardProps) {
  const [selectedPos, setSelectedPos] = useState<GridPosition | null>(null);
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});

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

  // Styled paddings
  const boardPaddingStyle = {
    paddingTop: `${styleSettings.paddingTop}px`,
    paddingBottom: `${styleSettings.paddingBottom}px`,
    paddingLeft: `${styleSettings.paddingLeft}px`,
    paddingRight: `${styleSettings.paddingRight}px`,
  };

  const boardCanvasStyle = {
    top: `${styleSettings.paddingTop}px`,
    bottom: `${styleSettings.paddingBottom}px`,
    left: `${styleSettings.paddingLeft}px`,
    right: `${styleSettings.paddingRight}px`,
  };

  const renderCssPiece = (p: Piece, isSel: boolean, hideText: boolean = false) => {
    return (
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

        {!hideText && (
          <>
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
          </>
        )}

        {/* Quick indicator if is King */}
        {p.type === 'K' && (
          <span className="absolute -top-1 -right-1 text-yellow-500">
            <Sparkles className="w-3 h-3 fill-yellow-500" />
          </span>
        )}
      </div>
    );
  };

  const renderPieceIndividual = (p: Piece, isSel: boolean) => {
    const key = `${p.color}-${p.type}`;
    const filename = pieceFileNames[key] || 'tuongdo.png';
    const baseUrl = styleSettings.pieceImageUrlBase ? styleSettings.pieceImageUrlBase.trim() : 'https://raw.githubusercontent.com/BinhPhan75/cotuong/main/src/assets/';
    
    // Attempt to load the raw GitHub URL directly as first priority
    const imageUrl = `${baseUrl}${filename}`;
    const hasFailed = failedImages[imageUrl];

    if (hasFailed) {
      // Safe fallback: use the pre-bundled local copy if GitHub is blocked or fails
      const localImg = localPieceImages[key];
      const localHasFailed = failedImages[localImg];
      if (localHasFailed) {
        // Ultimate fallback to CSS representation with no text inside as requested
        return renderCssPiece(p, isSel, true);
      }
      return (
        <div
          style={{
            width: `${styleSettings.pieceScale}%`,
            height: `${styleSettings.pieceScale}%`,
          }}
          className={`
            relative rounded-full overflow-hidden flex items-center justify-center transform active:scale-95 transition-all duration-150 aspect-square shadow-md border border-amber-950/20 bg-amber-50
            ${isSel ? 'ring-4 ring-offset-2 ring-emerald-500 scale-110 z-20 shadow-xl' : 'hover:scale-105'}
          `}
        >
          <img
            src={localImg}
            referrerPolicy="no-referrer"
            alt={p.nameVi}
            className="w-full h-full object-cover rounded-full pointer-events-none select-none"
            onError={() => {
              console.warn(`Failed to load backup local piece image: ${localImg}. Recording failure.`);
              setFailedImages(prev => ({ ...prev, [localImg]: true }));
            }}
          />
        </div>
      );
    }

    return (
      <div
        style={{
          width: `${styleSettings.pieceScale}%`,
          height: `${styleSettings.pieceScale}%`,
        }}
        className={`
          relative rounded-full overflow-hidden flex items-center justify-center transform active:scale-95 transition-all duration-150 aspect-square shadow-md border border-amber-950/20 bg-amber-50
          ${isSel ? 'ring-4 ring-offset-2 ring-emerald-500 scale-110 z-20 shadow-xl' : 'hover:scale-105'}
        `}
      >
        <img
          src={imageUrl}
          referrerPolicy="no-referrer"
          alt={p.nameVi}
          className="w-full h-full object-cover rounded-full pointer-events-none select-none"
          onError={() => {
            console.warn(`Failed to load piece image: ${imageUrl}. Recording failure.`);
            setFailedImages(prev => ({ ...prev, [imageUrl]: true }));
          }}
        />
      </div>
    );
  };

  const renderPieceSprite = (p: Piece, isSel: boolean) => {
    const colIdx = styleSettings.spriteOrder[p.type] !== undefined ? styleSettings.spriteOrder[p.type] : 0;
    const rowIdx = p.color === 'red' ? styleSettings.redRow : styleSettings.blackRow;

    const widthMult = styleSettings.spriteWidthMultiplier ?? 700;
    const rowHeightRatio = styleSettings.spriteRowHeightRatio ?? 100;

    return (
      <div
        style={{
          width: `${styleSettings.pieceScale}%`,
          height: `${styleSettings.pieceScale}%`,
        }}
        className={`
          relative rounded-full shadow-lg overflow-hidden flex items-center justify-center transform active:scale-95 transition-all duration-150 aspect-square
          ${isSel ? 'ring-4 ring-offset-2 ring-emerald-500 scale-110 z-20 shadow-xl' : 'hover:scale-105'}
        `}
      >
        <img
          src={quancotuong}
          referrerPolicy="no-referrer"
          style={{
            position: 'absolute',
            width: `${widthMult}%`,
            maxWidth: 'none',
            height: 'auto',
            left: `-${colIdx * 100}%`,
            top: `-${rowIdx * rowHeightRatio}%`,
          }}
          alt={p.nameVi}
          className="pointer-events-none select-none"
        />
      </div>
    );
  };

  // Prefer the direct boardImageUrl from settings (or fallback default raw.githubusercontent.com path)
  const boardImageUrlToUse = styleSettings.boardImageUrl && styleSettings.boardImageUrl.trim() !== '' 
    ? styleSettings.boardImageUrl.trim() 
    : 'https://raw.githubusercontent.com/BinhPhan75/cotuong/main/src/assets/bancotuong.png';

  return (
    <div 
      className="relative w-full aspect-[9/10] rounded-2xl shadow-2xl border-4 border-amber-800 selection:bg-transparent overflow-hidden"
      style={{
        backgroundColor: '#f7eedc'
      }}
    >
      {/* 🗺️ Board Image Background Layer with dynamic image fallback */}
      {styleSettings.useBoardImage && (
        <img 
          src={boardImageUrlToUse}
          referrerPolicy="no-referrer"
          className="absolute inset-0 w-full h-full object-fill pointer-events-none select-none z-0"
          alt="Bàn cờ tướng"
          onError={(e) => {
            console.warn(`Failed to load board image URL: ${boardImageUrlToUse}. Falling back to default backup.`);
            e.currentTarget.src = bancotuong;
          }}
        />
      )}
      
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

      {/* Grid Canvas Lines Layer (drawn on top of background image if enabled or if board image is off) */}
      {(styleSettings.showSvgGrid || !styleSettings.useBoardImage) && (
        <div 
          className="absolute pointer-events-none border border-stone-800/60"
          style={boardCanvasStyle}
        >
          {/* Draw chess rows and cols */}
          {/* Horizontal Lines */}
          {Array(10).fill(null).map((_, i) => (
            <div 
              key={`row-${i}`} 
              className="absolute left-0 right-0 h-[1px] bg-stone-700/60" 
              style={{ top: `${(i / 9) * 100}%` }}
            />
          ))}

          {/* Vertical Lines (Divided by the center River) */}
          {Array(9).fill(null).map((_, i) => (
            <React.Fragment key={`col-frag-${i}`}>
              {/* Top Grid (Rows 0 to 4) */}
              <div 
                className="absolute bg-stone-700/60" 
                style={{ 
                  left: `${(i / 8) * 100}%`, 
                  top: '0%', 
                  bottom: '55.55%', 
                  width: '1px' 
                }}
              />
              {/* Bottom Grid (Rows 5 to 9) */}
              <div 
                className="absolute bg-stone-700/60" 
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
          <svg className="absolute inset-0 w-full h-full opacity-50">
            {/* Top Palace */}
            <line x1="37.5%" y1="0%" x2="62.5%" y2="22.22%" stroke="#444" strokeWidth="1.2" />
            <line x1="62.5%" y1="0%" x2="37.5%" y2="22.22%" stroke="#444" strokeWidth="1.2" />
            
            {/* Bottom Palace */}
            <line x1="37.5%" y1="77.77%" x2="62.5%" y2="100%" stroke="#444" strokeWidth="1.2" />
            <line x1="62.5%" y1="77.77%" x2="37.5%" y2="100%" stroke="#444" strokeWidth="1.2" />
          </svg>

          {/* River Label */}
          <div className="absolute top-[44.44%] bottom-[55.55%] left-[2%] right-[2%] flex items-center justify-between px-12 z-0 font-sans text-stone-700/60 font-semibold text-xs md:text-sm tracking-widest pointer-events-none uppercase">
            <span> Sở Hà - 楚河</span>
            <span> Hán Giới - 漢界</span>
          </div>
        </div>
      )}

      {/* Interactive Cells and Pieces Grid - styled with local custom padding */}
      <div 
        className="relative w-full h-full grid grid-cols-9 grid-rows-10 z-10"
        style={boardPaddingStyle}
      >
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
                  <div className="absolute w-10 h-10 rounded-full border-2 border-dashed border-amber-500 bg-amber-500/10 pointer-events-none" />
                )}

                {/* Valid Destination Indicator */}
                {isTarget && (
                  <div className="absolute w-4 h-4 rounded-full bg-emerald-500/80 border border-white shadow-md hover:scale-125 transition-transform duration-100 animate-ping" />
                )}
                {isTarget && (
                  <div className="absolute w-3 h-3 rounded-full bg-emerald-500 shadow-sm border border-white" />
                )}

                {/* Chess Piece Render - conditional */}
                {p && (
                  (() => {
                    const mode = styleSettings.pieceStyleMode || (styleSettings.useSpritePieces ? 'sprite' : 'css');
                    if (mode === 'individual') {
                      return renderPieceIndividual(p, isSel);
                    } else if (mode === 'sprite') {
                      return renderPieceSprite(p, isSel);
                    } else {
                      return renderCssPiece(p, isSel, true);
                    }
                  })()
                )}
              </div>
            );
          })
        ))}
      </div>
    </div>
  );
}
