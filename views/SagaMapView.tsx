import React, { useEffect, useState, useRef } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { useImmersion } from '../contexts/ImmersionContext';
import { generateSagaMap, generateQuizFromTopics } from '../services/geminiService';
import { readAiCache, writeAiCache } from '../utils/aiCache';
import type { MapNode, SagaMap } from '../types';
import { CityEpisodeView } from './CityEpisodeView';
import { effectiveStreak } from '../utils/streak';

// --- Hero's Journal Component ---
const HeroJournal: React.FC<{ map: SagaMap; profile: any }> = ({ map, profile }) => {
    const { isHighContrast } = useAppContext();
    const { t, immersionLevel } = useImmersion();

    // Find next objective
    const nextNode = map.nodes.find(n => n.status === 'available');
    const currentBiome = map.nodes.find(n => n.id === map.userPosition)?.biome || 'forest';

    const getBiomeLore = (biome: string) => {
        switch (biome) {
            case 'desert': return t('lore_desert');
            case 'mountain': return t('lore_mountain');
            case 'forest': default: return t('lore_forest');
        }
    };

    return (
        <div className={`
            h-[calc(100%-2rem)] w-[calc(100%-2rem)] m-4 rounded-3xl flex flex-col relative overflow-hidden
            ${isHighContrast ? 'bg-night-card text-night-text' : 'bg-desert text-dark-green'}
            shadow-2xl border border-teal-900/10
        `}>
            {/* Pattern Overlay */}
            <div className="absolute inset-0 pointer-events-none opacity-[0.03]"
                style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='20' height='20' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23000000' fill-opacity='1' fill-rule='evenodd'%3E%3Ccircle cx='3' cy='3' r='3'/%3E%3Ccircle cx='13' cy='13' r='3'/%3E%3C/g%3E%3C/svg%3E")` }}
            ></div>

            {/* Header */}
            <div className="relative h-32 bg-gradient-to-b from-[#123A33] to-[#0F1613] flex items-center justify-center p-4 text-center overflow-hidden shrink-0">
                {/* Decorative Circles */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl translate-x-1/2 -translate-y-1/2"></div>

                <div className="relative z-10 text-white mt-2">
                    <div className="text-4xl mb-1 filter drop-shadow-[0_0_10px_rgba(251,191,36,0.4)]">📜</div>
                    <h2 className="text-2xl font-bold font-serif text-amber-50">{t('lbl_hero_journal')}</h2>
                </div>

            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 relative z-10 custom-scrollbar">

                {/* Current Objective */}
                <div className={`p-4 rounded-xl border shadow-sm ${isHighContrast ? 'bg-[#22302A] border-[#2A362F]' : 'bg-white/60 border-teal-900/10'}`}>
                    <div className="flex items-center gap-2 mb-2 opacity-80">
                        <span className="text-base">🧭</span>
                        <h3 className={`font-bold uppercase tracking-wider text-[10px] ${isHighContrast ? 'text-[#2DD4BF]' : 'text-ink-soft'}`}>{t('lbl_objective')}</h3>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="text-3xl filter drop-shadow-sm">{nextNode?.type === 'city' ? '🏔️' : '💎'}</div>
                        <div>
                            <p className={`font-bold text-lg leading-tight ${isHighContrast ? 'text-night-text' : 'text-dark-green'}`}>
                                {nextNode ? ((immersionLevel || 0) >= 50 ? nextNode.title : (nextNode.titleNative || nextNode.title)) : t('lbl_unknown_dest')}
                            </p>
                            <p className={`opacity-70 text-xs font-mono ${isHighContrast ? 'text-night-teal' : 'text-teal-800'}`}>{t('lbl_distance')}: 2 {t('lbl_days')}</p>
                        </div>
                    </div>
                </div>

                {/* Biome Lore */}
                <div className={`p-4 rounded-xl border shadow-sm ${isHighContrast ? 'bg-[#22302A] border-[#2A362F]' : 'bg-white/60 border-teal-900/10'}`}>
                    <div className="flex items-center gap-2 mb-2 opacity-80">
                        <span className="text-base">🗺️</span>
                        <h3 className={`font-bold uppercase tracking-wider text-[10px] ${isHighContrast ? 'text-[#2DD4BF]' : 'text-ink-soft'}`}>{t('lbl_lore')}</h3>
                    </div>
                    <p className={`italic text-base leading-relaxed font-serif ${isHighContrast ? 'text-night-text/90' : 'text-dark-green/90'}`}>"{getBiomeLore(currentBiome)}"</p>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-3">
                    <div className={`p-3 rounded-xl border text-center ${isHighContrast ? 'bg-[#22302A] border-[#2A362F]' : 'bg-white/60 border-teal-900/10'}`}>
                        <div className="text-xl mb-1">🔥</div>
                        <div className={`text-xl font-bold ${isHighContrast ? 'text-night-text' : 'text-dark-green'}`}>{effectiveStreak(profile)}</div>
                        <div className={`text-[10px] opacity-70 uppercase font-bold ${isHighContrast ? 'text-[#2DD4BF]' : 'text-ink-soft'}`}>{t('lbl_streak')}</div>
                    </div>
                    <div className={`p-3 rounded-xl border text-center ${isHighContrast ? 'bg-[#22302A] border-[#2A362F]' : 'bg-white/60 border-teal-900/10'}`}>
                        <div className="text-xl mb-1">✨</div>
                        <div className={`text-xl font-bold ${isHighContrast ? 'text-night-text' : 'text-dark-green'}`}>{profile.xp}</div>
                        <div className={`text-[10px] opacity-70 uppercase font-bold ${isHighContrast ? 'text-[#2DD4BF]' : 'text-ink-soft'}`}>{t('lbl_xp')}</div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- Node Component ---
const NodeComponent: React.FC<{ node: MapNode; isCurrent: boolean; isSelected: boolean; onClick: () => void; index: number }> = ({ node, isCurrent, isSelected, onClick, index }) => {
    const { isHighContrast } = useAppContext();
    const { t, immersionLevel } = useImmersion();

    // Simplified Size
    const size = 60; // Uniform size for all nodes

    // Visual Styles
    let baseClass = "transform transition-all duration-300 rounded-full flex items-center justify-center font-bold text-xl border-4";
    let content = `${index + 1}`; // Just the number

    if (node.status === 'locked') {
        baseClass += isHighContrast
            ? " bg-night-card border-[#2A362F] text-[#5C6F69] cursor-not-allowed"
            : " bg-desert-dark border-[#D8D1C0] text-dark-green/40 cursor-not-allowed";
    } else if (node.status === 'available') {
        baseClass += " cursor-pointer hover:scale-110 animate-pulse-slow";
        baseClass += isHighContrast
            ? " bg-brand-turquoise text-dark-green border-white shadow-[0_0_15px_rgba(56,189,248,0.6)]"
            : " bg-brand-turquoise text-white border-white shadow-[0_0_15px_rgba(45,212,191,0.6)]";
    } else if (node.status === 'completed' || node.status === 'perfect') {
        baseClass += " cursor-pointer hover:scale-105";
        baseClass += isHighContrast
            ? " bg-gold text-dark-green border-gold"
            : " bg-gold text-white border-gold";
    }

    // Selected State Highlight — teal, selection is an act not a reward
    if (isSelected) {
        baseClass += " ring-4 ring-brand-turquoise/50 scale-125 z-50";
    }

    return (
        <div
            className={`absolute z-10 ${baseClass}`}
            style={{
                left: `${node.position.x}%`,
                top: `${node.position.y}px`,
                width: `${size}px`,
                height: `${size}px`,
                transform: `translate(-50%, -50%)`
            }}
            onClick={node.status !== 'locked' ? onClick : undefined}
        >
            {content}

            {/* Label for Cities (Optional, maybe keep it simple?) */}
            {node.type === 'city' && (
                <div className={`
                    absolute top-full mt-2 px-3 py-1 rounded-lg text-xs font-bold whitespace-nowrap shadow-sm
                    ${isHighContrast ? 'bg-night-card text-night-text' : 'bg-white text-dark-green'}
                `}>
                    {(immersionLevel || 0) >= 50 ? node.title : (node.titleNative || node.title)}
                </div>
            )}
        </div>
    );
};

export const SagaMapView = () => {
    const {
        sagaMap, setSagaMap, completeNode,
        profile, setView, isHighContrast,
        sourceLang, targetLang, setError, setCustomQuiz,
        setCurrentScenario, setActiveNodeId
    } = useAppContext();
    const { t } = useImmersion();
    const [isLoading, setIsLoading] = useState(!sagaMap);
    const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(false);
    const [selectedNode, setSelectedNode] = useState<MapNode | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const fetchMap = async () => {
            // Check if map exists AND has the new data structure (titleNative)
            // Also check if titleNative is actually in the source language (not Arabic/Darija)
            const hasNativeTitles = sagaMap?.nodes?.length && 'titleNative' in sagaMap.nodes[0];
            const isNativeValid = hasNativeTitles && !/[\u0600-\u06FF]/.test(sagaMap.nodes[0].titleNative || '');

            if (sagaMap && hasNativeTitles && isNativeValid) {
                setIsLoading(false);
                return;
            }

            setIsLoading(true);
            try {
                const map = await generateSagaMap(sourceLang, targetLang, profile.level, profile.learnerProfile);
                setSagaMap(map);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'An unknown error occurred.');
            } finally {
                setIsLoading(false);
            }
        };

        fetchMap();
    }, [sourceLang, targetLang, profile.level, setError, sagaMap, setSagaMap]);

    // Auto-scroll to current node
    useEffect(() => {
        if (!isLoading && sagaMap && containerRef.current && !selectedNode) {
            const currentNode = sagaMap.nodes.find(n => n.id === sagaMap.userPosition);
            if (currentNode) {
                const containerHeight = containerRef.current.clientHeight;
                containerRef.current.scrollTo({
                    top: currentNode.position.y - containerHeight / 2 + 250,
                    behavior: 'smooth'
                });
            }
        }
    }, [isLoading, sagaMap, selectedNode]);

    // State for the current active episode
    const [currentEpisode, setCurrentEpisode] = useState<any | null>(null); // Using any for now to avoid import cycles if types aren't perfect
    const [isLoadingEpisode, setIsLoadingEpisode] = useState(false);

    const handleNodeClick = async (node: MapNode) => {
        if (node.status === 'locked') return;

        setSelectedNode(node);

        if (currentEpisode?.nodeId === node.id) return;

        // Episodes are expensive to generate — cache per node so revisiting
        // (or bouncing between nodes) never re-bills a Gemini call. The title
        // in the key invalidates the cache if the map is ever regenerated.
        const cacheKey = `sagaEpisode-${targetLang.code}-${node.id}-${node.title}`;
        const cached = readAiCache<any>(cacheKey);
        if (cached) {
            setCurrentEpisode(cached);
            return;
        }

        setIsLoadingEpisode(true);
        try {
            // Import dynamically to avoid circular dependency issues if any
            const { generateEpisode } = await import('../services/geminiService');
            const episode = await generateEpisode(node, sourceLang, targetLang, profile.learnerProfile);
            writeAiCache(cacheKey, episode);
            setCurrentEpisode(episode);
        } catch (err) {
            console.error("Failed to generate episode", err);
            // Fallback to mock if AI fails? Or just show error
            setError("The spirits of the land are silent. (AI Generation Failed)");
        } finally {
            setIsLoadingEpisode(false);
        }
    };

    const handleStartScenario = async (scenarioId: string) => {
        if (!currentEpisode) return;

        const scenario = currentEpisode.scenarios.find((s: any) => s.id === scenarioId);
        if (!scenario) return;

        console.log("Starting scenario:", scenario.title, scenario.type);

        // Logic to launch the correct view based on scenario type
        if (scenario.type === 'dialogue' || scenario.type === 'negotiation' || scenario.type === 'investigation') {
            // Launch Chat with specific context
            setCurrentScenario(scenario);
            setActiveNodeId(selectedNode?.id || null);
            setView('chat');
        } else {
            // Puzzle or Combat -> Quiz
            // Generate a quiz based on the scenario objective
            setIsGeneratingQuiz(true);
            try {
                const { generateQuizFromTopics } = await import('../services/geminiService');
                const questions = await generateQuizFromTopics([scenario.objective], sourceLang, targetLang);
                setCustomQuiz(questions);
                setView('quiz');
            } catch (err) {
                setError("Failed to prepare the challenge.");
            } finally {
                setIsGeneratingQuiz(false);
            }
        }
    };

    if (isLoading) {
        return (
            <div className={`flex flex-col items-center justify-center h-full ${isHighContrast ? 'text-white' : 'text-dark-green'}`}>
                <div className="w-16 h-16 border-4 border-brand-turquoise border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-xl font-bold animate-pulse">{t('lbl_charting')}</p>
            </div>
        );
    }

    if (!sagaMap) {
        return <div className="flex flex-col items-center justify-center h-full"><p className="text-xl text-deep-red">Map Generation Failed.</p></div>;
    }

    // SVG Path Logic
    const yOffset = 250;
    const pathData = sagaMap.nodes.reduce((acc, node, i, arr) => {
        const currentY = node.position.y + yOffset;
        if (i === 0) return `M ${node.position.x} ${currentY}`;
        const prev = arr[i - 1];
        const prevY = prev.position.y + yOffset;
        const cp1x = prev.position.x;
        const cp1y = prevY + (currentY - prevY) / 2;
        const cp2x = node.position.x;
        const cp2y = prevY + (currentY - prevY) / 2;
        return `${acc} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${node.position.x} ${currentY}`;
    }, '');

    const maxY = sagaMap.nodes[sagaMap.nodes.length - 1].position.y + yOffset + 300;

    // Biome Logic (Optional now, as we are transparent, but keeping for reference or subtle hints if needed)
    const currentBiome = sagaMap.nodes.find(n => n.id === sagaMap.userPosition)?.biome || 'forest';

    return (
        <div className="w-full h-full flex relative overflow-hidden">

            {/* --- MAP SECTION --- */}
            <div className={`
                relative h-full transition-all duration-500 ease-in-out
                ${selectedNode ? 'w-full md:w-1/2' : 'w-full md:w-1/2'}
                bg-transparent
            `}>
                {/* Scroll Container */}
                <div ref={containerRef} className="w-full h-full overflow-y-auto relative custom-scrollbar scroll-smooth px-8">
                    <div className="relative w-full max-w-2xl mx-auto" style={{ height: `${maxY}px` }}>
                        <svg className="absolute top-0 left-0 w-full h-full pointer-events-none" style={{ zIndex: 0 }} viewBox={`0 0 100 ${maxY}`} preserveAspectRatio="none">
                            {sagaMap.nodes.map((node, index) => {
                                if (index === sagaMap.nodes.length - 1) return null;
                                const nextNode = sagaMap.nodes[index + 1];
                                const isCompleted = node.status === 'completed' || node.status === 'perfect';

                                // Simple curve logic
                                const startX = node.position.x;
                                const startY = node.position.y + yOffset;
                                const endX = nextNode.position.x;
                                const endY = nextNode.position.y + yOffset;
                                const midY = (startY + endY) / 2;

                                const d = `M ${startX} ${startY} C ${startX} ${midY}, ${endX} ${midY}, ${endX} ${endY}`;

                                // Light as reward: the traveled route glows teal
                                // and stays solid; the road ahead is a dashed hairline.
                                const stroke = isCompleted
                                    ? (isHighContrast ? '#2DD4BF' : '#0F766E')
                                    : (isHighContrast ? '#3A4740' : '#8A9691');
                                return (
                                    <path
                                        key={`path-${index}`}
                                        d={d}
                                        fill="none"
                                        stroke={stroke}
                                        strokeWidth={isCompleted ? 4 : 3}
                                        strokeLinecap="round"
                                        strokeDasharray={isCompleted ? "0" : "10, 10"}
                                        className="opacity-100"
                                        vectorEffect="non-scaling-stroke"
                                    />
                                );
                            })}
                        </svg>

                        {sagaMap.nodes.map((node, index) => (
                            <NodeComponent
                                key={node.id}
                                node={{ ...node, position: { ...node.position, y: node.position.y + yOffset } }}
                                index={index}
                                isCurrent={node.id === sagaMap.userPosition}
                                isSelected={selectedNode?.id === node.id}
                                onClick={() => handleNodeClick(node)}
                            />
                        ))}
                    </div>
                </div>
            </div>

            {/* --- RIGHT PANEL SECTION (Journal or Lesson) --- */}
            <div className={`
                absolute md:relative inset-0 md:inset-auto z-40
                transition-all duration-500 ease-in-out transform
                ${selectedNode ? 'translate-y-0 md:translate-x-0 opacity-100' : 'translate-y-full md:translate-y-0 md:translate-x-0 opacity-100'}
                w-full md:w-1/2 h-full
            `}>
                {selectedNode ? (
                    <CityEpisodeView
                        node={selectedNode}
                        episode={currentEpisode}
                        isLoading={isLoadingEpisode}
                        onClose={() => setSelectedNode(null)}
                        onStartScenario={handleStartScenario}
                    />
                ) : (
                    <div className="hidden md:block h-full w-full">
                        <HeroJournal map={sagaMap} profile={profile} />
                    </div>
                )}
            </div>
        </div>
    );
};
