import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { useAppContext } from './AppContext';
import { englishStrings } from '../localization/strings';
import { generateUITranslations } from '../services/geminiService';

interface LocalizationContextType {
    t: (key: string, replacements?: Record<string, string | number>) => string;
    isUILoading: boolean;
    forceNative: boolean;
    setForceNative: (force: boolean) => void;
    isTargetLanguageActive: boolean;
}

const LocalizationContext = createContext<LocalizationContextType | undefined>(undefined);

// Helper to shuffle an array
const shuffleArray = (array: any[]) => {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
};

const getTranslationRatio = (level: number): number => {
    if (level <= 5) return 0;
    if (level <= 10) return 0.3; // 30%
    if (level <= 15) return 0.5; // 50%
    if (level <= 20) return 0.8; // 80%
    return 1; // 100% (or nearly)
};

export const LocalizationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { sourceLang, targetLang, profile, setError } = useAppContext();
    const [uiStrings, setUiStrings] = useState<Record<string, string>>(englishStrings);
    const [isUILoading, setIsUILoading] = useState(false);
    const [forceNative, setForceNative] = useState(false);

    useEffect(() => {
        // FORCE ENGLISH UI:
        // The user requested the "Menu Atlas" and all UI to be in English.
        // We disable the dynamic translation fetching here.
        setUiStrings(englishStrings);
        setIsUILoading(false);
    }, [targetLang, profile.level, sourceLang, forceNative]);

    const t = (key: string, replacements?: Record<string, string | number>): string => {
        let str = uiStrings[key] || englishStrings[key] || key; // Fallback chain
        if (replacements) {
            Object.keys(replacements).forEach(rKey => {
                str = str.replace(`{${rKey}}`, String(replacements[rKey]));
            });
        }
        return str;
    };

    const isTargetLanguageActive = !forceNative && getTranslationRatio(profile.level) > 0 && targetLang.code !== 'en';

    return (
        <LocalizationContext.Provider value={{ t, isUILoading, forceNative, setForceNative, isTargetLanguageActive }}>
            {children}
        </LocalizationContext.Provider>
    );
};

export const useLocalization = () => {
    const context = useContext(LocalizationContext);
    if (context === undefined) {
        throw new Error('useLocalization must be used within a LocalizationProvider');
    }
    return context;
};