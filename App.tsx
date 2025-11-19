
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ARABIC_LETTERS, AppState, LetterContent } from './types';
import { generateLetterData, generateStoryAudio, generateLetterVideo } from './services/geminiService';
import DrawingCanvas from './components/DrawingCanvas';
import { ArrowRight, ArrowLeft, Volume2, BookOpen, Pencil, Home, Star, Loader2, Play, Pause, Video, Sparkles, Lock, KeyRound } from 'lucide-react';

// --- COMPONENTS ---

const AnimatedBackground = () => {
  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      <motion.div 
        animate={{ x: [0, 50, 0], y: [0, 30, 0] }} 
        transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-yellow-200 rounded-full mix-blend-multiply filter blur-3xl opacity-50" 
      />
      <motion.div 
        animate={{ x: [0, -30, 0], y: [0, 50, 0] }} 
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut", delay: 2 }}
        className="absolute top-[20%] right-[-10%] w-80 h-80 bg-pink-200 rounded-full mix-blend-multiply filter blur-3xl opacity-50" 
      />
      <motion.div 
        animate={{ x: [0, 40, 0], y: [0, -40, 0] }} 
        transition={{ duration: 20, repeat: Infinity, ease: "easeInOut", delay: 4 }}
        className="absolute bottom-[-10%] left-[20%] w-80 h-80 bg-purple-200 rounded-full mix-blend-multiply filter blur-3xl opacity-50" 
      />
       <motion.div 
        animate={{ scale: [1, 1.2, 1] }} 
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        className="absolute bottom-[10%] right-[10%] w-64 h-64 bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-40" 
      />
    </div>
  );
};

const HighlightedWord = ({ word, letter, onClick }: { word: string, letter: string, onClick: () => void }) => {
    const parts = word.split(letter);
    const zwj = '\u200D'; 
    
    return (
      <div 
        onClick={onClick}
        className="inline-block mx-2 px-4 py-2 bg-white/80 backdrop-blur-sm rounded-xl shadow-sm border border-white/50 text-gray-800 text-4xl font-bold cursor-pointer hover:scale-105 hover:shadow-md transition-all select-none"
        dir="rtl"
        lang="ar"
      >
        {parts.map((part, i) => {
          const isLastPart = i === parts.length - 1;
          if (isLastPart) return <React.Fragment key={i}>{part}</React.Fragment>;
          const connectRight = part.length > 0 || i > 0;
          const connectLeft = (i < parts.length - 2) || (parts[i+1] && parts[i+1].length > 0);
          const displayLetter = (connectRight ? zwj : '') + letter + (connectLeft ? zwj : '');

          return (
            <React.Fragment key={i}>
              {part}
              <span className="text-pink-500 drop-shadow-sm">{displayLetter}</span>
            </React.Fragment>
          );
        })}
      </div>
    );
};

const TabButton = ({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) => (
    <button
        onClick={onClick}
        className={`flex flex-col sm:flex-row items-center gap-1 sm:gap-2 px-4 py-2 rounded-2xl transition-all duration-300 ${
            active ? 'bg-white text-indigo-600 shadow-md scale-105 ring-2 ring-indigo-100' : 'text-gray-500 hover:bg-indigo-50 hover:text-indigo-400'
        }`}
    >
        <div className={active ? "animate-bounce-short" : ""}>{icon}</div>
        <span className="text-xs sm:text-sm font-bold">{label}</span>
    </button>
);

// --- MAIN APP ---

export default function App() {
  const [appState, setAppState] = useState<AppState>(AppState.MENU);
  const [selectedLetter, setSelectedLetter] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [content, setContent] = useState<LetterContent | null>(null);
  const [tab, setTab] = useState<'learn' | 'story' | 'draw' | 'video'>('learn');
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  
  // Video state
  const [generatingVideo, setGeneratingVideo] = useState(false);
  const [videoError, setVideoError] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  const speak = (text: string, lang = 'ar-SA') => {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = 0.8;
    window.speechSynthesis.speak(utterance);
  };

  const handleLetterSelect = async (letter: string) => {
    setSelectedLetter(letter);
    setLoading(true);
    setAppState(AppState.LEARN);
    setTab('learn');
    setVideoError(null);
    setGeneratingVideo(false);
    
    const data = await generateLetterData(letter);
    setContent(data);
    setLoading(false);
    speak(letter);
  };

  const handleBack = () => {
    setAppState(AppState.MENU);
    setContent(null);
    if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
    }
    setIsPlayingAudio(false);
    setGeneratingVideo(false);
  };

  useEffect(() => {
    if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
    }
    setIsPlayingAudio(false);
  }, [content]);

  const playStory = async () => {
    if (isPlayingAudio && audioRef.current) {
        audioRef.current.pause();
        setIsPlayingAudio(false);
        return;
    }
    
    if (!content) return;

    if (!audioRef.current) {
        const audioUrl = await generateStoryAudio(content.story);
        if (audioUrl) {
            const audio = new Audio(audioUrl);
            audio.onended = () => setIsPlayingAudio(false);
            audio.onerror = (e) => {
                console.error("Audio playback error", e);
                setIsPlayingAudio(false);
                speak(content.story);
            };
            audioRef.current = audio;
            audio.play().catch(e => {
                console.error("Play failed", e);
                speak(content.story); 
            });
            setIsPlayingAudio(true);
        } else {
            speak(content.story);
        }
    } else {
        audioRef.current.play();
        setIsPlayingAudio(true);
    }
  };

  const navigateLetter = (direction: 'next' | 'prev') => {
    if (!selectedLetter) return;
    const idx = ARABIC_LETTERS.indexOf(selectedLetter);
    let newIdx = direction === 'next' ? idx + 1 : idx - 1;
    
    if (newIdx < 0) newIdx = ARABIC_LETTERS.length - 1;
    if (newIdx >= ARABIC_LETTERS.length) newIdx = 0;
    
    handleLetterSelect(ARABIC_LETTERS[newIdx]);
  };

  // Video Generation Logic
  const handleCreateVideo = async () => {
      if (!content) return;
      
      // 1. Check API Key Selection
      const aistudio = (window as any).aistudio;
      if (aistudio && aistudio.hasSelectedApiKey) {
          const hasKey = await aistudio.hasSelectedApiKey();
          if (!hasKey && aistudio.openSelectKey) {
              await aistudio.openSelectKey();
              // Assume success after dialog closes or re-check
          }
      }

      setGeneratingVideo(true);
      setVideoError(null);

      try {
          const videoUrl = await generateLetterVideo(content.letter, content.name);
          if (videoUrl) {
              setContent(prev => prev ? ({ ...prev, videoUri: videoUrl }) : null);
          } else {
              setVideoError("Oops! Could not make the video.");
          }
      } catch (e: any) {
          console.error("Video generation error:", e);
          
          const errorMessage = e.message || (e.error && e.error.message) || JSON.stringify(e);

          if (errorMessage.includes("Requested entity was not found") || errorMessage.includes("404")) {
               setVideoError("API Key Access Required. Please select your key.");
               const aistudio = (window as any).aistudio;
               if (aistudio && aistudio.openSelectKey) {
                   await aistudio.openSelectKey();
               }
          } else {
              setVideoError("Something went wrong connecting to the magic studio.");
          }
      } finally {
          setGeneratingVideo(false);
      }
  };

  // --- VIEW: MENU ---
  if (appState === AppState.MENU) {
    return (
      <div className="h-screen bg-gradient-to-br from-orange-50 to-indigo-50 p-6 pb-20 font-sans relative overflow-y-auto">
        <AnimatedBackground />

        <header className="text-center mb-10 relative z-10 pt-8">
            <motion.div
                initial={{ y: -50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="inline-block relative"
            >
                <h1 className="text-5xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-pink-500 drop-shadow-sm mb-2 tracking-wide">
                    عالم الحروف
                </h1>
                <Sparkles className="absolute -top-6 -right-6 text-yellow-400 w-10 h-10 animate-pulse" />
            </motion.div>
          <p className="text-indigo-400 text-lg font-medium mt-2">Learn Arabic Alphabet</p>
        </header>

        <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-7 gap-3 md:gap-6 max-w-4xl mx-auto relative z-10 pb-10" dir="rtl">
          {ARABIC_LETTERS.map((char, i) => (
            <motion.button
              key={char}
              whileHover={{ scale: 1.15, rotate: [0, -5, 5, 0], transition: {duration: 0.3} }}
              whileTap={{ scale: 0.9 }}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03, type: 'spring', stiffness: 300 }}
              onClick={() => handleLetterSelect(char)}
              className="aspect-square bg-white/80 backdrop-blur-sm rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border-b-4 border-indigo-100 flex items-center justify-center text-4xl md:text-5xl font-bold text-indigo-600 hover:bg-white hover:border-indigo-300 hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)] transition-all"
            >
              {char}
            </motion.button>
          ))}
        </div>
      </div>
    );
  }

  // --- VIEW: FLASHCARD ---
  return (
    <div className="h-screen bg-gradient-to-b from-indigo-50 to-white flex flex-col font-sans overflow-hidden relative">
      <AnimatedBackground />
      
      {/* Top Navigation */}
      <div className="px-4 py-4 flex justify-between items-center z-20 relative shrink-0">
        <motion.button 
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={handleBack} 
            className="p-3 rounded-full bg-white/80 backdrop-blur shadow-sm hover:shadow-md text-indigo-600 transition border border-indigo-50"
        >
          <Home size={24} />
        </motion.button>
        <h2 className="text-3xl font-black text-indigo-600 drop-shadow-sm">
            {content ? content.name : <div className="w-24 h-8 bg-indigo-100/50 animate-pulse rounded-lg"/>}
        </h2>
        <div className="w-12" /> {/* Spacer */}
      </div>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto pt-4 pb-32 px-4 relative w-full max-w-lg mx-auto z-10 scroll-smooth">
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div
              key="loader"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="flex flex-col items-center justify-center h-[50vh]"
            >
              <div className="relative">
                 <div className="absolute inset-0 bg-orange-200 rounded-full blur-xl opacity-50 animate-pulse"></div>
                 <Loader2 className="w-20 h-20 text-orange-500 animate-spin relative z-10" />
              </div>
              <p className="text-indigo-400 font-bold text-xl mt-8 animate-bounce">Preparing magic...</p>
            </motion.div>
          ) : content ? (
            <motion.div
              key={tab}
              initial={{ opacity: 0, y: 20, filter: 'blur(10px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: -20, filter: 'blur(10px)' }}
              transition={{ duration: 0.3 }}
              className="w-full flex flex-col items-center"
            >
                {/* TAB 1: LEARN */}
                {tab === 'learn' && (
                  <div className="flex flex-col items-center w-full gap-8">
                    {/* Big Letter Card */}
                    <motion.div 
                        className="bg-white/90 backdrop-blur rounded-[2rem] shadow-[0_20px_50px_rgb(0,0,0,0.1)] p-10 w-64 h-64 flex items-center justify-center border-4 border-white relative cursor-pointer group overflow-hidden"
                        onClick={() => speak(content.letter)}
                        whileHover={{ scale: 1.05, rotate: 2 }}
                        whileTap={{ scale: 0.95 }}
                    >
                        <div className="absolute inset-0 bg-gradient-to-br from-orange-100/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        <span className="text-9xl font-black text-transparent bg-clip-text bg-gradient-to-b from-indigo-600 to-purple-600 drop-shadow-sm relative z-10">
                            {content.letter}
                        </span>
                        <div className="absolute bottom-4 right-4 bg-orange-100 p-2 rounded-full text-orange-500 opacity-0 group-hover:opacity-100 transition-all transform translate-y-2 group-hover:translate-y-0">
                            <Volume2 className="w-6 h-6" />
                        </div>
                    </motion.div>

                    {/* Words Examples */}
                    <div className="w-full space-y-3">
                        <h3 className="text-center text-indigo-300 text-sm font-bold uppercase tracking-widest mb-2">Words</h3>
                        {content.words.map((word, idx) => (
                            <motion.div 
                                key={idx}
                                initial={{ x: -50, opacity: 0 }}
                                animate={{ x: 0, opacity: 1 }}
                                transition={{ delay: 0.1 + (idx * 0.1) }}
                                className="flex items-center justify-between bg-white/60 backdrop-blur-md border border-white p-3 rounded-2xl shadow-sm hover:bg-white transition-colors"
                            >
                                <div className="flex flex-col text-right flex-1">
                                    <span className="text-[10px] text-indigo-300 uppercase font-bold tracking-wide">{word.position}</span>
                                    <span className="text-sm font-medium text-gray-600">{word.english}</span>
                                </div>
                                <div className="flex-1 text-right">
                                    <HighlightedWord 
                                        word={word.arabic} 
                                        letter={content.letter}
                                        onClick={() => speak(word.arabic)}
                                    />
                                </div>
                            </motion.div>
                        ))}
                    </div>
                  </div>
                )}

                {/* TAB 2: STORY */}
                {tab === 'story' && (
                  <div className="w-full bg-white/80 backdrop-blur rounded-3xl shadow-xl overflow-hidden flex flex-col border border-white">
                     <div className="relative h-56 w-full bg-indigo-100 overflow-hidden shrink-0">
                         <img 
                            src={`https://picsum.photos/seed/${content.letter}arabic/600/400`} 
                            alt="Story illustration" 
                            className="w-full h-full object-cover opacity-90 hover:scale-110 transition-transform duration-1000"
                         />
                         <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent pointer-events-none" />
                         <motion.button 
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={playStory}
                            className="absolute bottom-4 right-4 bg-white/90 backdrop-blur p-4 rounded-full shadow-lg text-orange-500 transition z-30"
                         >
                            {isPlayingAudio ? <Pause size={28} fill="currentColor" /> : <Play size={28} fill="currentColor" className="ml-1" />}
                         </motion.button>
                     </div>
                     <div className="p-8 text-center space-y-4">
                        <h3 className="text-2xl font-bold text-indigo-800">{content.storyTitle}</h3>
                        <p className="text-2xl leading-loose text-gray-700 font-medium" dir="rtl">
                            {content.story}
                        </p>
                     </div>
                  </div>
                )}

                {/* TAB 3: DRAW */}
                {tab === 'draw' && (
                  <div className="w-full flex flex-col items-center">
                      <h3 className="text-2xl font-bold text-indigo-600 mb-6 flex items-center gap-2">
                        <Pencil className="w-6 h-6" /> Let's Color!
                      </h3>
                      <DrawingCanvas letter={content.letter} color="#f472b6" />
                  </div>
                )}

                {/* TAB 4: VIDEO */}
                {tab === 'video' && (
                    <div className="w-full flex flex-col items-center">
                        <div className="w-full aspect-video bg-black rounded-3xl shadow-2xl overflow-hidden relative flex items-center justify-center border-4 border-white">
                            {content.videoUri ? (
                                <video 
                                    src={content.videoUri} 
                                    controls 
                                    autoPlay 
                                    loop
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <div className="text-center p-6">
                                    {generatingVideo ? (
                                        <div className="flex flex-col items-center gap-4">
                                            <Loader2 className="w-12 h-12 text-white animate-spin" />
                                            <p className="text-white font-bold animate-pulse">Creating magic animation...</p>
                                            <span className="text-white/60 text-sm">This takes about a minute</span>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center gap-4">
                                            <div className="w-20 h-20 rounded-full bg-indigo-600/30 flex items-center justify-center backdrop-blur-sm mb-2">
                                                <Video className="w-10 h-10 text-white" />
                                            </div>
                                            <p className="text-white/80 max-w-xs">
                                                Watch {content.letter} come to life with magic AI video!
                                            </p>
                                            
                                            {videoError && (
                                                <div className="bg-red-500/20 border border-red-500/50 text-red-100 p-3 rounded-xl text-sm mb-2 flex flex-col gap-3 items-center">
                                                    <span>{videoError}</span>
                                                    <button 
                                                        onClick={() => (window as any).aistudio?.openSelectKey?.()}
                                                        className="flex items-center gap-2 bg-white text-red-500 px-4 py-2 rounded-lg text-xs font-bold hover:bg-red-50 transition shadow-sm"
                                                    >
                                                        <KeyRound size={14} />
                                                        Select API Key
                                                    </button>
                                                </div>
                                            )}

                                            <motion.button
                                                whileHover={{ scale: 1.05 }}
                                                whileTap={{ scale: 0.95 }}
                                                onClick={handleCreateVideo}
                                                className="bg-gradient-to-r from-orange-500 to-pink-500 text-white px-8 py-3 rounded-full font-bold shadow-lg flex items-center gap-2 hover:shadow-orange-500/30 transition-shadow"
                                            >
                                                <Sparkles className="w-5 h-5" />
                                                Bring to Life
                                            </motion.button>
                                            
                                            <p className="text-white/40 text-xs mt-4 flex items-center gap-1">
                                                <Lock className="w-3 h-3" /> Requires API Key selection
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                        <div className="mt-6 bg-white/50 backdrop-blur p-4 rounded-2xl text-center max-w-sm">
                            <p className="text-indigo-800 font-medium text-sm">
                                The magic video generator creates a unique 3D animation for this letter. It might take a moment!
                            </p>
                        </div>
                    </div>
                )}

            </motion.div>
          ) : null}
        </AnimatePresence>
      </main>

      {/* Bottom Tab Bar */}
      {!loading && (
          <div className="fixed bottom-0 left-0 right-0 p-4 z-50 flex justify-center">
            <div className="bg-white/90 backdrop-blur-xl border border-white/50 shadow-2xl rounded-3xl p-2 flex items-center gap-2 max-w-md w-full justify-between">
                <button 
                    onClick={() => navigateLetter('prev')}
                    className="p-3 rounded-full hover:bg-indigo-50 text-indigo-400 hover:text-indigo-600 transition active:scale-90"
                >
                    <ArrowLeft size={24} />
                </button>

                <div className="flex gap-1 overflow-x-auto no-scrollbar">
                    <TabButton active={tab === 'learn'} onClick={() => setTab('learn')} icon={<Star size={18} />} label="Learn" />
                    <TabButton active={tab === 'story'} onClick={() => setTab('story')} icon={<BookOpen size={18} />} label="Story" />
                    <TabButton active={tab === 'draw'} onClick={() => setTab('draw')} icon={<Pencil size={18} />} label="Draw" />
                    <TabButton active={tab === 'video'} onClick={() => setTab('video')} icon={<Video size={18} />} label="Video" />
                </div>

                <button 
                    onClick={() => navigateLetter('next')}
                    className="p-3 rounded-full hover:bg-indigo-50 text-indigo-400 hover:text-indigo-600 transition active:scale-90"
                >
                    <ArrowRight size={24} />
                </button>
            </div>
          </div>
      )}
    </div>
  );
}
