"use client";

import React from "react";
import { Play, ChevronRight, ChevronLeft } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { useUserActivity } from "@/context/UserActivityContext";
import { VideoLesson } from "@/data/physicsData";

interface ContinueWatchingProps {
  lessons: VideoLesson[];
  onPlay: (lesson: VideoLesson) => void;
}

export const ContinueWatching: React.FC<ContinueWatchingProps> = ({ lessons, onPlay }) => {
  const { lang, t } = useLanguage();
  const { videoStats } = useUserActivity();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-white tracking-tight">
          {t("continueWatching")}
        </h3>
        <div className="flex items-center space-x-2">
          <button className="p-1.5 rounded-lg bg-[#141926] border border-slate-800 text-slate-400 hover:text-white transition">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button className="p-1.5 rounded-lg bg-[#141926] border border-slate-800 text-slate-400 hover:text-white transition">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {lessons.slice(0, 5).map((item, idx) => (
          <div
            key={item.id}
            onClick={() => onPlay(item)}
            className="group cursor-pointer rounded-2xl bg-[#121622] border border-slate-800/80 hover:border-red-500/50 transition duration-300 overflow-hidden shadow-lg flex flex-col"
          >
            {/* Thumbnail Header */}
            <div className={`relative w-full h-32 bg-gradient-to-br ${item.thumbnailBg} flex items-center justify-center p-3 overflow-hidden`}>
              {/* Physics grid artwork */}
              <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:12px_12px]"></div>

              {/* Play Button Overlay */}
              <div className="w-10 h-10 rounded-full bg-black/60 border border-white/20 flex items-center justify-center text-white group-hover:scale-110 group-hover:bg-red-600 transition duration-300 shadow-xl">
                <Play className="w-4 h-4 fill-white ml-0.5" />
              </div>

              {/* Duration Badge */}
              <div className="absolute bottom-2 right-2 px-2 py-0.5 text-[10px] font-bold text-white bg-black/75 rounded backdrop-blur-sm border border-white/10">
                {item.duration}
              </div>
            </div>

            {/* Video Metadata */}
            <div className="p-3.5 space-y-1 flex-1 flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-bold text-red-400 block mb-0.5">
                  {item.week}
                </span>
                <h4 className="text-xs font-bold text-slate-100 line-clamp-1 group-hover:text-red-400 transition">
                  {lang === "bm" ? item.titleBm : item.titleDlp}
                </h4>
              </div>
              <p className="text-[10px] text-slate-400 font-medium pb-1">
                {lang === "bm" ? `Tingkatan ${item.form} • Bab ${item.chapterNum}` : `Form ${item.form} • Chapter ${item.chapterNum}`}
              </p>
              
              {/* Progress Bar */}
              {videoStats[item.id] !== undefined && (
                <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden shadow-inner border border-slate-700/50 mt-2">
                  <div 
                    className="h-full bg-red-500 rounded-full shadow-[0_0_8px_rgba(239,68,68,0.6)]" 
                    style={{ width: `${Math.max(2, videoStats[item.id].completionPercentage || 0)}%` }}
                  />
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
