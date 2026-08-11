"use client";

import React, { useState } from "react";
import { LanguageProvider, useLanguage } from "@/context/LanguageContext";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { UserActivityProvider, useUserActivity } from "@/context/UserActivityContext";
import { Navbar } from "@/components/Navbar";
import { HeroSpotlight, getPhysicsTopicCategory } from "@/components/HeroSpotlight";
import { Compass, Waves, Flame, Zap, Atom, Sparkles } from "lucide-react";
import { ContinueWatching } from "@/components/ContinueWatching";
import { TopPicks } from "@/components/TopPicks";
import { RevisionCollections } from "@/components/RevisionCollections";
import { VideoPlayerView } from "@/components/VideoPlayerView";
import { AnalyticBoard } from "@/components/AnalyticBoard";
import { ScoreBoardView } from "@/components/ScoreBoardView";
import { FormulaSheetModal } from "@/components/FormulaSheetModal";
import { DictionaryModal } from "@/components/DictionaryModal";
import { QuizModal } from "@/components/QuizModal";
import { CalculatorModal } from "@/components/CalculatorModal";
import { LoginPage } from "@/components/LoginPage";
import {
  allVideoLessons,
  form4VideoLessons,
  form5VideoLessons,
  VideoLesson
} from "@/data/physicsData";
import { Play, BookOpen, GraduationCap, Search, Loader2, Bookmark, ListVideo, Grid, Target } from "lucide-react";

function MainDashboard() {
  const { lang } = useLanguage();
  const { user, loading } = useAuth();
  const { isBookmarked, watchHistory, videoStats } = useUserActivity();
  const [currentTab, setCurrentTab] = useState("home");
  const [selectedLesson, setSelectedLesson] = useState<VideoLesson | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Modals
  const [isFormulaOpen, setIsFormulaOpen] = useState(false);
  const [isDictOpen, setIsDictOpen] = useState(false);
  const [isQuizOpen, setIsQuizOpen] = useState(false);
  const [isCalcOpen, setIsCalcOpen] = useState(false);

  // If Auth Loading
  if (loading) {
    return (
      <div className="min-h-screen bg-[#07090e] flex items-center justify-center text-white space-x-3">
        <Loader2 className="w-8 h-8 text-red-600 animate-spin" />
        <span className="text-sm font-bold">Memuatkan Pengesahan...</span>
      </div>
    );
  }

  // If Not Authenticated -> Require Login Page!
  if (!user) {
    return <LoginPage />;
  }

  // Filter lessons based on search
  const filteredLessons = allVideoLessons.filter((item) => {
    const q = searchQuery.toLowerCase();
    const title = lang === "bm" ? item.titleBm.toLowerCase() : item.titleDlp.toLowerCase();
    const ch = lang === "bm" ? item.chapterBm.toLowerCase() : item.chapterDlp.toLowerCase();
    return (
      title.includes(q) ||
      ch.includes(q) ||
      item.week.toLowerCase().includes(q)
    );
  });

  const handlePlayLesson = (lesson: VideoLesson) => {
    setSelectedLesson(lesson);
    setCurrentTab("playing");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSelectTopic = (chapterNum: number) => {
    const topicLesson = allVideoLessons.find((l) => l.chapterNum === chapterNum) || allVideoLessons[0];
    handlePlayLesson(topicLesson);
  };

  // Helper render video card
  const renderVideoCard = (item: VideoLesson) => {
    const cat = getPhysicsTopicCategory(item);
    const CategoryIcon =
      cat === "optics"
        ? Compass
        : cat === "waves"
        ? Waves
        : cat === "heat"
        ? Flame
        : cat === "electricity"
        ? Zap
        : cat === "quantum"
        ? Atom
        : Sparkles;

    return (
      <div
        key={item.id}
        onClick={() => handlePlayLesson(item)}
        className="group cursor-pointer rounded-2xl bg-[#121622] border border-slate-800/90 hover:border-red-500/60 p-3.5 space-y-3 transition-all duration-300 shadow-xl flex flex-col justify-between hover:-translate-y-1 relative overflow-hidden"
      >
        <div className={`w-full h-34 rounded-xl bg-gradient-to-br ${item.thumbnailBg} flex items-center justify-center relative overflow-hidden shadow-inner`}>
          {/* Subtle physics grid overlay */}
          <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:12px_12px]"></div>

          {/* Large background icon for visual interest */}
          <CategoryIcon className="absolute -right-4 -bottom-4 w-28 h-28 text-white opacity-[0.08] rotate-12 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-6 group-hover:opacity-[0.15]" />

          {/* Mini Category Icon Badge */}
          <div className="absolute top-2 left-2 px-2 py-1 rounded-lg bg-black/60 backdrop-blur-md border border-white/10 flex items-center space-x-1 text-[9px] font-bold text-slate-200">
            <CategoryIcon className="w-3 h-3 text-red-400" />
            <span>T{item.form} • Bab {item.chapterNum}</span>
          </div>

          {/* Play Button Overlay */}
          <div className="w-10 h-10 rounded-full bg-black/70 border border-white/20 flex items-center justify-center text-white group-hover:scale-110 group-hover:bg-red-600 transition-all duration-300 shadow-2xl z-10">
            <Play className="w-4 h-4 fill-white ml-0.5" />
          </div>

          {/* Duration Badge */}
          <span className="absolute bottom-2 right-2 px-2 py-0.5 text-[9px] font-bold text-white bg-black/80 rounded backdrop-blur-sm border border-white/10">
            {item.duration}
          </span>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            {/* Week badge removed */}
            <span className="text-[9px] font-semibold text-slate-400 truncate max-w-[120px]">{lang === "bm" ? item.chapterBm : item.chapterDlp}</span>
          </div>
          <h4 className="text-xs font-bold text-slate-100 group-hover:text-red-400 transition line-clamp-2 leading-snug">
            {lang === "bm" ? item.titleBm : item.titleDlp}
          </h4>
          {item.keyConceptsBm && item.keyConceptsBm.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-1">
              {item.keyConceptsBm.slice(0, 2).map((kc, idx) => (
                <span key={idx} className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800/80 text-slate-300 border border-slate-700/60 font-medium">
                  {kc}
                </span>
              ))}
            </div>
          )}
          {/* Progress Bar */}
          {videoStats[item.id] !== undefined && (
            <div className="w-full h-1.5 bg-slate-800 rounded-full mt-3 overflow-hidden shadow-inner border border-slate-700/50">
              <div 
                className="h-full bg-red-500 rounded-full shadow-[0_0_8px_rgba(239,68,68,0.6)]" 
                style={{ width: `${Math.max(2, videoStats[item.id].completionPercentage || 0)}%` }}
              />
            </div>
          )}
        </div>
      </div>
    );
  };

  const myListLessons = allVideoLessons.filter((l) => isBookmarked(l.id));
  const historyLessons = [...allVideoLessons]
    .filter((l) => watchHistory.includes(l.id) || videoStats[l.id]?.lastUpdatedTimestamp)
    .sort((a, b) => {
      const timeA = videoStats[a.id]?.lastUpdatedTimestamp || 0;
      const timeB = videoStats[b.id]?.lastUpdatedTimestamp || 0;
      // If neither has a timestamp (old data), fall back to watchHistory array order
      if (timeA === 0 && timeB === 0) {
        return watchHistory.indexOf(a.id) - watchHistory.indexOf(b.id);
      }
      return timeB - timeA;
    });

  const spmLessons = allVideoLessons.filter((l) => {
    const searchString = `${l.titleBm.toLowerCase()} ${l.keyConceptsBm.join(" ").toLowerCase()} ${l.titleDlp.toLowerCase()}`;
    return searchString.includes("ulangkaji") || searchString.includes("tips") || searchString.includes("percubaan") || searchString.includes("spm");
  });

  const allChapters = Array.from(new Set(allVideoLessons.map(l => `${l.form}-${l.chapterNum}`))).map(formChap => {
    const [form, chap] = formChap.split("-");
    const lessons = allVideoLessons.filter(l => l.form === parseInt(form) && l.chapterNum === parseInt(chap));
    return {
      form: parseInt(form),
      chapterNum: parseInt(chap),
      chapterBm: lessons[0].chapterBm,
      chapterDlp: lessons[0].chapterDlp,
      lessons
    };
  }).sort((a, b) => {
    if (a.form === b.form) return a.chapterNum - b.chapterNum;
    return a.form - b.form;
  });

  return (
    <div className="min-h-screen bg-[#07090e] text-slate-100 flex flex-col font-sans">
      {/* Navbar (Netflix Style Header) */}
      <Navbar 
        onSearchChange={(val) => setSearchQuery(val)}
        currentTab={currentTab}
        onTabChange={(tab) => {
          setCurrentTab(tab);
          if (tab !== "playing") setSelectedLesson(null);
        }}
        onOpenFormula={() => setIsFormulaOpen(true)}
        onOpenDict={() => setIsDictOpen(true)}
        onOpenQuiz={() => setIsQuizOpen(true)}
        onOpenCalc={() => setIsCalcOpen(true)}
      />

      <div className="flex-1 flex">

        {/* Main Content Area */}
        <main className="flex-1 p-4 md:p-8 space-y-8 max-w-7xl mx-auto overflow-x-hidden">
          {/* Active View Switch */}
          {currentTab === "playing" && selectedLesson ? (
            <VideoPlayerView
              key={selectedLesson.id}
              currentLesson={selectedLesson}
              onBack={() => setCurrentTab("home")}
              onSelectLesson={(lesson) => setSelectedLesson(lesson)}
            />
          ) : searchQuery.trim() !== "" ? (
            <div className="space-y-6">
              <div className="flex items-center space-x-3">
                <Search className="w-6 h-6 text-red-500" />
                <h2 className="text-xl font-extrabold text-white">
                  {lang === "bm" ? `Hasil Carian: "${searchQuery}"` : `Search Results for: "${searchQuery}"`}
                </h2>
                <span className="text-xs text-slate-400">({filteredLessons.length} video)</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {filteredLessons.map(renderVideoCard)}
              </div>
            </div>
          ) : currentTab === "mylist" ? (
            <div className="space-y-6">
              <div className="flex items-center space-x-3 border-b border-slate-800 pb-4">
                <Bookmark className="w-6 h-6 text-amber-500" />
                <h2 className="text-2xl font-extrabold text-white">
                  {lang === "bm" ? "Senarai Saya" : "My List"}
                </h2>
                <span className="px-3 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-500 text-xs font-extrabold rounded-full">
                  {myListLessons.length} Video
                </span>
              </div>
              {myListLessons.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {myListLessons.map(renderVideoCard)}
                </div>
              ) : (
                <div className="py-20 text-center text-slate-500 flex flex-col items-center">
                  <Bookmark className="w-12 h-12 mb-4 opacity-50" />
                  <p>{lang === "bm" ? "Tiada video dalam senarai bookmark." : "No videos bookmarked yet."}</p>
                </div>
              )}
            </div>
          ) : currentTab === "playlists" ? (
            <div className="space-y-6">
              <div className="flex items-center space-x-3 border-b border-slate-800 pb-4">
                <ListVideo className="w-6 h-6 text-purple-500" />
                <h2 className="text-2xl font-extrabold text-white">
                  {lang === "bm" ? "Tonton Semula (Sejarah Tontonan)" : "Watch History"}
                </h2>
                <span className="px-3 py-1 bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-extrabold rounded-full">
                  {historyLessons.length} Video
                </span>
              </div>
              {historyLessons.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {historyLessons.map(renderVideoCard)}
                </div>
              ) : (
                <div className="py-20 text-center text-slate-500 flex flex-col items-center">
                  <ListVideo className="w-12 h-12 mb-4 opacity-50" />
                  <p>{lang === "bm" ? "Anda belum menonton mana-mana video." : "You haven't watched any videos yet."}</p>
                </div>
              )}
            </div>
          ) : currentTab === "analytics" ? (
            <AnalyticBoard />
          ) : currentTab === "scoreboard" ? (
            <ScoreBoardView onPlayLesson={handlePlayLesson} />
          ) : currentTab === "topics" ? (
            <div className="space-y-10">
              <div className="flex items-center space-x-3 border-b border-slate-800 pb-4">
                <Grid className="w-6 h-6 text-blue-500" />
                <h2 className="text-2xl font-extrabold text-white">
                  {lang === "bm" ? "Topik Pembelajaran Mengikut Bab" : "Learning Topics by Chapter"}
                </h2>
              </div>
              {allChapters.map(chap => (
                <div key={`${chap.form}-${chap.chapterNum}`} className="space-y-4">
                  <h3 className="text-lg font-bold text-slate-200 border-l-4 border-blue-500 pl-3">
                    {lang === "bm" ? `Tingkatan ${chap.form} - Bab ${chap.chapterNum}: ${chap.chapterBm}` : `Form ${chap.form} - Chapter ${chap.chapterNum}: ${chap.chapterDlp}`}
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {chap.lessons.map(renderVideoCard)}
                  </div>
                </div>
              ))}
            </div>
          ) : currentTab === "spm" ? (
            <div className="space-y-6">
              <div className="flex items-center space-x-3 border-b border-slate-800 pb-4">
                <Target className="w-6 h-6 text-red-500" />
                <h2 className="text-2xl font-extrabold text-white">
                  {lang === "bm" ? "Koleksi Ulangkaji SPM" : "SPM Revision Collection"}
                </h2>
                <span className="px-3 py-1 bg-red-950/60 border border-red-800/60 text-red-400 text-xs font-extrabold rounded-full">
                  {spmLessons.length} Video
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {spmLessons.map(renderVideoCard)}
              </div>
            </div>
          ) : currentTab === "form4" ? (
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div>
                  <h2 className="text-2xl font-extrabold text-white flex items-center gap-2">
                    <BookOpen className="w-6 h-6 text-red-500" />
                    {lang === "bm" ? "Fizik Tingkatan 4 (KSSM)" : "Form 4 SPM Physics (KSSM)"}
                  </h2>
                </div>
                <span className="px-3 py-1 bg-red-950/60 border border-red-800/60 text-red-400 text-xs font-extrabold rounded-full">
                  {form4VideoLessons.length} Video Lengkap
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {form4VideoLessons.map(renderVideoCard)}
              </div>
            </div>
          ) : currentTab === "form5" ? (
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div>
                  <h2 className="text-2xl font-extrabold text-white flex items-center gap-2">
                    <GraduationCap className="w-6 h-6 text-red-500" />
                    {lang === "bm" ? "Fizik Tingkatan 5 (KSSM)" : "Form 5 SPM Physics (KSSM)"}
                  </h2>
                </div>
                <span className="px-3 py-1 bg-red-950/60 border border-red-800/60 text-red-400 text-xs font-extrabold rounded-full">
                  {form5VideoLessons.length} Video Lengkap
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {form5VideoLessons.map(renderVideoCard)}
              </div>
            </div>
          ) : (
            <>
              {/* Hero Spotlight */}
              <HeroSpotlight
                featuredLessons={allVideoLessons.filter((l) => {
                  const text = `${l.titleBm} ${l.titleDlp} ${l.week}`.toLowerCase();
                  return !text.includes("ulangkaji") && !text.includes("homework") && !text.includes("tips");
                })}
                onPlay={handlePlayLesson}
              />
              {/* Continue Watching Row */}
              <ContinueWatching
                lessons={allVideoLessons}
                onPlay={handlePlayLesson}
              />
              {/* Top Picks for You Categories */}
              <TopPicks onSelectTopic={handleSelectTopic} />
              {/* SPM Revision Collections */}
              <RevisionCollections
                onOpenQuiz={() => setIsQuizOpen(true)}
                onOpenFormula={() => setIsFormulaOpen(true)}
              />
            </>
          )}
        </main>
      </div>

      {/* Modals */}
      <FormulaSheetModal isOpen={isFormulaOpen} onClose={() => setIsFormulaOpen(false)} />
      <DictionaryModal isOpen={isDictOpen} onClose={() => setIsDictOpen(false)} />
      <QuizModal isOpen={isQuizOpen} onClose={() => setIsQuizOpen(false)} />
      <CalculatorModal isOpen={isCalcOpen} onClose={() => setIsCalcOpen(false)} />
    </div>
  );
}

export default function Home() {
  return (
    <AuthProvider>
      <LanguageProvider>
        <UserActivityProvider>
          <MainDashboard />
        </UserActivityProvider>
      </LanguageProvider>
    </AuthProvider>
  );
}
