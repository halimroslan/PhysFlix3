"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  ArrowLeft,
  ThumbsUp,
  ThumbsDown,
  Share2,
  Plus,
  CheckCircle2,
  Circle,
  FileText,
  Play,
  ShieldAlert,
  Lock,
  Bookmark,
  Maximize,
  Settings,
  X
} from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { VideoLesson, allVideoLessons } from "@/data/physicsData";
import { conceptDefinitions } from "@/data/conceptDefinitions";
import { useDRMProtection, deobfuscateId } from "@/utils/security";
import { useUserActivity } from "@/context/UserActivityContext";
import { useAuth } from "@/context/AuthContext";
import { doc, getDoc, setDoc, updateDoc, increment } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface VideoPlayerViewProps {
  currentLesson: VideoLesson;
  onBack: () => void;
  onSelectLesson: (lesson: VideoLesson) => void;
}

export const VideoPlayerView: React.FC<VideoPlayerViewProps> = ({
  currentLesson,
  onBack,
  onSelectLesson
}) => {
  const { lang, t } = useLanguage();
  const { isBookmarked, toggleBookmark, addToHistory, updateVideoProgress, incrementRepeat } = useUserActivity();
  const { user } = useAuth();
  const email = user?.email?.toLowerCase() || "";
  const isDev = email.includes("abdulhalimroslan") || email.includes("halimroslan");

  // Developer Toggles
  const [devShowGrid, setDevShowGrid] = useState(false);
  const [devShowFullScreenGrid, setDevShowFullScreenGrid] = useState(false);
  const [devShow45Watermark, setDevShow45Watermark] = useState(false);
  const [devShowShields, setDevShowShields] = useState(true);
  const [devShowControllerShield, setDevShowControllerShield] = useState(true);
  const [devShowJump, setDevShowJump] = useState(false);
  const [devPanelOpen, setDevPanelOpen] = useState(false);

  useDRMProtection(); // Activates DRM anti-inspect & anti-shortcut hook

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const playTimerRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const coverMountedAt = useRef<number>(Date.now());
  const videoOpenedAt = useRef<number>(Date.now());
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMobileDevice, setIsMobileDevice] = useState(false);
  const [shieldStyle, setShieldStyle] = useState({ bottom: '19.2%', height: '7.7%' });
  const [iframeSrc, setIframeSrc] = useState("");

  useEffect(() => {
    setIsMobileDevice(/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));
  }, []);

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    
    // Check if browser supports native fullscreen API
    if ('requestFullscreen' in document.documentElement) {
      if (!document.fullscreenElement) {
        containerRef.current.requestFullscreen().catch(err => {
          console.error("Native fullscreen failed, using CSS fallback:", err);
          setIsFullscreen(true);
        });
      } else {
        document.exitFullscreen().catch(() => {});
        setIsFullscreen(false);
      }
    } else if ((containerRef.current as any).webkitRequestFullscreen) {
      // Safari specific native
      if (!(document as any).webkitFullscreenElement) {
        (containerRef.current as any).webkitRequestFullscreen();
      } else {
        (document as any).webkitExitFullscreen();
      }
    } else {
      // Complete fallback (iOS iPhone)
      setIsFullscreen(!isFullscreen);
    }
  };

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (let entry of entries) {
        if (entry.contentRect.height >= 600) {
          setShieldStyle({ bottom: '3.8%', height: '11.6%' }); // V-X extended down
        } else {
          setShieldStyle({ bottom: '15.3%', height: '11.6%' }); // S-U extended down
        }
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!(document.fullscreenElement || (document as any).webkitFullscreenElement));
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", handleFullscreenChange);
    };
  }, []);

  // Parse duration into total seconds
  const totalSeconds = (() => {
    if (!currentLesson?.duration) return 0;
    const parts = currentLesson.duration.split(':').map(Number);
    if (parts.length === 3) {
      return parts[0] * 3600 + parts[1] * 60 + parts[2];
    } else if (parts.length === 2) {
      return parts[0] * 60 + parts[1];
    }
    return 0;
  })();

  const [showCover, setShowCover] = useState(true);
  const [showEndCover, setShowEndCover] = useState(false);
  const [currentStartSeconds, setCurrentStartSeconds] = useState(600);
  const [showMobileTip, setShowMobileTip] = useState(false);
  const [prevLessonId, setPrevLessonId] = useState(currentLesson?.id);

  // Derived state to INSTANTLY reset covers when lesson changes (prevents flash of background)
  if (currentLesson && currentLesson.id !== prevLessonId) {
    setPrevLessonId(currentLesson.id);
    setShowCover(true);
    setShowEndCover(false);
  }

  useEffect(() => {
    if (currentLesson && currentLesson.id) {
      addToHistory(currentLesson.id);
      incrementRepeat(currentLesson.id);
      videoOpenedAt.current = Date.now();
      coverMountedAt.current = Date.now(); // Reset cover mount timestamp
      const is20MinStart = currentLesson.titleBm === "2.2b Graf Gerakan Linear & 2.3 Jatuh Bebas Ulangkaji";
      const is18MinStart = currentLesson.titleBm === "6.1a Reputan Radioaktif";
      const is15MinStart = currentLesson.titleBm === "5.1 Asas Gelombang" || currentLesson.titleBm === "1.1 Daya Paduan";
      const is14m40sStart = currentLesson.titleBm === "4.4b Hukum Gas Ulangkaji";
      const is12m40sStart = currentLesson.titleBm === "6.1 Pembiasan Cahaya";
      const is13mStart = currentLesson.titleBm === "6.6b Pembentukan Imej Oleh Cermin Sfera";
      const startSecs = is20MinStart ? 1200 : (is18MinStart ? 1080 : (is15MinStart ? 900 : (is14m40sStart ? 880 : (is13mStart ? 780 : (is12m40sStart ? 760 : 600)))));
      
      setCurrentStartSeconds(startSecs); // Reset timer tracking
      
      if (currentLesson.youtubeId) {
        setIframeSrc(`https://www.youtube.com/embed/${currentLesson.youtubeId}?start=${startSecs}&rel=0&modestbranding=1&autoplay=1`);
      } else {
        const driveUrl = `https://drive.google.com/file/d/${deobfuscateId(currentLesson.driveId)}/preview`;
        setIframeSrc(`${driveUrl}?t=${startSecs}s`); // Auto start based on lesson in seconds, no extra params
      }
    }
    
    // Auto-scroll screen to video player (useful for mobile when selecting a video)
    const screenTimer = setTimeout(() => {
      if (window.innerWidth < 768 && containerRef.current) {
        containerRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }, 100);
    
    return () => clearTimeout(screenTimer);
  }, [currentLesson]);

  // Detect clicks on the iframe when it gains focus
  useEffect(() => {
    const handleBlur = () => {
      setTimeout(() => {
        if (document.activeElement === iframeRef.current) {
          setShowCover(false);
          
          // Auto-activate fullscreen on mobile
          if (window.innerWidth < 768) {
            if (containerRef.current) {
              if ('requestFullscreen' in document.documentElement) {
                containerRef.current.requestFullscreen().catch(() => {
                  // Fallback to CSS fullscreen if native fails (e.g. due to lack of direct user gesture)
                  setIsFullscreen(true);
                });
              } else if ((containerRef.current as any).webkitRequestFullscreen) {
                (containerRef.current as any).webkitRequestFullscreen();
                // Safari might not return a promise, so we also set CSS fallback just in case
                setIsFullscreen(true);
              } else {
                setIsFullscreen(true);
              }
            }
          }
        }
      }, 50);
    };
    window.addEventListener("blur", handleBlur);
    return () => {
      window.removeEventListener("blur", handleBlur);
    };
  }, []);

  // Manage mobile interaction tip
  useEffect(() => {
    let showTimer: NodeJS.Timeout;
    let hideTimer: NodeJS.Timeout;
    
    if (!showCover) {
      showTimer = setTimeout(() => {
        setShowMobileTip(true);
        hideTimer = setTimeout(() => setShowMobileTip(false), 15000); // Hide after 15 seconds of showing
      }, 4000); // Wait 4 seconds before showing
    } else {
      setShowMobileTip(false);
    }
    
    return () => {
      clearTimeout(showTimer);
      clearTimeout(hideTimer);
    };
  }, [showCover]);

  // Track and update video progress on unmount or when currentLesson changes
  useEffect(() => {
    return () => {
      if (currentLesson && currentLesson.id) {
        const timeSpent = Math.floor((Date.now() - videoOpenedAt.current) / 1000);
        const parts = currentLesson.duration.split(":");
        let durationInSeconds = 600; // fallback 10 mins
        if (parts.length === 2) {
          durationInSeconds = parseInt(parts[0]) * 60 + parseInt(parts[1]);
        }
        updateVideoProgress(currentLesson.id, timeSpent, durationInSeconds);
      }
    };
  }, [currentLesson, updateVideoProgress]);

  // Manage end cover timer based on playback state (showCover)
  useEffect(() => {
    if (!showCover) {
      // Calculate time remaining from the start point to 5 minutes BEFORE the end of the video.
      let watchTimeSeconds = totalSeconds - currentStartSeconds - 300;
      
      // If the jump start time is already within the last 5 minutes, 
      // they explicitly jumped here, so let them watch the remainder of the video.
      if (watchTimeSeconds <= 0 && totalSeconds > currentStartSeconds) {
        watchTimeSeconds = totalSeconds - currentStartSeconds;
      }
      
      if (watchTimeSeconds > 0) {
        playTimerRef.current = setTimeout(() => {
          setShowEndCover(true);
          setIframeSrc(""); // Auto mute by destroying iframe
        }, watchTimeSeconds * 1000);
      } else if (totalSeconds > 0) {
        // If somehow they jumped past the very end
        setShowEndCover(true);
        setIframeSrc("");
      }
    } else {
      setShowEndCover(false);
      if (playTimerRef.current) clearTimeout(playTimerRef.current);
    }
    return () => {
      if (playTimerRef.current) clearTimeout(playTimerRef.current);
    };
  }, [showCover, totalSeconds, currentStartSeconds]);

  const [activeTab, setActiveTab] = useState<"overview" | "notes" | "qa">("overview");
  const [sidebarTab, setSidebarTab] = useState<"playlist" | "tools">("playlist");
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [shareText, setShareText] = useState("Kongsi");
  const [saved, setSaved] = useState(false);
  const [selectedConcept, setSelectedConcept] = useState<string | null>(null);

  // Auto-scroll to currently playing video in playlist
  useEffect(() => {
    if (sidebarTab === "playlist") {
      // Small timeout to ensure DOM is updated
      const scrollTimer = setTimeout(() => {
        const el = document.getElementById("current-playing-video");
        const container = document.getElementById("playlist-container");
        if (el && container) {
          // Scroll only the container, not the entire page window
          container.scrollTo({
            top: el.offsetTop - container.offsetTop - 20, // 20px padding
            behavior: 'smooth'
          });
        }
      }, 200); // Slightly longer timeout to allow page-level scroll to take precedence
      return () => clearTimeout(scrollTimer);
    }
  }, [sidebarTab, currentLesson.id]);

  // Helper to generate a stable, realistic number of likes based on video ID
  const getBaseLikes = (id: string) => {
    let hash = 0;
    for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash);
    return 1200 + (Math.abs(hash) % 4000); // Generates a number between 1200 and 5200
  };

  useEffect(() => {
    if (!currentLesson?.id) return;
    
    // Check local storage for like state
    const localLiked = localStorage.getItem(`liked_${currentLesson.id}`) === "true";
    setLiked(localLiked);

    const fetchLikes = async () => {
      const baseLikes = getBaseLikes(currentLesson.id);
      try {
        const docRef = doc(db, "videoStats", currentLesson.id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setLikeCount(docSnap.data().likes);
        } else {
          // Initialize document with base likes
          await setDoc(docRef, { likes: baseLikes });
          setLikeCount(baseLikes + (localLiked ? 1 : 0));
        }
      } catch (e) {
        console.warn("Firestore likes unavailable, using fallback.", e);
        setLikeCount(baseLikes + (localLiked ? 1 : 0));
      }
    };
    fetchLikes();
  }, [currentLesson]);

  const [comments, setComments] = useState([
    { name: "Ahmad Rizky", text: "Terbaik Sir! Baru faham melukis sinar selari dan sinar fokus.", time: "2 jam lepas" },
    { name: "Siti Sarah", text: "Fast explanation and clear graphics for DLP students!", time: "5 jam lepas" },
    { name: "Cikgu Tan", text: "Sangat membantu untuk ulangkaji SPM murid.", time: "1 hari lepas" }
  ]);
  const [newComment, setNewComment] = useState("");

  const rawDriveId = deobfuscateId(currentLesson.driveId);

  const handleLike = async () => {
    const newLikedState = !liked;
    setLiked(newLikedState);
    
    // Update local UI immediately
    setLikeCount((c) => newLikedState ? c + 1 : c - 1);
    localStorage.setItem(`liked_${currentLesson.id}`, newLikedState ? "true" : "false");
    
    // Update Firestore
    try {
      const docRef = doc(db, "videoStats", currentLesson.id);
      await updateDoc(docRef, {
        likes: increment(newLikedState ? 1 : -1)
      });
    } catch (e) {
      console.warn("Error updating likes in Firestore", e);
    }
  };

  const handleShare = async () => {
    const shareData = {
      title: currentLesson.titleBm,
      text: "Jom tonton video pengajaran Fizik ini di Physics SPM Flix!",
      url: window.location.href,
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(window.location.href);
        setShareText("Tersalin!");
        setTimeout(() => setShareText("Kongsi"), 2000);
      }
    } catch (err) {
      console.error("Error sharing", err);
    }
  };

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    setComments([{ name: "Pelajar Fizik", text: newComment, time: "Baru sahaja" }, ...comments]);
    setNewComment("");
  };

  const { showTavisM1toM20, showTavisM21Plus } = (() => {
    const formStr = String(currentLesson.form);
    if (formStr !== "4" && formStr !== "5") return { showTavisM1toM20: false, showTavisM21Plus: false };
    
    const match = String(currentLesson.week).match(/M(\d+)/i);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num >= 1 && num <= 20) return { showTavisM1toM20: true, showTavisM21Plus: false };
      if (num >= 21) return { showTavisM1toM20: false, showTavisM21Plus: true };
    }
    return { showTavisM1toM20: false, showTavisM21Plus: false };
  })();
  return (
    <div className="w-full space-y-4 md:space-y-6 select-none">
      {/* Top Bar Navigation */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
        <button
          onClick={onBack}
          className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-[#121622] hover:bg-slate-800 border border-slate-800 text-xs font-bold text-slate-300 hover:text-white transition"
        >
          <ArrowLeft className="w-4 h-4 text-red-500" />
          <span className="font-bold text-slate-200">Back</span>
        </button>



        {isDev && (
          <div className="relative">
            <button 
              onClick={() => setDevPanelOpen(!devPanelOpen)}
              className="flex items-center space-x-2 bg-slate-800 hover:bg-slate-700 text-white px-3 py-2 rounded-full border border-sky-600/50 transition-all hover:scale-105 active:scale-95"
            >
              {devPanelOpen ? <X className="w-4 h-4 text-red-500" /> : <Settings className="w-4 h-4 text-sky-400" />}
              <span className="text-xs font-bold text-sky-400">Dev Panel</span>
            </button>
            
            {devPanelOpen && (
              <div className="absolute top-12 left-0 z-50 bg-slate-900 border border-slate-700/50 rounded-xl shadow-2xl p-4 w-64 space-y-4 animate-in fade-in duration-200">
                <h3 className="text-sm font-bold text-sky-400 uppercase tracking-wider mb-2 border-b border-slate-800 pb-2">Developer Tools</h3>
                
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-sm text-slate-300">Tunjuk Grid Koordinat</span>
                  <input type="checkbox" checked={devShowGrid} onChange={(e) => setDevShowGrid(e.target.checked)} className="rounded text-sky-500 focus:ring-sky-500 bg-slate-800 border-slate-600" />
                </label>

                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-sm text-slate-300">Tunjuk Grid Skrin Penuh (Biru)</span>
                  <input type="checkbox" checked={devShowFullScreenGrid} onChange={(e) => setDevShowFullScreenGrid(e.target.checked)} className="rounded text-blue-500 focus:ring-blue-500 bg-slate-800 border-slate-600" />
                </label>

                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-sm text-slate-300">Watermark 27° (Hijau)</span>
                  <input type="checkbox" checked={devShow45Watermark} onChange={(e) => setDevShow45Watermark(e.target.checked)} className="rounded text-green-500 focus:ring-green-500 bg-slate-800 border-slate-600" />
                </label>
                
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-sm text-slate-300">Aktifkan Cermin Ghaib</span>
                  <input type="checkbox" checked={devShowShields} onChange={(e) => setDevShowShields(e.target.checked)} className="rounded text-sky-500 focus:ring-sky-500 bg-slate-800 border-slate-600" />
                </label>
                
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-sm text-slate-300">Pelindung Controller (PC)</span>
                  <input type="checkbox" checked={devShowControllerShield} onChange={(e) => setDevShowControllerShield(e.target.checked)} className="rounded text-sky-500 focus:ring-sky-500 bg-slate-800 border-slate-600" />
                </label>

                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-sm text-slate-300">Tunjuk Kotak Lompat</span>
                  <input type="checkbox" checked={devShowJump} onChange={(e) => setDevShowJump(e.target.checked)} className="rounded text-sky-500 focus:ring-sky-500 bg-slate-800 border-slate-600" />
                </label>
              </div>
            )}
          </div>
        )}

        {user?.email && (
          <span className="text-[10px] text-slate-500 opacity-30 select-all">{user.email}</span>
        )}

        <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-slate-400">
          <span className="flex items-center space-x-1 text-emerald-400 bg-emerald-950/60 px-2.5 py-1 rounded-full border border-emerald-800/50">
            <Lock className="w-3 h-3" />
            <span>DRM Encrypted Stream</span>
          </span>
          <span>•</span>
          <span className="text-red-400">
            {lang === "bm" ? currentLesson.chapterBm : currentLesson.chapterDlp}
          </span>
        </div>
      </div>

      {/* Main Grid: Player on Left, Playlist/Tools on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column - Protected Video Player & Details */}
        <div className="lg:col-span-8 space-y-6">
          {/* DRM Video Outer Wrapper */}
          <div
            ref={containerRef}
            onContextMenu={(e) => e.preventDefault()}
            className={`mx-auto bg-black flex items-center justify-center shadow-2xl ${
              isFullscreen ? "fixed inset-0 z-[100] h-[100dvh] w-screen rounded-none" : "relative w-full border border-slate-800 rounded-xl overflow-hidden aspect-[4/3] md:aspect-video"
            }`}
          >
            {/* Mobile Fullscreen Back Button */}
            {isFullscreen && (
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setIsFullscreen(false);
                }}
                className="absolute top-4 left-4 z-[110] bg-black/60 hover:bg-black/80 text-white p-3 rounded-full md:hidden flex items-center justify-center border border-white/20 shadow-xl"
              >
                <ArrowLeft className="w-6 h-6" />
              </button>
            )}

            {/* FULL SCREEN DEV GRID (BLUE) */}
            {devShowFullScreenGrid && (
              <div 
                className="absolute inset-0 z-[120] pointer-events-none grid"
                style={{ 
                  gridTemplateColumns: 'repeat(15, minmax(0, 1fr))',
                  gridTemplateRows: 'repeat(26, minmax(0, 1fr))'
                }}
              >
                {Array.from({ length: 26 * 15 }).map((_, i) => {
                  const row = Math.floor(i / 15);
                  const col = i % 15;
                  const rowLabel = String.fromCharCode(65 + row);
                  const colLabel = col + 1;
                  return (
                    <div 
                      key={i} 
                      className="border border-blue-500/40 flex items-center justify-center relative"
                    >
                      <span className="text-[8px] md:text-[10px] text-blue-400/80 font-mono rotate-90 md:rotate-0">
                        {rowLabel}{colLabel}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Mobile Interaction Tip - Klik di sini (Positioned at I14-J14 of the full screen grid) */}
            {showMobileTip && (
              <div 
                className="absolute md:hidden z-[130] pointer-events-none flex flex-col items-center justify-center animate-in fade-in zoom-in duration-500" 
                style={{ top: '34.6%', left: '90%', transform: 'translate(-50%, -50%)' }}
              >
                <div className="bg-black/60 backdrop-blur-md px-2 py-1 rounded border border-white/20 shadow-2xl mb-0.5 whitespace-nowrap transform -translate-x-16">
                  <p className="text-[10px] font-bold text-white leading-tight animate-pulse">
                    Klik di sini untuk cerahkan video
                  </p>
                </div>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-500 animate-bounce mt-1 drop-shadow-md" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
              </div>
            )}

            {/* Inner Container - ALWAYS maintains 16:9 aspect ratio and scales to fit */}
            <div 
              className="relative group select-none overflow-hidden bg-black w-full h-full flex items-center justify-center"
              style={isFullscreen ? { 
                aspectRatio: '16/9',
                maxWidth: '177.778vh',
                maxHeight: '56.25vw'
              } : {
                aspectRatio: '16/9',
                maxWidth: '100%',
                maxHeight: '100%'
              }}
            >
              {/* Embedded Stream via Obfuscated ID */}
            <iframe
              ref={iframeRef}
              src={iframeSrc}
              className="absolute top-0 left-0 w-full h-full border-0 pointer-events-auto"
              allow="autoplay"
              title={currentLesson.titleBm}
              onLoad={() => {
                // Reset timer when iframe finishes loading to catch late auto-focuses
                coverMountedAt.current = Date.now();
              }}
            ></iframe>

            {/* Large Diagonal Watermark (27 degrees, Grid I2-N12) */}
            <div className="absolute inset-0 z-[15] pointer-events-none flex items-center justify-center overflow-hidden">
              <div 
                className="w-[150%] h-[150%] absolute"
                style={{ transform: 'rotate(-27deg)' }}
              >
                <div 
                  className="absolute flex items-center justify-center"
                  style={{
                    left: currentLesson.titleBm === "2.6 Prinsip Bernoulli" ? '13.333%' : '6.666%',   // Col 3 for Bernoulli, Col 2 for others
                    top: currentLesson.titleBm === "2.6 Prinsip Bernoulli" ? '7.692%' : '30.769%',    // Row C for Bernoulli, Row I for others
                    width: currentLesson.titleBm === "2.6 Prinsip Bernoulli" ? '86.666%' : '73.333%', // 13 cols for Bernoulli, 11 cols for others
                    height: currentLesson.titleBm === "2.6 Prinsip Bernoulli" ? '57.692%' : '23.076%' // 15 rows for Bernoulli, 6 rows for others
                  }}
                >
                  <div className={`bg-slate-900 rounded-2xl opacity-40 scale-[0.95] h-full flex items-center justify-center ${currentLesson.titleBm === "2.6 Prinsip Bernoulli" ? 'p-5 md:p-8' : 'p-3 md:p-5'}`}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/PHYSFLIX.png" alt="PhysicsSPMFlix Watermark" className="h-full w-auto object-contain" />
                  </div>
                </div>

                {/* Second Rotated Semi-Transparent Watermark (J4-M12) only for 2.6 Prinsip Bernoulli */}
                {currentLesson.titleBm === "2.6 Prinsip Bernoulli" && (
                  <div 
                    className="absolute flex items-center justify-center"
                    style={{
                      left: '20%',      // Col 4 start
                      top: '34.615%',   // Row J start
                      width: '60%',     // Col 4 to 12 (9 cols)
                      height: '15.384%' // Span 4 rows (J to M)
                    }}
                  >
                    <div className="bg-slate-900 rounded-2xl p-3 md:p-5 opacity-40 scale-150 h-full flex items-center justify-center">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src="/PHYSFLIX.png" alt="PhysicsSPMFlix Watermark" className="h-full w-auto object-contain" />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Mobile Landscape Fullscreen Controller Shields (Red Grid Based) */}
            {isFullscreen && isMobileDevice && (
              <>
                {/* Block 1: P10-S15 */}
                <div 
                  className="absolute z-20 pointer-events-auto cursor-default bg-[#0a0a0a] hidden landscape:block"
                  style={{
                    left: '60%',      // Col 10 start
                    top: '57.692%',   // Row P start
                    width: '40%',     // Col 10 to 15 (6 cols)
                    height: '15.384%' // Span 4 rows (P to S)
                  }}
                ></div>
                {/* Block 2: V8-Z12 */}
                <div 
                  className="absolute z-20 pointer-events-auto cursor-default bg-[#0a0a0a] hidden landscape:block"
                  style={{
                    left: '46.666%',  // Col 8 start
                    top: '80.769%',   // Row V start
                    width: '33.333%', // Col 8 to 12 (5 cols)
                    height: '19.23%'  // Span 5 rows (V to Z)
                  }}
                ></div>
              </>
            )}

            {/* Mobile Bottom Controls Shield - Blocks CC, Gear, Fullscreen buttons on Drive player */}
            <div className="absolute left-0 right-0 bottom-0 z-20 pointer-events-auto cursor-default bg-black/95 md:hidden" style={{ height: '15%' }}></div>

            {/* Custom Top Right Brand Watermark - Blocks Google Drive Popout Button */}
            {/* Grid coverage: Mobile Portrait=A13-E15, FS Portrait=A13-F15, Mobile Landscape=A14-D15, FS Landscape=keep current */}
            <div 
              className="absolute top-0 right-0 z-20 flex items-center justify-center bg-black/90 rounded-bl-2xl pointer-events-auto cursor-default border-l border-b border-white/5 w-12 h-12 md:w-14 md:h-14"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/PFlix.png" alt="PhysicsSPMFlix" className="h-4 md:h-6 w-auto object-contain" />
            </div>

            {/* Conditional Tavis Censor Block for 2.6 Daya */}
            {currentLesson.titleBm === "2.6 Daya" && (
              <div 
                className={`absolute left-0 z-20 pointer-events-auto cursor-default bg-black/95 border-r border-b border-white/5 w-[13.33%] ${
                  isFullscreen
                    ? "portrait:top-[23.08%] portrait:h-[7.69%] landscape:top-[11.54%] landscape:h-[7.69%]"
                    : "portrait:top-[23.08%] portrait:h-[3.85%] landscape:top-[11.54%] landscape:h-[7.69%]"
                }`}
              ></div>
            )}

            {/* Conditional PHYSFLIX Cover for 5.6b Interferens Gelombang */}
            {currentLesson.titleBm === "5.6b Interferens Gelombang" && (
              <div 
                className="absolute z-20 flex items-center justify-center bg-[#0a0a0a] rounded-[2px] md:rounded-md shadow-lg border border-white/10 pointer-events-none"
                style={{
                  left: '60%',      // Col 10 start
                  top: '84.615%',   // Row W start
                  width: '20%',     // Col 10 to 12 (3 cols)
                  height: '7.692%'  // Span 2 rows (W and X)
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/PHYSFLIX.png" alt="PhysicsSPMFlix" className="h-[60%] w-auto object-contain opacity-80" />
              </div>
            )}


            {/* Top-Left Shield - Blocks Google Drive Title Link (Solid black on mobile to hide menu) */}
            <div className="absolute top-0 left-0 z-20 w-[80%] h-10 md:h-16 pointer-events-auto cursor-default bg-black md:bg-transparent"></div>

            {/* Bottom Controller Shield (Solid Black) - Hides player controls completely on PC */}
            {devShowControllerShield && (
              <div 
                className="absolute left-0 right-0 bottom-0 z-20 pointer-events-auto cursor-default bg-black hidden md:block"
                style={{
                  height: isFullscreen ? '7.692%' : '15.38%',
                }}
              ></div>
            )}

            {/* 27-Degree Rotated Green Grid Watermark (Dev Tools) */}
            {devShow45Watermark && (
              <div className="absolute inset-0 z-[140] pointer-events-none flex items-center justify-center overflow-hidden">
                <div 
                  className="w-[150%] h-[150%] grid" // Slightly larger to cover corners during rotation
                  style={{ 
                    transform: 'rotate(-27deg)',
                    gridTemplateColumns: 'repeat(15, minmax(0, 1fr))',
                    gridTemplateRows: 'repeat(26, minmax(0, 1fr))'
                  }}
                >
                  {Array.from({ length: 15 * 26 }).map((_, i) => {
                    const col = i % 15;
                    const row = Math.floor(i / 15);
                    const letter = String.fromCharCode(65 + row); // A-Z
                    const number = col + 1; // 1-15
                    return (
                      <div key={i} className="border border-green-500/40 flex items-center justify-center bg-green-500/20">
                        <span className="text-green-300 font-mono text-[8px] md:text-xs font-bold bg-black/60 px-0.5 rounded">{letter}{number}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* TEMPORARY 15x26 GRID OVERLAY FOR PRECISE POSITIONING */}
            {devShowGrid && (
              <div 
                className="absolute inset-0 z-50 pointer-events-none grid"
                style={{ 
                  gridTemplateColumns: 'repeat(15, minmax(0, 1fr))',
                  gridTemplateRows: 'repeat(26, minmax(0, 1fr))'
                }}
              >
                {Array.from({ length: 15 * 26 }).map((_, i) => {
                  const col = i % 15;
                  const row = Math.floor(i / 15);
                  const letter = String.fromCharCode(65 + row); // A-Z
                  const number = col + 1; // 1-15
                  return (
                    <div key={i} className="border border-red-500/30 flex items-center justify-center overflow-hidden">
                      <span className="text-red-500/80 font-mono text-[8px] md:text-xs font-bold bg-black/40 px-0.5 rounded">{letter}{number}</span>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Bottom-Center Invisible Shield - Blocks Timeline Scrubbing (Fast Forward/Rewind) */}
            <div 
              className={`absolute left-[2%] right-[2%] z-30 pointer-events-auto cursor-not-allowed max-md:landscape:!top-0 max-md:landscape:!bottom-auto max-md:landscape:!h-[11.5%] max-md:landscape:!left-0 max-md:landscape:!right-0 ${isDev && devShowShields ? 'bg-red-500/30' : 'bg-transparent'}`}
              style={shieldStyle}
              title="Sila tonton tanpa skip"
            ></div>

            {/* Permanent Protectors for 'Tavis' Logo */}
            {devShowShields && (
              <>
                {currentLesson.tavisPositions && currentLesson.tavisPositions.length > 0 ? (
                  currentLesson.tavisPositions.map((pos, idx) => (
                <div 
                  key={idx}
                  className="absolute z-20 flex items-center justify-center bg-[#0a0a0a] rounded-[4px] md:rounded-lg shadow-xl border border-white/10 pointer-events-none"
                  style={pos as React.CSSProperties}
                >
                   {/* eslint-disable-next-line @next/next/no-img-element */}
                   <img src="/PHYSFLIX.png" alt="PhysicsSPMFlix" className="h-[45%] w-auto object-contain opacity-80" />
                </div>
              ))
            ) : (
              <>
                {showTavisM1toM20 && (
                  <>
                    {/* Top-Right Tavis Protector (B7-B8 for M1-M20) -> Portrait T10-U12 */}
                    <div 
                      className="absolute z-20 flex items-center justify-center bg-[#0a0a0a] rounded-[4px] md:rounded-lg shadow-xl border border-white/10 pointer-events-none top-[10%] right-[20%] w-[20%] h-[10%] portrait:top-[73%] portrait:right-auto portrait:left-[60%] portrait:w-[20%] portrait:h-[7.7%]"
                    >
                       {/* eslint-disable-next-line @next/next/no-img-element */}
                       <img src="/PHYSFLIX.png" alt="PhysicsSPMFlix" className="h-[45%] w-auto object-contain opacity-80" />
                    </div>
                    
                    {/* Bottom-Right Tavis Protector (I7-I8 for M1-M20) -> Portrait G10-H12 */}
                    <div 
                      className="absolute z-20 flex items-center justify-center bg-[#0a0a0a] rounded-[4px] md:rounded-lg shadow-xl border border-white/10 pointer-events-none bottom-[10%] right-[20%] w-[20%] h-[10%] portrait:bottom-auto portrait:top-[23%] portrait:right-auto portrait:left-[60%] portrait:w-[20%] portrait:h-[7.7%]"
                    >
                       {/* eslint-disable-next-line @next/next/no-img-element */}
                       <img src="/PHYSFLIX.png" alt="PhysicsSPMFlix" className="h-[45%] w-auto object-contain opacity-80" />
                    </div>
                  </>
                )}

                {showTavisM21Plus && (
                  <>
                    {/* Top-Left Tavis Protector (B1-B2 for M21+) -> Portrait F10-H12 */}
                    <div 
                      className="absolute z-20 flex items-center justify-center bg-[#0a0a0a] rounded-[4px] md:rounded-lg shadow-xl border border-white/10 pointer-events-none top-[10%] left-[0%] w-[20%] h-[10%] portrait:top-[19.2%] portrait:left-[60%] portrait:w-[20%] portrait:h-[11.5%]"
                    >
                       {/* eslint-disable-next-line @next/next/no-img-element */}
                       <img src="/PHYSFLIX.png" alt="PhysicsSPMFlix" className="h-[45%] w-auto object-contain opacity-80" />
                    </div>

                    {/* Top-Right Tavis Protector 1 (B7-B8 for M21+) */}
                    <div 
                      className="absolute z-20 flex items-center justify-center bg-[#0a0a0a] rounded-[4px] md:rounded-lg shadow-xl border border-white/10 pointer-events-none top-[10%] right-[20%] w-[20%] h-[10%] portrait:hidden"
                    >
                       {/* eslint-disable-next-line @next/next/no-img-element */}
                       <img src="/PHYSFLIX.png" alt="PhysicsSPMFlix" className="h-[45%] w-auto object-contain opacity-80" />
                    </div>
                    
                    {/* Top-Right Tavis Protector 2 (C9 for M21+) */}
                    <div 
                      className="absolute z-20 flex items-center justify-center bg-[#0a0a0a] rounded-[4px] md:rounded-lg shadow-xl border border-white/10 pointer-events-none top-[20%] right-[10%] w-[10%] h-[10%] portrait:hidden"
                    >
                       {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src="/PHYSFLIX.png" alt="PhysicsSPMFlix" className="h-[45%] w-auto object-contain opacity-80" />
                    </div>
                  </>
                )}
              </>
            )}
            </>
          )}

            {/* Custom Initial Cover (Hole Punch) - unified for mobile & desktop */}
            {showCover && (
              <div className="absolute inset-0 z-30 pointer-events-none overflow-hidden flex items-center justify-center">
                {/* Click blockers & Solid Fallback Cover - prevents clicks and acts as a solid visual fallback if box-shadow fails */}
                <div className="absolute top-0 left-0 right-0 h-[calc(50%-26px)] bg-[#0a0a0a] pointer-events-auto z-40"></div>
                <div className="absolute bottom-0 left-0 right-0 h-[calc(50%-26px)] bg-[#0a0a0a] pointer-events-auto z-40"></div>
                <div className="absolute top-[calc(50%-26px)] left-0 w-[calc(50%-36px)] h-[52px] bg-[#0a0a0a] pointer-events-auto z-40"></div>
                <div className="absolute top-[calc(50%-26px)] right-0 w-[calc(50%-36px)] h-[52px] bg-[#0a0a0a] pointer-events-auto z-40"></div>

                {/* Highly compatible inline-styled Hole Punch (Bypasses Tailwind JIT/Caching issues) */}
                <div 
                  className="w-[72px] h-[52px] rounded-[12px] z-30"
                  style={{ 
                    boxShadow: '0 0 0 9999px #0a0a0a',
                    transform: 'translateZ(0)',
                    WebkitTransform: 'translateZ(0)' 
                  }}
                ></div>

                {/* Additional UI elements (Logo, text) placed around the hole EXACTLY like old repo */}
                <div className="absolute top-10 left-0 right-0 flex flex-col items-center z-40">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/PHYSFLIX.png" alt="PhysicsSPMFlix" className="h-12 md:h-16 w-auto object-contain mb-4 opacity-90" />
                  <span className="text-white/80 text-sm md:text-xl font-black font-mono tracking-widest text-center uppercase">
                    {currentLesson.titleBm}
                  </span>
                </div>
                
                <div className="absolute bottom-16 left-0 right-0 flex justify-center z-40">
                  <span className="text-red-500/80 text-sm md:text-base font-bold tracking-wide animate-pulse">
                    ↑ Klik butang Play di atas ↑
                  </span>
                </div>
              </div>
            )}

            {/* Full Screen End Cover (Last 5 Minutes) */}
            {showEndCover && (
              <div 
                className="absolute inset-0 z-50 bg-black flex flex-col items-center justify-center pointer-events-auto"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/PHYSFLIX.png" alt="PhysicsSPMFlix" className="h-16 md:h-24 w-auto object-contain opacity-90 mb-4" />
                <span className="text-red-500 font-bold text-lg md:text-2xl animate-pulse mb-6">SESI TAMAT</span>
                
                <button
                  onClick={() => {
                    const is20MinStart = currentLesson.titleBm === "2.2b Graf Gerakan Linear & 2.3 Jatuh Bebas Ulangkaji";
                    const is18MinStart = currentLesson.titleBm === "6.1a Reputan Radioaktif";
                    const is15MinStart = currentLesson.titleBm === "5.1 Asas Gelombang" || currentLesson.titleBm === "1.1 Daya Paduan";
                    const is14m40sStart = currentLesson.titleBm === "4.4b Hukum Gas Ulangkaji";
                    const is12m40sStart = currentLesson.titleBm === "6.1 Pembiasan Cahaya";
                    const is13mStart = currentLesson.titleBm === "6.6b Pembentukan Imej Oleh Cermin Sfera";
                    const startSecs = is20MinStart ? 1200 : (is18MinStart ? 1080 : (is15MinStart ? 900 : (is14m40sStart ? 880 : (is13mStart ? 780 : (is12m40sStart ? 760 : 600)))));
                    const startParam = is20MinStart ? "1200s" : (is18MinStart ? "1080s" : (is15MinStart ? "900s" : (is14m40sStart ? "880s" : (is13mStart ? "780s" : (is12m40sStart ? "760s" : "600s")))));

                    setShowEndCover(false);
                    setShowCover(true); // Reset the hole punch cover
                    setCurrentStartSeconds(startSecs); // Reset timer
                    
                    if (currentLesson.youtubeId) {
                      setIframeSrc(`https://www.youtube.com/embed/${currentLesson.youtubeId}?start=${startSecs}&rel=0&modestbranding=1&autoplay=1`);
                    } else {
                      const driveUrl = `https://drive.google.com/file/d/${rawDriveId}/preview`;
                      setIframeSrc(`${driveUrl}?t=${startParam}&cc_load_policy=0&cc=0`); // Restart video at correct min
                    }
                  }}
                  className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-6 rounded-lg shadow-lg transition-transform transform hover:scale-105 active:scale-95 flex items-center gap-2"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                  </svg>
                  Tonton Semula
                </button>
              </div>
            )}
            </div>
          </div>

          {/* TEMPORARY JUMP FEATURE */}
          {devShowJump && (
            <div className="mt-4 flex flex-col md:flex-row items-start md:items-center gap-3 bg-slate-800/50 p-4 rounded-lg border border-slate-700/50">
              <span className="text-sm font-medium text-slate-300 whitespace-nowrap">⏳ Lompat ke Masa:</span>
              <input 
                type="text" 
                placeholder="Cth: 12:30 atau 1m30s"
                className="bg-black border border-slate-600 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-red-500 w-full md:w-48"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const val = e.currentTarget.value;
                    if (!val) return;
                    let formattedTime = val;
                    let calculatedSecs = 0;
                    if (val.includes(":")) {
                      const parts = val.split(":");
                      if (parts.length === 2) formattedTime = `${parts[0]}m${parts[1]}s`;
                      else if (parts.length === 3) formattedTime = `${parts[0]}h${parts[1]}m${parts[2]}s`;
                      
                      const p = val.split(":").map(Number);
                      if (p.length === 2) calculatedSecs = p[0]*60 + p[1];
                      else if (p.length === 3) calculatedSecs = p[0]*3600 + p[1]*60 + p[2];
                    } else {
                      let h=0, m=0, s=0;
                      const hM = val.match(/(\d+)h/);
                      const mM = val.match(/(\d+)m/);
                      const sM = val.match(/(\d+)s/);
                      if (hM) h = parseInt(hM[1]);
                      if (mM) m = parseInt(mM[1]);
                      if (sM) s = parseInt(sM[1]);
                      calculatedSecs = h*3600 + m*60 + s;
                    }
                    setCurrentStartSeconds(calculatedSecs);

                    if (currentLesson.youtubeId) {
                      setIframeSrc(`https://www.youtube.com/embed/${currentLesson.youtubeId}?start=${calculatedSecs}&rel=0&modestbranding=1&autoplay=1`);
                    } else {
                      const baseUrl = `https://drive.google.com/file/d/${rawDriveId}/preview`;
                      const urlWithTime = `${baseUrl}?t=${formattedTime}&cc_load_policy=0&cc=0`;
                      setIframeSrc(urlWithTime);
                    }
                  }
                }}
              />
              <span className="text-xs text-slate-400 italic">
                (Taip masa dan tekan <strong>Enter</strong>. Video akan *reload* di minit tersebut. Ciri sementara.)
              </span>
            </div>
          )}



          {/* Video Header & Actions */}
          <div className="space-y-4">
            <div>
              <h1 className="text-xl md:text-2xl font-black text-white tracking-tight mt-2">
                {lang === "bm" ? currentLesson.titleBm : currentLesson.titleDlp}
              </h1>
              <p className="text-xs text-slate-400 mt-1 font-medium">
                {lang === "bm" ? `Tingkatan ${currentLesson.form} • ${currentLesson.chapterBm}` : `Form ${currentLesson.form} • ${currentLesson.chapterDlp}`}
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center justify-end gap-4 pt-2 border-t border-b border-slate-800/80 py-3">
              <div className="flex items-center space-x-2">
                <div className="flex items-center bg-[#131826] rounded-full border border-slate-800 p-0.5">
                  <button
                    onClick={handleLike}
                    className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition ${
                      liked ? "bg-red-600 text-white" : "text-slate-300 hover:text-white"
                    }`}
                  >
                    <ThumbsUp className="w-3.5 h-3.5" />
                    <span>{likeCount}</span>
                  </button>
                  <button className="px-2.5 py-1.5 text-slate-400 hover:text-white border-l border-slate-800">
                    <ThumbsDown className="w-3.5 h-3.5" />
                  </button>
                </div>

                <button 
                  onClick={handleShare}
                  className="flex items-center space-x-1.5 px-3.5 py-2 rounded-full bg-[#131826] hover:bg-slate-800 border border-slate-800 text-xs font-bold text-slate-300 transition"
                >
                  <Share2 className="w-3.5 h-3.5 text-blue-400" />
                  <span>{shareText === "Kongsi" ? t("btnShare") : shareText}</span>
                </button>

                <button
                  onClick={() => toggleBookmark(currentLesson.id)}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-semibold transition ${
                    isBookmarked(currentLesson.id)
                      ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                      : "bg-[#131724] hover:bg-[#1a2133] text-slate-300 border border-slate-800"
                  }`}
                >
                  <Bookmark className={`w-4 h-4 ${isBookmarked(currentLesson.id) ? "fill-current" : ""}`} />
                  <span>{isBookmarked(currentLesson.id) ? t("saved") : t("save")}</span>
                </button>

                <button
                  onClick={toggleFullscreen}
                  className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-900/20 text-sm font-semibold transition"
                >
                  <Maximize className="w-4 h-4" />
                  <span className="hidden sm:inline">Skrin Penuh</span>
                </button>
              </div>
            </div>
          </div>

          {/* Detail Tabs Section */}
          <div className="space-y-4">
            <div className="flex overflow-x-auto hide-scrollbar border-b border-slate-800 gap-4 md:gap-6 text-sm font-bold">
              <button
                onClick={() => setActiveTab("overview")}
                className={`pb-3 whitespace-nowrap transition ${
                  activeTab === "overview"
                    ? "border-b-2 border-red-500 text-white"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {t("tabOverview")}
              </button>
              <button
                onClick={() => setActiveTab("notes")}
                className={`pb-3 whitespace-nowrap transition ${
                  activeTab === "notes"
                    ? "border-b-2 border-red-500 text-white"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {t("tabNotes")}
              </button>
              <button
                onClick={() => setActiveTab("qa")}
                className={`pb-3 whitespace-nowrap transition ${
                  activeTab === "qa"
                    ? "border-b-2 border-red-500 text-white"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {t("tabQA")}
              </button>
            </div>

            {/* Tab Content */}
            {activeTab === "overview" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-5 rounded-2xl bg-[#111624] border border-slate-800 space-y-3">
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
                    {t("whatYoullLearn")}
                  </h3>
                  <ul className="space-y-2">
                    {(lang === "bm" ? currentLesson.learningPointsBm : currentLesson.learningPointsDlp).map(
                      (point, i) => (
                        <li key={i} className="flex items-start space-x-2 text-xs text-slate-300">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                          <span>{point}</span>
                        </li>
                      )
                    )}
                  </ul>
                </div>

                <div className="p-5 rounded-2xl bg-[#111624] border border-slate-800 space-y-3">
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
                    {t("keyConcepts")}
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {(lang === "bm" ? currentLesson.keyConceptsBm : currentLesson.keyConceptsDlp).map(
                      (concept, i) => (
                        <button
                          key={i}
                          onClick={() => setSelectedConcept(selectedConcept === concept ? null : concept)}
                          className={`px-3 py-1 border rounded-lg text-xs font-medium transition-colors ${
                            selectedConcept === concept
                              ? "bg-red-600 border-red-500 text-white"
                              : "bg-[#1a2133] border-slate-700/60 text-slate-200 hover:bg-slate-800 hover:text-white"
                          }`}
                        >
                          {concept}
                        </button>
                      )
                    )}
                  </div>
                  {selectedConcept && (
                    <div className="mt-3 p-4 bg-slate-900/80 border border-slate-700 rounded-xl relative animate-in fade-in slide-in-from-top-2 duration-300">
                      <h4 className="text-sm font-bold text-red-400 mb-1">{selectedConcept}</h4>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        {conceptDefinitions[selectedConcept] || 
                          (lang === "bm" 
                            ? "Definisi untuk konsep ini akan dikemas kini kelak mengikut silibus SPM." 
                            : "The definition for this concept will be updated soon according to the SPM syllabus.")}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === "notes" && (
              <div className="p-5 rounded-2xl bg-[#111624] border border-slate-800 space-y-3 text-xs text-slate-300 leading-relaxed">
                <h3 className="text-sm font-bold text-white">
                  Nota Ringkas & Formula SPM
                </h3>
                <p>
                  1. Pastikan perhatikan tanda positif dan negatif bagi jarak objek (u) dan jarak imej (v).
                </p>
                <p>
                  2. Kanta Cembung (Convex Lens) berfungsi menumpukan sinar cahaya pada titik fokus (F).
                </p>
                <p>
                  3. Formula Kanta / Cermin: <code className="bg-[#1c2438] px-2 py-0.5 rounded text-red-400 font-mono">1/f = 1/u + 1/v</code>
                </p>
              </div>
            )}

            {activeTab === "qa" && (
              <div className="p-5 rounded-2xl bg-[#111624] border border-slate-800 space-y-4">
                <form onSubmit={handleAddComment} className="flex gap-2">
                  <input
                    type="text"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Tanya soalan tentang video ini..."
                    className="flex-1 px-4 py-2 bg-[#171e2e] border border-slate-700/60 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-500"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-bold text-xs rounded-xl transition"
                  >
                    Hantar
                  </button>
                </form>

                <div className="space-y-3 pt-2">
                  {comments.map((c, i) => (
                    <div key={i} className="p-3 bg-[#161c2c] border border-slate-800 rounded-xl space-y-1">
                      <div className="flex justify-between items-center text-[10px] text-slate-400">
                        <span className="font-bold text-slate-200">{c.name}</span>
                        <span>{c.time}</span>
                      </div>
                      <p className="text-xs text-slate-300">{c.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column - Sidebar (Playlist / Learning Tools) */}
        <div className="lg:col-span-4 space-y-6">
          <div className="p-5 rounded-3xl bg-[#101420] border border-slate-800/80 shadow-2xl space-y-5">
            {/* Playlist vs Learning Tools Segmented Switch */}
            <div className="flex bg-[#161c2b] p-1 rounded-2xl border border-slate-800">
              <button
                onClick={() => setSidebarTab("playlist")}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition ${
                  sidebarTab === "playlist"
                    ? "bg-red-600 text-white shadow-md"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {t("tabPlaylist")}
              </button>
              <button
                onClick={() => setSidebarTab("tools")}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition ${
                  sidebarTab === "tools"
                    ? "bg-red-600 text-white shadow-md"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {t("tabLearningTools")}
              </button>
            </div>

            {/* Protected Learning Notes Section */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-purple-900/40 via-indigo-950/40 to-slate-900 border border-purple-800/40 space-y-3">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-purple-600/30 border border-purple-500/40 flex items-center justify-center text-purple-300">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">{t("downloadNotesTitle")}</h4>
                  <p className="text-[10px] text-slate-400">Modul pembacaan digital dalam web</p>
                </div>
              </div>

              <button
                onClick={() => setActiveTab("notes")}
                className="w-full flex items-center justify-center space-x-2 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition shadow-lg shadow-purple-950"
              >
                <span>Buka Reader Digital</span>
              </button>
            </div>

            {/* Chapters / Videos Playlist */}
            {sidebarTab === "playlist" && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
                    {t("tabChapters")} ({allVideoLessons.length} Video)
                  </h4>
                  <span className="text-[10px] text-slate-500 font-bold">{t("hide")}</span>
                </div>

                <div id="playlist-container" className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                  {allVideoLessons.map((lesson, idx) => {
                    const isCurrent = lesson.id === currentLesson.id;
                    return (
                      <div
                        key={lesson.id}
                        id={isCurrent ? "current-playing-video" : undefined}
                        onClick={() => onSelectLesson(lesson)}
                        className={`group cursor-pointer p-3 rounded-2xl border transition flex items-center space-x-3 ${
                          isCurrent
                            ? "bg-red-950/40 border-red-600/80 ring-1 ring-red-500/40"
                            : "bg-[#141a28] hover:bg-[#1a2234] border-slate-800/80"
                        }`}
                      >
                        {/* Mini Thumbnail */}
                        <div className="relative w-16 h-12 rounded-xl bg-slate-800 flex items-center justify-center overflow-hidden shrink-0">
                          {isCurrent ? (
                            <div className="w-6 h-6 rounded-full bg-red-600 flex items-center justify-center text-white">
                              <Play className="w-3 h-3 fill-white ml-0.5" />
                            </div>
                          ) : (
                            <span className="text-[10px] font-bold text-slate-400">{idx + 1}</span>
                          )}
                        </div>

                        {/* Title & Metadata */}
                        <div className="flex-1 overflow-hidden">
                          <span className="text-[9px] font-bold text-red-400 block">
                            {lesson.week}
                          </span>
                          <h5
                            className={`text-xs font-bold truncate ${
                              isCurrent ? "text-red-400" : "text-slate-200 group-hover:text-white"
                            }`}
                          >
                            {lang === "bm" ? lesson.titleBm : lesson.titleDlp}
                          </h5>
                          <span className="text-[10px] text-slate-400">{lesson.duration}</span>
                        </div>

                        {/* Completion Icon */}
                        <div>
                          {idx < 3 ? (
                            <CheckCircle2 className="w-4 h-4 text-red-500" />
                          ) : (
                            <Circle className="w-4 h-4 text-slate-600" />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
