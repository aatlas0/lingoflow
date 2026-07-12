import React, { createContext, useContext } from 'react';
import { dictionary, TranslationKey } from '../data/translations';
import { useAppContext } from './AppContext';

interface ImmersionContextType {
    immersionLevel: number; // 0 to 100
    setImmersionLevel: (level: number) => void;
    t: (key: TranslationKey) => string;
}

const ImmersionContext = createContext<ImmersionContextType | undefined>(undefined);

export const ImmersionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { profile, updateProfile, sourceLang, targetLang } = useAppContext();
    const [nativeTranslations, setNativeTranslations] = React.useState<Record<string, string>>({});
    const [targetTranslations, setTargetTranslations] = React.useState<Record<string, string>>({});

    // Use profile score, default to 0 if undefined
    const immersionLevel = profile.immersionScore || 0;

    const setImmersionLevel = (level: number) => {
        updateProfile({ immersionScore: level });
    };

    // Fetch native translations if source language is not English
    React.useEffect(() => {
        const fetchNativeTranslations = async () => {
            if (sourceLang.code === 'en') {
                setNativeTranslations({});
                return;
            }

            // Check cache (Version 5 to force refresh for English UI)
            const cacheKey = `immersion-native-${sourceLang.code}-v5`;
            // localStorage (not sessionStorage) so the paid translation call
            // happens once per device, not once per browser session.
            const cached = localStorage.getItem(cacheKey);
            if (cached) {
                setNativeTranslations(JSON.parse(cached));
                return;
            }

            // Prepare strings to translate (English -> User's Native)
            // Translate ALL keys to ensure full UI localization
            const stringsToTranslate = Object.entries(dictionary)
                .reduce((acc, [key, entry]) => {
                    acc[key] = entry.native;
                    return acc;
                }, {} as Record<string, string>);

            try {
                // We use 'en' as source and user's sourceLang as target for this specific translation
                const englishLang = { code: 'en', name: 'English' };
                const translations = await import('../services/geminiService').then(m =>
                    m.generateUITranslations(stringsToTranslate, englishLang, sourceLang)
                );

                setNativeTranslations(translations);
                localStorage.setItem(cacheKey, JSON.stringify(translations));
            } catch (err) {
                console.error("Failed to translate immersion strings:", err);
            }
        };

        fetchNativeTranslations();
    }, [sourceLang]);

    // Fetch the TARGET-language side of the immersion dictionary, so raising
    // immersion shows the language you're actually learning. Darija uses the
    // authentic built-in strings; English needs no translation.
    // Skipped until immersion can actually display them (lowest tier is 30).
    const needsTargetStrings = immersionLevel >= 30;
    React.useEffect(() => {
        let cancelled = false;
        const fetchTargetTranslations = async () => {
            if (!needsTargetStrings || targetLang.code === 'ary' || targetLang.code === 'en') {
                setTargetTranslations({});
                return;
            }

            // localStorage: one paid translation call per language per device.
            const cacheKey = `immersion-target-${targetLang.code}-v1`;
            try {
                const cached = localStorage.getItem(cacheKey);
                if (cached) {
                    setTargetTranslations(JSON.parse(cached));
                    return;
                }
            } catch { /* ignore */ }

            const stringsToTranslate = Object.entries(dictionary)
                .reduce((acc, [key, entry]) => {
                    acc[key] = entry.native;
                    return acc;
                }, {} as Record<string, string>);

            try {
                const englishLang = { code: 'en', name: 'English' };
                const translations = await import('../services/geminiService').then(m =>
                    m.generateUITranslations(stringsToTranslate, englishLang, targetLang)
                );
                if (cancelled) return;
                setTargetTranslations(translations);
                try { localStorage.setItem(cacheKey, JSON.stringify(translations)); } catch { /* ignore */ }
            } catch (err) {
                console.error('Failed to translate immersion strings to target language:', err);
            }
        };

        setTargetTranslations({});
        fetchTargetTranslations();
        return () => { cancelled = true; };
    }, [targetLang.code, needsTargetStrings]);

    // Helper function to translate based on current level
    const t = (key: TranslationKey): string => {
        const entry = dictionary[key];
        if (!entry) {
            console.warn(`Missing translation for key: ${key}`);
            return key;
        }

        // If current level is greater than or equal to the tier, show target language
        if (immersionLevel >= entry.tier) {
            if (targetLang.code === 'ary') return entry.target; // built-in authentic Darija
            // Never show the wrong language: fall back to native until the
            // generated target translations arrive.
            return targetTranslations[key] || nativeTranslations[key] || entry.native;
        }

        // Otherwise show native language (translated if available, else English default)
        return nativeTranslations[key] || entry.native;
    };

    return (
        <ImmersionContext.Provider value={{ immersionLevel, setImmersionLevel, t }}>
            {children}
        </ImmersionContext.Provider>
    );
};

export const useImmersion = () => {
    const context = useContext(ImmersionContext);
    if (context === undefined) {
        throw new Error('useImmersion must be used within an ImmersionProvider');
    }
    return context;
};
