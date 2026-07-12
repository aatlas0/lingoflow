import React, { useState } from 'react';
import { playTextAsSpeech } from '../../services/ttsService';
import { useLocalization } from '../../contexts/LocalizationContext';
import { useAppContext } from '../../contexts/AppContext';

interface SpeakerIconProps {
  textToSpeak: string;
  /** BCP-47 / ISO language code; defaults to the current target language. */
  lang?: string;
}

export const SpeakerIcon: React.FC<SpeakerIconProps> = ({ textToSpeak, lang }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { t } = useLocalization();
  const { targetLang } = useAppContext();

  const handlePlay = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card clicks when clicking icon
    if (isPlaying) return;

    setIsPlaying(true);
    setError(null);
    try {
      await playTextAsSpeech(textToSpeak, lang ?? targetLang.code);
    } catch (err) {
      setError('Audio failed');
      console.error(err);
    } finally {
      setIsPlaying(false);
    }
  };

  return (
    <button
      onClick={handlePlay}
      disabled={isPlaying}
      // Accessibility: aria-label describes the button's action
      aria-label={t('common.speaker.label')}
      className="p-2 text-dark-green/60 rounded-full hover:bg-brand-turquoise/10 hover:text-brand-turquoise transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-turquoise active:scale-95"
    >
      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        {isPlaying ? (
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
        ) : (
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072M12 6V4m0 16v-2m4.95-12.95l-1.414 1.414M4.464 19.536l1.414-1.414M19.536 4.464l-1.414 1.414M4.464 4.464l1.414 1.414M21 12h-2M5 12H3m14.05-7.05l-1.414 1.414M7.929 16.071l-1.414 1.414" />
        )}
      </svg>
      {error && <span className="text-deep-red text-xs">{error}</span>}
    </button>
  );
};