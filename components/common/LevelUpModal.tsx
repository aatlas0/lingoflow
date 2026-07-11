import React, { useEffect } from 'react';
import { useLocalization } from '../../contexts/LocalizationContext';
import { triggerLevelUpConfetti } from '../../utils/confetti';
import { Button } from './Button';

interface LevelUpModalProps {
    level: number;
    onClose: () => void;
}

export const LevelUpModal: React.FC<LevelUpModalProps> = ({ level, onClose }) => {
    const { t } = useLocalization();

    useEffect(() => {
        triggerLevelUpConfetti();
    }, []);

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[100] p-4 backdrop-blur-sm animate-fade-in">
            <div className="bg-white p-8 rounded-3xl shadow-2xl border-4 border-gold text-center max-w-sm w-full relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-brand-turquoise via-gold to-brand-turquoise animate-pulse"></div>

                <div className="mb-6 relative">
                    <div className="text-6xl animate-bounce">🆙</div>
                    <div className="absolute -top-4 -right-4 text-4xl animate-ping opacity-50">✨</div>
                    <div className="absolute -bottom-4 -left-4 text-4xl animate-ping opacity-50 delay-100">✨</div>
                </div>

                <h2 className="text-3xl font-bold text-dark-green mb-2 uppercase tracking-wide">
                    {t('levelUp.title')}
                </h2>

                <div className="text-6xl font-black text-brand-turquoise mb-4 drop-shadow-md">
                    {level}
                </div>

                <p className="text-dark-green/80 mb-8 text-lg font-medium">
                    {t('levelUp.message')}
                </p>

                <Button onClick={onClose} className="w-full text-lg py-3 shadow-lg hover:scale-105 transition-transform">
                    {t('levelUp.continue')}
                </Button>
            </div>
        </div>
    );
};
