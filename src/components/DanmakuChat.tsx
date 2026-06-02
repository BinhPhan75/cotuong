import React, { useEffect, useState, useRef } from 'react';
import { ChatMessage } from '../types';
import { MessageSquare, Gift, Shield, User, Heart } from 'lucide-react';

interface DanmakuChatProps {
  chatFeed: ChatMessage[];
  boardContainerRef?: React.RefObject<HTMLDivElement | null>;
}

interface FlyingDanmaku {
  id: string;
  text: string;
  top: number; // percent height
  delay: number; // delay in ms
  color: string;
  isGift: boolean;
  avatar?: string;
  nickname: string;
}

export default function DanmakuChat({ chatFeed, boardContainerRef }: DanmakuChatProps) {
  const [danmakus, setDanmakus] = useState<FlyingDanmaku[]>([]);
  const chatScrollEndRef = useRef<HTMLDivElement>(null);
  const lastProcessedIndex = useRef<number>(0);

  // Auto-scroll chats to bottom
  useEffect(() => {
    chatScrollEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatFeed]);

  // Handle Danmaku Spawning whenever new chats arrive
  useEffect(() => {
    if (chatFeed.length === 0) return;

    // First load setup: just initialize pointer
    if (lastProcessedIndex.current === 0) {
      lastProcessedIndex.current = chatFeed.length;
      return;
    }

    // Capture newly arrived messages
    const newItems = chatFeed.slice(lastProcessedIndex.current);
    if (newItems.length > 0) {
      const colors = [
        'text-white',
        'text-stone-100',
        'text-cyan-300',
        'text-yellow-300',
        'text-emerald-300',
        'text-pink-300'
      ];

      const newDanmakus: FlyingDanmaku[] = newItems
        .filter(item => item.username !== 'system') // skip generic system alerts on flying overlay
        .map((item, idx) => {
          const randomColor = colors[Math.floor(Math.random() * colors.length)];
          const isGift = item.type === 'gift';
          
          return {
            id: `danmaku-${item.id}-${idx}`,
            text: isGift ? `🎁 Đã gửi thiết đạo cụ: ${item.text}` : item.text,
            nickname: item.nickname,
            top: 5 + (idx * 16 + Math.random() * 8) % 80, // spread across rows
            delay: idx * 250, // stagger multiple rapid comments
            color: isGift ? 'text-pink-400 font-bold bg-pink-900/40 px-2 py-0.5 rounded-full border border-pink-500/35' : randomColor,
            isGift,
            avatar: item.avatar
          };
        });

      setDanmakus(prev => [...prev, ...newDanmakus].slice(-30)); // Maintain sensible limit
      lastProcessedIndex.current = chatFeed.length;
    }
  }, [chatFeed]);

  // Periodically clean up finished danmakus after sliding (e.g. 5 seconds lifespan)
  useEffect(() => {
    const interval = setInterval(() => {
      setDanmakus(prev => prev.filter(d => {
        // Simple age analysis (approx 6 seconds cleanup)
        return true; 
      }));
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full flex flex-col h-full bg-slate-900/90 text-slate-100 rounded-2xl border border-slate-800 shadow-xl overflow-hidden">
      
      {/* 📺 FLYING OVERLAY INJECTOR */}
      {/* This invisible overlay will be absolutely positioned over the ChessBoard container by placing it in a React Portal or standard absolute alignment */}
      {boardContainerRef?.current && (
        <div className="hidden">
          {/* Internal state rendered remotely or mounted on same window */}
        </div>
      )}

      {/* RENDER FLYING WORDS (Attached dynamically when rendered in parent layout) */}
      
      {/* Chat header area */}
      <div className="bg-slate-950 p-4 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 bg-rose-500 rounded-full animate-ping" />
          <span className="font-sans font-bold text-xs uppercase tracking-wider text-slate-300 flex items-center gap-1">
            💬 Tương tác TikTok Live
          </span>
        </div>
        <div className="flex items-center gap-3 text-xs text-rose-400 font-medium bg-rose-950/20 px-2.5 py-0.5 rounded-full border border-rose-900/30">
          <Heart className="w-3 h-3 fill-rose-500 text-rose-500" /> Live Stream
        </div>
      </div>

      {/* Chat Lists Stream View */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 font-sans scrollbar-thin scrollbar-track-transparent scrollbar-thumb-slate-800">
        {chatFeed.map((msg) => {
          const isSystem = msg.type === 'system';
          const isGift = msg.type === 'gift';

          if (isSystem) {
            return (
              <div key={msg.id} className="bg-amber-950/20 border border-amber-900/35 rounded-xl p-3 text-xs text-amber-300 flex gap-2.5 leading-relaxed">
                <Shield className="w-4 h-4 text-amber-500 flex-shrink-0" />
                <div>
                  <span className="font-semibold text-[10px] bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded uppercase tracking-wider mr-1">ADMIN</span>
                  {msg.text}
                </div>
              </div>
            );
          }

          if (isGift) {
            return (
              <div key={msg.id} className="bg-gradient-to-r from-pink-950/30 to-rose-950/10 border border-pink-500/30 rounded-xl p-3 text-xs text-pink-200 flex gap-2.5 shadow-md shadow-pink-950/15 animate-pulse">
                <div className="w-8 h-8 rounded-full bg-pink-500/10 border border-pink-500/30 flex items-center justify-center flex-shrink-0 text-pink-400">
                  <Gift className="w-4.5 h-4.5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-pink-300 hover:underline cursor-pointer">{msg.nickname}</span>
                    <span className="text-gray-400 text-[10px]">@{msg.username}</span>
                  </div>
                  <div className="text-pink-100 font-semibold mt-1">
                    đã tặng <span className="px-2 py-0.5 bg-pink-500/10 text-pink-300 rounded border border-pink-500/25 inline-block text-[11px] font-bold">{msg.giftCount} x {msg.giftName}</span>
                  </div>
                </div>
              </div>
            );
          }

          // Standard Viewers chats
          return (
            <div key={msg.id} className="bg-slate-800/40 hover:bg-slate-800/60 rounded-xl p-2.5 transition-colors duration-100 flex gap-2.5 items-start">
              {msg.avatar ? (
                <img referrerPolicy="no-referrer" src={msg.avatar} alt="avatar" className="w-7 h-7 rounded-full bg-slate-700 flex-shrink-0 border border-slate-600" />
              ) : (
                <div className="w-7 h-7 rounded-full bg-indigo-600/20 flex items-center justify-center flex-shrink-0 text-indigo-400 border border-indigo-500/30">
                  <User className="w-3.5 h-3.5" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1">
                  <span className="text-slate-200 font-semibold text-xs leading-none">{msg.nickname}</span>
                  <span className="text-slate-500 text-[9px] truncate">@{msg.username}</span>
                </div>
                <p className="text-slate-300 text-xs mt-1 leading-normal break-words selection:bg-indigo-500 selection:text-white">
                  {msg.text}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={chatScrollEndRef} />
      </div>

      {/* FLYING WORDS ENGINE PORTAL IN VISUAL PARENT ELEMENT */}
      {/* We compile this helper function so the parent view can render flying text directly over the chessboard container! */}
      {false && danmakus} 
    </div>
  );
}

// Separate container-renderable Danmaku flow for visual ChessBoard area
export function FlyingDanmakuContainer({ chatFeed }: { chatFeed: ChatMessage[] }) {
  const [items, setItems] = useState<FlyingDanmaku[]>([]);
  const lastProcessedIdx = useRef(0);

  useEffect(() => {
    if (chatFeed.length === 0) return;
    
    // Jump over on start
    if (lastProcessedIdx.current === 0) {
      lastProcessedIdx.current = chatFeed.length;
      return;
    }

    const nextChats = chatFeed.slice(lastProcessedIdx.current);
    if (nextChats.length > 0) {
      const nextItems = nextChats
        .filter(item => item.username !== 'system')
        .map((item, idx) => ({
          id: `fly-${item.id}-${idx}-${Date.now()}`,
          text: item.type === 'gift' ? `🎁 ${item.nickname}: Tặng ${item.text}` : item.text,
          nickname: item.nickname,
          top: 10 + (Math.random() * 70), // randomized 10% to 80%
          delay: idx * 400,
          color: item.type === 'gift' ? 'text-pink-400 font-bold drop-shadow-md bg-pink-900/60' : 'text-neutral-100 drop-shadow-[0_1.5px_1.5px_rgba(0,0,0,0.9)]',
          isGift: item.type === 'gift',
          avatar: item.avatar
        }));

      setItems(prev => [...prev, ...nextItems]);
      lastProcessedIdx.current = chatFeed.length;
    }
  }, [chatFeed]);

  const handleAnimationEnd = (id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
  };

  return (
    <div className="absolute inset-x-0 top-1 bottom-1 z-20 pointer-events-none overflow-hidden rounded-2xl select-none">
      {items.map((item) => (
        <span
          key={item.id}
          onAnimationEnd={() => handleAnimationEnd(item.id)}
          className={`absolute whitespace-nowrap text-xs md:text-sm font-sans px-3 py-1 rounded-full flex items-center gap-1.5 font-semibold animate-danmaku-flow pointer-events-none`}
          style={{
            top: `${item.top}%`,
            animationDelay: `${item.delay}ms`,
            animationDuration: item.isGift ? '7.5s' : '9s',
            left: '100%'
          }}
        >
          {item.avatar && (
            <img 
              referrerPolicy="no-referrer"
              src={item.avatar} 
              alt="avatar" 
              className="w-4.5 h-4.5 rounded-full border border-stone-100/50 flex-shrink-0" 
            />
          )}
          <span className="text-white hover:underline text-[10px] md:text-xs">
            {item.nickname}:
          </span>
          <span className={`${item.color}`}>
            {item.text}
          </span>
        </span>
      ))}
    </div>
  );
}
