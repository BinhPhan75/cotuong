import React, { useEffect, useState } from 'react';
import { ChatMessage } from '../types';
import { Gift, Sparkles, Smile, Star, Zap } from 'lucide-react';

interface GiftNotificationProps {
  chatFeed: ChatMessage[];
}

interface ToastGift {
  id: string;
  nickname: string;
  text: string;
  count: number;
}

export default function GiftNotification({ chatFeed }: GiftNotificationProps) {
  const [activeGift, setActiveGift] = useState<ToastGift | null>(null);

  useEffect(() => {
    if (chatFeed.length === 0) return;

    // Retrieve last message
    const latest = chatFeed[chatFeed.length - 1];
    if (latest && latest.type === 'gift') {
      setActiveGift({
         id: `toast-${latest.id}-${Date.now()}`,
         nickname: latest.nickname,
         text: latest.giftName || "Quà tặng",
         count: latest.giftCount || 1,
      });

      // Show toast and decay after 4 seconds
      const timeout = setTimeout(() => {
        setActiveGift(null);
      }, 4000);

      return () => clearTimeout(timeout);
    }
  }, [chatFeed]);

  if (!activeGift) return null;

  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40 bg-gradient-to-r from-pink-600 via-rose-600 to-amber-500 rounded-2xl shadow-2xl p-0.5 animate-bounce max-w-sm w-80">
      <div className="bg-slate-950/95 backdrop-blur-sm p-3 rounded-[14px] flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-pink-500/10 flex items-center justify-center border border-pink-500/30 text-pink-400 animate-spin">
          <Gift className="w-6 h-6" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1">
            <span className="text-white text-xs font-bold truncate leading-none">
              {activeGift.nickname}
            </span>
            <Sparkles className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500 flex-shrink-0" />
          </div>
          <p className="text-[11px] text-gray-300 mt-1">
            Gửi tặng <span className="font-bold text-pink-400 text-xs">{activeGift.text}</span>
          </p>
        </div>

        <div className="bg-slate-900 border border-pink-500/30 px-3 py-1.5 rounded-xl font-mono text-lg font-bold text-yellow-400 flex items-center gap-0.5 animate-pulse">
          <Zap className="w-4 h-4 fill-yellow-400 text-yellow-400" />
          X{activeGift.count}
        </div>
      </div>
    </div>
  );
}
