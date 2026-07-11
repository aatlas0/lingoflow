import React, { useState, useEffect } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { useLocalization } from '../contexts/LocalizationContext';
import { generateSkillTree } from '../services/geminiService';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import type { SkillTree, SkillBranch, SkillNode } from '../types';

const NodeTag: React.FC<{ label: string, color: string }> = ({ label, color }) => (
    <span className={`text-xs font-bold px-2 py-1 rounded-full ${color} uppercase tracking-wide`}>
        {label}
    </span>
);

const SkillNodeCard: React.FC<{ node: SkillNode; isUnlocked: boolean }> = ({ node, isUnlocked }) => {
    const { t } = useLocalization();
    const { isHighContrast } = useAppContext();
    const typeColors: Record<string, string> = {
        vocabulary: 'bg-blue-100 text-blue-800',
        grammar: 'bg-purple-100 text-purple-800',
        conversation: 'bg-green-100 text-green-800',
        culture: 'bg-gold/30 text-dark-green',
    };

    const unlockedClasses = isHighContrast
        ? 'bg-night-card border-brand-turquoise hover:shadow-md'
        : 'bg-white border-brand-turquoise hover:shadow-md';

    const lockedClasses = isHighContrast
        ? 'bg-slate-800 border-slate-700 opacity-60'
        : 'bg-gray-50 border-gray-300 opacity-60';

    return (
        <div className={`p-5 rounded-xl border-l-4 shadow-sm transition-all ${isUnlocked ? unlockedClasses : lockedClasses}`}>
            <div className="flex justify-between items-start mb-3">
                <div>
                    <h4 className={`font-bold text-lg ${isHighContrast ? 'text-white' : 'text-dark-green'}`}>{node.node_name}</h4>
                    <p className={`text-xs font-bold uppercase tracking-wider ${isHighContrast ? 'text-slate-400' : 'text-dark-green/50'}`}>{t('skillTree.node.requiresLevel', { level: node.level })}</p>
                </div>
                <div className="flex items-center gap-2 text-xl">
                    {isUnlocked ? <span title={t('skillTree.node.unlocked')} className="grayscale-[0.2]">✅</span> : <span title={t('skillTree.node.locked')} className="grayscale opacity-50">🔒</span>}
                </div>
            </div>
            <p className={`text-sm mb-4 font-medium leading-snug ${isHighContrast ? 'text-slate-300' : 'text-dark-green/80'}`}>{node.objective}</p>
            <ul className={`list-disc list-inside text-sm mb-4 pl-2 space-y-1 p-3 rounded-lg
                ${isHighContrast
                    ? 'bg-slate-700 text-slate-300'
                    : 'bg-desert/30 text-dark-green/70'}
            `}>
                {node.content_examples.map((ex, i) => <li key={i}>{ex}</li>)}
            </ul>
            <div className="flex items-center gap-2 flex-wrap">
                <NodeTag label={node.type} color={typeColors[node.type] || 'bg-gray-200 text-gray-800'} />
                <NodeTag label={t('skillTree.node.difficulty', { difficulty: node.difficulty })} color="bg-deep-red/10 text-deep-red" />
            </div>
        </div>
    );
};


const SkillBranchAccordion: React.FC<{ branch: SkillBranch; userLevel: number }> = ({ branch, userLevel }) => {
    const { t } = useLocalization();
    const { isHighContrast } = useAppContext();
    const [isOpen, setIsOpen] = useState(userLevel >= branch.required_level);
    const isBranchUnlocked = userLevel >= branch.required_level;

    const unlockedClasses = isHighContrast
        ? 'border-slate-700 bg-night-card/60'
        : 'border-white bg-white/60';

    const lockedClasses = isHighContrast
        ? 'border-slate-700 bg-slate-800 opacity-70'
        : 'border-gray-300 bg-gray-100 opacity-70';

    return (
        <div className={`border rounded-xl shadow-sm overflow-hidden ${isBranchUnlocked ? unlockedClasses : lockedClasses}`}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                disabled={!isBranchUnlocked}
                aria-expanded={isOpen}
                className={`w-full flex justify-between items-center p-5 text-left transition-colors 
                    ${isBranchUnlocked
                        ? (isHighContrast ? 'hover:bg-slate-800 text-white' : 'hover:bg-white/80 text-dark-green')
                        : 'cursor-not-allowed text-gray-500'} 
                    ${isOpen ? (isHighContrast ? 'border-b border-slate-700' : 'border-b border-desert-dark/20') : ''}`}
            >
                <div>
                    <h3 className="text-xl font-bold">{branch.branch}</h3>
                    <p className={`text-sm font-medium ${isHighContrast ? 'text-slate-400' : 'opacity-70'}`}>{t('skillTree.branch.requiresLevel', { level: branch.required_level })}</p>
                </div>
                <div className="flex items-center gap-4">
                    {!isBranchUnlocked && <span className="text-2xl opacity-50" title={t('skillTree.node.locked')}>🔒</span>}
                    {isBranchUnlocked && (
                        <span className={`transform transition-transform duration-300 text-brand-turquoise text-2xl ${isOpen ? 'rotate-180' : ''}`}>
                            ▼
                        </span>
                    )}
                </div>
            </button>
            {isOpen && isBranchUnlocked && (
                <div className={`p-5 space-y-4 ${isHighContrast ? 'bg-night-card/40' : 'bg-white/40'}`}>
                    {branch.nodes.map((node) => (
                        <SkillNodeCard
                            key={node.node_name}
                            node={node}
                            isUnlocked={userLevel >= node.level}
                        />
                    ))}
                </div>
            )}
        </div>
    )
}

export const SkillTreeView = () => {
    const { sourceLang, targetLang, profile, setError, isHighContrast, skillTree, setSkillTree } = useAppContext();
    const { t } = useLocalization();
    const [isLoading, setIsLoading] = useState(!skillTree);

    useEffect(() => {
        const fetchSkillTree = async () => {
            if (skillTree) {
                setIsLoading(false);
                return;
            }

            setIsLoading(true);
            try {
                const tree = await generateSkillTree(sourceLang, targetLang, profile.level);
                setSkillTree(tree);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'An unknown error occurred.');
            } finally {
                setIsLoading(false);
            }
        };

        fetchSkillTree();
    }, [sourceLang, targetLang, profile.level, setError, skillTree, setSkillTree]);

    if (isLoading) {
        return <div className={`flex flex-col items-center justify-center h-full ${isHighContrast ? 'text-white' : 'text-dark-green'}`}><LoadingSpinner size="lg" /><p className="mt-4 text-lg">{t('skillTree.loading')}</p></div>;
    }

    if (!skillTree) {
        return <div className="flex flex-col items-center justify-center h-full"><p className="text-xl text-deep-red">{t('skillTree.error')}</p></div>;
    }

    return (
        <div className="w-full h-full max-w-7xl mx-auto p-4 flex flex-col overflow-hidden animate-fade-in">
            <div className="shrink-0 text-center mb-6 md:mb-10">
                <h1 className={`text-3xl md:text-5xl font-bold mb-2 drop-shadow-sm ${isHighContrast ? 'text-white' : 'text-dark-green'}`}>
                    Training Grounds
                </h1>
                <p className={`font-medium max-w-2xl mx-auto ${isHighContrast ? 'text-slate-300' : 'text-dark-green/80'}`}>
                    {t('skillTree.subtitle') || "Hone your skills before venturing into the Saga."}
                </p>
            </div>

            <div className="flex-grow overflow-y-auto pr-2 pb-10 custom-scrollbar">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-start">
                    {skillTree.skill_tree.map(branch => (
                        <SkillBranchAccordion
                            key={branch.branch}
                            branch={branch}
                            userLevel={profile.level}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
};