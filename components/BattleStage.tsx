
import React, { useState, useEffect } from 'react';
import { ShieldAlert, Zap, Skull, ArrowRight, User, Swords, Layers, Shuffle, Target, UserPlus, Disc, Loader2, ArrowDown } from 'lucide-react';
import { Team, ChanceCard, GamePhase, MetalType, Language, GameMode } from '../types';
import { TrilingualText } from './Visuals';
import { WiringStage } from './WiringStage';
import { playGameSound } from '../utils';

interface BattleStageProps {
  phase: string;
  activeTeam: Team;
  opponentTeam: Team;
  onDrawCards: () => void; // Trigger animation end
  onPlayCard: (card: ChanceCard, targetData?: any) => void;
  onSkip: () => void;
  language: Language;
  gameMode?: GameMode;
  onCoinTossComplete?: (winnerIndex: number) => void; // New prop for spinner
  teams?: Team[]; // To display names in spinner
  themeColor: 'blue' | 'purple';
}

export const BattleStage: React.FC<BattleStageProps> = ({ 
  phase, 
  activeTeam, 
  opponentTeam, 
  onDrawCards, 
  onPlayCard, 
  onSkip,
  language,
  gameMode,
  onCoinTossComplete,
  teams,
  themeColor
}) => {
  const [selectedCard, setSelectedCard] = useState<ChanceCard | null>(null);
  const [showZeroVoltageWarning, setShowZeroVoltageWarning] = useState(false);
  const [pendingActionData, setPendingActionData] = useState<any>(null);
  
  // Coin Toss State
  const [isSpinning, setIsSpinning] = useState(false);
  const [spinWinner, setSpinWinner] = useState<number | null>(null);
  
  // New state for Flexible Phase Target Switching
  const [targetScope, setTargetScope] = useState<'SELF' | 'OPPONENT'>('OPPONENT');

  const isJointDraw = phase === GamePhase.JOINT_DRAW_ANIMATION;
  const isCoinToss = phase === GamePhase.COIN_TOSS;
  
  // Phase Logic
  const isAction1 = phase === GamePhase.A_ACTION_1 || phase === GamePhase.B_ACTION_1; // Mandatory Attack
  const isAction2 = phase === GamePhase.A_ACTION_2 || phase === GamePhase.B_ACTION_2; // Mandatory Self Buff
  const isAction3 = phase === GamePhase.A_ACTION_3 || phase === GamePhase.B_ACTION_3; // Optional Flexible

  // Theme Classes
  const themeClasses = {
      text: themeColor === 'blue' ? 'text-neon-blue' : 'text-neon-purple',
      border: themeColor === 'blue' ? 'border-neon-blue' : 'border-neon-purple',
      bgSoft: themeColor === 'blue' ? 'bg-blue-900/40' : 'bg-purple-900/40',
      iconColor: themeColor === 'blue' ? 'text-neon-blue' : 'text-neon-purple'
  };

  // Effect to lock target scope based on phase rules
  useEffect(() => {
      if (isAction1) setTargetScope('OPPONENT');
      if (isAction2) setTargetScope('SELF');
      // For Action 3, default to Opponent but allow change, so we don't force reset on every render if user changed it
      if (isAction3 && !selectedCard) setTargetScope('OPPONENT'); 
  }, [phase, isAction1, isAction2, isAction3]);

  // Determine which board to show based on scope
  const targetTeam = targetScope === 'OPPONENT' ? opponentTeam : activeTeam;

  const handleCardSelect = (card: ChanceCard) => {
      playGameSound('click');
      setSelectedCard(card);
  };

  const handleSabotageAction = (actionData: any) => {
      if (!selectedCard) return;
      playGameSound('click');
      setPendingActionData({ ...actionData, targetScope }); // Include scope in data passed up
      setShowZeroVoltageWarning(true);
  };

  const confirmAction = () => {
      if (selectedCard && pendingActionData) {
          playGameSound('attack');
          onPlayCard(selectedCard, pendingActionData);
          setSelectedCard(null);
          setShowZeroVoltageWarning(false);
          setPendingActionData(null);
      }
  };

  const startSpin = () => {
      if (isSpinning || spinWinner !== null) return;
      playGameSound('click');
      setIsSpinning(true);
      
      // Random winner: 0 or 1
      const winner = Math.random() > 0.5 ? 1 : 0;
      
      // Fake spin duration
      setTimeout(() => {
          setIsSpinning(false);
          setSpinWinner(winner);
          
          // Delay before proceeding to let user see result
          setTimeout(() => {
              if (onCoinTossComplete) onCoinTossComplete(winner);
          }, 2000);
      }, 3000);
  };

  // --- JOINT DRAW ANIMATION SCREEN ---
  if (isJointDraw) {
      return (
          <div className="text-center py-24 animate-fade-in flex flex-col items-center">
              <h2 className="text-5xl font-bold text-white mb-12">
                  <TrilingualText content={{zh: "雙方同步抽牌 (3張)", en: "Joint Card Draw (3 Cards)", ja: "両チーム同時ドロー (3枚)"}} language={language} size="xl" />
              </h2>
              
              <div className="relative group cursor-pointer" onClick={onDrawCards}>
                   {/* Deck Graphic - Double Size/Stacked */}
                   <div className="flex gap-8 justify-center">
                       {/* Left Pile */}
                       <div className="w-60 h-96 bg-gradient-to-br from-purple-900 to-indigo-900 rounded-3xl border-8 border-neon-blue shadow-[0_0_50px_rgba(0,243,255,0.3)] flex items-center justify-center transform -rotate-6">
                           <Layers size={96} className="text-white opacity-50" />
                       </div>
                       {/* Right Pile */}
                       <div className="w-60 h-96 bg-gradient-to-br from-indigo-900 to-purple-900 rounded-3xl border-8 border-neon-purple shadow-[0_0_50px_rgba(188,19,254,0.3)] flex items-center justify-center transform rotate-6">
                           <Layers size={96} className="text-white opacity-50" />
                       </div>
                   </div>
                   
                   <div className="mt-16 px-12 py-6 bg-neon-blue text-black font-bold rounded-full animate-pulse mx-auto w-fit cursor-pointer hover:scale-105 transition active:scale-95 text-2xl shadow-xl">
                       <TrilingualText content={{zh: "點擊發牌", en: "CLICK TO DEAL", ja: "クリックして配る"}} language={language} />
                   </div>
              </div>
          </div>
      );
  }

  // --- COIN TOSS SCREEN ---
  if (isCoinToss && teams) {
      return (
          <div className="text-center py-24 animate-fade-in flex flex-col items-center">
              <h2 className="text-5xl font-bold text-white mb-8">
                  <TrilingualText content={{zh: "決定先後攻擊順序", en: "Deciding Attack Order", ja: "攻撃順を決定"}} language={language} size="xl" />
              </h2>
              <p className="text-gray-400 text-xl mb-12">
                  <TrilingualText content={{zh: "轉盤贏家將在戰鬥階段先攻！", en: "Spinner winner attacks first in Battle Phase!", ja: "ルーレットの勝者がバトルフェーズで先攻します！"}} language={language} />
              </p>

              <div className="relative w-80 h-80 flex items-center justify-center">
                  {/* Spinner Circle */}
                  <div className={`w-full h-full rounded-full border-8 border-gray-700 bg-gray-900 relative overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)] ${isSpinning ? 'animate-spin' : ''}`} style={{ animationDuration: '0.5s' }}>
                      {/* Divider */}
                      <div className="absolute inset-0 bg-gradient-to-b from-neon-blue via-transparent to-neon-purple opacity-20"></div>
                      <div className="absolute top-0 bottom-0 left-1/2 w-1 bg-gray-600 -translate-x-1/2"></div>
                      <div className="absolute left-0 right-0 top-1/2 h-1 bg-gray-600 -translate-y-1/2"></div>
                      
                      {/* Icons representing teams */}
                      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 text-neon-blue font-bold text-2xl">{teams[0].name.substring(0,2)}</div>
                      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 text-neon-purple font-bold text-2xl">{teams[1].name.substring(0,2)}</div>
                  </div>

                  {/* Arrow Indicator */}
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-white z-20 drop-shadow-lg">
                      <ArrowDown size={48} fill="white" />
                  </div>

                  {/* Result Overlay */}
                  {!isSpinning && spinWinner !== null && (
                      <div className="absolute inset-0 flex items-center justify-center z-30 bg-black/60 rounded-full backdrop-blur-sm animate-bounce-in">
                          <div className="text-center">
                               <div className="text-yellow-400 font-bold text-lg mb-2"><TrilingualText content={{zh: "先攻", en: "FIRST", ja: "先攻"}} language={language} /></div>
                               <div className={`text-4xl font-black ${spinWinner === 0 ? 'text-neon-blue' : 'text-neon-purple'}`}>
                                   {teams[spinWinner].name}
                               </div>
                          </div>
                      </div>
                  )}
              </div>

              {!isSpinning && spinWinner === null && (
                   <button 
                        onClick={startSpin}
                        className="mt-16 px-12 py-6 bg-yellow-500 text-black font-bold rounded-full animate-pulse hover:scale-105 transition active:scale-95 text-2xl shadow-xl flex items-center gap-3"
                   >
                       <Disc size={28} className="animate-spin-slow" />
                       <TrilingualText content={{zh: "啟動轉盤", en: "SPIN", ja: "スピン"}} language={language} />
                   </button>
              )}

              {isSpinning && (
                  <div className="mt-16 text-2xl text-yellow-400 font-bold flex items-center gap-3">
                      <Loader2 className="animate-spin" size={32} />
                      <TrilingualText content={{zh: "命運輪轉中...", en: "Spinning...", ja: "回転中..."}} language={language} />
                  </div>
              )}
          </div>
      );
  }

  // Helper text for instruction
  const getActionInstruction = (card: ChanceCard) => {
      if (card.effectType === 'REVERSE_POLARITY') {
          return {
              zh: `目標：${targetTeam.name} - 請點擊整個電池進行反轉`, 
              en: `Target: ${targetTeam.name} - Click Battery to Reverse Polarity`, 
              ja: `ターゲット: ${targetTeam.name} - 極性を反転させる電池をクリック`
          };
      }
      return {
          zh: `目標：${targetTeam.name} - 請點擊電極進行更換`, 
          en: `Target: ${targetTeam.name} - Click electrode to replace`, 
          ja: `ターゲット: ${targetTeam.name} - 電極をクリックして交換`
      };
  };

  // --- ACTION SCREEN ---
  return (
    <div className="w-full mx-auto space-y-8 animate-fade-in relative">
        {/* Warning Modal */}
        {showZeroVoltageWarning && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                <div className="bg-gray-900 border-4 border-red-500 rounded-3xl p-12 max-w-2xl text-center shadow-2xl">
                    <Skull size={96} className="mx-auto text-red-500 mb-6 animate-pulse" />
                    <h3 className="text-4xl font-bold text-white mb-4">
                        <TrilingualText content={{zh: "確認執行操作？", en: "Confirm Action?", ja: "アクションを確認"}} language={language} size="xl" />
                    </h3>
                    <p className="text-gray-300 mb-10 text-xl">
                        <TrilingualText content={{
                            zh: `您確定要將 ${selectedCard?.title[language] || selectedCard?.title.en} 使用在 ${targetTeam.name} 身上嗎？`, 
                            en: `Use ${selectedCard?.title.en} on ${targetTeam.name}?`, 
                            ja: `${targetTeam.name} に ${selectedCard?.title.ja || selectedCard?.title.en} を使用しますか？`
                        }} language={language} size="lg" />
                    </p>
                    <div className="flex gap-8 justify-center">
                        <button onClick={() => { playGameSound('click'); setShowZeroVoltageWarning(false); }} className="px-10 py-5 rounded-xl bg-gray-700 hover:bg-gray-600 text-white font-bold active:scale-95 transition-transform text-xl">
                            <TrilingualText content={{zh: "取消", en: "CANCEL", ja: "キャンセル"}} language={language} />
                        </button>
                        <button onClick={confirmAction} className="px-10 py-5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold active:scale-95 transition-transform text-xl">
                            <TrilingualText content={{zh: "執行", en: "EXECUTE", ja: "実行"}} language={language} />
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* Header */}
        <div className="text-center mb-8">
            <h2 className="text-5xl font-bold text-white flex justify-center items-center gap-4">
                {isAction1 && <Swords className="text-red-500 w-12 h-12" />}
                {isAction2 && <ShieldAlert className="text-green-500 w-12 h-12" />}
                {isAction3 && <Target className="text-yellow-500 w-12 h-12" />}
                
                {isAction1 && <TrilingualText content={{zh: "階段一：強制攻擊", en: "Stage 1: Mandatory Attack", ja: "ステージ1：強制攻撃"}} language={language} size="xl" />}
                {isAction2 && <TrilingualText content={{zh: "階段二：自我強化", en: "Stage 2: Self Buff", ja: "ステージ2：自己強化"}} language={language} size="xl" />}
                {isAction3 && <TrilingualText content={{zh: "階段三：自由戰略", en: "Stage 3: Flexible Strategy", ja: "ステージ3：自由戦略"}} language={language} size="xl" />}
            </h2>
            <div className="text-gray-400 mt-4 text-xl">
                {isAction1 && <TrilingualText content={{zh: "必須選擇一張牌使用在對手身上。", en: "You MUST use a card on the OPPONENT.", ja: "対戦相手にカードを使用しなければなりません。"}} language={language} size="lg" />}
                {isAction2 && <TrilingualText content={{zh: "必須選擇一張牌使用在自己身上。", en: "You MUST use a card on YOURSELF.", ja: "自分自身にカードを使用しなければなりません。"}} language={language} size="lg" />}
                {isAction3 && <TrilingualText content={{zh: "選擇攻擊對手、強化自己，或跳過。", en: "Target Opponent, Self, or Skip.", ja: "対戦相手を攻撃、自分を強化、またはスキップを選択してください。"}} language={language} size="lg" />}
            </div>
        </div>

        {/* Flexible Phase Target Toggle */}
        {isAction3 && !selectedCard && (
            <div className="flex justify-center mb-8">
                <div className="bg-gray-900 p-2 rounded-2xl flex border-2 border-gray-700">
                    <button 
                        onClick={() => { playGameSound('click'); setTargetScope('OPPONENT'); }}
                        className={`px-8 py-4 rounded-xl flex items-center gap-3 transition-all text-lg ${targetScope === 'OPPONENT' ? 'bg-red-600 text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}
                    >
                        <Swords size={24} /> <span className="font-bold"><TrilingualText content={{zh: "目標：對手", en: "Target Opponent", ja: "ターゲット：相手"}} language={language} /></span>
                    </button>
                    <button 
                        onClick={() => { playGameSound('click'); setTargetScope('SELF'); }}
                        className={`px-8 py-4 rounded-xl flex items-center gap-3 transition-all text-lg ${targetScope === 'SELF' ? 'bg-green-600 text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}
                    >
                        <UserPlus size={24} /> <span className="font-bold"><TrilingualText content={{zh: "目標：自己", en: "Target Self", ja: "ターゲット：自分"}} language={language} /></span>
                    </button>
                </div>
            </div>
        )}

        {/* Card Selection */}
        <div className={`glass-panel p-10 rounded-3xl mb-10 min-h-[300px] flex flex-col justify-center`}>
             <div className="flex flex-wrap gap-8 justify-center">
                {activeTeam.chanceHand.length === 0 ? (
                    <div className="text-gray-500 italic flex items-center gap-3 text-2xl">
                        <Layers size={32} /> <TrilingualText content={{zh: "無可用卡牌", en: "No cards remaining", ja: "カードなし"}} language={language} />
                    </div>
                ) : (
                    activeTeam.chanceHand.map(card => {
                        const isSelected = selectedCard?.id === card.id;
                        
                        return (
                            <div 
                                key={card.id}
                                onClick={() => handleCardSelect(card)}
                                className={`w-80 p-8 rounded-2xl border-4 transition-all duration-200 cursor-pointer hover:-translate-y-2 active:scale-95 active:translate-y-0 ${
                                    isSelected
                                    ? `${themeClasses.border} ${themeClasses.bgSoft} shadow-xl scale-105` 
                                    : 'border-gray-600 bg-gray-900 hover:border-gray-400'
                                }`}
                            >
                                <div className="flex justify-between items-center mb-6 border-b border-gray-700/50 pb-4">
                                    <div className="flex items-center gap-3">
                                        <Shuffle size={24} className={themeClasses.iconColor} />
                                        <span className={`text-sm font-bold uppercase ${themeClasses.text}`}>ELEMENT</span>
                                    </div>
                                </div>
                                <TrilingualText content={card.title} className="text-white font-bold mb-4" size="lg" language={language} />
                                <TrilingualText content={card.description} className="text-gray-500" size="md" language={language} />
                            </div>
                        );
                    })
                )}
                
                {isAction3 && (
                     <button 
                        onClick={onSkip}
                        className="w-48 p-4 rounded-2xl border-4 border-dashed border-gray-600 text-gray-500 hover:text-white hover:border-white flex flex-col items-center justify-center transition-all duration-200 ml-4 hover:-translate-y-1 active:scale-95 active:translate-y-0"
                    >
                        <ArrowRight size={48} className="mb-4" />
                        <TrilingualText content={{zh: "跳過", en: "SKIP", ja: "スキップ"}} language={language} size="lg" />
                    </button>
                )}
             </div>
        </div>

        {/* Interactive Board Area */}
        {selectedCard ? (
            <div className="animate-slide-up border-t-2 border-gray-700 pt-8">
                <div className={`p-6 mb-8 text-center text-white rounded-2xl flex items-center justify-center gap-4 ${targetScope === 'OPPONENT' ? 'bg-red-900/20 border-2 border-red-500/50' : 'bg-green-900/20 border-2 border-green-500/50'}`}>
                    <Zap size={32} className={targetScope === 'OPPONENT' ? 'text-red-400' : 'text-green-400'} />
                    <TrilingualText 
                        content={getActionInstruction(selectedCard)}
                        size="lg" 
                        className="font-bold"
                        language={language}
                    />
                </div>
                
                {/* Change Selection Button (Only for Phase 3 if user wants to swap target) */}
                {isAction3 && (
                    <div className="flex justify-center mb-6">
                        <button onClick={() => { playGameSound('click'); setSelectedCard(null); }} className="text-lg text-gray-400 hover:text-white underline">
                            <TrilingualText content={{zh: "取消選擇並更改策略", en: "Cancel Selection & Change Strategy", ja: "選択をキャンセルして戦略を変更"}} language={language} />
                        </button>
                    </div>
                )}
                
                {/* Board Render - Auto-renders the correct target based on phase */}
                <div className="scale-100">
                    <WiringStage 
                        team={targetTeam} 
                        onUpdate={() => {}} // Read-only physics
                        onConfirm={() => {}} 
                        isSabotageMode={true}
                        sabotageType={selectedCard.effectType}
                        sabotagePayload={selectedCard.metalPayload}
                        onSabotageAction={handleSabotageAction}
                        hideVoltage={true} // FORCE HIDE VOLTAGE DURING ACTION
                        language={language}
                        gameMode={gameMode} // Pass gameMode here
                        themeColor={themeColor} // Pass theme down
                    />
                </div>
            </div>
        ) : (
            <div className="h-80 flex items-center justify-center border-4 border-dashed border-gray-800 rounded-3xl text-gray-600 bg-black/20">
                <TrilingualText content={{zh: "請選擇一張卡片", en: "Please select a card", ja: "カードを選択してください"}} size="xl" language={language} />
            </div>
        )}
    </div>
  );
};