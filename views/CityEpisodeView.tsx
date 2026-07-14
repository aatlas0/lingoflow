import React, { useState } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { useImmersion } from '../contexts/ImmersionContext';
import type { MapNode, Episode, Scenario } from '../types';

interface EpisodeViewProps {
    node: MapNode;
    episode: Episode | null;
    isLoading: boolean;
    onClose: () => void;
    onStartScenario: (scenarioId: string) => void;
}

export const CityEpisodeView: React.FC<EpisodeViewProps> = ({ node, episode, isLoading, onClose, onStartScenario }) => {
    const { isHighContrast } = useAppContext();
    const { t, immersionLevel, setImmersionLevel } = useImmersion();

    if (isLoading || !episode) {
        return (
            <div className={`
                h-[calc(100%-2rem)] w-[calc(100%-2rem)] m-4 rounded-3xl flex flex-col items-center justify-center relative overflow-hidden
                ${isHighContrast ? 'bg-night-bg text-white' : 'bg-[#fdf6e3] text-dark-green'}
                shadow-2xl border border-teal-900/10
            `}>
                <div className="w-12 h-12 border-4 border-brand-turquoise border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="animate-pulse font-serif italic">Consulting the Oracle...</p>
            </div>
        );
    }

    return (
        <div className={`
            h-[calc(100%-2rem)] w-[calc(100%-2rem)] m-4 rounded-2xl flex flex-col relative overflow-hidden
            ${isHighContrast ? 'bg-night-bg text-white' : 'bg-white text-dark-green'}
            shadow-2xl border border-line dark:border-night-line
        `}>
            {/* Header */}
            <div className={`
                relative p-6 shrink-0 border-b
                ${isHighContrast ? 'bg-night-bg border-night-line' : 'bg-desert border-line/60'}
            `}>
                <button
                    onClick={onClose}
                    className={`
                        absolute top-6 right-6 p-2 rounded-full transition-colors
                        ${isHighContrast ? 'hover:bg-night-card text-night-muted' : 'hover:bg-desert-dark text-ink-soft'}
                    `}
                    title={t('btn_close')}
                >
                    ✕
                </button>

                <div className="max-w-2xl mx-auto">
                    <div className={`text-xs font-bold uppercase tracking-widest mb-2 ${isHighContrast ? 'text-teal-400' : 'text-teal-600'}`}>
                        {t('lbl_episode') || 'Episode'}
                    </div>
                    <h2 className="text-2xl md:text-3xl font-bold mb-2 leading-tight">{episode.title}</h2>
                    <p className={`text-sm leading-relaxed ${isHighContrast ? 'text-night-muted' : 'text-ink-soft'}`}>
                        {episode.intro_narrative}
                    </p>

                    {/* How to Play Section */}
                    {episode.how_to_play && (
                        <div className={`mt-4 p-3 rounded-lg border ${isHighContrast ? 'bg-night-card border-night-line' : 'bg-teal-50 border-teal-100'}`}>
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-lg">🎮</span>
                                <h3 className={`text-xs font-bold uppercase tracking-wider ${isHighContrast ? 'text-teal-400' : 'text-teal-700'}`}>
                                    {t('lbl_how_to_play') || 'How to Play'}
                                </h3>
                            </div>
                            <p className={`text-sm ${isHighContrast ? 'text-night-soft' : 'text-dark-green/80'}`}>
                                {episode.how_to_play}
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Scenarios List */}
            <div className="flex-1 overflow-y-auto px-6 py-8 custom-scrollbar">
                <div className="max-w-2xl mx-auto space-y-4">
                    {episode.scenarios.map((scenario, index) => {
                        const isLocked = scenario.status === 'locked';
                        const isActive = scenario.status === 'active';
                        const isCompleted = scenario.status === 'completed';

                        return (
                            <div
                                key={scenario.id}
                                className={`
                                    group relative p-5 rounded-xl border transition-all duration-200
                                    ${isLocked
                                        ? 'opacity-50 grayscale cursor-not-allowed bg-desert dark:bg-night-card/50'
                                        : 'cursor-pointer hover:shadow-md hover:border-teal-500/30'}
                                    ${isActive
                                        ? (isHighContrast ? 'bg-night-card border-teal-500 ring-1 ring-teal-500' : 'bg-white border-teal-500 ring-1 ring-teal-500')
                                        : (isHighContrast ? 'bg-night-bg border-night-line' : 'bg-white border-line')}
                                `}
                                onClick={() => !isLocked && onStartScenario(scenario.id)}
                            >
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <h3 className="font-bold text-lg">{scenario.title}</h3>
                                            {isCompleted && <span className="text-green-500 text-sm">✓</span>}
                                            {isLocked && <span className="text-night-muted text-sm">🔒</span>}
                                        </div>

                                        <p className={`text-sm mb-3 ${isHighContrast ? 'text-night-muted' : 'text-dark-green/70'}`}>
                                            {scenario.description}
                                        </p>

                                        {!isLocked && (
                                            <div className={`text-xs font-medium ${isHighContrast ? 'text-teal-400' : 'text-teal-600'}`}>
                                                Goal: {scenario.objective}
                                            </div>
                                        )}
                                    </div>

                                    {!isLocked && (
                                        <button className={`
                                            shrink-0 px-4 py-2 rounded-lg text-sm font-bold transition-colors
                                            ${isActive
                                                ? 'bg-teal-600 text-white hover:bg-teal-700'
                                                : 'bg-desert-dark/50 text-dark-green/70 hover:bg-desert-dark dark:bg-night-card dark:text-night-soft'}
                                        `}>
                                            {isActive ? (t('btn_start') || 'Start') : (t('btn_replay') || 'Replay')}
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};
