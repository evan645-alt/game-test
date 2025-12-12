
import React from 'react';
import { MetalType, TrilingualContent, Language } from '../types';
import { getMetalColor, getSolutionColor } from '../utils';

// Helper for extracting string
export const getLocalizedText = (content: TrilingualContent | string, language: Language = 'zh'): string => {
    if (typeof content === 'string') return content;
    return content[language] || content.en;
};

interface TrilingualTextProps {
    content: TrilingualContent | string; 
    className?: string;
    size?: 'sm' | 'md' | 'lg' | 'xl';
    language?: Language; 
}

export const TrilingualText: React.FC<TrilingualTextProps> = ({ content, className = '', size = 'md', language = 'zh' }) => {
    const text = getLocalizedText(content, language as Language);

    const sizeClasses = {
        sm: 'text-sm',
        md: 'text-lg',
        lg: 'text-2xl',
        xl: 'text-4xl',
    };

    return (
        <span className={`${sizeClasses[size]} leading-tight ${className}`}>
            {text}
        </span>
    );
};

interface SaltBridgeProps {
    label?: string;
    className?: string;
}

export const SaltBridge: React.FC<SaltBridgeProps> = ({ label, className = '' }) => {
    return (
        <div className={`absolute left-1/2 -translate-x-1/2 pointer-events-none flex flex-col items-center justify-end ${className}`}>
            {/* Inverted U-Tube Structure */}
            <div className="w-20 md:w-24 h-16 border-t-[8px] border-x-[8px] border-gray-300 rounded-t-[3rem] shadow-lg backdrop-blur-sm relative box-border bg-white/5">
                 {/* Internal Electrolyte Tint */}
                 <div className="absolute inset-0 border-t-[4px] border-x-[4px] border-blue-200/20 rounded-t-[2.5rem] top-0.5 left-0.5 right-0.5 bottom-[-10px]"></div>
            </div>
            {/* Label */}
            {label && (
                <div className="absolute top-[-14px] z-10 bg-gray-800/95 px-2 py-0.5 rounded-full text-[9px] md:text-[10px] text-white font-bold uppercase tracking-wider shadow-md border border-gray-600 whitespace-nowrap">
                    {label}
                </div>
            )}
        </div>
    );
};

interface HalfCellBeakerProps {
    metal: MetalType | null;
    label?: string; // Expecting already localized string here
    isEmpty?: boolean;
    onClick?: () => void;
    className?: string;
    isActive?: boolean; 
}

export const HalfCellBeaker: React.FC<HalfCellBeakerProps> = ({ metal, label, isEmpty, onClick, className = '', isActive = false }) => {
    const metalColor = getMetalColor(metal);
    const liquidColor = getSolutionColor(metal);

    return (
        <div 
            className={`relative w-full h-full min-w-[80px] min-h-[100px] flex flex-col items-center select-none transition-transform duration-200 ${isActive ? 'scale-105 ring-4 ring-neon-green rounded-xl' : ''} ${className}`} 
            onClick={onClick}
        >
            {/* Label */}
            {label && <div className="mb-1 text-xs text-gray-400 font-mono uppercase tracking-widest font-bold whitespace-nowrap">{label}</div>}

            {/* SVG Beaker */}
            <svg width="100%" height="100%" viewBox="0 0 100 120" className="drop-shadow-lg">
                <defs>
                    <linearGradient id={`grad-${metal}`} x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor={metalColor} stopOpacity="0.8" />
                        <stop offset="50%" stopColor={metalColor} stopOpacity="1" />
                        <stop offset="100%" stopColor={metalColor} stopOpacity="0.8" />
                    </linearGradient>
                </defs>

                {/* Glass Container */}
                <path 
                    d="M10,10 L10,100 Q10,115 25,115 L75,115 Q90,115 90,100 L90,10" 
                    fill="none" 
                    stroke={isActive ? "#0aff00" : "rgba(255,255,255,0.3)"} 
                    strokeWidth="3" 
                />
                
                {/* Liquid */}
                {!isEmpty && (
                    <path 
                        d="M12,40 L12,100 Q12,113 25,113 L75,113 Q88,113 88,100 L88,40 Z" 
                        fill={liquidColor} 
                    />
                )}

                {/* Electrode */}
                {!isEmpty && metal && (
                    <g>
                        {/* The Rod */}
                        <rect x="35" y="0" width="30" height="95" fill={`url(#grad-${metal})`} stroke="rgba(0,0,0,0.3)" />
                        {/* Metal Symbol Text */}
                        <text x="50" y="55" textAnchor="middle" fill="white" fontSize="24" fontWeight="bold" style={{ textShadow: '2px 2px 3px black' }}>
                            {metal}
                        </text>
                    </g>
                )}

                {/* Empty State */}
                {isEmpty && (
                     <text x="50" y="70" textAnchor="middle" fill="rgba(255,255,255,0.2)" fontSize="14" fontWeight="bold">EMPTY</text>
                )}
            </svg>
        </div>
    );
};
