"use client";

import React, { useState } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { form4VideoLessons, form5VideoLessons, VideoLesson } from "../data/physicsData";
import { useUserActivity } from "../context/UserActivityContext";
import { useLanguage } from "../context/LanguageContext";
import { ArrowLeft, RotateCw } from "lucide-react";

export const ScoreBoardView = () => {
  const { lang } = useLanguage();
  const { videoStats } = useUserActivity();
  const [selectedForm, setSelectedForm] = useState<4 | 5 | null>(null);

  // Calculate overall form completion
  const calculateFormStats = (lessons: VideoLesson[]) => {
    if (lessons.length === 0) return 0;
    const totalPercentage = lessons.reduce((sum, lesson) => {
      const stat = videoStats[lesson.id];
      return sum + (stat ? stat.completionPercentage : 0);
    }, 0);
    return Math.round(totalPercentage / lessons.length);
  };

  const form4Completion = calculateFormStats(form4VideoLessons);
  const form5Completion = calculateFormStats(form5VideoLessons);

  const renderMainDonut = (form: 4 | 5, completion: number) => {
    const data = [
      { name: "Completed", value: completion },
      { name: "Remaining", value: 100 - completion },
    ];
    const COLORS = ["#0ea5e9", "#1e293b"]; // Sky blue and dark slate

    return (
      <div 
        className="flex flex-col items-center bg-slate-900/50 p-6 rounded-2xl border border-white/5 cursor-pointer hover:bg-slate-800/50 hover:border-sky-500/30 transition-all shadow-xl group w-full max-w-sm"
        onClick={() => setSelectedForm(form)}
      >
        <h3 className="text-xl font-bold text-white mb-4 group-hover:text-sky-400 transition-colors">
          {lang === "bm" ? `Tingkatan ${form}` : `Form ${form}`}
        </h3>
        <div className="w-56 h-56 relative">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={70}
                outerRadius={95}
                startAngle={90}
                endAngle={-270}
                dataKey="value"
                stroke="none"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-4xl font-black text-sky-400 drop-shadow-md">{completion}%</span>
          </div>
        </div>
        <p className="text-sm text-slate-400 mt-4 font-medium text-center">
          {lang === "bm" ? "Peratusan Video Diselesaikan" : "Video Completion Percentage"}
        </p>
        <div className="mt-3 text-xs text-sky-500 opacity-0 group-hover:opacity-100 transition-opacity flex items-center">
          <span>{lang === "bm" ? "Klik untuk butiran" : "Click for details"}</span>
        </div>
      </div>
    );
  };

  const renderDetailView = () => {
    const lessons = selectedForm === 4 ? form4VideoLessons : form5VideoLessons;
    
    return (
      <div className="animate-in fade-in slide-in-from-right-4 duration-300 pb-20">
        <button 
          onClick={() => setSelectedForm(null)}
          className="flex items-center text-sky-400 hover:text-sky-300 mb-8 font-bold bg-sky-500/10 px-4 py-2 rounded-full border border-sky-500/20 w-fit transition-colors"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          {lang === "bm" ? "Kembali ke Skor Utama" : "Back to Main Score"}
        </button>
        
        <div className="mb-8">
          <h2 className="text-3xl font-black text-white">
            {lang === "bm" ? `Statistik Video Tingkatan ${selectedForm}` : `Form ${selectedForm} Video Statistics`}
          </h2>
          <p className="text-slate-400 mt-2">
            {lang === "bm" 
              ? "Paparan pecahan bagi setiap peratusan video yang ditonton serta jumlah ulangan."
              : "Breakdown of each video's completion percentage and total repeats."}
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5">
          {lessons.map(lesson => {
            const stat = videoStats[lesson.id] || { completionPercentage: 0, repeats: 0 };
            const completion = stat.completionPercentage;
            const data = [
              { name: "Completed", value: completion },
              { name: "Remaining", value: 100 - completion },
            ];
            
            // Color based on completion
            let primaryColor = "#f43f5e"; // Rose for low
            if (completion >= 80) primaryColor = "#10b981"; // Emerald for high
            else if (completion >= 40) primaryColor = "#eab308"; // Yellow for medium
            
            const COLORS = [primaryColor, "#1e293b"];

            return (
              <div key={lesson.id} className="bg-slate-900 p-5 rounded-2xl border border-white/5 flex flex-col items-center shadow-lg hover:bg-slate-800/80 transition-colors">
                <div className="w-24 h-24 relative mb-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={data}
                        cx="50%"
                        cy="50%"
                        innerRadius={30}
                        outerRadius={42}
                        startAngle={90}
                        endAngle={-270}
                        dataKey="value"
                        stroke="none"
                      >
                        {data.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <span className="text-sm font-black" style={{ color: primaryColor }}>{completion}%</span>
                  </div>
                </div>
                
                <h4 className="text-xs font-bold text-slate-300 text-center line-clamp-2 mb-3 h-8 leading-tight" title={lang === "bm" ? lesson.titleBm : lesson.titleDlp}>
                  {lang === "bm" ? lesson.titleBm : lesson.titleDlp}
                </h4>
                
                <div className="flex items-center text-xs font-bold text-slate-400 bg-black/40 border border-white/5 px-3 py-1.5 rounded-full w-full justify-center">
                  <RotateCw className="w-3.5 h-3.5 mr-1.5 opacity-70" />
                  <span>{stat.repeats} {lang === "bm" ? "Ulang" : "Repeats"}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="w-full">
      {!selectedForm ? (
        <div className="animate-in fade-in zoom-in-95 duration-500 py-10">
          <div className="flex flex-col items-center mb-12 text-center px-4">
            <h2 className="text-3xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-sky-400 via-blue-500 to-indigo-500 tracking-tight">
              {lang === "bm" ? "Papan Skor" : "Score Board"}
            </h2>
            <p className="text-slate-400 mt-4 max-w-lg mx-auto text-sm md:text-base">
              {lang === "bm" 
                ? "Jejaki kemajuan pembelajaran anda untuk keseluruhan subjek Fizik SPM. Klik pada carta untuk melihat analisis terperinci." 
                : "Track your learning progress for the entire SPM Physics subject. Click on a chart to view detailed analytics."}
            </p>
          </div>
          
          <div className="flex flex-col md:flex-row justify-center items-center gap-8 md:gap-16 px-4">
            {renderMainDonut(4, form4Completion)}
            {renderMainDonut(5, form5Completion)}
          </div>
        </div>
      ) : (
        renderDetailView()
      )}
    </div>
  );
};
