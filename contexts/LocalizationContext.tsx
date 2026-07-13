import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { useAppContext } from './AppContext';
import { englishStrings } from '../localization/strings';

interface LocalizationContextType {
    t: (key: string, replacements?: Record<string, string | number>) => string;
    isUILoading: boolean;
}

const LocalizationContext = createContext<LocalizationContextType | undefined>(undefined);

export const LocalizationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { sourceLang, targetLang, profile } = useAppContext();
    const [uiStrings, setUiStrings] = useState<Record<string, string>>(englishStrings);
    const [isUILoading, setIsUILoading] = useState(false);

    useEffect(() => {
        // FORCE ENGLISH UI:
        // The user requested the "Menu Atlas" and all UI to be in English.
        // We disable the dynamic translation fetching here.
        setUiStrings(englishStrings);
        setIsUILoading(false);
    }, [targetLang, profile.level, sourceLang]);

    const t = (key: string, replacements?: Record<string, string | number>): string => {
        let str = uiStrings[key] || englishStrings[key] || key; // Fallback chain
        if (replacements) {
            Object.keys(replacements).forEach(rKey => {
                str = str.replace(`{${rKey}}`, String(replacements[rKey]));
            });
        }
        return str;
    };

    return (
        <LocalizationContext.Provider value={{ t, isUILoading }}>
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