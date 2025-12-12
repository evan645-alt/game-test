
import React, { useState, useEffect, useRef } from 'react';
import { Zap, Activity, Trophy, ArrowRight, History, Calculator, Crown, RotateCcw, Timer, Maximize, Minimize, ScrollText, X, BookOpen, GraduationCap, Swords, HelpCircle, Settings, ArrowUp, ArrowDown, MoveRight, Eye, ChevronsRight, Repeat, ArrowRightLeft, FlaskConical, Medal } from 'lucide-react';
import { 
  Team, 
  GamePhase, 
  LogEntry, 
  MetalType, 
  CellConfig, 
  Wire, 
  Probes,
  ChanceCard,
  ConnectionType,
  TrilingualContent,
  HistorySnapshot,
  CIRCUIT_NODES,
  NodeId,
  GameMode,
  Language,
  METAL_POTENTIALS
} from './types';
import { calculateCircuitVoltage, drawChanceCards, getMetalColor, generateCalculationLog, getPhaseInstruction, drawRandomHand, playGameSound } from './utils';
import { AssemblyStage } from './components/AssemblyStage';
import { WiringStage } from './components/WiringStage';
import { BattleStage } from './components/BattleStage';
import { TrilingualText } from './components/Visuals';
import { GameManual } from './components/GameManual';

// --- Templates ---
const INITIAL_TEAM: Omit<Team, 'id' | 'name'> = {
  hand: [],
  cell1: { id: 1, metalL: null, metalR: null, voltage: 0, polarityL: 'neutral', isFlipped: false },
  cell2: { id: 2, metalL: null, metalR: null, voltage: 0, polarityL: 'neutral', isFlipped: false },
  wires: [],
  probes: { red: null, black: null },
  totalVoltage: 0,
  status: 'Active',
  wins: 0, // Wins tracker
  chanceHand: [],
  logs: [],
  connectionType: ConnectionType.Broken,
  battleSummary: {},
  history: []
};

// --- Chemical Reaction Data ---
const REACTION_TEMPLATES: Record<MetalType, { ox: string, red: string }> = {
  [MetalType.Mg]: { ox: "Mg → Mg²⁺ + 2e⁻", red: "Mg²⁺ + 2e⁻ → Mg" },
  [MetalType.Ag]: { ox: "Ag → Ag⁺ + e⁻",   red: "Ag⁺ + e⁻ → Ag" },
  [MetalType.Cu]: { ox: "Cu → Cu²⁺ + 2e⁻", red: "Cu²⁺ + 2e⁻ → Cu" },
  [MetalType.Fe]: { ox: "Fe → Fe²⁺ + 2e⁻", red: "Fe²⁺ + 2e⁻ → Fe" },
  [MetalType.Zn]: { ox: "Zn → Zn²⁺ + 2e⁻", red: "Zn²⁺ + 2e⁻ → Zn" },
  [MetalType.Pb]: { ox: "Pb → Pb²⁺ + 2e⁻", red: "Pb²⁺ + 2e⁻ → Pb" },
};

// --- Scaled Wrapper for WiringStage ---
const ScaledBoardPreview: React.FC<{ 
    team: Team, 
    gameMode: GameMode, 
    language: Language,
    showFlow?: boolean,
    forcedVoltage?: number,
    flowMode?: 'ELECTRON' | 'CURRENT'
}> = ({ team, gameMode, language, showFlow, forcedVoltage, flowMode }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [scale, setScale] = useState(1);

    // Use 4:3 base size (800x600) for better vertical accommodation on all screens
    const BASE_WIDTH = 800;
    const BASE_HEIGHT = 600;

    useEffect(() => {
        const updateScale = () => {
            if (containerRef.current) {
                const parentWidth = containerRef.current.offsetWidth;
                const parentHeight = containerRef.current.offsetHeight;
                
                // Calculate scale to fit CONTAIN within the parent
                // Force scale to match width to prevent gaps on sides if parent is close ratio
                const scaleX = parentWidth / BASE_WIDTH;
                const scaleY = parentHeight / BASE_HEIGHT;
                
                // Use minimum scale to ensure containment, but if they are very close, prefer width to fill
                setScale(Math.min(scaleX, scaleY));
            }
        };

        const observer = new ResizeObserver(() => {
            updateScale();
        });

        if (containerRef.current) {
            observer.observe(containerRef.current);
        }
        
        updateScale();

        return () => observer.disconnect();
    }, []);

    return (
        <div ref={containerRef} className="w-full h-full relative overflow-hidden flex items-center justify-center bg-[#1e293b]">
            <div 
                style={{ 
                    width: `${BASE_WIDTH}px`,
                    height: `${BASE_HEIGHT}px`,
                    position: 'absolute',
                    transform: `scale(${scale})`,
                    transformOrigin: 'center center',
                }}
            >
                <WiringStage 
                    team={team} 
                    onUpdate={() => {}} 
                    onConfirm={() => {}} 
                    readOnly={true}
                    hideVoltage={false} 
                    showFlow={showFlow}
                    gameMode={gameMode}
                    language={language}
                    forcedVoltage={forcedVoltage}
                    flowMode={flowMode}
                    themeColor='blue' 
                />
            </div>
        </div>
    );
};

export default function App() {
  const [phase, setPhase] = useState<GamePhase>(GamePhase.SETUP);
  const [gameMode, setGameMode] = useState<GameMode | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [language, setLanguage] = useState<Language>('zh'); // Default Language
  
  // Game State
  const [gameRound, setGameRound] = useState<number>(1); // 1, 2, or 3
  const [resultHistoryStep, setResultHistoryStep] = useState<number>(0); 
  const [turnOrder, setTurnOrder] = useState<number[]>([0, 1]); // [WinnerOfToss, LoserOfToss]
  
  // Visual State for Result Screen
  const [flowMode, setFlowMode] = useState<'ELECTRON' | 'CURRENT'>('ELECTRON');

  const [instruction, setInstruction] = useState<TrilingualContent>(getPhaseInstruction(GamePhase.SETUP));
  
  const [name1, setName1] = useState('');
  const [name2, setName2] = useState('');

  // Timer State
  const ROUND_DURATION = 120; // 2 minutes
  const [timeLeft, setTimeLeft] = useState(ROUND_DURATION);

  // Draft State (for auto-submission from AssemblyStage)
  const [draftAssembly, setDraftAssembly] = useState<{hand: MetalType[], c1: CellConfig, c2: CellConfig} | null>(null);

  // UI States
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showLogViewer, setShowLogViewer] = useState(false);
  const [logViewTab, setLogViewTab] = useState<'SYSTEM' | 'TEAM1' | 'TEAM2'>('SYSTEM');
  const [showManual, setShowManual] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);

  // --- Helpers ---
  const addLog = (msg: string, type: LogEntry['type'] = 'info') => {
    setLogs(prev => [{
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date(),
      message: msg,
      type
    }, ...prev]);
    return msg;
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(e => {
            console.error(`Error enabling fullscreen: ${e.message}`);
        });
        setIsFullscreen(true);
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        }
        setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  const setPhaseWithInstruction = (newPhase: GamePhase, activeTeamName?: string) => {
    setPhase(newPhase);
    setInstruction(getPhaseInstruction(newPhase, activeTeamName));
    setTimeLeft(ROUND_DURATION); // Reset timer on phase change
    setDraftAssembly(null); // Reset draft
    setResultHistoryStep(0); // Reset history view
  };

  const updateTeam = (index: number, updates: Partial<Team>) => {
    setTeams(prev => {
        const newTeams = [...prev];
        newTeams[index] = { ...newTeams[index], ...updates };
        return newTeams;
    });
  };

  const captureSnapshot = (teamIndex: number, stepName: string, description?: TrilingualContent, card?: ChanceCard) => {
      setTeams(prev => {
          const newTeams = [...prev];
          const team = newTeams[teamIndex];
          
          const snapshot: HistorySnapshot = {
              stepName,
              cell1: JSON.parse(JSON.stringify(team.cell1)), // Deep copy
              cell2: JSON.parse(JSON.stringify(team.cell2)), // Deep copy
              wires: [...team.wires], // Copy wires for history visualization
              totalVoltage: team.totalVoltage,
              actionDescription: description,
              cardUsed: card
          };
          
          team.history = [...team.history, snapshot];
          return newTeams;
      });
  };

  // --- TIMER LOGIC ---
  useEffect(() => {
    const timedPhases = [
        GamePhase.A_DRAW, GamePhase.B_DRAW,
        GamePhase.A_ASSEMBLE, GamePhase.B_ASSEMBLE,
        GamePhase.A_WIRING, GamePhase.B_WIRING,
    ];

    if (timedPhases.includes(phase) && timeLeft > 0) {
        const timerId = setTimeout(() => setTimeLeft(prev => prev - 1), 1000);
        // Play alert sound if time is low
        if (timeLeft <= 10 && timeLeft > 0) {
            playGameSound('alert');
        }
        return () => clearTimeout(timerId);
    } else if (timeLeft === 0 && timedPhases.includes(phase)) {
        handleTimeout();
    }
  }, [timeLeft, phase]);

  const handleTimeout = () => {
    addLog("Time limit reached! System forcing action.", 'system');
    
    // Auto-progress based on phase
    if (phase === GamePhase.A_DRAW || phase === GamePhase.B_DRAW) {
        const teamIdx = phase === GamePhase.A_DRAW ? 0 : 1;
        if (draftAssembly && draftAssembly.hand.length > 0) {
             handleDrawComplete(teamIdx, draftAssembly.hand);
        } else {
             handleDrawComplete(teamIdx, drawRandomHand(6));
        }
    } else if (phase === GamePhase.A_ASSEMBLE || phase === GamePhase.B_ASSEMBLE) {
         const teamIdx = phase === GamePhase.A_ASSEMBLE ? 0 : 1;
         if (draftAssembly) {
             handleAssemblyComplete(teamIdx, draftAssembly.hand, draftAssembly.c1, draftAssembly.c2);
         } else {
             const t = teams[teamIdx];
             handleAssemblyComplete(teamIdx, t.hand, t.cell1, t.cell2);
         }
    } else if (phase === GamePhase.A_WIRING || phase === GamePhase.B_WIRING) {
         const teamIdx = phase === GamePhase.A_WIRING ? 0 : 1;
         handleWiringConfirm(teamIdx);
    } 
  };

  // --- Phase Handlers ---

  const startGame = (mode: GameMode) => {
      if (!name1 || !name2) return alert("Names required");
      playGameSound('click');
      setGameMode(mode);
      const initTeams = [
          { ...INITIAL_TEAM, id: 't1', name: name1, wins: 0 } as Team,
          { ...INITIAL_TEAM, id: 't2', name: name2, wins: 0 } as Team
      ];
      setTeams(initTeams);
      // START WITH COIN TOSS IMMEDIATELY
      setPhaseWithInstruction(GamePhase.COIN_TOSS);
      addLog(`System Initialized. Mode: ${mode}. Game Started.`, 'system');
  };

  const handleCoinTossComplete = (winnerIndex: number) => {
      const loserIndex = winnerIndex === 0 ? 1 : 0;
      setTurnOrder([winnerIndex, loserIndex]);
      playGameSound('victory');
      
      addLog(`Coin Toss: ${teams[winnerIndex].name} attacks first in Round 1!`, 'system');
      
      // Determine First Player of Round 1 (The Winner)
      const roundFirst = winnerIndex;
      // Start Drawing Phase with First Player
      setPhaseWithInstruction(GamePhase.A_DRAW, teams[roundFirst].name);
  };

  const startNextRound = () => {
      playGameSound('click');
      const nextRound = gameRound + 1;
      setGameRound(nextRound);
      
      setTeams(prevTeams => prevTeams.map(t => ({
          ...t,
          ...INITIAL_TEAM, // Reset round-specific data
          id: t.id,
          name: t.name,
          wins: t.wins // Preserve wins
      })));

      // Determine First Player based on Round Number
      // Round 1: Winner (turnOrder[0])
      // Round 2: Loser (turnOrder[1])
      // Round 3: Winner (turnOrder[0])
      const isWinnerFirst = (nextRound === 1 || nextRound === 3);
      const roundFirst = isWinnerFirst ? turnOrder[0] : turnOrder[1];

      // Re-run setup starting with the designated first player
      setPhaseWithInstruction(GamePhase.A_DRAW, teams[roundFirst].name);
      addLog(`Starting Round ${nextRound}. First Player: ${teams[roundFirst].name}`, 'system');
  };

  const getRoundPlayerIndices = () => {
      const isWinnerFirst = (gameRound === 1 || gameRound === 3);
      const p1 = isWinnerFirst ? turnOrder[0] : turnOrder[1];
      const p2 = isWinnerFirst ? turnOrder[1] : turnOrder[0];
      return { p1, p2 };
  };

  const handleDraw = (teamIndex: number) => {
      const { p1, p2 } = getRoundPlayerIndices();
      if (teamIndex === p1) {
          setPhaseWithInstruction(GamePhase.B_DRAW, teams[p2].name);
      } else {
          setPhaseWithInstruction(GamePhase.A_ASSEMBLE, teams[p1].name);
      }
  };
  
  const handleDrawComplete = (teamIndex: number, hand: MetalType[]) => {
      playGameSound('draw');
      updateTeam(teamIndex, { hand });
      const { p1, p2 } = getRoundPlayerIndices();
      const currentIdx = phase === GamePhase.A_DRAW ? p1 : p2;
      
      addLog(`${teams[currentIdx].name} completed component draw.`);
      handleDraw(currentIdx);
  }

  const handleAssemblyComplete = (teamIndex: number, hand: MetalType[], c1: CellConfig, c2: CellConfig) => {
      playGameSound('place');
      updateTeam(teamIndex, { hand, cell1: c1, cell2: c2 });
      
      const desc = {zh: "組件配置完成", en: "Components Placed", ja: "コンポーネント配置完了"};
      captureSnapshot(teamIndex, "Assembly Phase", desc);

      const { p1, p2 } = getRoundPlayerIndices();

      if (phase === GamePhase.A_ASSEMBLE) {
          setPhaseWithInstruction(GamePhase.B_ASSEMBLE, teams[p2].name);
      } else {
          setPhaseWithInstruction(GamePhase.A_WIRING, teams[p1].name);
      }
      addLog(`${teams[teamIndex].name} assembly locked.`);
  };

  const handleAssemblyUpdate = (hand: MetalType[], c1: CellConfig, c2: CellConfig) => {
      setDraftAssembly({ hand, c1, c2 });
  };

  const handleWiringUpdate = (teamIndex: number, wires: Wire[], probes: Probes, voltage: number, connectionType?: ConnectionType, cellUpdates?: any) => {
      const currentTeam = teams[teamIndex];
      const newCell1 = cellUpdates?.cell1 ? { ...currentTeam.cell1, ...cellUpdates.cell1 } : currentTeam.cell1;
      const newCell2 = cellUpdates?.cell2 ? { ...currentTeam.cell2, ...cellUpdates.cell2 } : currentTeam.cell2;
      
      updateTeam(teamIndex, { 
          wires, 
          probes, 
          totalVoltage: voltage, 
          connectionType: connectionType || ConnectionType.Broken,
          cell1: newCell1,
          cell2: newCell2
      });
  };

  const handleWiringConfirm = (teamIndex: number) => {
      playGameSound('wire');
      const team = teams[teamIndex];
      updateTeam(teamIndex, { 
          battleSummary: { ...team.battleSummary, initialVoltage: team.totalVoltage } 
      });
      
      const desc = {zh: "初始電路設定", en: "Initial Circuit Setup", ja: "初期回路設定"};
      captureSnapshot(teamIndex, "Wiring Complete", desc);

      addLog(`${team.name} wiring confirmed. Voltage: ${team.totalVoltage.toFixed(2)}V`);
      
      const { p1, p2 } = getRoundPlayerIndices();

      if (phase === GamePhase.A_WIRING) {
          setPhaseWithInstruction(GamePhase.B_WIRING, teams[p2].name);
      } else if (phase === GamePhase.B_WIRING) {
          setPhaseWithInstruction(GamePhase.JOINT_DRAW_ANIMATION);
      }
  };

  const handleJointDrawComplete = () => {
      playGameSound('draw');
      updateTeam(0, { chanceHand: drawChanceCards() });
      updateTeam(1, { chanceHand: drawChanceCards() });
      addLog("Action Cards distributed.", 'system');
      const { p1 } = getRoundPlayerIndices();
      setPhaseWithInstruction(GamePhase.A_ACTION_1, teams[p1].name);
  };

  const handleCardPlay = (actorIndex: number, card: ChanceCard, data: any) => {
      playGameSound('attack');
      const actor = teams[actorIndex];
      const isAction1 = phase === GamePhase.A_ACTION_1 || phase === GamePhase.B_ACTION_1; 
      const isAction2 = phase === GamePhase.A_ACTION_2 || phase === GamePhase.B_ACTION_2; 
      
      let targetIndex;
      if (isAction1) targetIndex = actorIndex === 0 ? 1 : 0;
      else if (isAction2) targetIndex = actorIndex;
      else {
          const scope = data.targetScope; 
          targetIndex = (scope === 'OPPONENT') ? (actorIndex === 0 ? 1 : 0) : actorIndex;
      }
      
      setTeams(currentTeams => {
          const targetTeam = JSON.parse(JSON.stringify(currentTeams[targetIndex])) as Team;
          const cardType = card.effectType;
          let logMsg = `${actor.name} used ${card.title.en} on ${targetTeam.name}.`;
          
          let actionDesc: TrilingualContent = {
              zh: `${actor.name} 使用了 ${card.title.zh}`,
              en: `${actor.name} used ${card.title.en}`,
              ja: `${actor.name} は ${card.title.ja} を使用しました`
          };

          if (cardType === 'SWAP_ELECTRODE') {
              const { cellId, slot, newMetal } = data;
              const cellKey = cellId === 1 ? 'cell1' : 'cell2';
              const slotKey = slot === 'L' ? 'metalL' : 'metalR';
              if (targetTeam[cellKey]) {
                 (targetTeam[cellKey] as any)[slotKey] = newMetal;
                 
                 const slotName = slot === 'L' ? 'Left' : 'Right';
                 actionDesc.zh += `，將電池 ${cellId} ${slot === 'L' ? '左' : '右'}電極換為 ${newMetal}`;
                 actionDesc.en += `, swapping Cell ${cellId} ${slotName} to ${newMetal}`;
                 actionDesc.ja += `、電池${cellId}の${slot === 'L' ? '左' : '右'}電極を${newMetal}に交換`;
              }
          } else if (cardType === 'REVERSE_POLARITY') {
              const { cellId } = data;
              const cellKey = cellId === 1 ? 'cell1' : 'cell2';
              if (targetTeam[cellKey]) {
                  targetTeam[cellKey].isFlipped = !targetTeam[cellKey].isFlipped;
                  actionDesc.zh += `，反轉了電池 ${cellId} 的極性`;
                  actionDesc.en += `, reversing polarity of Cell ${cellId}`;
                  actionDesc.ja += `、電池${cellId}の極性を反転`;
              }
          }

          const newV = calculateCircuitVoltage(targetTeam);
          targetTeam.totalVoltage = newV;

          if (isAction1) targetTeam.battleSummary.attackReceived = card;
          else if (isAction2) targetTeam.battleSummary.buffApplied = card;

          const newTeams = [...currentTeams];
          newTeams[targetIndex] = targetTeam;
          
          const isAttack = targetIndex !== actorIndex;
          const snapshotName = isAttack ? `Attacked by ${actor.name}` : "Self Modification";
          const snapshot: HistorySnapshot = {
              stepName: snapshotName,
              cell1: JSON.parse(JSON.stringify(targetTeam.cell1)),
              cell2: JSON.parse(JSON.stringify(targetTeam.cell2)),
              wires: [...targetTeam.wires],
              totalVoltage: newV,
              actionDescription: actionDesc,
              cardUsed: card
          };
          newTeams[targetIndex].history.push(snapshot);
          
          const newActorHand = newTeams[actorIndex].chanceHand.filter(c => c.id !== card.id);
          newTeams[actorIndex].chanceHand = newActorHand;

          addLog(logMsg, 'attack');
          return newTeams;
      });

      const { p1, p2 } = getRoundPlayerIndices();
      if (phase === GamePhase.A_ACTION_1) setPhaseWithInstruction(GamePhase.B_ACTION_1, teams[p2].name);
      else if (phase === GamePhase.B_ACTION_1) setPhaseWithInstruction(GamePhase.A_ACTION_2, teams[p2].name);
      else if (phase === GamePhase.A_ACTION_2) setPhaseWithInstruction(GamePhase.B_ACTION_2, teams[p1].name);
      else if (phase === GamePhase.B_ACTION_2) setPhaseWithInstruction(GamePhase.A_ACTION_3, teams[p1].name);
      else if (phase === GamePhase.A_ACTION_3) setPhaseWithInstruction(GamePhase.B_ACTION_3, teams[p2].name);
      else if (phase === GamePhase.B_ACTION_3) checkWinner();
  };

  const handleSkip = () => {
      playGameSound('click');
      const { p1, p2 } = getRoundPlayerIndices();
      let currentActorIdx = p1;
      if (phase === GamePhase.B_ACTION_1 || phase === GamePhase.A_ACTION_2 || phase === GamePhase.B_ACTION_3) {
          currentActorIdx = p2;
      } else if (phase === GamePhase.A_ACTION_1 || phase === GamePhase.B_ACTION_2 || phase === GamePhase.A_ACTION_3) {
          currentActorIdx = p1;
      }

      const actor = teams[currentActorIdx];
      const desc = {zh: "跳過階段", en: "Skipped Phase", ja: "フェーズをスキップ"};
      captureSnapshot(currentActorIdx, "Skipped Phase", desc);
      addLog(`${actor.name} skipped phase.`);

      if (phase === GamePhase.A_ACTION_1) setPhaseWithInstruction(GamePhase.B_ACTION_1, teams[p2].name);
      else if (phase === GamePhase.B_ACTION_1) setPhaseWithInstruction(GamePhase.A_ACTION_2, teams[p2].name);
      else if (phase === GamePhase.A_ACTION_2) setPhaseWithInstruction(GamePhase.B_ACTION_2, teams[p1].name);
      else if (phase === GamePhase.B_ACTION_2) setPhaseWithInstruction(GamePhase.A_ACTION_3, teams[p1].name);
      else if (phase === GamePhase.A_ACTION_3) setPhaseWithInstruction(GamePhase.B_ACTION_3, teams[p2].name);
      else if (phase === GamePhase.B_ACTION_3) checkWinner();
  };

  const checkWinner = () => {
     playGameSound('victory');
     setTeams(currentTeams => {
        const t0 = currentTeams[0];
        const t1 = currentTeams[1];
        const v1 = calculateCircuitVoltage(t0);
        const v2 = calculateCircuitVoltage(t1);

        let s0 = t0.status;
        let s1 = t1.status;
        let w0 = t0.wins;
        let w1 = t1.wins;

        // Victory Logic: Higher algebraic value wins.
        // Positive > Negative
        // Negative close to 0 (e.g. -1) > Negative far from 0 (e.g. -5) because -1 > -5
        if (v1 > v2) {
            s0 = 'Winner'; s1 = 'Loser';
            w0 += 1;
        } else if (v2 > v1) {
            s1 = 'Winner'; s0 = 'Loser';
            w1 += 1;
        } else {
            s0 = 'Winner'; s1 = 'Winner';
        }
        
        const newTeams: Team[] = [
            { ...t0, status: s0, wins: w0, totalVoltage: v1, battleSummary: { ...t0.battleSummary, finalVoltage: v1 } },
            { ...t1, status: s1, wins: w1, totalVoltage: v2, battleSummary: { ...t1.battleSummary, finalVoltage: v2 } }
        ];

        // Explicitly log voltages to confirm victory condition
        if (gameMode === GameMode.COMPETITIVE && (w0 >= 2 || w1 >= 2)) {
             setPhaseWithInstruction(GamePhase.GAME_OVER);
             addLog(`Series Over. ${t0.name}: ${v1.toFixed(2)}V, ${t1.name}: ${v2.toFixed(2)}V. Winner: ${w0 > w1 ? t0.name : t1.name}`, 'system');
        } else {
             setPhaseWithInstruction(GamePhase.ROUND_SUMMARY);
             addLog(`Round ${gameRound} Over. ${t0.name}: ${v1.toFixed(2)}V vs ${t1.name}: ${v2.toFixed(2)}V. Winner: ${v1 > v2 ? t0.name : (v2 > v1 ? t1.name : "Draw")}`, 'system');
        }

        return newTeams;
     });
  };

  const getActiveTeamName = () => {
      const { p1, p2 } = getRoundPlayerIndices();
      if (phase === GamePhase.A_DRAW || phase === GamePhase.A_ASSEMBLE || phase === GamePhase.A_WIRING) return teams[p1]?.name;
      if (phase === GamePhase.B_DRAW || phase === GamePhase.B_ASSEMBLE || phase === GamePhase.B_WIRING) return teams[p2]?.name;
      if (phase === GamePhase.A_ACTION_1) return teams[p1]?.name;
      if (phase === GamePhase.B_ACTION_1) return teams[p2]?.name;
      if (phase === GamePhase.A_ACTION_2) return teams[p2]?.name;
      if (phase === GamePhase.B_ACTION_2) return teams[p1]?.name;
      if (phase === GamePhase.A_ACTION_3) return teams[p1]?.name;
      if (phase === GamePhase.B_ACTION_3) return teams[p2]?.name;
      if (phase === GamePhase.JOINT_DRAW_ANIMATION) return "JOINT SESSION";
      if (phase === GamePhase.COIN_TOSS) return "COIN TOSS";
      return null;
  };
  const activeTeamName = getActiveTeamName();
  
  // Theme Color Logic for Props
  const getPhaseTheme = (): 'blue' | 'purple' => {
      // Determine based on phase prefix or team match
      if (phase.startsWith('A_')) return 'blue';
      if (phase.startsWith('B_')) return 'purple';
      
      // Fallback for action phases if not explicitly prefixed (though they are)
      // or setup phases
      return 'blue'; 
  };
  
  const currentTheme = getPhaseTheme();
  
  // Background Class Logic for easy identification
  const getBackgroundClass = () => {
      if (phase === GamePhase.SETUP) return 'bg-dark-bg';
      if (phase.startsWith('A_')) return 'bg-gradient-to-b from-slate-900 to-blue-950/40 shadow-[inset_0_0_100px_rgba(0,243,255,0.05)]';
      if (phase.startsWith('B_')) return 'bg-gradient-to-b from-slate-900 to-purple-950/40 shadow-[inset_0_0_100px_rgba(188,19,254,0.05)]';
      return 'bg-dark-bg';
  };
  const bgClass = getBackgroundClass();

  const themeClasses = {
      blue: 'from-transparent via-blue-900/80 to-transparent border-neon-blue/30 text-neon-blue',
      purple: 'from-transparent via-purple-900/80 to-transparent border-neon-purple/30 text-neon-purple'
  };

  const getCellReactions = (cell: CellConfig) => {
      // 1. Identify Physical Metals
      const metalL = cell.isFlipped ? cell.metalR : cell.metalL;
      const metalR = cell.isFlipped ? cell.metalL : cell.metalR;

      if (!metalL || !metalR) return { hasReaction: false };
      if (metalL === metalR) return { hasReaction: false };

      const potL = METAL_POTENTIALS[metalL];
      const potR = METAL_POTENTIALS[metalR];

      let anodeMetal: MetalType; // Oxidation (Low Potential)
      let cathodeMetal: MetalType; // Reduction (High Potential)

      // Spontaneous Reaction Logic: High Potential gets Reduced, Low Potential gets Oxidized
      if (potR > potL) {
          cathodeMetal = metalR;
          anodeMetal = metalL;
      } else {
          cathodeMetal = metalL;
          anodeMetal = metalR;
      }

      return {
          hasReaction: true,
          ox: { metal: anodeMetal, eq: REACTION_TEMPLATES[anodeMetal].ox },
          red: { metal: cathodeMetal, eq: REACTION_TEMPLATES[cathodeMetal].red }
      };
  };

  const renderResultScreen = (isFinal: boolean) => {
      const title = isFinal ? {zh: "最終冠軍", en: "SERIES CHAMPION", ja: "シリーズチャンピオン"} : {zh: `回合 ${gameRound} 結算`, en: `ROUND ${gameRound} SUMMARY`, ja: `ラウンド ${gameRound} 結果`};
      const steps = [
          { label: {zh: "接線完成", en: "Wiring", ja: "配線完了"}, historyIndex: 1 },
          { label: {zh: "階段一", en: "Stage 1", ja: "ステージ 1"}, historyIndex: 2 },
          { label: {zh: "階段二", en: "Stage 2", ja: "ステージ 2"}, historyIndex: 3 },
          { label: {zh: "階段三", en: "Stage 3", ja: "ステージ 3"}, historyIndex: 4 },
      ];

      const winner = teams.find(t => t.status === 'Winner');
      const loser = teams.find(t => t.status === 'Loser');
      const isDraw = !loser;

      return (
        <div className="flex flex-col h-full w-full max-w-7xl mx-auto overflow-hidden animate-fade-in">
            {/* Header: Title & Victory Banner - Fixed Height */}
            <div className="flex-shrink-0 px-2 md:px-4 pt-2 md:pt-4 text-center">
                <div className="flex justify-center items-center gap-2 mb-2">
                     {isFinal ? (
                        <Trophy size={40} className="text-yellow-500 drop-shadow-lg animate-bounce" />
                    ) : (
                        <Activity size={32} className="text-neon-blue drop-shadow-lg" />
                    )}
                    <h2 className="text-2xl md:text-4xl font-black text-white font-display">
                        <TrilingualText content={title} language={language} />
                    </h2>
                </div>

                {/* Victory Banner */}
                 {!isFinal && (
                     <div className="w-full max-w-4xl mx-auto mb-4">
                         {isDraw ? (
                             <div className="bg-gray-800/80 border-2 border-gray-500 p-3 rounded-2xl text-center shadow-lg backdrop-blur">
                                <h2 className="text-2xl font-black text-white font-display tracking-widest">
                                    <TrilingualText content={{zh: "平局", en: "DRAW", ja: "引き分け"}} language={language} />
                                </h2>
                                <div className="text-lg font-mono text-gray-400">
                                    {teams[0].totalVoltage.toFixed(2)}V = {teams[1].totalVoltage.toFixed(2)}V
                                </div>
                             </div>
                         ) : (
                             <div className="relative bg-gradient-to-r from-yellow-900/80 via-yellow-600/80 to-yellow-900/80 border-2 md:border-4 border-yellow-400 p-4 md:p-6 rounded-2xl md:rounded-3xl text-center shadow-[0_0_30px_rgba(234,179,8,0.4)] backdrop-blur transform hover:scale-[1.01] transition-transform animate-bounce-in z-20">
                                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10 mix-blend-overlay"></div>
                                
                                <div className="flex flex-col md:flex-row items-center justify-center gap-2 md:gap-4 mb-2 relative z-10">
                                    <Crown size={32} className="text-yellow-200 drop-shadow hidden md:block" />
                                    <h2 className="text-3xl md:text-5xl font-black text-white drop-shadow font-display tracking-wider italic">
                                        {winner?.name} WINS!
                                    </h2>
                                    <Crown size={32} className="text-yellow-200 drop-shadow hidden md:block" />
                                </div>
                                
                                <div className="flex items-center justify-center gap-2 md:gap-4 text-lg md:text-2xl font-bold text-white bg-black/40 inline-flex px-4 md:px-8 py-2 rounded-full border border-yellow-400/30 backdrop-blur-md shadow-inner">
                                     <span className="text-neon-green">{winner?.totalVoltage.toFixed(2)}V</span>
                                     <span className="text-gray-400 font-mono">&gt;</span>
                                     <span className="text-red-400">{loser?.totalVoltage.toFixed(2)}V</span>
                                </div>
                                
                                <div className="mt-2 text-yellow-200/80 font-bold text-xs md:text-sm tracking-[0.1em] uppercase hidden md:block">
                                    <TrilingualText content={{zh: "勝利條件：電壓較大者獲勝", en: "VICTORY: HIGHER VOLTAGE WINS", ja: "勝利条件：高電圧の勝利"}} language={language} />
                                </div>
                             </div>
                         )}
                     </div>
                 )}

                {/* Controls Row */}
                <div className="flex flex-col md:flex-row justify-center gap-2 md:gap-4 mb-2 px-2">
                    {/* Steps */}
                    <div className="flex justify-center gap-1 md:gap-2 flex-wrap">
                        {steps.map((step, idx) => (
                            <button
                                key={idx}
                                onClick={() => {
                                    playGameSound('click');
                                    setResultHistoryStep(idx);
                                }}
                                className={`px-3 py-1 md:px-4 md:py-2 rounded-lg font-bold transition-all border text-xs md:text-sm ${
                                    resultHistoryStep === idx 
                                    ? 'bg-neon-blue text-black border-neon-blue shadow' 
                                    : 'bg-gray-800 text-gray-400 border-gray-600 hover:text-white'
                                }`}
                            >
                                <TrilingualText content={step.label} language={language} />
                            </button>
                        ))}
                    </div>
                    {/* Flow Toggle */}
                    <div className="flex justify-center bg-gray-900 rounded-full p-1 border border-gray-700 w-fit mx-auto md:mx-0">
                        <button 
                            onClick={() => { playGameSound('click'); setFlowMode('ELECTRON'); }}
                            className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${flowMode === 'ELECTRON' ? 'bg-neon-blue text-black' : 'text-gray-400'}`}
                        >
                            e⁻
                        </button>
                        <button 
                            onClick={() => { playGameSound('click'); setFlowMode('CURRENT'); }}
                            className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${flowMode === 'CURRENT' ? 'bg-red-500 text-white' : 'text-gray-400'}`}
                        >
                            I
                        </button>
                    </div>
                </div>

                {/* Action Button (Moved from bottom footer to header) */}
                <div className="flex justify-center mt-2 pb-2">
                    {isFinal ? (
                        <button 
                            onClick={() => window.location.reload()} 
                            className="bg-gray-700 text-white px-6 py-2 rounded-lg hover:bg-gray-600 flex items-center justify-center gap-2 active:scale-95 transition-transform text-sm md:text-base font-bold shadow-lg border border-gray-500"
                        >
                            <RotateCcw size={18} /> <TrilingualText content={{zh: "重置系統", en: "RESET SYSTEM", ja: "システムリセット"}} language={language} />
                        </button>
                    ) : (
                        <button 
                            onClick={startNextRound} 
                            className="bg-neon-blue text-black font-black px-8 py-2 rounded-lg hover:scale-105 transition flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(0,243,255,0.4)] active:scale-95 text-base md:text-lg"
                        >
                            <TrilingualText content={{zh: "下一回合", en: "NEXT ROUND", ja: "次のラウンド"}} language={language} /> <ArrowRight size={20} />
                        </button>
                    )}
                </div>
            </div>

            {/* Scrollable Content: Team Cards */}
            <div className="flex-1 overflow-y-auto px-2 md:px-4 pb-4 custom-scrollbar pt-2">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-8 max-w-7xl mx-auto h-full">
                    {teams.map((t, index) => {
                        const isWinner = t.status === 'Winner';
                        const targetHistoryIndex = steps[resultHistoryStep].historyIndex;
                        const snapshot = t.history[targetHistoryIndex] || t.history[t.history.length - 1]; 
                        const prevSnapshot = t.history[targetHistoryIndex - 1]; 
                        const currentV = snapshot?.totalVoltage || 0;
                        const delta = currentV - (prevSnapshot?.totalVoltage || 0);
                        const hasChange = Math.abs(delta) > 0.01 && targetHistoryIndex > 1; 

                        const calc = generateCalculationLog(snapshot?.cell1 || t.cell1, snapshot?.cell2 || t.cell2, currentV);
                        const displayTeam: Team = {
                            ...t,
                            cell1: snapshot?.cell1 || t.cell1,
                            cell2: snapshot?.cell2 || t.cell2,
                            wires: snapshot?.wires || t.wires,
                            totalVoltage: currentV
                        };

                        // Calculate Reactions
                        const r1 = getCellReactions(snapshot?.cell1 || t.cell1);
                        const r2 = getCellReactions(snapshot?.cell2 || t.cell2);

                        return (
                            <div 
                                key={t.id} 
                                className={`p-3 md:p-5 rounded-3xl border-2 md:border-4 flex flex-col h-full transition-all duration-500 relative overflow-hidden ${
                                    isWinner 
                                    ? 'border-yellow-500 bg-gradient-to-b from-yellow-900/20 to-gray-900 shadow-[0_0_20px_rgba(234,179,8,0.2)] lg:scale-[1.01] lg:ring-2 lg:ring-yellow-500/50' 
                                    : 'border-gray-700 bg-gray-900/40 opacity-90 lg:scale-[0.98]'
                                }`}
                                style={{ zIndex: teams.length - index }} 
                            >
                                {/* Card Header */}
                                <div className="flex justify-between items-center mb-2 md:mb-4 border-b border-gray-700 pb-2 relative z-10">
                                    <h3 className={`text-xl md:text-3xl font-bold font-display truncate ${isWinner ? 'text-yellow-400' : 'text-gray-300'}`}>{t.name}</h3>
                                    <div className={`text-xs md:text-sm font-black px-2 py-1 rounded flex items-center gap-1 ${isWinner ? 'bg-yellow-500 text-black' : 'bg-gray-800 text-gray-500'}`}>
                                         {isWinner ? (
                                             <><Trophy size={14} /><TrilingualText content={{zh: "勝", en: "WIN", ja: "勝"}} language={language} /></>
                                         ) : (
                                             <TrilingualText content={t.status === 'Loser' ? {zh: "敗", en: "LOSE", ja: "負"} : {zh: "平", en: "DRAW", ja: "平"}} language={language} />
                                         )}
                                    </div>
                                </div>
                                
                                {/* Action Log */}
                                <div className="bg-black/40 p-2 md:p-3 rounded-xl mb-2 md:mb-4 min-h-[60px] md:min-h-[80px] flex items-center justify-center border border-gray-600/50 relative z-10">
                                    {snapshot?.actionDescription ? (
                                        <div className="text-center w-full">
                                            {snapshot.cardUsed && (
                                                <div className="text-neon-blue text-[10px] md:text-xs font-bold uppercase mb-0.5 truncate px-2">
                                                    <TrilingualText content={snapshot.cardUsed.title} language={language} />
                                                </div>
                                            )}
                                            <div className="text-white font-medium text-sm md:text-lg leading-tight line-clamp-3">
                                                <TrilingualText content={snapshot.actionDescription} language={language} />
                                            </div>
                                        </div>
                                    ) : (
                                        <span className="text-gray-500 italic text-sm">
                                            <TrilingualText content={{zh: "無變化", en: "No changes", ja: "変更なし"}} language={language} />
                                        </span>
                                    )}
                                </div>

                                {/* Board Preview (Aspect Ratio Maintained - No Outer Border) */}
                                <div className="w-full aspect-[4/3] relative bg-gray-900 rounded-xl overflow-hidden shadow-inner z-10 mb-2 md:mb-4 shrink-0">
                                    <ScaledBoardPreview 
                                        team={displayTeam} 
                                        gameMode={gameMode || GameMode.PRACTICE} 
                                        language={language}
                                        showFlow={Math.abs(currentV) > 0} 
                                        forcedVoltage={currentV}
                                        flowMode={flowMode}
                                    />
                                </div>

                                {/* Stats Grid - Split into 2 columns on Tablet/Desktop for compactness */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 relative z-10 flex-grow">
                                    {/* Voltage Calc */}
                                    <div className="p-2 md:p-3 bg-gray-800/60 rounded-xl text-xs md:text-sm font-mono text-gray-300 space-y-1 border border-gray-700 h-full">
                                        <div className="text-[10px] text-gray-500 uppercase font-bold tracking-wider mb-1 border-b border-gray-700 pb-1">
                                            <TrilingualText content={{zh: "電壓計算", en: "VOLTAGE CALC", ja: "電圧計算"}} language={language} />
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="opacity-70">C1:</span>
                                            <span className="text-white">{calc.cell1Math.split('=')[0]}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="opacity-70">C2:</span>
                                            <span className="text-white">{calc.cell2Math.split('=')[0]}</span>
                                        </div>
                                        <div className="flex justify-between pt-1 font-bold text-white border-t border-gray-700/50 mt-1">
                                            <span>∑:</span>
                                            <span>{currentV.toFixed(2)}V</span>
                                        </div>
                                    </div>

                                    {/* Reactions */}
                                    <div className="p-2 md:p-3 bg-gray-900/80 rounded-xl border border-gray-600 text-xs h-full">
                                        <div className="text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-1 flex items-center gap-1 border-b border-gray-700 pb-1">
                                            <FlaskConical size={10} /> 
                                            <TrilingualText content={{zh: "反應", en: "REACTIONS", ja: "反応"}} language={language} />
                                        </div>
                                        <div className="space-y-1 overflow-hidden">
                                            {r1.hasReaction ? (
                                                 <div className="truncate"><span className="text-gray-500 font-bold">C1:</span> <span className="text-cyan-300">{r1.ox?.metal}/{r1.red?.metal}</span></div>
                                            ) : <div className="text-gray-600 italic">C1: None</div>}
                                            {r2.hasReaction ? (
                                                 <div className="truncate"><span className="text-gray-500 font-bold">C2:</span> <span className="text-cyan-300">{r2.ox?.metal}/{r2.red?.metal}</span></div>
                                            ) : <div className="text-gray-600 italic">C2: None</div>}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
      );
  };

  const renderLogViewer = () => {
    if (!showLogViewer) return null;

    const filteredLogs = logs.filter(l => {
        if (logViewTab === 'SYSTEM') return l.type === 'system' || l.type === 'info';
        if (logViewTab === 'TEAM1') return l.message.includes(teams[0]?.name || 'Team 1');
        if (logViewTab === 'TEAM2') return l.message.includes(teams[1]?.name || 'Team 2');
        return true;
    });

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur p-4" onClick={() => setShowLogViewer(false)}>
            <div className="bg-gray-900 border-2 border-neon-blue rounded-3xl w-full max-w-3xl h-[70vh] flex flex-col shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center p-6 border-b border-gray-800 bg-gray-900/50">
                    <h3 className="text-2xl font-bold text-white flex items-center gap-3">
                        <History /> <TrilingualText content={{zh: "任務日誌", en: "Mission Logs", ja: "ミッションログ"}} language={language} />
                    </h3>
                    <button onClick={() => setShowLogViewer(false)} className="text-gray-400 hover:text-white">
                        <X size={24} />
                    </button>
                </div>
                
                <div className="flex border-b border-gray-800">
                    <button 
                        onClick={() => { playGameSound('click'); setLogViewTab('SYSTEM'); }} 
                        className={`flex-1 py-4 font-bold transition ${logViewTab === 'SYSTEM' ? 'bg-neon-blue/10 text-neon-blue border-b-2 border-neon-blue' : 'text-gray-500 hover:text-white'}`}
                    >
                        SYSTEM
                    </button>
                    <button 
                        onClick={() => { playGameSound('click'); setLogViewTab('TEAM1'); }} 
                        className={`flex-1 py-4 font-bold transition ${logViewTab === 'TEAM1' ? 'bg-neon-blue/10 text-neon-blue border-b-2 border-neon-blue' : 'text-gray-500 hover:text-white'}`}
                    >
                        {teams[0]?.name || 'TEAM A'}
                    </button>
                    <button 
                        onClick={() => { playGameSound('click'); setLogViewTab('TEAM2'); }} 
                        className={`flex-1 py-4 font-bold transition ${logViewTab === 'TEAM2' ? 'bg-neon-blue/10 text-neon-blue border-b-2 border-neon-blue' : 'text-gray-500 hover:text-white'}`}
                    >
                        {teams[1]?.name || 'TEAM B'}
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar bg-black/20">
                    {filteredLogs.length === 0 ? (
                        <div className="text-center text-gray-600 py-10 italic">No logs recorded.</div>
                    ) : (
                        filteredLogs.map(log => (
                            <div key={log.id} className="flex gap-4 items-start animate-fade-in">
                                <span className="text-xs text-gray-500 font-mono mt-1 w-16">{log.timestamp.toLocaleTimeString()}</span>
                                <div className={`flex-1 p-3 rounded-lg text-sm ${log.type === 'system' ? 'bg-blue-900/20 text-blue-300 border border-blue-900/50' : log.type === 'attack' ? 'bg-red-900/20 text-red-300 border border-red-900/50' : 'bg-gray-800 text-gray-300'}`}>
                                    {log.message}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
  };

  return (
    <div className={`min-h-screen text-gray-100 p-4 font-sans w-full overflow-hidden select-none flex flex-col transition-colors duration-700 ${bgClass}`}>
        {showManual && <GameManual onClose={() => setShowManual(false)} />}
        {renderLogViewer()}

        {/* --- Top Navigation Bar --- */}
        <div className="w-full max-w-7xl mx-auto mb-4 flex flex-col gap-0 bg-gray-900/50 rounded-2xl border border-gray-700 backdrop-blur-md sticky top-2 z-50 shadow-xl flex-shrink-0 relative overflow-hidden">
             
             <div className="flex justify-between items-center p-4">
                 <div className="flex items-center gap-3">
                     <Zap className="text-neon-blue w-8 h-8" />
                     <h1 className="font-bold tracking-widest text-2xl font-display hidden md:block">VOLTAGE WARS</h1>
                     {gameMode && (
                         <div className={`px-3 py-0.5 rounded-full text-xs font-bold border ${gameMode === GameMode.PRACTICE ? 'border-green-500 text-green-400 bg-green-900/20' : 'border-purple-500 text-purple-400 bg-purple-900/20'}`}>
                             {gameMode === GameMode.PRACTICE ? <TrilingualText content={{zh: "模擬戰", en: "SIMULATION", ja: "シミュレーション"}} language={language} /> : <TrilingualText content={{zh: "排名戰", en: "RANKED", ja: "ランク戦"}} language={language} />}
                         </div>
                     )}
                 </div>

                 {/* Digital Timer (Text) */}
                 {phase !== GamePhase.SETUP && !phase.includes('SUMMARY') && phase !== GamePhase.GAME_OVER && phase !== GamePhase.COIN_TOSS && (
                     <div className={`flex items-center gap-2 px-4 py-1.5 rounded-full border ${timeLeft < 30 ? 'bg-red-900/50 border-red-500 animate-pulse' : 'bg-gray-800 border-gray-700'}`}>
                        <Timer size={20} className={timeLeft < 30 ? 'text-red-400' : 'text-neon-green'} />
                        <span className={`font-mono font-bold text-xl ${timeLeft < 30 ? 'text-red-400' : 'text-white'}`}>
                            {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                        </span>
                     </div>
                 )}

                 <div className="flex items-center gap-4">
                     {/* Language Toggle */}
                     <div className="flex bg-gray-800 rounded-lg p-1 border border-gray-600">
                         {(['zh', 'en', 'ja'] as Language[]).map(lang => (
                             <button 
                                key={lang}
                                onClick={() => { playGameSound('click'); setLanguage(lang); }}
                                className={`px-3 py-1 rounded text-sm font-bold transition-all ${language === lang ? 'bg-neon-blue text-black shadow' : 'text-gray-400 hover:text-white'}`}
                             >
                                 {lang.toUpperCase()}
                             </button>
                         ))}
                     </div>

                     {/* Controls */}
                     <div className="flex gap-2 border-l border-gray-700 pl-4">
                         {phase !== GamePhase.SETUP && (
                             <button 
                                onClick={() => { playGameSound('click'); setShowHelpModal(true); }}
                                className="p-2 bg-neon-purple/20 text-neon-purple rounded-lg hover:bg-neon-purple/40 border border-neon-purple/30 transition shadow-lg active:scale-95"
                             >
                                <HelpCircle size={24} />
                             </button>
                         )}
                         <button onClick={() => { playGameSound('click'); setShowLogViewer(true); }} className="p-2 text-neon-blue hover:bg-gray-800 rounded-lg">
                            <ScrollText size={24} />
                         </button>
                         <button onClick={() => { playGameSound('click'); toggleFullscreen(); }} className="p-2 text-gray-400 hover:bg-gray-800 rounded-lg hidden md:block">
                            {isFullscreen ? <Minimize size={24} /> : <Maximize size={24} />}
                         </button>
                     </div>
                 </div>
             </div>

             {/* Visual Progress Bar Timer */}
             {phase !== GamePhase.SETUP && !phase.includes('SUMMARY') && phase !== GamePhase.GAME_OVER && phase !== GamePhase.COIN_TOSS && (
                 <div className="w-full h-1 bg-gray-800 relative">
                     <div 
                        className={`h-full transition-all duration-1000 ease-linear ${currentTheme === 'blue' ? 'bg-neon-blue shadow-[0_0_10px_rgba(0,243,255,0.7)]' : 'bg-neon-purple shadow-[0_0_10px_rgba(188,19,254,0.7)]'}`}
                        style={{ width: `${(timeLeft / ROUND_DURATION) * 100}%` }}
                     />
                 </div>
             )}
        </div>

        {/* --- Help Modal --- */}
        {showHelpModal && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur p-4" onClick={() => setShowHelpModal(false)}>
                <div className="bg-gray-900 border-2 border-neon-purple rounded-3xl p-8 max-w-lg w-full text-center shadow-[0_0_50px_rgba(188,19,254,0.3)] animate-fade-in relative" onClick={e => e.stopPropagation()}>
                    <button onClick={() => setShowHelpModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-white">
                        <X size={24} />
                    </button>
                    <div className="w-16 h-16 bg-neon-purple/20 rounded-full flex items-center justify-center mx-auto mb-6">
                        <HelpCircle size={40} className="text-neon-purple" />
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-4 font-display">
                        <TrilingualText content={{zh: "任務目標", en: "Mission Objective", ja: "ミッション目標"}} language={language} />
                    </h3>
                    <div className="text-xl text-gray-300 leading-relaxed font-medium">
                        <TrilingualText content={instruction} language={language} size="lg" />
                    </div>
                </div>
            </div>
        )}

        {/* --- Main Game Area --- */}
        <main className="w-full max-w-7xl mx-auto flex-1 flex flex-col items-center overflow-hidden">
             
             {/* Turn Banner */}
             {activeTeamName && !phase.includes('SUMMARY') && phase !== GamePhase.GAME_OVER && (
                 <div className={`mb-6 bg-gradient-to-r py-2 px-12 rounded-full border flex-shrink-0 transition-all duration-500 ${themeClasses[currentTheme]}`}>
                     <span className={`font-bold tracking-[0.2em] text-sm uppercase mr-4 opacity-80 ${currentTheme === 'blue' ? 'text-neon-blue' : 'text-neon-purple'}`}>
                         <TrilingualText content={{zh: "當前階段", en: "CURRENT PHASE", ja: "現在のフェーズ"}} language={language} />
                     </span>
                     <span className="text-2xl font-black text-white font-display">{activeTeamName}</span>
                 </div>
             )}

             {/* Setup Phase */}
             {phase === GamePhase.SETUP && (
                <div className="w-full max-w-4xl bg-gray-800/50 border border-gray-700 p-12 rounded-[2.5rem] text-center shadow-2xl mt-8 flex-shrink-0">
                    <Zap size={80} className="mx-auto text-neon-blue mb-8 animate-pulse" />
                    <h1 className="text-6xl font-black mb-10 text-transparent bg-clip-text bg-gradient-to-r from-neon-blue to-neon-purple font-display">VOLTAGE WARS</h1>
                    
                    <div className="space-y-6 max-w-2xl mx-auto">
                        <input className="w-full bg-black/40 p-6 rounded-xl border-2 border-gray-600 text-white text-2xl focus:border-neon-blue outline-none text-center" placeholder={language === 'zh' ? "隊伍 A 名稱" : language === 'ja' ? "チームAの名前" : "Team Alpha Name"} value={name1} onChange={e => setName1(e.target.value)} />
                        <input className="w-full bg-black/40 p-6 rounded-xl border-2 border-gray-600 text-white text-2xl focus:border-neon-purple outline-none text-center" placeholder={language === 'zh' ? "隊伍 B 名稱" : language === 'ja' ? "チームBの名前" : "Team Beta Name"} value={name2} onChange={e => setName2(e.target.value)} />
                        
                        <div className="grid grid-cols-2 gap-6 mt-8">
                            <button 
                                onClick={() => startGame(GameMode.PRACTICE)} 
                                className="group bg-gray-900 hover:bg-green-900/30 border-2 border-gray-700 hover:border-green-500 rounded-2xl p-6 transition-all"
                            >
                                <GraduationCap size={40} className="text-green-500 mx-auto mb-2" />
                                <div className="text-xl font-bold text-white"><TrilingualText content={{zh: "訓練模式", en: "TRAINING", ja: "トレーニング"}} language={language} /></div>
                                <div className="text-green-400 text-sm"><TrilingualText content={{zh: "包含手冊與日誌", en: "Manual & Logs", ja: "マニュアルとログ"}} language={language} /></div>
                            </button>

                            <button 
                                onClick={() => startGame(GameMode.COMPETITIVE)} 
                                className="group bg-gray-900 hover:bg-purple-900/30 border-2 border-gray-700 hover:border-neon-purple rounded-2xl p-6 transition-all"
                            >
                                <Swords size={40} className="text-neon-purple mx-auto mb-2" />
                                <div className="text-xl font-bold text-white"><TrilingualText content={{zh: "排名模式", en: "RANKED", ja: "ランク戦"}} language={language} /></div>
                                <div className="text-neon-purple text-sm"><TrilingualText content={{zh: "三戰兩勝制", en: "Best of 3", ja: "3本勝負"}} language={language} /></div>
                            </button>
                        </div>
                    </div>
                </div>
             )}

             {/* Stages */}
             {(phase === GamePhase.A_DRAW || phase === GamePhase.B_DRAW) && (
                 <div className="w-full h-full overflow-y-auto custom-scrollbar">
                     <AssemblyStage 
                        key={phase} 
                        teamName={phase === GamePhase.A_DRAW ? teams[0].name : teams[1].name} 
                        isDrawPhase={true} 
                        onComplete={(hand) => handleDrawComplete(phase === GamePhase.A_DRAW ? 0 : 1, hand)} 
                        onUpdate={handleAssemblyUpdate}
                        language={language}
                        themeColor={currentTheme}
                     />
                 </div>
             )}

             {(phase === GamePhase.A_ASSEMBLE || phase === GamePhase.B_ASSEMBLE) && (
                 <div className="w-full h-full overflow-y-auto custom-scrollbar">
                     <AssemblyStage 
                        key={phase} 
                        teamName={phase === GamePhase.A_ASSEMBLE ? teams[0].name : teams[1].name} 
                        isDrawPhase={false} 
                        existingTeamData={phase === GamePhase.A_ASSEMBLE ? teams[0] : teams[1]} 
                        onComplete={(h, c1, c2) => handleAssemblyComplete(phase === GamePhase.A_ASSEMBLE ? 0 : 1, h, c1, c2)} 
                        onUpdate={handleAssemblyUpdate}
                        language={language}
                        themeColor={currentTheme}
                     />
                 </div>
             )}

             {(phase === GamePhase.A_WIRING || phase === GamePhase.B_WIRING) && (
                 <div className="w-full max-w-6xl h-full flex flex-col justify-center">
                     <WiringStage 
                        key={phase}
                        team={phase === GamePhase.A_WIRING ? teams[0] : teams[1]} 
                        onUpdate={(w, p, v, c, u) => handleWiringUpdate(phase === GamePhase.A_WIRING ? 0 : 1, w, p, v, c, u)} 
                        onConfirm={() => handleWiringConfirm(phase === GamePhase.A_WIRING ? 0 : 1)} 
                        hideVoltage={true}
                        gameMode={gameMode || GameMode.PRACTICE}
                        showFlow={false}
                        language={language}
                        themeColor={currentTheme}
                     />
                 </div>
             )}

             {(phase === GamePhase.JOINT_DRAW_ANIMATION || phase.includes('ACTION') || phase === GamePhase.COIN_TOSS) && (
                 <div className="w-full h-full overflow-y-auto custom-scrollbar">
                     <BattleStage 
                        phase={phase} 
                        activeTeam={(activeTeamName === teams[0].name) ? teams[0] : teams[1]} 
                        opponentTeam={(activeTeamName === teams[0].name) ? teams[1] : teams[0]} 
                        teams={teams}
                        onDrawCards={handleJointDrawComplete} 
                        onPlayCard={(c, d) => handleCardPlay(activeTeamName === teams[0].name ? 0 : 1, c, d)} 
                        onSkip={handleSkip}
                        onCoinTossComplete={handleCoinTossComplete}
                        language={language}
                        gameMode={gameMode || GameMode.PRACTICE}
                        themeColor={currentTheme}
                     />
                 </div>
             )}

             {phase === GamePhase.ROUND_SUMMARY && renderResultScreen(false)}
             {phase === GamePhase.GAME_OVER && renderResultScreen(true)}
        </main>
    </div>
  );
}
