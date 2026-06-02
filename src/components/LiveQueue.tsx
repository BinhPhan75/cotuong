import React, { useState } from 'react';
import { QueueItem, LivePlayer, BoardColor } from '../types';
import { Clock, Users, ArrowRight, CheckCircle, ShieldCheck, UserCheck } from 'lucide-react';

interface LiveQueueProps {
  queue: QueueItem[];
  activePlayers: {
    red: LivePlayer | null;
    black: LivePlayer | null;
  };
  onJoinQueue: (username: string, nickname: string) => Promise<any>;
  onLeaveQueue: (username: string) => void;
  onRequestCode: () => Promise<string>;
}

export default function LiveQueue({
  queue,
  activePlayers,
  onJoinQueue,
  onLeaveQueue,
  onRequestCode
}: LiveQueueProps) {
  const [username, setUsername] = useState('');
  const [nickname, setNickname] = useState('');
  const [verificationCode, setVerificationCode] = useState<string | null>(null);
  const [isJoined, setIsJoined] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleRequestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) return;

    setIsLoading(true);
    try {
      // First, join the temporary queue list
      const cleanUser = username.trim().toLowerCase();
      const cleanNick = nickname.trim() || username.trim();
      
      const rc = await onRequestCode();
      setVerificationCode(rc);
      
      await onJoinQueue(cleanUser, cleanNick);
      setIsJoined(true);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLeave = () => {
    if (username) {
      onLeaveQueue(username.trim().toLowerCase());
    }
    setIsJoined(false);
    setVerificationCode(null);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-5">
      <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
        <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400">
          <Users className="w-5 h-5" />
        </div>
        <div>
          <h3 className="font-display font-bold text-sm tracking-tight text-white">XÁC THỰC & HÀNG ĐỢI</h3>
          <p className="text-[11px] text-slate-400">Đăng ký tham gia trận đấu tiếp theo</p>
        </div>
      </div>

      {/* 🔐 ID VERIFICATION FLOW (ANTI-FAKE ID) */}
      {!isJoined ? (
        <form onSubmit={handleRequestCode} className="space-y-4">
          <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-850 space-y-2">
            <span className="text-[11px] font-semibold text-indigo-400 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" /> LUẬT ĐẤU CHỐNG GIẢ MẠO (ANTI-FAKE)
            </span>
            <p className="text-[10px] text-slate-400 leading-normal">
              Để chống việc lấy ID người khác đi phá hoại, hệ thống sẽ cấp mã 4 số. Bạn cần copy mã này và dán vào bình luận TikTok Live để hệ thống tự liên kết.
            </p>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-[11px] font-medium text-slate-300 mb-1">ID TikTok của bạn</label>
              <input
                id="verify-username-input"
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9_.]/g, ''))}
                placeholder="Ví dụ: nguyen_van_a"
                className="w-full bg-slate-950 text-xs border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500 placeholder-slate-600"
              />
            </div>
            
            <div>
              <label className="block text-[11px] font-medium text-slate-300 mb-1">Biệt danh hiển thị</label>
              <input
                id="verify-nickname-input"
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="Ví dụ: Kỳ thủ Sơn La"
                className="w-full bg-slate-950 text-xs border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500 placeholder-slate-600"
              />
            </div>
          </div>

          <button
            id="get-code-btn"
            type="submit"
            disabled={isLoading}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs px-4 py-2.5 rounded-lg transition-all flex items-center justify-center gap-2"
          >
            {isLoading ? "Đang tạo mã..." : "Lấy mã liên kết đấu vật ➔"}
          </button>
        </form>
      ) : (
        <div className="space-y-4">
          <div className="bg-indigo-950/30 border border-indigo-500/20 rounded-xl p-4 text-center space-y-3 animate-fade-in">
            <div className="w-10 h-10 rounded-full bg-indigo-500/15 flex items-center justify-center mx-auto text-indigo-400">
              <CheckCircle className="w-5 h-5" />
            </div>
            
            <div>
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">Mã xác thực của bạn</h4>
              <p className="text-[10px] text-slate-400 mt-0.5">Bình luận đúng mã này trong box chat TikTok</p>
            </div>

            {verificationCode && (
              <div className="inline-block px-5 py-2.5 bg-slate-950 rounded-lg border-2 border-indigo-500 font-mono text-xl font-bold tracking-widest text-indigo-300 shadow-inner">
                {verificationCode}
              </div>
            )}

            <div className="text-[10px] text-slate-400 leading-normal bg-slate-950/40 p-2.5 rounded border border-slate-850 text-left">
              🇻🇳 <span className="font-semibold text-slate-200">Cách tham gia:</span> Hãy nhập đúng mã <span className="text-indigo-400 font-bold">{verificationCode}</span> vào ô Chat ở <span className="font-semibold text-slate-200">Khung Giả lập TikTok Live (bên dưới)</span> để kích hoạt liên kết tài khoản @{username} vào danh sách hàng đợi đấu chính thức!
            </div>

            <button
              id="cancel-queue-btn"
              type="button"
              onClick={handleLeave}
              className="mt-2 text-slate-400 hover:text-slate-200 text-[10px] underline"
            >
              Hủy yêu cầu / Rời hàng chờ
            </button>
          </div>
        </div>
      )}

      {/* 👥 WAITING QUEUE LIST VIEW */}
      <div className="space-y-2.5">
        <h4 className="text-[11px] font-semibold text-slate-300 uppercase tracking-widest flex items-center justify-between">
          <span>Hàng chờ thi đấu ({queue.length})</span>
          <span className="flex items-center gap-1 text-[10px] text-indigo-400 normal-case font-normal">
            <Clock className="w-3.5 h-3.5" /> Thực tế
          </span>
        </h4>

        {queue.length === 0 ? (
          <div className="text-center py-6 bg-slate-950/20 rounded-xl border border-dashed border-slate-800 text-[11px] text-slate-500 font-mono">
            Chưa có kì thủ nào xếp hàng chờ...
          </div>
        ) : (
          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1 scrollbar-thin">
            {queue.map((item, idx) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-2.5 bg-slate-950/40 hover:bg-slate-950/75 rounded-lg border border-slate-850 transition-colors"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="text-slate-500 text-[10px] font-mono font-bold w-4.5 text-center">
                    #{idx + 1}
                  </div>
                  <img
                    referrerPolicy="no-referrer"
                    src={item.avatar}
                    alt="avatar"
                    className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex-shrink-0"
                  />
                  <div className="min-w-0">
                    <p className="text-slate-200 text-xs font-semibold leading-tight truncate">
                      {item.nickname}
                    </p>
                    <p className="text-slate-500 text-[9px] truncate">
                      @{item.username}
                    </p>
                  </div>
                </div>

                <div>
                  {item.verified ? (
                    <span className="text-[9px] bg-emerald-950 text-emerald-400 px-2 py-0.5 rounded-full font-medium border border-emerald-900/40 flex items-center gap-1">
                      <UserCheck className="w-3 h-3" /> Đã duyệt
                    </span>
                  ) : (
                    <span className="text-[9px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full font-medium">
                      Chờ nhập mã
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ⚔️ CURRENT COMBATANTS BOARD SUMMARY */}
      <div className="bg-slate-950/40 p-3.5 rounded-xl border border-slate-850 space-y-2.5">
        <h4 className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest text-center">
          Trận đấu hiện tại
        </h4>
        <div className="flex items-center justify-between">
          {/* RED SLOT */}
          <div className="text-center w-[44%] min-w-0">
            {activePlayers.red ? (
              <div className="space-y-1">
                <img
                  referrerPolicy="no-referrer"
                  src={activePlayers.red.avatar}
                  alt="red avatar"
                  className="w-8.5 h-8.5 rounded-full bg-red-950/20 border-2 border-red-500 mx-auto"
                />
                <p className="text-xs font-bold text-red-400 truncate">{activePlayers.red.nickname}</p>
                <p className="text-[9px] text-slate-500 truncate">@{activePlayers.red.username}</p>
              </div>
            ) : (
              <div className="py-3 border border-dashed border-red-900/30 rounded-lg text-slate-500 text-[10px]">
                Trống (Chờ Red)
              </div>
            )}
          </div>

          <div className="text-center font-mono font-medium text-xs text-indigo-400">
            VS
          </div>

          {/* BLACK SLOT */}
          <div className="text-center w-[44%] min-w-0">
            {activePlayers.black ? (
              <div className="space-y-1">
                <img
                  referrerPolicy="no-referrer"
                  src={activePlayers.black.avatar}
                  alt="black avatar"
                  className="w-8.5 h-8.5 rounded-full bg-stone-950 border-2 border-slate-500 mx-auto"
                />
                <p className="text-xs font-bold text-slate-300 truncate">{activePlayers.black.nickname}</p>
                <p className="text-[9px] text-slate-500 truncate">@{activePlayers.black.username}</p>
              </div>
            ) : (
              <div className="py-3 border border-dashed border-slate-800 rounded-lg text-slate-500 text-[10px]">
                Trống (Chờ Black)
              </div>
            )}
          </div>
        </div>
      </div>

    </div>
  );
}
