
import React from 'react';
import { AppProvider, useAppContext } from './contexts/AppContext';
import { LocalizationProvider, useLocalization } from './contexts/LocalizationContext';
import { Header } from './components/layout/Header';
import { AnimatedBackground } from './components/layout/AnimatedBackground';
import { HomeView } from './views/HomeView';
import { DashboardView } from './views/DashboardView';
import { QuizView } from './views/QuizView';
import { LightningRoundView } from './views/LightningRoundView';
import { ChatView } from './views/ChatView';
import { ProfileView } from './views/ProfileView';
import { SkillTreeView } from './views/SkillTreeView';
import { SagaMapView } from './views/SagaMapView';
import { TrainingGroundsView } from './views/TrainingGroundsView';
import { PracticeQuizView } from './views/PracticeQuizView';
import { Button } from './components/common/Button';
import { LevelUpModal } from './components/common/LevelUpModal';

const ErrorDisplay: React.FC = () => {
    const { error, setError, setView } = useAppContext();
    const { t } = useLocalization();
    if (!error) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-red-900/80 backdrop-blur-md border border-red-500 text-white p-8 rounded-xl max-w-md text-center">
                <h2 className="text-2xl font-bold mb-4">{t('common.error.title')}</h2>
                <p className="mb-6">{error}</p>
                <div className="flex gap-4 justify-center">
                    <Button onClick={() => setError(null)} variant="secondary">{t('common.error.dismiss')}</Button>
                    <Button onClick={() => setView('home')}>{t('common.error.goHome')}</Button>
                </div>
            </div>
        </div>
    );
}

const AppContent: React.FC = () => {
    const { currentView, isHighContrast, showLevelUpModal, newLevel, closeLevelUpModal, currentSubLesson, setCurrentSubLesson, setView } = useAppContext();

    const renderView = () => {
        switch (currentView) {
            case 'practiceQuiz': return currentSubLesson
                ? <PracticeQuizView
                    subLesson={currentSubLesson}
                    onComplete={() => setCurrentSubLesson(null)}
                    onExit={() => setView('training')}
                  />
                : <TrainingGroundsView />;
            case 'home': return <HomeView />;
            case 'dashboard': return <DashboardView />;
            case 'quiz': return <QuizView />;
            case 'lightning': return <LightningRoundView />;
            case 'chat': return <ChatView />;
            case 'profile': return <ProfileView />;
            case 'skillTree': return <SkillTreeView />;
            case 'sagaMap': return <SagaMapView />;
            case 'map': return <SagaMapView />;
            case 'training': return <TrainingGroundsView />;
            default: return <HomeView />;
        }
    };

    return (
        <div className={`h-screen flex flex-col font-sans ${isHighContrast ? 'high-contrast' : ''} overflow-hidden`}>
            <AnimatedBackground />
            <Header />
            {/* 
              We use flex-grow to take remaining space. 
              'home' view manages its own centering and full height.
              Other views fit within the space below the header.
            */}
            <main className="flex-grow container mx-auto p-0 sm:p-0 lg:p-0 relative flex flex-col overflow-y-auto h-full">
                <div className="w-full min-h-full flex flex-col">
                    {renderView()}
                </div>
            </main>
            <ErrorDisplay />
            {showLevelUpModal && <LevelUpModal level={newLevel} onClose={closeLevelUpModal} />}
        </div>
    );
};

import { ImmersionProvider } from './contexts/ImmersionContext';

const App = () => {
    return (
        <AppProvider>
            <LocalizationProvider>
                <ImmersionProvider>
                    <AppContent />
                </ImmersionProvider>
            </LocalizationProvider>
        </AppProvider>
    );
};

export default App;
