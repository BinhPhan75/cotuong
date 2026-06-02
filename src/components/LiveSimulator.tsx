import React, { useState } from 'react';
import { BoardColor, ChatMessage } from '../types';
import { Send, Gift, Heart, User, Sparkles, HelpCircle } from 'lucide-react';

interface LiveSimulatorProps {
  onSimulateEvent: (data: {
    eventType: 'chat' | 'like' | 'gift';
    username: string;
    nickname: string;
    text?: string;
    giftName?: string;
    count?: number;
    sponsorSide?: BoardColor;
  }) => Promise<any>;
  queue: any[];
}

export default function LiveSimulator({ onSimulateEvent, queue }: LiveSimulatorProps) {
  const [username, setUsername] = useState('khanh_duong');
  const [nickname, setNickname] = useState('Khánh Dương Kỳ Đài');
  const [chatMessage, setChatMessage] = useState('');
  const [giftName, setGiftName] = useState('rose');
  const [giftCount, setGiftCount] = useState(1);
  const [sponsorSide, setSponsorSide] = useState<BoardColor>('red');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatMessage.trim()) return;

    setIsSubmitting(true);
    try {
      await onSimulateEvent({
        eventType: 'chat',
        username: username.toLowerCase().trim(),
        nickname: nickname.trim(),
        text: chatMessage.trim()
      });
      setChatMessage('');
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendLike = async () => {
    setIsSubmitting(true);
    try {
      await onSimulateEvent({
        eventType: 'like',
        username: username.toLowerCase().trim(),
        nickname: nickname.trim(),
        count: Math.floor(Math.random() * 40) + 10
      });
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendGift = async (gType: string, label: string) => {
    setIsSubmitting(true);
    try {
      await onSimulateEvent({
        eventType: 'gift',
        username: username.toLowerCase().trim(),
        nickname: nickname.trim(),
        giftName: gType,
        count: giftCount,
        sponsorSide
      });
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const loadPresetUser = (user: string, nick: string) => {
    setUsername(user);
    setNickname(nick);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-5">
      <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
        <div className="p-2 bg-pink-550/10 rounded-lg text-pink-400">
          <Heart className="w-5 h-5 fill-pink-500 text-pink-500 animate-pulse" />
        </div>
        <div>
          <h3 className="font-display font-bold text-sm tracking-tight text-white">BÀNG GIẢ LẬP TIKTOK LIVE</h3>
          <p className="text-[11px] text-slate-400">Gửi Chat, Like, Thả Quà tác động tới Bàn Cờ</p>
        </div>
      </div>

      {/* Profile Simulator presets */}
      <div className="space-y-3">
        <h4 className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest">
          1. Tài khoản sục giả lập (Preset Viewer)
        </h4>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[9px] text-slate-500 uppercase font-mono">Username</label>
            <input
              id="preset-username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9_.]/g, ''))}
              className="w-full bg-slate-950 text-xs border border-slate-850 px-2 py-1 rounded text-white focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-[9px] text-slate-500 uppercase font-mono">Nickname</label>
            <input
              id="preset-nickname"
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              className="w-full bg-slate-950 text-xs border border-slate-850 px-2 py-1 rounded text-white focus:outline-none"
            />
          </div>
        </div>

        {/* Quick select users */}
        <div className="flex flex-wrap gap-1.5 pt-1">
          <button
            type="button"
            onClick={() => loadPresetUser('khanh_duong', 'Khánh Dương Kỳ Đài')}
            className="text-[9px] px-2 py-0.5 rounded bg-slate-950 text-slate-300 hover:bg-slate-800"
          >
            🧔 Khánh Dương
          </button>
          <button
            type="button"
            onClick={() => loadPresetUser('huynh_tram', 'Trâm Anh Xe Pháo')}
            className="text-[9px] px-2 py-0.5 rounded bg-slate-950 text-slate-300 hover:bg-slate-800"
          >
            👩 Trâm Anh
          </button>
          {queue.length > 0 && (
            <button
              type="button"
              onClick={() => {
                // Load first queue item waiting for verification
                const unverified = queue.find(q => !q.verified);
                if (unverified) {
                  loadPresetUser(unverified.username, unverified.nickname);
                }
              }}
              className="text-[9px] px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 hover:bg-indigo-900 font-bold"
            >
              🔄 Chọn người chờ duyệt mã
            </button>
          )}
        </div>
      </div>

      {/* 💬 MESSAGE SIMULATOR */}
      <div className="space-y-2 border-t border-slate-850 pt-4">
        <h4 className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest flex items-center justify-between">
          <span>2. Bình luận Bình Thường (Chat Box)</span>
          <span className="flex items-center gap-1 font-normal lowercase text-[9px] text-slate-500">
            <Send className="w-3 h-3" /> gửi để liên kết mã
          </span>
        </h4>

        <form onSubmit={handleSendChat} className="flex gap-2">
          <input
            id="sim-chat-input"
            type="text"
            value={chatMessage}
            onChange={(e) => setChatMessage(e.target.value)}
            placeholder="Nhập nội dung chat hoặc mã liên kết (VD: 5829)..."
            className="flex-1 bg-slate-950 text-xs border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-pink-500 placeholder-slate-700"
          />
          <button
            id="sim-chat-send-btn"
            type="submit"
            disabled={isSubmitting}
            className="bg-slate-950 hover:bg-slate-800 border border-slate-800 px-3.5 py-2 rounded-lg text-slate-300 hover:text-white shrink-0"
          >
            Gửi
          </button>
        </form>
      </div>

      {/* 🎁 INTERACTIVE GIFT SIMULATOR */}
      <div className="space-y-4 border-t border-slate-850 pt-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h4 className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
            <span>3. Gửi Quà Tặng Đạo Cụ (Gifting Game)</span>
          </h4>
          
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-slate-500 font-medium">Bảo trợ cho:</span>
            <select
              id="sponsor-select"
              value={sponsorSide}
              onChange={(e) => setSponsorSide(e.target.value as BoardColor)}
              className="bg-slate-950 text-[10px] border border-slate-800 rounded px-1.5 py-0.5 text-white focus:outline-none"
            >
              <option value="red">🔴 Phe Đỏ</option>
              <option value="black">⚫ Phe Đen</option>
            </select>

            <select
              id="gift-qty-select"
              value={giftCount}
              onChange={(e) => setGiftCount(Number(e.target.value))}
              className="bg-slate-950 text-[10px] border border-slate-800 rounded px-1.5 py-0.5 text-white focus:outline-none"
            >
              <option value={1}>x1</option>
              <option value={5}>x5</option>
              <option value={10}>x10</option>
            </select>
          </div>
        </div>

        {/* Gift grid layout according to specs */}
        <div className="grid grid-cols-3 gap-2">
          
          {/* Rose - Small */}
          <button
            type="button"
            onClick={() => handleSendGift('rose', 'Hoa Hồng')}
            className="flex flex-col items-center p-2.5 bg-slate-950/60 hover:bg-slate-950 border border-pink-500/10 hover:border-pink-500/40 rounded-xl transition-all group scale-100 hover:scale-102"
          >
            <span className="text-xl group-hover:scale-115 transition-transform">🌹</span>
            <span className="text-[10px] font-bold text-slate-200 mt-1">Hoa Hồng</span>
            <span className="text-[8px] text-pink-400 mt-0.5">Tăng giờ +15s</span>
          </button>

          {/* Soccer Ball - Small */}
          <button
            type="button"
            onClick={() => handleSendGift('ball', 'Quả Bóng')}
            className="flex flex-col items-center p-2.5 bg-slate-950/60 hover:bg-slate-950 border border-pink-500/10 hover:border-pink-500/40 rounded-xl transition-all group scale-100 hover:scale-102"
          >
            <span className="text-xl group-hover:scale-115 transition-transform">⚽</span>
            <span className="text-[10px] font-bold text-slate-200 mt-1">Quả Bóng</span>
            <span className="text-[8px] text-pink-400 mt-0.5">Tăng giờ +15s</span>
          </button>

          {/* Sunglasses - Medium */}
          <button
            type="button"
            onClick={() => handleSendGift('sunglasses', 'Kính Mát')}
            className="flex flex-col items-center p-2.5 bg-slate-950/60 hover:bg-slate-950 border border-pink-500/10 hover:border-pink-500/40 rounded-xl transition-all group scale-100 hover:scale-102"
          >
            <span className="text-xl group-hover:scale-115 transition-transform">😎</span>
            <span className="text-[10px] font-bold text-slate-200 mt-1">Kính Mát</span>
            <span className="text-[8px] text-orange-400 mt-0.5">Mù sương 10s</span>
          </button>

          {/* Ring - Medium */}
          <button
            type="button"
            onClick={() => handleSendGift('ring', 'Chiếc Nhẫn')}
            className="flex flex-col items-center p-2.5 bg-slate-950/60 hover:bg-slate-950 border border-pink-500/10 hover:border-pink-500/40 rounded-xl transition-all group scale-100 hover:scale-102"
          >
            <span className="text-xl group-hover:scale-115 transition-transform">💍</span>
            <span className="text-[10px] font-bold text-slate-200 mt-1">Chiếc Nhẫn</span>
            <span className="text-[8px] text-orange-400 mt-0.5">Mù sương 10s</span>
          </button>

          {/* Crown - Large */}
          <button
            type="button"
            onClick={() => handleSendGift('crown', 'Vương Miện')}
            className="flex flex-col items-center p-2.5 bg-slate-950/60 hover:bg-slate-950 border border-pink-500/10 hover:border-pink-500/40 rounded-xl transition-all group scale-100 hover:scale-102"
          >
            <span className="text-xl group-hover:scale-115 transition-transform text-yellow-400">👑</span>
            <span className="text-[10px] font-bold text-slate-200 mt-1">Vương Miện</span>
            <span className="text-[8px] text-yellow-500 mt-0.5">Đề nghị Undo</span>
          </button>

          {/* Lion - Large */}
          <button
            type="button"
            onClick={() => handleSendGift('lion', 'Sư Tử')}
            className="flex flex-col items-center p-2.5 bg-slate-950/60 hover:bg-slate-950 border border-pink-500/10 hover:border-pink-500/40 rounded-xl transition-all group scale-100 hover:scale-102"
          >
            <span className="text-xl group-hover:scale-115 transition-transform text-amber-500">🦁</span>
            <span className="text-[10px] font-bold text-slate-200 mt-1">Sư Tử</span>
            <span className="text-[8px] text-yellow-500 mt-0.5">Đề nghị Undo</span>
          </button>

        </div>
      </div>

      {/* 💖 LIKE OVERLAY EMULATOR */}
      <div className="flex gap-2 items-center justify-between border-t border-slate-850 pt-4">
        <div>
          <h4 className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest leading-none">
            4. Thả tim Livestream (Likes)
          </h4>
          <p className="text-[9px] text-slate-500 mt-1">Giúp kênh tăng xu hướng</p>
        </div>
        <button
          id="sim-like-btn"
          type="button"
          onClick={handleSendLike}
          className="bg-rose-600 hover:bg-rose-500 text-white flex items-center justify-center gap-1 px-4 py-2 rounded-lg text-xs font-bold transition-all relative overflow-hidden group scale-100 active:scale-95"
        >
          <Heart className="w-4 h-4 fill-white animate-bounce" />
          Thả tim ❤️
        </button>
      </div>

    </div>
  );
}
