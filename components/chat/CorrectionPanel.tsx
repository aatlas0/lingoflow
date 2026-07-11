import React from 'react';

interface Correction {
    original: string;
    corrected: string;
    explanation: string;
}

interface CorrectionPanelProps {
    corrections: Correction[];
}

import { useAppContext } from '../../contexts/AppContext';

export const CorrectionPanel: React.FC<CorrectionPanelProps> = ({ corrections }) => {
    const latestCorrection = corrections[0];
    const { isHighContrast } = useAppContext();

    if (!latestCorrection) {
        return (
            <div className={`h-full flex flex-col items-center justify-center text-center p-6 ${isHighContrast ? 'text-slate-400' : 'text-dark-green/40'}`}>
                <div className="text-4xl mb-4">✨</div>
                <p className="font-medium">No corrections yet.</p>
                <p className="text-sm">Keep chatting! I'll help you improve.</p>
            </div>
        );
    }

    return (
        <div className="h-full p-4 flex flex-col">
            <h3 className={`text-lg font-bold mb-4 flex items-center gap-2 ${isHighContrast ? 'text-white' : 'text-dark-green'}`}>
                <span>📝</span> Latest Correction
            </h3>

            <div className={`p-6 rounded-xl shadow-sm border animate-fade-in flex-grow flex flex-col justify-center
                ${isHighContrast
                    ? 'bg-slate-800 border-slate-600'
                    : 'bg-white border-desert-dark/50'}
            `}>
                <div className={`mb-6 pb-6 border-b border-dashed ${isHighContrast ? 'border-slate-600' : 'border-gray-200'}`}>
                    <p className="text-xs text-red-500 font-bold uppercase tracking-wide mb-2">You said</p>
                    <p className={`line-through text-lg ${isHighContrast ? 'text-slate-400' : 'text-dark-green/80'}`}>{latestCorrection.original}</p>
                </div>

                <div className="mb-6">
                    <p className="text-xs text-brand-turquoise font-bold uppercase tracking-wide mb-2">Better way</p>
                    <p className={`font-bold text-xl ${isHighContrast ? 'text-white' : 'text-dark-green'}`}>{latestCorrection.corrected}</p>
                </div>

                <div className={`p-4 rounded-xl mt-auto ${isHighContrast ? 'bg-slate-700' : 'bg-desert/30'}`}>
                    <p className={`text-sm italic ${isHighContrast ? 'text-slate-300' : 'text-dark-green/70'}`}>
                        💡 {latestCorrection.explanation}
                    </p>
                </div>
            </div>
        </div>
    );
};
