
import React, { useState, useEffect } from 'react';
import { Zap, GraduationCap, Swords, ChevronRight, Atom, Globe2 } from 'lucide-react';
import { TrilingualText } from './Visuals';
import { GameMode, Language } from '../types';
import { playGameSound } from '../utils';

interface WelcomeScreenProps {
    onStart: (mode: GameMode, name1: string, name2: string) => void;
    language: Language;
    setLanguage: (lang: Language) => void;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onStart, language, setLanguage }) => {
    const [name1, setName1] = useState('');
    const [name2, setName2] = useState('');
    const [step, setStep] = useState<'MODE' | 'NAMES'>('MODE');
    const [selectedMode, setSelectedMode] = useState<GameMode | null>(null);

    // Placeholder names generator
    const generatePlaceholder = (teamNum: 1 | 2) => {
        if (language === 'zh') return teamNum === 1 ? "正極戰隊" : "負極戰隊";
        if (language === 'ja') return teamNum === 1 ? "チーム陽極" : "チーム陰極";
        return teamNum === 1 ? "Anode Squad" : "Cathode Crew";
    };

    const handleModeSelect = (mode: GameMode) => {
        playGameSound('click');
        setSelectedMode(mode);
        setStep('NAMES');
    };

    const handleStartGame = () => {
        if (!name1 && !name2) {
             // Shake animation or alert could go here
        }
        playGameSound('victory');
        // Use defaults if empty
        const finalName1 = name1.trim() || generatePlaceholder(1);
        const finalName2 = name2.trim() || generatePlaceholder(2);
        onStart(selectedMode!, finalName1, finalName2);
    };

    return (
        <div className="relative w-full min-h-screen flex flex-col items-center justify-center overflow-hidden bg-dark-bg text-white selection:bg-neon-blue selection:text-black">
            
            {/* --- Animated Background Elements --- */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                {/* Grid */}
                <div className="absolute inset-0 bg-[linear-gradient(rgba(0,243,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,243,255,0.03)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,black_40%,transparent_100%)]"></div>
                
                {/* Glowing Orbs */}
                <div className="absolute top-[-10%] left-[-10%] w-[40vw] h-[40vw] bg-blue-900/20 rounded-full blur-[100px] animate-pulse"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[40vw] h-[40vw] bg-purple-900/20 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '1s' }}></div>

                {/* Atom Animation (CSS) */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-20 scale-[2] md:scale-100">
                    <div className="relative w-96 h-96">
                        {/* Nucleus */}
                        <div className="absolute top-1/2 left-1/2 w-8 h-8 bg-white rounded-full -translate-x-1/2 -translate-y-1/2 shadow-[0_0_20px_white]"></div>
                        
                        {/* Orbit 1 */}
                        <div className="absolute top-0 left-0 w-full h-full border border-cyan-400/30 rounded-full animate-[spin_4s_linear_infinite]">
                            <div className="absolute top-1/2 -right-2 w-4 h-4 bg-cyan-400 rounded-full shadow-[0_0_10px_#00f3ff]"></div>
                        </div>
                        {/* Orbit 2 */}
                        <div className="absolute top-4 left-4 right-4 bottom-4 border border-purple-400/30 rounded-full animate-[spin_6s_linear_infinite_reverse]">
                            <div className="absolute top-1/2 -left-2 w-4 h-4 bg-purple-400 rounded-full shadow-[0_0_10px_#bc13fe]"></div>
                        </div>
                        {/* Orbit 3 */}
                        <div className="absolute top-8 left-8 right-8 bottom-8 border border-green-400/30 rounded-full animate-[spin_10s_linear_infinite]">
                             <div className="absolute -top-2 left-1/2 w-4 h-4 bg-green-400 rounded-full shadow-[0_0_10px_#0aff00]"></div>
                        </div>
                    </div>
                </div>
            </div>

            {/* --- Main Content --- */}
            <div className="relative z-10 w-full max-w-5xl px-4 flex flex-col items-center">
                
                {/* Title Section */}
                <div className="text-center mb-12 animate-fade-in">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-gray-700 bg-gray-900/50 backdrop-blur-md mb-6">
                        <Zap size={16} className="text-neon-blue" />
                        <span className="text-xs font-bold tracking-[0.2em] text-gray-400 uppercase">Interactive Electrochemical Battle</span>
                    </div>
                    <h1 className="text-6xl md:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-br from-white via-blue-100 to-gray-500 font-display tracking-tighter drop-shadow-2xl mb-4">
                        VOLTAGE WARS
                    </h1>
                    <p className="text-gray-400 text-lg md:text-xl font-light tracking-wide max-w-2xl mx-auto">
                        <TrilingualText 
                            content={{
                                zh: "掌握氧化還原反應，構建最強電池，擊敗對手。",
                                en: "Master redox reactions. Build the strongest cell. Crush the competition.",
                                ja: "酸化還元反応をマスターし、最強の電池を構築して、競争相手を打ち負かそう。"
                            }} 
                            language={language}
                        />
                    </p>
                </div>

                {/* Step 1: Mode Selection */}
                {step === 'MODE' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl animate-slide-up">
                        {/* Training Mode */}
                        <button 
                            onClick={() => handleModeSelect(GameMode.PRACTICE)}
                            className="group relative bg-gray-900/40 border border-gray-700 hover:border-green-500 hover:bg-green-900/10 p-8 rounded-3xl transition-all duration-300 text-left hover:-translate-y-2 hover:shadow-[0_0_30px_rgba(10,255,0,0.15)]"
                        >
                            <div className="mb-6 w-14 h-14 rounded-2xl bg-gray-800 group-hover:bg-green-500/20 flex items-center justify-center transition-colors">
                                <GraduationCap size={32} className="text-gray-400 group-hover:text-green-400 transition-colors" />
                            </div>
                            <h3 className="text-3xl font-bold text-white mb-2 font-display">
                                <TrilingualText content={{zh: "訓練模式", en: "TRAINING", ja: "トレーニング"}} language={language} />
                            </h3>
                            <p className="text-gray-500 group-hover:text-gray-300 transition-colors leading-relaxed">
                                <TrilingualText content={{zh: "包含完整教學手冊與日誌，適合初學者練習。", en: "Includes full manual and logs. Perfect for beginners.", ja: "完全なマニュアルとログが含まれています。初心者に最適です。"}} language={language} />
                            </p>
                        </button>

                        {/* Ranked Mode */}
                        <button 
                            onClick={() => handleModeSelect(GameMode.COMPETITIVE)}
                            className="group relative bg-gray-900/40 border border-gray-700 hover:border-neon-purple hover:bg-purple-900/10 p-8 rounded-3xl transition-all duration-300 text-left hover:-translate-y-2 hover:shadow-[0_0_30px_rgba(188,19,254,0.15)]"
                        >
                             <div className="absolute top-4 right-4 bg-neon-purple/20 text-neon-purple text-xs font-bold px-3 py-1 rounded-full border border-neon-purple/30">
                                BEST OF 3
                             </div>
                            <div className="mb-6 w-14 h-14 rounded-2xl bg-gray-800 group-hover:bg-neon-purple/20 flex items-center justify-center transition-colors">
                                <Swords size={32} className="text-gray-400 group-hover:text-neon-purple transition-colors" />
                            </div>
                            <h3 className="text-3xl font-bold text-white mb-2 font-display">
                                <TrilingualText content={{zh: "排名對戰", en: "RANKED", ja: "ランク戦"}} language={language} />
                            </h3>
                            <p className="text-gray-500 group-hover:text-gray-300 transition-colors leading-relaxed">
                                <TrilingualText content={{zh: "三戰兩勝制。無情的電壓對決，只有勝者為王。", en: "Best of 3 series. Ruthless voltage battles. Winner takes all.", ja: "3本勝負。容赦ない電圧の戦い。勝者総取り。"}} language={language} />
                            </p>
                        </button>
                    </div>
                )}

                {/* Step 2: Name Setup */}
                {step === 'NAMES' && (
                    <div className="w-full max-w-2xl bg-gray-900/60 backdrop-blur-xl border border-gray-600 p-8 md:p-12 rounded-[2rem] shadow-2xl animate-fade-in">
                         <div className="text-center mb-8">
                            <h2 className="text-2xl font-bold text-white mb-2">
                                <TrilingualText content={{zh: "隊伍登記", en: "TEAM REGISTRATION", ja: "チーム登録"}} language={language} />
                            </h2>
                            <p className="text-gray-400 text-sm">
                                <TrilingualText content={{zh: "請輸入雙方隊伍名稱以開始", en: "Enter names to initialize battle sequence", ja: "バトルシーケンスを開始するには名前を入力してください"}} language={language} />
                            </p>
                         </div>

                         <div className="space-y-6">
                             <div className="group">
                                 <label className="block text-neon-blue text-xs font-bold uppercase tracking-widest mb-2 ml-1">Team Alpha</label>
                                 <input 
                                    type="text" 
                                    value={name1}
                                    onChange={(e) => setName1(e.target.value)}
                                    placeholder={generatePlaceholder(1)}
                                    className="w-full bg-black/40 border-2 border-gray-700 rounded-xl px-5 py-4 text-xl text-white placeholder-gray-600 focus:border-neon-blue focus:shadow-[0_0_15px_rgba(0,243,255,0.2)] outline-none transition-all"
                                 />
                             </div>
                             
                             <div className="flex justify-center items-center text-gray-500 font-display font-black text-2xl italic">VS</div>

                             <div className="group">
                                 <label className="block text-neon-purple text-xs font-bold uppercase tracking-widest mb-2 ml-1">Team Beta</label>
                                 <input 
                                    type="text" 
                                    value={name2}
                                    onChange={(e) => setName2(e.target.value)}
                                    placeholder={generatePlaceholder(2)}
                                    className="w-full bg-black/40 border-2 border-gray-700 rounded-xl px-5 py-4 text-xl text-white placeholder-gray-600 focus:border-neon-purple focus:shadow-[0_0_15px_rgba(188,19,254,0.2)] outline-none transition-all"
                                 />
                             </div>
                         </div>

                         <div className="flex gap-4 mt-10">
                             <button 
                                onClick={() => { playGameSound('click'); setStep('MODE'); }}
                                className="flex-1 py-4 rounded-xl border border-gray-600 text-gray-400 font-bold hover:bg-gray-800 transition"
                             >
                                <TrilingualText content={{zh: "返回", en: "BACK", ja: "戻る"}} language={language} />
                             </button>
                             <button 
                                onClick={handleStartGame}
                                className="flex-[2] py-4 rounded-xl bg-white text-black font-black text-xl hover:bg-cyan-300 hover:scale-[1.02] active:scale-95 transition-all shadow-lg flex items-center justify-center gap-2"
                             >
                                <TrilingualText content={{zh: "啟動引擎", en: "ENGAGE", ja: "エンジン始動"}} language={language} />
                                <ChevronRight size={24} />
                             </button>
                         </div>
                    </div>
                )}

                {/* Footer Controls */}
                <div className="mt-16 flex gap-4 animate-fade-in delay-500">
                    <button 
                        onClick={() => {
                            playGameSound('click');
                            const langs: Language[] = ['zh', 'en', 'ja'];
                            const next = langs[(langs.indexOf(language) + 1) % langs.length];
                            setLanguage(next);
                        }}
                        className="flex items-center gap-2 px-4 py-2 rounded-full border border-gray-800 bg-black/30 text-gray-400 hover:text-white hover:border-gray-600 transition text-sm"
                    >
                        <Globe2 size={14} />
                        <span className="uppercase font-bold">{language}</span>
                    </button>
                    
                    <a href="https://github.com" target="_blank" rel="noreferrer" className="flex items-center gap-2 px-4 py-2 rounded-full border border-gray-800 bg-black/30 text-gray-400 hover:text-white hover:border-gray-600 transition text-sm">
                        <Atom size={14} />
                        <span className="font-bold">v2.0.0</span>
                    </a>
                </div>
            </div>
        </div>
    );
};
