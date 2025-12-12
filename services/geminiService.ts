
import { Team, TrilingualContent } from '../types';

// --- Local Commentary Templates ---
// Categorized by game state to mimic AI context awareness

const TEMPLATES = {
    WELCOME: [
        {
            zh: "系統啟動。請各隊伍準備好你們的電化學知識，這將是一場電位差的戰爭。",
            en: "System initialized. Prepare your electrochemical knowledge. This is a war of potential difference.",
            ja: "システム起動。電気化学の知識を準備してください。これは電位差の戦いです。"
        },
        {
            zh: "歡迎來到電壓戰爭。記住：標準還原電位表是你們最好的武器。",
            en: "Welcome to Voltage Wars. Remember: The Standard Reduction Potential table is your best weapon.",
            ja: "Voltage Warsへようこそ。覚えておいてください：標準還元電位表こそが最強の武器です。"
        }
    ],
    HIGH_VOLTAGE: [
        {
            zh: "驚人的高電壓！這隊伍顯然掌握了金屬活性序。",
            en: "Incredible voltage! This team clearly mastered the reactivity series.",
            ja: "驚異的な高電圧！このチームは金属のイオン化傾向を完全に把握しています。"
        },
        {
            zh: "能量讀數爆表！完美的串聯配置。",
            en: "Energy readings are off the charts! A perfect series configuration.",
            ja: "エネルギー測定値が振り切れています！完璧な直列配置です。"
        }
    ],
    NEGATIVE_VOLTAGE: [
        {
            zh: "警告：偵測到負電壓。請檢查您的電極連接方向，紅線應接高電位。",
            en: "WARNING: Negative voltage detected. Check your electrode polarity. Red wire goes to High Potential.",
            ja: "警告：負電圧を検出。電極の極性を確認してください。赤い線は高電位に接続すべきです。"
        },
        {
            zh: "系統錯誤？不，是接反了。負極接到了正極端子。",
            en: "System error? No, just reversed wiring. Anode connected to positive terminal.",
            ja: "システムエラー？いいえ、配線ミスです。負極が正端子に接続されています。"
        }
    ],
    CLOSE_GAME: [
        {
            zh: "勢均力敵！雙方的電壓差距微乎其微。",
            en: "It's neck and neck! The voltage difference is negligible.",
            ja: "接戦です！電圧差はごくわずかです。"
        },
        {
            zh: "目前戰況膠著，下一張功能卡將決定勝負。",
            en: "The battle is tight. The next Action Card will determine the winner.",
            ja: "戦況は拮抗しています。次のアクションカードが勝敗を分けます。"
        }
    ],
    ATTACK: [
        {
            zh: "偵測到惡意干擾！電路穩定性正在下降。",
            en: "Malicious interference detected! Circuit stability is dropping.",
            ja: "悪意のある干渉を検出！回路の安定性が低下しています。"
        },
        {
            zh: "精彩的戰術！對手的電壓瞬間崩潰了。",
            en: "Brilliant tactic! The opponent's voltage has collapsed.",
            ja: "見事な戦術！相手の電圧が一瞬で崩壊しました。"
        }
    ],
    DEFAULT: [
        {
            zh: "請繼續下一步操作。保持專注。",
            en: "Please proceed to the next step. Stay focused.",
            ja: "次の手順に進んでください。集中しましょう。"
        },
        {
            zh: "正在監控電路狀態...",
            en: "Monitoring circuit status...",
            ja: "回路の状態を監視中..."
        }
    ]
};

// --- Helper to pick random template ---
const getRandom = (list: TrilingualContent[]) => list[Math.floor(Math.random() * list.length)];

// --- Main Service Function (Mocking the AI Interface) ---
export const generateCommentary = async (
    teams: Team[],
    lastAction: string
): Promise<TrilingualContent> => {
    
    // Simulate network delay for realism (optional, but feels nicer)
    await new Promise(resolve => setTimeout(resolve, 500));

    // 1. Analyze Game State
    const t1 = teams[0];
    const t2 = teams[1];
    
    // Sort by voltage
    const leader = t1.totalVoltage >= t2.totalVoltage ? t1 : t2;
    const trailer = t1.totalVoltage < t2.totalVoltage ? t1 : t2;
    const diff = Math.abs(t1.totalVoltage - t2.totalVoltage);
    
    const hasNegative = t1.totalVoltage < 0 || t2.totalVoltage < 0;
    const isHighVoltage = leader.totalVoltage > 2.5;
    
    // 2. Determine Context based on lastAction string or State
    let category = 'DEFAULT';

    if (lastAction.toLowerCase().includes('attack') || lastAction.toLowerCase().includes('card') || lastAction.toLowerCase().includes('swap')) {
        category = 'ATTACK';
    } else if (hasNegative) {
        category = 'NEGATIVE_VOLTAGE';
    } else if (isHighVoltage) {
        category = 'HIGH_VOLTAGE';
    } else if (t1.totalVoltage !== 0 && t2.totalVoltage !== 0 && diff < 0.5) {
        category = 'CLOSE_GAME';
    } else if (lastAction.toLowerCase().includes('start') || lastAction.toLowerCase().includes('setup')) {
        category = 'WELCOME';
    }

    // 3. Select Template
    const templateList = TEMPLATES[category as keyof typeof TEMPLATES] || TEMPLATES.DEFAULT;
    return getRandom(templateList);
};
