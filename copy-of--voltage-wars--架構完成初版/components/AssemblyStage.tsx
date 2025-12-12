
import React, { useState, useEffect } from 'react';
import { Shuffle, ArrowRight, Zap, Play, Hand } from 'lucide-react';
import { MetalType, Team, CellConfig, METAL_POTENTIALS, Language } from '../types';
import { drawRandomHand, playGameSound } from '../utils';
import { HalfCellBeaker, TrilingualText, getLocalizedText, SaltBridge } from './Visuals';

interface AssemblyStageProps {
  teamName: string;
  isDrawPhase: boolean;
  existingTeamData?: Team;
  onComplete: (hand: MetalType[], cell1: CellConfig, cell2: CellConfig) => void;
  onUpdate?: (hand: MetalType[], cell1: CellConfig, cell2: CellConfig) => void;
  language: Language;
  themeColor: 'blue' | 'purple';
}

export const AssemblyStage: React.FC<AssemblyStageProps> = ({ 
  teamName, 
  isDrawPhase, 
  existingTeamData,
  onComplete,
  onUpdate,
  language,
  themeColor
}) => {
  // State for Assemble Phase
  const [hand, setHand] = useState<MetalType[]>(existingTeamData?.hand || []);
  const [slots, setSlots] = useState<{
    c1L: MetalType | null;
    c1R: MetalType | null;
    c2L: MetalType | null;
    c2R: MetalType | null;
  }>({
    c1L: existingTeamData?.cell1.metalL || null,
    c1R: existingTeamData?.cell1.metalR || null,
    c2L: existingTeamData?.cell2.metalL || null,
    c2R: existingTeamData?.cell2.metalR || null,
  });

  // Touch Logic State
  const [selectedHandIndex, setSelectedHandIndex] = useState<number | null>(null);

  // Report state changes
  useEffect(() => {
      if (onUpdate) {
        const c1: CellConfig = {
            id: 1,
            metalL: slots.c1L,
            metalR: slots.c1R,
            voltage: 0, 
            polarityL: 'neutral',
            isFlipped: existingTeamData?.cell1.isFlipped
        };
        const c2: CellConfig = {
            id: 2,
            metalL: slots.c2L,
            metalR: slots.c2R,
            voltage: 0,
            polarityL: 'neutral',
            isFlipped: existingTeamData?.cell2.isFlipped
        };
        onUpdate(hand, c1, c2);
      }
  }, [hand, slots, onUpdate, existingTeamData]);

  // State for Draw Phase Animation
  const [drawingState, setDrawingState] = useState<'IDLE' | 'REVEALING' | 'CONFIRM'>('IDLE');
  const [revealedCount, setRevealedCount] = useState(0);

  const handleStartDraw = () => {
    playGameSound('draw');
    const newHand = drawRandomHand(6);
    setHand(newHand);
    setDrawingState('REVEALING');
    setRevealedCount(0);
  };

  useEffect(() => {
    if (drawingState === 'REVEALING') {
        if (revealedCount < 6) {
            const timer = setTimeout(() => {
                setRevealedCount(prev => prev + 1);
            }, 500);
            return () => clearTimeout(timer);
        } else {
            setDrawingState('CONFIRM');
        }
    }
  }, [drawingState, revealedCount]);

  const handleConfirmDraw = () => {
    playGameSound('click');
    onComplete(hand, { id: 1, metalL: null, metalR: null, voltage: 0, polarityL: 'neutral' }, { id: 2, metalL: null, metalR: null, voltage: 0, polarityL: 'neutral' });
  };

  // --- TOUCH / CLICK LOGIC ---

  const handleHandCardTap = (index: number) => {
      if (isDrawPhase) return;
      playGameSound('click');
      if (selectedHandIndex === index) {
          setSelectedHandIndex(null); // Deselect
      } else {
          setSelectedHandIndex(index); // Select
      }
  };

  const handleSlotTap = (key: keyof typeof slots) => {
      if (isDrawPhase) return;

      // Logic 1: Moving from Hand to Slot
      if (selectedHandIndex !== null) {
          playGameSound('place');
          const metal = hand[selectedHandIndex];
          const newHand = [...hand];
          const newSlots = { ...slots };
          
          // Check if slot occupied, swap back to hand
          if (newSlots[key]) {
              newHand[selectedHandIndex] = newSlots[key]!;
          } else {
              newHand.splice(selectedHandIndex, 1);
          }
          newSlots[key] = metal;
          
          setSlots(newSlots);
          setHand(newHand);
          setSelectedHandIndex(null);
          return;
      }

      // Logic 2: Moving from Slot back to Hand (if nothing selected)
      if (slots[key]) {
          playGameSound('click');
          const metal = slots[key]!;
          const newSlots = { ...slots };
          newSlots[key] = null;
          setSlots(newSlots);
          setHand([...hand, metal]);
      }
  };

  const handleSubmitAssembly = () => {
    playGameSound('click');
    const c1: CellConfig = {
        id: 1,
        metalL: slots.c1L,
        metalR: slots.c1R,
        voltage: 0, 
        polarityL: 'neutral'
    };
    const c2: CellConfig = {
        id: 2,
        metalL: slots.c2L,
        metalR: slots.c2R,
        voltage: 0,
        polarityL: 'neutral'
    };
    onComplete(hand, c1, c2);
  };

  // --- RENDER HELPERS ---
  
  // Dynamic color classes based on theme
  const themeClasses = {
      text: themeColor === 'blue' ? 'text-neon-blue' : 'text-neon-purple',
      border: themeColor === 'blue' ? 'border-neon-blue' : 'border-neon-purple',
      bgSoft: themeColor === 'blue' ? 'bg-neon-blue/10' : 'bg-neon-purple/10',
      bgHover: themeColor === 'blue' ? 'hover:bg-neon-blue/20' : 'hover:bg-neon-purple/20',
      button: themeColor === 'blue' ? 'bg-neon-blue' : 'bg-neon-purple',
      buttonText: themeColor === 'blue' ? 'text-black' : 'text-white' // Purple needs white text usually
  };

  const renderCard = (metal: MetalType, idx: number, source: string, animated: boolean = false) => {
    const isSelected = selectedHandIndex === idx && source === 'hand';
    return (
        <div
            key={`${metal}-${idx}-${source}`}
            onClick={() => source === 'hand' && handleHandCardTap(idx)}
            className={`relative ${animated ? 'animate-bounce-in' : ''} ${!isDrawPhase ? 'cursor-pointer' : ''} transition-all duration-300 ${isSelected ? `-translate-y-4 shadow-[0_0_20px_rgba(255,255,255,0.5)]` : 'hover:scale-105 active:scale-95'}`}
        >
            <div className={`w-24 h-36 md:w-28 md:h-40 bg-gray-200 rounded-xl border-4 ${isSelected ? themeClasses.border : 'border-gray-400'} flex flex-col items-center justify-center shadow-lg relative overflow-hidden`}>
                <div className="absolute inset-0 opacity-20 bg-gradient-to-br from-white to-black"></div>
                <div className="text-4xl md:text-5xl font-bold text-gray-800 z-10">{metal}</div>
                <div className="text-sm md:text-base text-gray-600 font-mono mt-2 z-10 font-bold">{METAL_POTENTIALS[metal]}V</div>
            </div>
        </div>
    );
  }

  const renderSlot = (key: keyof typeof slots, label: string) => (
      <div 
        onClick={() => handleSlotTap(key)}
        className={`p-2 rounded-2xl border-2 border-dashed transition-all relative h-40 w-28 md:h-48 md:w-32 flex flex-col items-center justify-center cursor-pointer ${slots[key] ? `${themeClasses.border} ${themeClasses.bgSoft}` : 'border-gray-600 bg-black/20 hover:bg-gray-800/50'}`}
      >
          {slots[key] ? (
              <HalfCellBeaker 
                  metal={slots[key]} 
                  isEmpty={false} 
                  label={getLocalizedText({zh: label === 'Left' ? "左" : "右", en: label, ja: label === 'Left' ? "左" : "右"}, language)}
                  className="scale-90 md:scale-100"
              />
          ) : (
              <span className={`text-gray-500 text-xs md:text-sm uppercase font-bold text-center px-2 leading-tight select-none pointer-events-none`}>
                  {getLocalizedText({zh: label === 'Left' ? "左電極" : "右電極", en: `${label} Electrode`, ja: `${label === 'Left' ? "左" : "右"}電極`}, language)}
                  {selectedHandIndex !== null && <div className={`${themeClasses.text} mt-2 animate-pulse text-xs`}>{getLocalizedText({zh: "點擊放置", en: "TAP TO PLACE", ja: "タップして配置"}, language)}</div>}
              </span>
          )}
      </div>
  );

  if (isDrawPhase) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-12 animate-fade-in text-center">
            <h2 className="text-5xl font-bold text-white mb-4">
                <TrilingualText content={{zh: `${teamName}: 獲取組件`, en: `${teamName}: Draw Phase`, ja: `${teamName}: ドローフェーズ`}} language={language} size="xl" />
            </h2>
            
            {drawingState === 'IDLE' && (
                <button 
                    onClick={handleStartDraw}
                    className={`px-16 py-8 ${themeClasses.bgSoft} border-4 ${themeClasses.border} rounded-3xl ${themeClasses.bgHover} transition group`}
                >
                    <div className="flex flex-col items-center gap-4">
                        <Shuffle size={64} className={`${themeClasses.text} group-hover:rotate-180 transition duration-700`} />
                        <TrilingualText content={{zh: "啟動抽取", en: "DRAW", ja: "ドロー"}} language={language} className="text-white font-bold" size="xl" />
                    </div>
                </button>
            )}

            {(drawingState === 'REVEALING' || drawingState === 'CONFIRM') && (
                <div className="w-full max-w-[95%]">
                    <div className="flex flex-wrap justify-center gap-6 min-h-[200px]">
                        {hand.slice(0, revealedCount).map((m, i) => renderCard(m, i, 'deck', true))}
                    </div>
                    
                    <div className="mt-12 h-20">
                        {drawingState === 'CONFIRM' ? (
                             <button 
                                onClick={handleConfirmDraw}
                                className={`${themeClasses.button} ${themeClasses.buttonText} px-12 py-6 rounded-2xl font-bold text-2xl hover:scale-105 transition flex items-center gap-4 mx-auto animate-bounce-in shadow-xl`}
                            >
                                <TrilingualText content={{zh: "確認手牌", en: "CONFIRM HAND", ja: "手札を確認"}} language={language} />
                                <ArrowRight size={32} />
                            </button>
                        ) : (
                            <div className={`flex items-center justify-center gap-4 ${themeClasses.text}`}>
                                <Zap className="animate-spin" />
                                <span className="font-mono text-xl font-bold">MATERIALIZING...</span>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
      );
  }

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 animate-fade-in pb-20">
        <div className="flex justify-between items-center bg-gray-900/40 p-4 rounded-xl border border-gray-700">
            <h2 className="text-3xl font-bold text-white flex items-center gap-3">
                <TrilingualText content={{zh: `${teamName}: 組裝電池`, en: `${teamName}: Assemble`, ja: `${teamName}: 組み立て`}} language={language} size="lg" />
                <span className="text-sm font-normal text-gray-400 hidden md:inline ml-4">
                    (<TrilingualText content={{zh: "點擊卡片再點擊插槽", en: "Tap card then tap slot", ja: "カードをタップしてスロットを選択"}} language={language} />)
                </span>
            </h2>
            <button 
                onClick={handleSubmitAssembly}
                className={`${themeClasses.button} ${themeClasses.buttonText} font-bold px-8 py-4 rounded-xl hover:scale-105 transition flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg active:scale-95`}
                disabled={!slots.c1L || !slots.c1R || !slots.c2L || !slots.c2R} 
            >
                <TrilingualText content={{zh: "確認設計", en: "CONFIRM", ja: "確認"}} language={language} className="font-bold text-xl" />
                <ArrowRight size={24} />
            </button>
        </div>

        {/* Workbench Grid - Responsive for iPad */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Cell 1 */}
            <div className="bg-gray-800/50 p-6 rounded-3xl flex flex-col items-center border border-gray-700">
                <h3 className={`${themeClasses.text} font-bold mb-4 flex items-center gap-2 text-xl`}>
                    <Zap size={24} /> CELL 1
                </h3>
                <div className="flex gap-6 items-end justify-center w-full relative">
                    {/* Salt Bridge - Cell 1 */}
                    <SaltBridge label={getLocalizedText({zh: "鹽橋", en: "Salt Bridge", ja: "塩橋"}, language)} className="top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 mt-[-15px]" />

                    <div className="relative z-10">{renderSlot('c1L', 'Left')}</div>
                    <div className="relative z-10">{renderSlot('c1R', 'Right')}</div>
                </div>
            </div>

            {/* Cell 2 */}
            <div className="bg-gray-800/50 p-6 rounded-3xl flex flex-col items-center border border-gray-700">
                <h3 className={`${themeClasses.text} font-bold mb-4 flex items-center gap-2 text-xl`}>
                    <Zap size={24} /> CELL 2
                </h3>
                <div className="flex gap-6 items-end justify-center w-full relative">
                     {/* Salt Bridge - Cell 2 */}
                    <SaltBridge label={getLocalizedText({zh: "鹽橋", en: "Salt Bridge", ja: "塩橋"}, language)} className="top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 mt-[-15px]" />
                     
                    <div className="relative z-10">{renderSlot('c2L', 'Left')}</div>
                    <div className="relative z-10">{renderSlot('c2R', 'Right')}</div>
                </div>
            </div>
        </div>

        {/* Hand Area */}
        <div className="bg-black/30 p-6 rounded-3xl border-t-2 border-gray-700 mt-4">
            <h4 className="text-gray-400 mb-4 uppercase tracking-wider font-bold text-sm flex items-center gap-2">
                <Hand size={18} /> <TrilingualText content={{zh: "可用組件 (點擊選取)", en: "Components (Tap to Select)", ja: "コンポーネント (タップして選択)"}} language={language} />
            </h4>
            <div className="flex flex-wrap gap-4 justify-center min-h-[160px] items-center">
                {hand.map((m, i) => renderCard(m, i, 'hand'))}
                {hand.length === 0 && <span className="text-gray-600 italic">
                    <TrilingualText content={{zh: "手牌為空", en: "Empty Hand", ja: "手札なし"}} language={language} />
                </span>}
            </div>
        </div>
    </div>
  );
};
