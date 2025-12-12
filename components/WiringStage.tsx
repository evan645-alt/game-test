
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Trash2, Zap, EyeOff, Spline, GitCommitHorizontal } from 'lucide-react';
import { Team, Wire, Probes, SabotageType, MetalType, ConnectionType, NodeId, CIRCUIT_NODES, GameMode, Language } from '../types';
import { calculateCircuitVoltage, playGameSound } from '../utils';
import { HalfCellBeaker, TrilingualText, getLocalizedText, SaltBridge } from './Visuals';

interface WiringStageProps {
  team: Team;
  onUpdate: (wires: Wire[], probes: Probes, voltage: number, connectionType?: ConnectionType, cellUpdates?: any) => void;
  onConfirm: () => void;
  isSabotageMode?: boolean;
  sabotageType?: SabotageType;
  sabotagePayload?: MetalType;
  onSabotageAction?: (actionData: any) => void;
  hideVoltage?: boolean;
  readOnly?: boolean;
  gameMode?: GameMode;
  showFlow?: boolean;
  flowMode?: 'ELECTRON' | 'CURRENT'; // New prop
  language: Language;
  forcedVoltage?: number; 
  themeColor: 'blue' | 'purple';
}

const NODES = CIRCUIT_NODES;

const GUIDE_PATHS: Record<'series' | 'parallel', [NodeId, NodeId][]> = {
    series: [
        ['v_neg', 'c1_L'],
        ['c1_R', 'c2_L'],
        ['c2_R', 'v_pos']
    ],
    parallel: [
        ['v_neg', 'c1_L'],
        ['v_neg', 'c2_L'],
        ['c1_R', 'v_pos'],
        ['c2_R', 'v_pos']
    ]
};

// Simplified Terminal Node for Click Interaction
const TerminalNode: React.FC<{
    id: NodeId;
    x: number;
    y: number;
    color?: string;
    onClick: (e: React.MouseEvent | React.TouchEvent, id: NodeId) => void;
    label?: string;
    subLabel?: string;
    isSelected: boolean; // Is this the source node?
    isValidTarget: boolean; // Is this a valid destination?
    connections: number;
}> = ({ id, x, y, color = 'bg-gray-300', onClick, label, subLabel, isSelected, isValidTarget, connections }) => {
    
    return (
        <div
            className={`absolute z-30 group cursor-pointer`}
            style={{ left: `${x}%`, top: `${y}%`, transform: 'translate(-50%, -50%)' }}
            onClick={(e) => onClick(e, id)}
        >
            {/* Selection Halo (Source) */}
            {isSelected && (
                <div className="absolute inset-0 rounded-full bg-neon-blue/40 scale-150 pointer-events-none animate-pulse shadow-[0_0_20px_#00f3ff]"></div>
            )}

            {/* Valid Target Halo (Destination) */}
            {isValidTarget && (
                <div className="absolute inset-0 rounded-full bg-neon-green/40 animate-pulse scale-150 pointer-events-none border-2 border-neon-green border-dashed"></div>
            )}
            
            {/* Visual Node */}
            <div className={`relative w-14 h-14 md:w-16 md:h-16 rounded-full border-[6px] transition-all duration-200 z-10 touch-none flex items-center justify-center shadow-lg
                ${isSelected ? 'border-neon-blue scale-110 ring-4 ring-neon-blue ring-offset-2 ring-offset-gray-900 shadow-[0_0_15px_#00f3ff]' : ''} 
                ${isValidTarget ? 'border-neon-green scale-110 ring-4 ring-neon-green/30' : ''}
                ${!isSelected && !isValidTarget ? 'border-gray-700 hover:border-gray-500' : ''}
                ${color}
            `}>
                <div className={`w-4 h-4 rounded-full ${isValidTarget ? 'bg-neon-green animate-pulse' : 'bg-black/50'}`}></div>
            </div>
            
            {/* Connection Dots */}
            <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 flex gap-1 pointer-events-none">
                <div className={`w-2 h-2 rounded-full ${connections >= 1 ? 'bg-neon-green' : 'bg-gray-600'}`}></div>
                <div className={`w-2 h-2 rounded-full ${connections >= 2 ? 'bg-neon-green' : 'bg-gray-600'}`}></div>
            </div>

            {/* Label */}
            {label && (
                <div className={`absolute -top-12 left-1/2 -translate-x-1/2 border text-sm md:text-base font-bold text-white px-3 py-1 rounded-lg shadow-lg pointer-events-none whitespace-nowrap z-20 transition-colors
                    ${isValidTarget ? 'bg-neon-green/20 border-neon-green text-neon-green' : 'bg-gray-900/90 border-gray-600'}
                `}>
                    {label}
                </div>
            )}
        </div>
    );
};

export const WiringStage: React.FC<WiringStageProps> = ({ 
    team, 
    onUpdate, 
    onConfirm, 
    isSabotageMode = false,
    sabotageType,
    sabotagePayload,
    onSabotageAction,
    hideVoltage = false,
    readOnly = false,
    gameMode,
    showFlow = false,
    flowMode = 'ELECTRON',
    language,
    forcedVoltage,
    themeColor
}) => {
  const [wires, setWires] = useState<Wire[]>(team.wires || []);
  // Removed drawingWire, relying solely on selectedNode + cursorPos for "ghost wire"
  const [selectedNode, setSelectedNode] = useState<NodeId | null>(null); 
  const [guideMode, setGuideMode] = useState<'none' | 'series'>('none');
  const [cursorPos, setCursorPos] = useState<{x: number, y: number} | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [displayVoltage, setDisplayVoltage] = useState(team.totalVoltage);

  const isReverseMode = isSabotageMode && sabotageType === 'REVERSE_POLARITY';
  const isSwapMode = isSabotageMode && sabotageType === 'SWAP_ELECTRODE';
  
  // Theme Classes
  const themeClasses = {
      text: themeColor === 'blue' ? 'text-neon-blue' : 'text-neon-purple',
      border: themeColor === 'blue' ? 'border-neon-blue' : 'border-neon-purple',
      button: themeColor === 'blue' ? 'bg-neon-blue' : 'bg-neon-purple',
      buttonText: themeColor === 'blue' ? 'text-black' : 'text-white'
  };

  useEffect(() => {
    if (forcedVoltage !== undefined) {
        setDisplayVoltage(forcedVoltage);
        return;
    }

    if (isSabotageMode && !readOnly) return;
    const voltage = calculateCircuitVoltage(team);
    setDisplayVoltage(voltage);

    if (!readOnly && !isSabotageMode) {
        onUpdate(wires, { red: null, black: null }, voltage, ConnectionType.Custom, {});
    }
  }, [wires, team.cell1, team.cell2, isSabotageMode, readOnly, forcedVoltage, team]);

  useEffect(() => {
      setWires(team.wires || []);
  }, [team.wires]);

  // --- FLOW CALCULATION ---
  const activeFlowPath = useMemo(() => {
    if (!showFlow) return new Set<string>();
    const voltage = displayVoltage;
    if (Math.abs(voltage) < 0.01) return new Set<string>();

    let source: string;
    let sink: string;

    if (voltage > 0) {
        if (flowMode === 'ELECTRON') { source = 'v_neg'; sink = 'v_pos'; } 
        else { source = 'v_pos'; sink = 'v_neg'; }
    } else {
        if (flowMode === 'ELECTRON') { source = 'v_pos'; sink = 'v_neg'; } 
        else { source = 'v_neg'; sink = 'v_pos'; }
    }

    const adj: Record<string, string[]> = {};
    const addEdge = (u: string, v: string) => {
        if (!adj[u]) adj[u] = [];
        if (!adj[v]) adj[v] = [];
        adj[u].push(v);
        adj[v].push(u);
    };

    wires.forEach(w => addEdge(w.from, w.to));
    addEdge('c1_L', 'c1_R');
    addEdge('c2_L', 'c2_R');

    const queue: string[] = [source];
    const parent: Record<string, string> = {};
    const visited = new Set<string>([source]);
    let found = false;

    while (queue.length > 0) {
        const curr = queue.shift()!;
        if (curr === sink) { found = true; break; }
        for (const neighbor of (adj[curr] || [])) {
            if (!visited.has(neighbor)) {
                visited.add(neighbor);
                parent[neighbor] = curr;
                queue.push(neighbor);
            }
        }
    }

    const directedPath = new Set<string>();
    if (found) {
        let curr = sink;
        while (curr !== source) {
            const p = parent[curr];
            directedPath.add(`${p}->${curr}`);
            curr = p;
        }
    }
    return directedPath;
  }, [wires, displayVoltage, flowMode, showFlow]);

  const getRelativeCoords = (e: React.MouseEvent | MouseEvent | React.TouchEvent) => {
      if (!containerRef.current) return { x: 0, y: 0 };
      const rect = containerRef.current.getBoundingClientRect();
      
      let clientX, clientY;
      if ('touches' in e && e.touches.length > 0) {
           clientX = e.touches[0].clientX;
           clientY = e.touches[0].clientY;
      } else if ('changedTouches' in e && e.changedTouches.length > 0) {
           clientX = e.changedTouches[0].clientX;
           clientY = e.changedTouches[0].clientY;
      } else {
           clientX = (e as React.MouseEvent).clientX;
           clientY = (e as React.MouseEvent).clientY;
      }

      return {
          x: ((clientX - rect.left) / rect.width) * 100,
          y: ((clientY - rect.top) / rect.height) * 100
      };
  };

  const tryConnect = (from: NodeId, to: NodeId) => {
      // Self-loop check
      if (from === to) return;
      
      // Max connections check (2 per node)
      const count1 = wires.filter(w => w.from === from || w.to === from).length;
      const count2 = wires.filter(w => w.from === to || w.to === to).length;
      
      if (count1 >= 2 || count2 >= 2) return;

      // Duplicate check
      const exists = wires.some(w => 
          (w.from === from && w.to === to) ||
          (w.from === to && w.to === from)
      );
      
      if (!exists) {
          const newWire: Wire = {
              id: `w_${Date.now()}`,
              from,
              to
          };
          setWires(prev => [...prev, newWire]);
          playGameSound('wire');
      }
  };

  // Helper to determine if a node is a valid connection target from the currently selected node
  const isConnectable = (targetId: NodeId) => {
      if (!selectedNode) return false;
      if (selectedNode === targetId) return false;

      const targetCount = wires.filter(w => w.from === targetId || w.to === targetId).length;
      if (targetCount >= 2) return false;

      const exists = wires.some(w => 
          (w.from === selectedNode && w.to === targetId) ||
          (w.from === targetId && w.to === selectedNode)
      );
      if (exists) return false;

      return true;
  };

  const handleNodeClick = (e: React.MouseEvent | React.TouchEvent, id: NodeId) => {
      e.stopPropagation(); // Prevent container click
      if (readOnly || isSabotageMode) return;

      if (!selectedNode) {
          // SELECT PHASE
          // Check limits before allowing selection
          const count = wires.filter(w => w.from === id || w.to === id).length;
          if (count < 2) {
              setSelectedNode(id);
              playGameSound('click');
          }
      } else {
          // CONNECT PHASE
          if (selectedNode === id) {
              // Clicked same node -> Deselect
              setSelectedNode(null);
              playGameSound('click');
          } else {
              // Clicked different node -> Attempt connect
              if (isConnectable(id)) {
                  tryConnect(selectedNode, id);
                  setSelectedNode(null); // Success, clear selection
              } else {
                  // If invalid target but valid start, switch selection
                  const count = wires.filter(w => w.from === id || w.to === id).length;
                  if (count < 2) {
                      setSelectedNode(id);
                      playGameSound('click');
                  }
              }
          }
      }
  };

  const handleMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
      if (!selectedNode) return; // Only track cursor if we are in "connect mode"
      const coords = getRelativeCoords(e);
      setCursorPos(coords);
  };

  // Clear selection if clicking on empty background
  const handleBackgroundClick = () => {
      if (selectedNode) {
          setSelectedNode(null);
      }
  };

  const handleWireClick = (id: string) => {
      if (!readOnly && !isSabotageMode) {
          setWires(prev => prev.filter(w => w.id !== id));
          playGameSound('click');
      }
  };

  const handleBeakerClick = (cellId: number, slot: 'L' | 'R') => {
      if (isReverseMode) return; 
      if (readOnly && !isSabotageMode) return;
      if (isSabotageMode && onSabotageAction) {
           if (sabotageType === 'SWAP_ELECTRODE' && sabotagePayload) {
              onSabotageAction({ type: 'SWAP_ELECTRODE', cellId, slot, newMetal: sabotagePayload });
           }
      }
  };

  const handleCellContainerClick = (cellId: number) => {
      if (readOnly && !isSabotageMode) return;
      if (isSabotageMode && onSabotageAction && sabotageType === 'REVERSE_POLARITY') {
           onSabotageAction({ type: 'REVERSE_POLARITY', cellId });
      }
  };

  const clearWires = () => {
      setWires([]);
      setSelectedNode(null);
      playGameSound('click');
  };

  const renderWire = (x1: number, y1: number, x2: number, y2: number, color: string = '#fbbf24', isGhost: boolean = false, animationDirection: 'normal' | 'reverse' | 'none' = 'none') => {
      const dist = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
      const sag = Math.min(dist * 0.3, 15);
      const path = `M ${x1} ${y1} Q ${(x1+x2)/2} ${(y1+y2)/2 + sag} ${x2} ${y2}`;
      const strokeWidth = isGhost ? 1.5 : 1.5;
      const hitAreaWidth = 25; 
      const animClass = (animationDirection !== 'none') ? 'animate-flow' : '';
      const dashArray = isGhost ? '6,6' : '12,12';

      return (
          <>
             {!isGhost && <path d={path} stroke="rgba(0,0,0,0.5)" strokeWidth={strokeWidth * 2} fill="none" />}
             <path 
                d={path} 
                stroke={color} 
                strokeWidth={strokeWidth} 
                fill="none" 
                strokeLinecap="round" 
                strokeDasharray={dashArray}
                className={animClass}
                style={{ animationDirection: animationDirection === 'reverse' ? 'reverse' : 'normal' }}
             />
             <path d={path} stroke="transparent" strokeWidth={hitAreaWidth} fill="none" className="cursor-pointer" />
          </>
      );
  };

  const getPhysicalMetal = (cellId: 1 | 2, side: 'L' | 'R') => {
      const cell = cellId === 1 ? team.cell1 : team.cell2;
      const isFlipped = cell.isFlipped;
      const effectiveSide = isFlipped ? (side === 'L' ? 'R' : 'L') : side; 
      if (effectiveSide === 'L') return cell.metalL || '?';
      return cell.metalR || '?';
  };

  const getNodeConnections = (id: NodeId) => {
      return wires.filter(w => w.from === id || w.to === id).length;
  };

  // Localized Strings
  const txtLeft = getLocalizedText({zh: '左', en: 'Left', ja: '左'}, language);
  const txtRight = getLocalizedText({zh: '右', en: 'Right', ja: '右'}, language);
  const txtVoltmeter = getLocalizedText({zh: '紅(+) - 黑(-)', en: 'Red(+) - Black(-)', ja: '赤(+) - 黒(-)'}, language);
  const txtSaltBridge = getLocalizedText({zh: '鹽橋', en: 'Salt Bridge', ja: '塩橋'}, language);

  return (
    <div className="w-full flex flex-col gap-4 animate-fade-in select-none">
      
      {/* --- HEADER --- */}
      {!readOnly && (
      <div className="flex justify-between items-center px-4 md:px-6 bg-gray-800/50 p-4 rounded-3xl border-2 border-gray-700">
          <div>
              <div className="flex items-center gap-2">
                  <Spline className={`${themeClasses.text} w-6 h-6`} />
                  <h2 className="text-xl md:text-2xl font-bold text-white">
                      <TrilingualText content={{zh: "接線區", en: "Wiring", ja: "配線"}} language={language} />
                  </h2>
              </div>
              
              {/* Only show guide in Practice Mode */}
              {(!gameMode || gameMode === GameMode.PRACTICE) && (
                  <div className="mt-2">
                       <button 
                           onClick={() => {
                               playGameSound('click');
                               setGuideMode(guideMode === 'series' ? 'none' : 'series');
                           }}
                           className={`text-sm px-4 py-2 rounded-lg border flex items-center gap-2 font-bold ${guideMode === 'series' ? `${themeClasses.border} ${themeClasses.text} bg-gray-800` : 'border-gray-600 text-gray-400 hover:text-white'}`}
                       >
                           <GitCommitHorizontal size={16} /> 
                           <TrilingualText content={{zh: "接線引導", en: "Guide", ja: "ガイド"}} language={language} />
                       </button>
                  </div>
              )}
          </div>
          
          <div className="flex gap-4">
               {!isSabotageMode && (
                   <button 
                        onClick={clearWires}
                        className="px-4 py-3 bg-red-900/50 border border-red-500 rounded-xl text-red-300 hover:bg-red-900 active:scale-95 transition-transform font-bold"
                   >
                       <Trash2 size={24} />
                   </button>
               )}
               
               {!isSabotageMode && (
                   <button 
                        onClick={onConfirm} 
                        className={`${themeClasses.button} ${themeClasses.buttonText} px-6 py-3 font-bold rounded-xl hover:scale-105 transition shadow-lg flex items-center gap-2 active:scale-95 text-lg`}
                   >
                       <TrilingualText content={{zh: "啟動", en: "GO", ja: "起動"}} language={language} /> <Zap size={20} fill={themeColor === 'blue' ? "black" : "white"} />
                   </button>
               )}
          </div>
      </div>
      )}

      {/* --- BOARD --- */}
      <div 
        ref={containerRef}
        className={`relative w-full aspect-[4/3] bg-[#1e293b] rounded-3xl overflow-hidden border-[8px] shadow-2xl ${readOnly ? 'border-yellow-500/50' : 'border-gray-600'}`}
        onMouseMove={(e) => handleMouseMove(e)}
        onTouchMove={(e) => handleMouseMove(e)}
        onClick={handleBackgroundClick}
      >
        <div className="absolute inset-0 opacity-5 bg-[linear-gradient(rgba(255,255,255,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.1)_1px,transparent_1px)] bg-[size:5%_5%] pointer-events-none"></div>

        <svg 
            className="absolute inset-0 w-full h-full z-20 pointer-events-none overflow-visible"
            viewBox="0 0 100 100" 
            preserveAspectRatio="none"
        >
            {guideMode !== 'none' && GUIDE_PATHS[guideMode].map(([from, to], i) => {
                const n1 = NODES[from];
                const n2 = NODES[to];
                return (
                    <g key={`ghost-${i}`} className="opacity-30">
                        {renderWire(n1.x, n1.y, n2.x, n2.y, '#00f3ff', true, 'none')}
                    </g>
                );
            })}

            {wires.map(w => {
                const n1 = NODES[w.from];
                const n2 = NODES[w.to];
                let color = '#fbbf24'; 
                if (w.from.includes('v_pos') || w.to.includes('v_pos')) color = '#ef4444';
                if (w.from.includes('v_neg') || w.to.includes('v_neg')) color = '#374151';

                let animDir: 'normal' | 'reverse' | 'none' = 'none';
                if (showFlow) {
                    if (activeFlowPath.has(`${w.from}->${w.to}`)) animDir = 'normal';
                    else if (activeFlowPath.has(`${w.to}->${w.from}`)) animDir = 'reverse';
                }

                return (
                    <g key={w.id} onClick={() => handleWireClick(w.id)} className="pointer-events-auto">
                        {renderWire(n1.x, n1.y, n2.x, n2.y, color, false, animDir)}
                    </g>
                );
            })}
            
            {/* Guide Wire: Connects selected node to cursor */}
            {selectedNode && cursorPos && (
                <g className="opacity-80 pointer-events-none animate-pulse">
                    {renderWire(
                        NODES[selectedNode].x, 
                        NODES[selectedNode].y, 
                        cursorPos.x, 
                        cursorPos.y, 
                        '#00f3ff', // Cyan Ghost Wire
                        true, 
                        'none'
                    )}
                    <circle cx={cursorPos.x} cy={cursorPos.y} r={1.5} fill="#00f3ff" />
                </g>
            )}
        </svg>

        {/* --- COMPONENTS --- */}
        
        {/* VOLTMETER - Lifted to top 4% to create space */}
        <div className="absolute top-[4%] left-1/2 -translate-x-1/2 w-64 h-24 md:w-80 md:h-28 bg-gray-900 border-4 border-gray-600 rounded-2xl shadow-2xl flex flex-col items-center justify-center z-10 pointer-events-none">
             <div className="w-56 h-14 md:w-72 md:h-16 bg-[#0f1a0f] rounded-xl border border-gray-700 flex items-center justify-center px-4 relative overflow-hidden shadow-inner">
                 {hideVoltage ? (
                     <div className="flex items-center gap-2 text-gray-500 font-mono text-3xl md:text-4xl animate-pulse">
                         <EyeOff size={32} />
                         <span>---</span>
                     </div>
                 ) : (
                     <span className={`font-mono text-4xl md:text-5xl font-bold tracking-widest ${displayVoltage > 0 ? 'text-neon-green' : displayVoltage < 0 ? 'text-red-500' : 'text-gray-600'}`} style={{ textShadow: displayVoltage > 0 ? '0 0 15px rgba(10, 255, 0, 0.5)' : 'none' }}>
                         {displayVoltage.toFixed(2)}<span className="text-xl ml-1">V</span>
                     </span>
                 )}
             </div>
             <div className="text-[10px] text-gray-500 mt-1 font-mono uppercase tracking-widest font-bold">
                 {txtVoltmeter}
             </div>
        </div>

        {/* CELL 1 - Lifted to 45% top to show full beaker */}
        <div className="absolute top-[45%] left-[25%] md:left-[28%] -translate-x-1/2 flex flex-col items-center group z-10">
             {isReverseMode && (
                 <div 
                    className="absolute -top-16 -left-12 -right-12 -bottom-12 z-50 cursor-pointer rounded-3xl hover:bg-neon-blue/10 transition-colors border-2 border-transparent hover:border-neon-blue border-dashed animate-pulse"
                    onClick={(e) => { e.stopPropagation(); handleCellContainerClick(1); }}
                 />
             )}
             <div className="w-48 md:w-56 h-6 bg-gray-700 rounded-t-lg shadow-md absolute -top-6 border-b-2 border-black"></div>
             
             {/* Cell Container - Structure modified for Salt Bridge Layering */}
             <div className="relative">
                {/* Salt Bridge - Now inside, z-0 */}
                <SaltBridge label={txtSaltBridge} className="top-1/2 -translate-y-1/2 mt-[-20px] z-0" />
                
                {/* Beaker Holder - relative z-10 to sit ON TOP of bridge */}
                <div 
                    className={`w-48 md:w-56 bg-gray-800/90 p-1 md:p-2 rounded-b-2xl border-x-2 border-b-2 border-gray-500 shadow-xl flex justify-center transition-transform duration-500 relative z-10 ${team.cell1.isFlipped ? 'rotate-y-180' : ''} ${isReverseMode ? 'cursor-pointer ring-4 ring-neon-blue ring-offset-4 ring-offset-gray-900' : ''}`}
                    style={{ transformStyle: 'preserve-3d' }}
                    onClick={() => !isReverseMode && handleCellContainerClick(1)}
                >
                     <div className="relative" onClick={(e) => { e.stopPropagation(); handleBeakerClick(1, 'L'); }}>
                         {isSwapMode && <div className="absolute -inset-6 z-50 cursor-pointer rounded-xl hover:bg-neon-green/20 border-2 border-transparent hover:border-neon-green border-dashed transition-all" />}
                         <HalfCellBeaker metal={team.cell1.metalL} className="scale-100 origin-bottom" label={txtLeft} />
                     </div>
                     <div className="relative" onClick={(e) => { e.stopPropagation(); handleBeakerClick(1, 'R'); }}>
                        {isSwapMode && <div className="absolute -inset-6 z-50 cursor-pointer rounded-xl hover:bg-neon-green/20 border-2 border-transparent hover:border-neon-green border-dashed transition-all" />}
                        <HalfCellBeaker metal={team.cell1.metalR} className="scale-100 origin-bottom" label={txtRight} />
                     </div>
                </div>
             </div>
        </div>

        {/* CELL 2 - Lifted to 45% top */}
        <div className="absolute top-[45%] left-[75%] md:left-[72%] -translate-x-1/2 flex flex-col items-center group z-10">
             {isReverseMode && (
                 <div 
                    className="absolute -top-16 -left-12 -right-12 -bottom-12 z-50 cursor-pointer rounded-3xl hover:bg-neon-blue/10 transition-colors border-2 border-transparent hover:border-neon-blue border-dashed animate-pulse"
                    onClick={(e) => { e.stopPropagation(); handleCellContainerClick(2); }}
                 />
             )}
             <div className="w-48 md:w-56 h-6 bg-gray-700 rounded-t-lg shadow-md absolute -top-6 border-b-2 border-black"></div>
             
             {/* Cell Container - Structure modified for Salt Bridge Layering */}
             <div className="relative">
                {/* Salt Bridge - Now inside, z-0 */}
                <SaltBridge label={txtSaltBridge} className="top-1/2 -translate-y-1/2 mt-[-20px] z-0" />

                {/* Beaker Holder - relative z-10 to sit ON TOP of bridge */}
                <div 
                    className={`w-48 md:w-56 bg-gray-800/90 p-1 md:p-2 rounded-b-2xl border-x-2 border-b-2 border-gray-500 shadow-xl flex justify-center transition-transform duration-500 relative z-10 ${team.cell2.isFlipped ? 'rotate-y-180' : ''} ${isReverseMode ? 'cursor-pointer ring-4 ring-neon-blue ring-offset-4 ring-offset-gray-900' : ''}`}
                    onClick={() => !isReverseMode && handleCellContainerClick(2)}
                >
                     <div className="relative" onClick={(e) => { e.stopPropagation(); handleBeakerClick(2, 'L'); }}>
                         {isSwapMode && <div className="absolute -inset-6 z-50 cursor-pointer rounded-xl hover:bg-neon-green/20 border-2 border-transparent hover:border-neon-green border-dashed transition-all" />}
                         <HalfCellBeaker metal={team.cell2.metalL} className="scale-100 origin-bottom" label={txtLeft} />
                     </div>
                     <div className="relative" onClick={(e) => { e.stopPropagation(); handleBeakerClick(2, 'R'); }}>
                        {isSwapMode && <div className="absolute -inset-6 z-50 cursor-pointer rounded-xl hover:bg-neon-green/20 border-2 border-transparent hover:border-neon-green border-dashed transition-all" />}
                        <HalfCellBeaker metal={team.cell2.metalR} className="scale-100 origin-bottom" label={txtRight} />
                     </div>
                </div>
             </div>
        </div>

        {/* Terminals with click-to-connect support and visual feedback */}
        <TerminalNode id="v_pos" x={40} y={15} color="bg-red-600" onClick={handleNodeClick} label="Red (+)" subLabel="Voltmeter (+)" isSelected={selectedNode === 'v_pos'} isValidTarget={isConnectable('v_pos')} connections={getNodeConnections('v_pos')} />
        <TerminalNode id="v_neg" x={60} y={15} color="bg-black" onClick={handleNodeClick} label="Black (-)" subLabel="Voltmeter (-)" isSelected={selectedNode === 'v_neg'} isValidTarget={isConnectable('v_neg')} connections={getNodeConnections('v_neg')} />
        
        <TerminalNode id="c1_L" x={18} y={50} onClick={handleNodeClick} label={getPhysicalMetal(1, 'L')} subLabel="Cell 1 (Left)" isSelected={selectedNode === 'c1_L'} isValidTarget={isConnectable('c1_L')} connections={getNodeConnections('c1_L')} />
        <TerminalNode id="c1_R" x={32} y={50} onClick={handleNodeClick} label={getPhysicalMetal(1, 'R')} subLabel="Cell 1 (Right)" isSelected={selectedNode === 'c1_R'} isValidTarget={isConnectable('c1_R')} connections={getNodeConnections('c1_R')} />

        <TerminalNode id="c2_L" x={68} y={50} onClick={handleNodeClick} label={getPhysicalMetal(2, 'L')} subLabel="Cell 2 (Left)" isSelected={selectedNode === 'c2_L'} isValidTarget={isConnectable('c2_L')} connections={getNodeConnections('c2_L')} />
        <TerminalNode id="c2_R" x={82} y={50} onClick={handleNodeClick} label={getPhysicalMetal(2, 'R')} subLabel="Cell 2 (Right)" isSelected={selectedNode === 'c2_R'} isValidTarget={isConnectable('c2_R')} connections={getNodeConnections('c2_R')} />

      </div>
    </div>
  );
};
