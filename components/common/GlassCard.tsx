import React from 'react';

interface GlassCardProps {
    children: React.ReactNode;
    className?: string;
    onClick?: () => void;
    hoverEffect?: boolean;
    intensity?: 'low' | 'medium' | 'high';
}

export const GlassCard: React.FC<GlassCardProps> = ({
    children,
    className = '',
    onClick,
    hoverEffect = true,
    intensity = 'medium'
}) => {
    const intensityMap = {
        low: 'bg-white/40 dark:bg-slate-900/40 backdrop-blur-md border-white/20 dark:border-slate-700/30',
        medium: 'bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border-white/30 dark:border-slate-700/40',
        high: 'bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl border-white/40 dark:border-slate-700/50'
    };

    return (
        <div
            onClick={onClick}
            className={`
                relative rounded-3xl border shadow-lg
                ${intensityMap[intensity]}
                ${hoverEffect ? 'transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:border-teal-400/50 cursor-pointer' : ''}
                ${className}
            `}
        >
            {/* Glossy reflection effect */}
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-white/40 to-transparent opacity-50 pointer-events-none" />

            {/* Content */}
            <div className="relative z-10">
                {children}
            </div>
        </div>
    );
};
