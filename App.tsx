
import React from 'react';
import { AppProvider, useAppContext } from './contexts/AppContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AuthView } from './views/AuthView';
import { LocalizationProvider, useLocalization } from './contexts/LocalizationContext';
import { Header } from './components/layout/Header';
import { AnimatedBackground } from './components/layout/AnimatedBackground';
import { LevelUpModal } from './components/common/LevelUpModal';
import { ErrorBoundary } from './components/common/ErrorBoundary';

// Each view loads as its own chunk on first visit instead of shipping the
// whole app in one bundle. AuthView stays static: it's the first paint.
const HomeView = React.lazy(() => import('./views/HomeView').then(m => ({ default: m.HomeView })));
const DashboardView = React.lazy(() => import('./views/DashboardView').then(m => ({ default: m.DashboardView })));
const QuizView = React.lazy(() => import('./views/QuizView').then(m => ({ default: m.QuizView })));
const LightningRoundView = React.lazy(() => import('./views/LightningRoundView').then(m => ({ default: m.LightningRoundView })));
const ChatView = React.lazy(() => import('./views/ChatView').then(m => ({ default: m.ChatView })));
const ProfileView = React.lazy(() => import('./views/ProfileView').then(m => ({ default: m.ProfileView })));
const SagaMapView = React.lazy(() => import('./views/SagaMapView').then(m => ({ default: m.SagaMapView })));
const PlacementView = React.lazy(() => import('./views/PlacementView').then(m => ({ default: m.PlacementView })));
const TrainingGroundsView = React.lazy(() => import('./views/TrainingGroundsView').then(m => ({ default: m.TrainingGroundsView })));
const PracticeQuizView = React.lazy(() => import('./views/PracticeQuizView').then(m => ({ default: m.PracticeQuizView })));
const MyLanguagesView = React.lazy(() => import('./views/MyLanguagesView').then(m => ({ default: m.MyLanguagesView })));

// Non-blocking toast: background failures (quests, translations…) used to
// throw a full-screen overlay over whatever the user was doing.
const ErrorDisplay: React.FC = () => {
    const { error, setError } = useAppContext();
    const { t } = useLocalization();

    React.useEffect(() => {
        if (!error) return;
        const timer = setTimeout(() => setError(null), 8000);
        return () => clearTimeout(timer);
    }, [error, setError]);

    if (!error) return null;

    return (
        <div
            role="alert"
            className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 max-w-md w-[calc(100%-2rem)] bg-red-900/95 backdrop-blur-md border border-red-500 text-white px-5 py-4 rounded-2xl shadow-2xl flex items-start gap-3 animate-fade-in-up"
        >
            <span className="text-xl shrink-0">⚠️</span>
            <p className="flex-1 text-sm leading-relaxed">{error}</p>
            <button
                onClick={() => setError(null)}
                className="font-bold text-white/70 hover:text-white px-1 shrink-0"
                aria-label={t('common.error.dismiss')}
            >
                ✕
            </button>
        </div>
    );
}

// Views where a modal popping up would interrupt an active game.
const GAME_VIEWS: string[] = ['quiz', 'lightning', 'practiceQuiz', 'placement'];

const AppContent: React.FC = () => {
    const { currentView, isHighContrast, showLevelUpModal, newLevel, closeLevelUpModal, currentSubLesson, setCurrentSubLesson, setView, isHydrating, targetLang } = useAppContext();
    const { session, isAuthLoading } = useAuth();

    // Auth gate: nothing is accessible without an account.
    if (isAuthLoading) {
        return (
            <div className="h-screen flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-brand-turquoise/30 border-t-brand-turquoise rounded-full animate-spin"></div>
            </div>
        );
    }
    if (!session) {
        return <AuthView />;
    }
    // Language switch / login: hold the UI until this language's own progress
    // is in — otherwise the previous language's numbers flash on screen.
    if (isHydrating) {
        return (
            <div className={`h-screen flex flex-col items-center justify-center gap-4 ${isHighContrast ? 'high-contrast' : ''}`}>
                <div className="w-12 h-12 border-4 border-brand-turquoise/30 border-t-brand-turquoise rounded-full animate-spin"></div>
                <p className={`text-lg font-bold ${isHighContrast ? 'text-white' : 'text-dark-green'}`}>
                    Loading your {targetLang.name} journey…
                </p>
            </div>
        );
    }

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
            case 'sagaMap': return <SagaMapView />;
            case 'training': return <TrainingGroundsView />;
            case 'placement': return <PlacementView />;
            case 'languages': return <MyLanguagesView />;
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
                    {/* key remounts the boundary on navigation so a crash in
                        one view doesn't keep showing after leaving it */}
                    <ErrorBoundary key={currentView} onReset={() => setView('dashboard')}>
                        <React.Suspense fallback={
                            <div className="flex-grow flex items-center justify-center">
                                <div className="w-12 h-12 border-4 border-brand-turquoise/30 border-t-brand-turquoise rounded-full animate-spin"></div>
                            </div>
                        }>
                            {renderView()}
                        </React.Suspense>
                    </ErrorBoundary>
                </div>
            </main>
            <ErrorDisplay />
            {showLevelUpModal && !GAME_VIEWS.includes(currentView) && <LevelUpModal level={newLevel} onClose={closeLevelUpModal} />}
        </div>
    );
};

import { ImmersionProvider } from './contexts/ImmersionContext';

const App = () => {
    return (
        <AuthProvider>
            <AppProvider>
                <LocalizationProvider>
                    <ImmersionProvider>
                        <AppContent />
                    </ImmersionProvider>
                </LocalizationProvider>
            </AppProvider>
        </AuthProvider>
    );
};

export default App;
