import React from 'react';
import { useAppContext } from '../../contexts/AppContext';
import { useLocalization } from '../../contexts/LocalizationContext';
import type { Quest } from '../../types';

const QuestItem: React.FC<{ quest: Quest }> = ({ quest }) => {
    const { t } = useLocalization();
    const progressPercent = Math.min((quest.progress / quest.target) * 100, 100);
    const isCompleted = quest.progress >= quest.target;


    return (
        <div className={`p-2 rounded-xl border-2 transition-all ${isCompleted ? 'bg-brand-turquoise/10 border-brand-turquoise' : 'bg-white border-desert-dark/30'}`}>
            <div className="flex justify-between items-center mb-1">
                <span className={`font-bold text-xs ${isCompleted ? 'text-brand-turquoise' : 'text-dark-green'}`}>
                    {quest.description}
                </span>
                <span className="text-[10px] font-bold text-gold bg-gold/10 px-2 py-0.5 rounded-full">
                    +{quest.rewardXP} XP
                </span>
            </div>

            <div className="relative h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div
                    className={`absolute top-0 left-0 h-full transition-all duration-500 ${isCompleted ? 'bg-brand-turquoise' : 'bg-gold'}`}
                    style={{ width: `${progressPercent}%` }}
                />
            </div>

            <div className="flex justify-between mt-1">
                <span className="text-[9px] text-dark-green/60 font-bold uppercase tracking-wider">
                    {isCompleted ? t('common.quests.completed') : t('common.quests.progress')}
                </span>
                <span className="text-[9px] font-bold text-dark-green">
                    {quest.progress} / {quest.target}
                </span>
            </div>
        </div>
    );
};

export const DailyQuestsCard: React.FC = () => {
    const { dailyQuests } = useAppContext();
    const { t } = useLocalization();

    // Calculate time until reset (midnight)
    // For now, just a static label or simple calculation could work, 
    // but let's keep it simple visually.

    return (
        <div className="w-full bg-white/80 backdrop-blur-sm p-3 rounded-2xl shadow-lg border-2 border-gold h-full">
            <div className="flex justify-between items-center mb-3">
                <h3 className="text-lg font-bold text-dark-green flex items-center gap-2">
                    <span>📜</span> {t('common.quests.title')}
                </h3>
                <span className="text-[10px] font-bold text-deep-red bg-deep-red/10 px-2 py-1 rounded-lg uppercase tracking-wider">
                    {t('common.quests.daily')}
                </span>
            </div>

            <div className="space-y-2">
                {dailyQuests.map(quest => (
                    <QuestItem key={quest.id} quest={quest} />
                ))}
            </div>
        </div>
    );
};
