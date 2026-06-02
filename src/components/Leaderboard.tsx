import React from 'react';
import { LeaderboardEntry } from '../types';
import { Trophy, Award, Flame, Zap, Percent, Swords } from 'lucide-react';

interface LeaderboardProps {
  entries: LeaderboardEntry[];
}

export default function Leaderboard({ entries }: LeaderboardProps) {
  // Sort entries just in case
  const sorted = [...entries].sort((a, b) => b.elo - a.elo);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
      <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
        <div className="p-2 bg-yellow-500/10 rounded-lg text-yellow-400">
          <Trophy className="w-5 h-5" />
        </div>
        <div>
          <h3 className="font-display font-bold text-sm tracking-tight text-white">BẢNG XẾP HẠNG KỲ THỦ</h3>
          <p className="text-[11px] text-slate-400">BXH kỳ nghệ & điểm số Elo của sảnh</p>
        </div>
      </div>

      <div className="space-y-2">
        {sorted.map((u, i) => {
          const rank = i + 1;
          const totalMatches = u.wins + u.losses;
          const winRate = totalMatches > 0 ? Math.round((u.wins / totalMatches) * 100) : 0;
          
          let medalStyle = "text-slate-400 font-mono";
          let rowStyle = "bg-slate-950/20";
          
          if (rank === 1) {
            medalStyle = "text-yellow-400 font-bold bg-yellow-500/10 px-2 py-0.5 rounded";
            rowStyle = "bg-yellow-500/5 border border-yellow-500/10 shadow-sm shadow-yellow-950/5";
          } else if (rank === 2) {
            medalStyle = "text-slate-200 font-bold bg-slate-100/10 px-2 py-0.5 rounded";
            rowStyle = "bg-slate-500/5 border border-slate-500/10";
          } else if (rank === 3) {
            medalStyle = "text-amber-600 font-bold bg-amber-600/10 px-2 py-0.5 rounded";
            rowStyle = "bg-amber-600/5";
          } else {
            rowStyle = "bg-slate-950/40 border border-slate-850";
          }

          return (
            <div
              key={u.username}
              className={`flex items-center justify-between p-3 rounded-xl transition-colors duration-150 ${rowStyle}`}
            >
              <div className="flex items-center gap-3 min-w-0">
                {/* Seed / Position */}
                <div className={`w-8 text-center text-xs ${medalStyle}`}>
                  {rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : `#${rank}`}
                </div>

                <img
                  referrerPolicy="no-referrer"
                  src={u.avatar}
                  alt={u.username}
                  className="w-8.5 h-8.5 rounded-full bg-slate-800 border border-slate-700 flex-shrink-0"
                />

                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-200 font-bold text-xs truncate">
                      {u.nickname}
                    </span>
                    {u.streak >= 3 && (
                      <span className="bg-red-500/20 text-red-400 text-[9px] font-bold px-1.5 py-0.5 rounded-full border border-red-500/30 flex items-center gap-0.5 animate-pulse">
                        <Flame className="w-3 h-3 fill-red-400" /> W{u.streak}
                      </span>
                    )}
                  </div>
                  <div className="text-slate-500 text-[10px] truncate">
                     @{u.username}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4 text-right">
                <div className="text-right">
                  <div className="font-mono text-xs font-bold text-indigo-400 flex items-center justify-end gap-1">
                     <Zap className="w-3.5 h-3.5 fill-indigo-400" />
                     {u.elo} ELO
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono">
                     Tỉ lệ thắng: {winRate}%
                  </span>
                </div>

                <div className="hidden sm:block text-slate-400 text-[10px] font-mono whitespace-nowrap bg-slate-950/60 p-1.5 rounded border border-slate-850">
                  <span className="text-emerald-400 font-bold">{u.wins}W</span>
                  <span className="mx-1 text-slate-700">/</span>
                  <span className="text-red-400 font-bold">{u.losses}L</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
