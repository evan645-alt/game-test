
import React, { useState } from 'react';
import { BookOpen, X, Battery, Zap, AlertTriangle } from 'lucide-react';
import { METAL_POTENTIALS, MetalType } from '../types';
import { getMetalColor } from '../utils';

interface GameManualProps {
  onClose: () => void;
}

export const GameManual: React.FC<GameManualProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<'METALS' | 'CIRCUITS' | 'SABOTAGE'>('METALS');

  const tabs = [
    { id: 'METALS', label: '1. Materials / 基礎材料', icon: Battery },
    { id: 'CIRCUITS', label: '2. Wiring / 電路邏輯', icon: Zap },
    { id: 'SABOTAGE', label: '3. Tactics / 戰術干擾', icon: AlertTriangle },
  ];

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/90 backdrop-blur-md animate-fade-in" onClick={onClose}>
      <div className="bg-gray-900 border-2 border-neon-blue rounded-2xl w-full max-w-4xl h-[80vh] flex flex-col shadow-[0_0_50px_rgba(0,243,255,0.15)] overflow-hidden" onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-800 bg-gray-900/50">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-neon-blue/20 rounded-lg">
              <BookOpen className="text-neon-blue w-8 h-8" />
            </div>
            <div>
              <h2 className="text-3xl font-bold text-white font-display">ENGINEER MANUAL</h2>
              <p className="text-gray-400 font-mono text-sm">Training Module v1.0 // 能源工程師入職培訓</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition p-2 hover:bg-gray-800 rounded-full">
            <X size={32} />
          </button>
        </div>

        {/* Layout */}
        <div className="flex flex-1 overflow-hidden">
          
          {/* Sidebar */}
          <div className="w-64 bg-gray-950 border-r border-gray-800 p-4 space-y-2">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`w-full flex items-center gap-3 p-4 rounded-xl text-left transition-all ${
                  activeTab === tab.id 
                    ? 'bg-neon-blue text-black font-bold shadow-lg' 
                    : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                }`}
              >
                <tab.icon size={20} />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Content Area */}
          <div className="flex-1 p-8 overflow-y-auto custom-scrollbar bg-gradient-to-br from-gray-900 to-gray-800">
            
            {activeTab === 'METALS' && (
              <div className="space-y-8 animate-fade-in">
                <div className="bg-black/30 p-6 rounded-2xl border border-gray-700">
                  <h3 className="text-2xl font-bold text-neon-blue mb-4">Standard Reduction Potentials (標準還原電位)</h3>
                  <p className="text-gray-300 mb-6 leading-relaxed">
                    為了製造最強大的電池，你需要選擇<span className="text-white font-bold">電位差 (Potential Difference)</span> 最大的兩種金屬。
                    <br/>
                    <span className="text-green-400">高電位</span>適合做正極 (Cathode/紅線)。
                    <span className="text-red-400">低電位</span>適合做負極 (Anode/黑線)。
                  </p>
                  
                  <div className="grid grid-cols-1 gap-3">
                    {Object.entries(METAL_POTENTIALS)
                      .sort(([, a], [, b]) => b - a) // Sort High to Low
                      .map(([metal, voltage]) => (
                        <div key={metal} className="flex items-center gap-4 bg-gray-800 p-3 rounded-lg border border-gray-700">
                           <div className="w-12 h-12 rounded-lg flex items-center justify-center font-bold text-black shadow-inner" style={{ backgroundColor: getMetalColor(metal as MetalType) }}>
                             {metal}
                           </div>
                           <div className="flex-1">
                             <div className="flex justify-between items-center">
                               <span className="text-lg font-bold text-white">
                                  {metal === 'Ag' ? 'Silver (銀)' : 
                                   metal === 'Cu' ? 'Copper (銅)' :
                                   metal === 'Pb' ? 'Lead (鉛)' :
                                   metal === 'Fe' ? 'Iron (鐵)' :
                                   metal === 'Zn' ? 'Zinc (鋅)' : 'Magnesium (鎂)'}
                               </span>
                               <span className={`font-mono text-xl font-bold ${voltage > 0 ? 'text-green-400' : 'text-red-400'}`}>
                                 {voltage > 0 ? '+' : ''}{voltage.toFixed(2)}V
                               </span>
                             </div>
                             <div className="w-full bg-gray-900 h-2 rounded-full mt-2 overflow-hidden relative">
                               <div 
                                  className={`h-full ${voltage > 0 ? 'bg-green-500' : 'bg-red-500'}`} 
                                  style={{ width: `${Math.abs(voltage) / 2.37 * 50}%`, marginLeft: voltage > 0 ? '50%' : `${50 - (Math.abs(voltage) / 2.37 * 50)}%` }} 
                               />
                               <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-white/20"></div>
                             </div>
                           </div>
                        </div>
                    ))}
                  </div>
                </div>

                <div className="bg-blue-900/20 p-6 rounded-2xl border border-blue-500/30">
                  <h4 className="text-xl font-bold text-white mb-2">🏆 冠軍組合提示</h4>
                  <p className="text-gray-300">
                    最強組合：<span className="text-white font-bold">Ag (+0.80V)</span> 與 <span className="text-white font-bold">Mg (-2.37V)</span>
                    <br/>
                    單電池電壓：0.80 - (-2.37) = <span className="text-neon-green font-bold text-xl">3.17V</span>
                  </p>
                </div>
              </div>
            )}

            {activeTab === 'CIRCUITS' && (
              <div className="space-y-8 animate-fade-in">
                <div className="bg-black/30 p-6 rounded-2xl border border-gray-700">
                   <h3 className="text-2xl font-bold text-neon-blue mb-4">Core Formula (核心公式)</h3>
                   <div className="text-4xl font-mono text-center py-8 bg-gray-900 rounded-xl border border-gray-600 shadow-inner text-white">
                      Voltage = <span className="text-red-500">Right</span> - <span className="text-gray-500">Left</span>
                   </div>
                   <p className="text-gray-400 mt-4 text-center">
                     <span className="text-red-500 font-bold">紅色探針</span> 測量右側電位，<span className="text-gray-500 font-bold">黑色探針</span> 測量左側電位。
                     <br/>
                     如果你把低電位金屬放在右邊，結果將會是<span className="text-red-400 font-bold">負值</span>！
                   </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-gray-800 p-6 rounded-2xl border-l-4 border-green-500">
                        <h4 className="text-xl font-bold text-white mb-2">Series Connection (串聯)</h4>
                        <p className="text-gray-300 mb-4">將兩個電池首尾相連。</p>
                        <div className="font-mono text-neon-green text-lg bg-black/50 p-3 rounded">
                            V_total = V1 + V2
                        </div>
                        <p className="text-sm text-gray-400 mt-2">這是獲得最高分的唯一途徑。</p>
                    </div>
                    <div className="bg-gray-800 p-6 rounded-2xl border-l-4 border-yellow-500">
                        <h4 className="text-xl font-bold text-white mb-2">Parallel Connection (並聯)</h4>
                        <p className="text-gray-300 mb-4">將兩個電池並排連接。</p>
                        <div className="font-mono text-yellow-400 text-lg bg-black/50 p-3 rounded">
                            V_total = (V1 + V2) / 2
                        </div>
                        <p className="text-sm text-gray-400 mt-2">電壓會被平均，通常用於穩定電流，但在這場電壓戰爭中不利。</p>
                    </div>
                </div>
              </div>
            )}

            {activeTab === 'SABOTAGE' && (
              <div className="space-y-8 animate-fade-in">
                <div className="bg-red-900/10 p-6 rounded-2xl border border-red-500/50">
                   <h3 className="text-2xl font-bold text-red-400 mb-4 flex items-center gap-2">
                     <AlertTriangle /> Combat Protocol (戰鬥須知)
                   </h3>
                   <ul className="space-y-4 text-gray-300">
                      <li className="flex gap-3">
                         <div className="min-w-[8px] h-8 bg-red-500 rounded-full mt-1"></div>
                         <div>
                            <strong className="text-white block text-lg">極性反轉 (Reverse Polarity)</strong>
                            此卡片會將對手的正負極接線顛倒。原本 +3.0V 的電池會瞬間變成 -3.0V。這是逆轉勝的關鍵！
                         </div>
                      </li>
                      <li className="flex gap-3">
                         <div className="min-w-[8px] h-8 bg-blue-500 rounded-full mt-1"></div>
                         <div>
                            <strong className="text-white block text-lg">元素置換 (Element Swap)</strong>
                            將對手的高電位銀 (Ag) 換成低電位鎂 (Mg)。這不僅降低電壓，如果放在錯誤的位置，甚至會造成負電壓。
                         </div>
                      </li>
                   </ul>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
};
