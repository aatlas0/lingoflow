import React from 'react';

interface Props {
    children: React.ReactNode;
    /** Called when the user clicks "Back to Dashboard" after a crash. */
    onReset?: () => void;
}

interface State {
    hasError: boolean;
}

// A render error in one view used to white-screen the whole app. This keeps
// the shell alive and offers a way back instead.
export class ErrorBoundary extends React.Component<Props, State> {
    state: State = { hasError: false };

    static getDerivedStateFromError(): State {
        return { hasError: true };
    }

    componentDidCatch(error: Error, info: React.ErrorInfo) {
        console.error('View crashed:', error, info.componentStack);
    }

    handleReset = () => {
        this.setState({ hasError: false });
        this.props.onReset?.();
    };

    render() {
        if (this.state.hasError) {
            return (
                <div className="flex-grow flex flex-col items-center justify-center text-center p-6 gap-4">
                    <div className="text-5xl">🧭</div>
                    <h2 className="text-2xl font-bold text-dark-green">Something went off the map.</h2>
                    <p className="text-dark-green/70 max-w-md">
                        This screen hit an unexpected error. Your progress is safe — head back and try again.
                    </p>
                    <button
                        onClick={this.handleReset}
                        className="px-6 py-3 rounded-xl font-bold bg-brand-turquoise text-white shadow-lg hover:shadow-xl transition-all"
                    >
                        🏠 Back to Dashboard
                    </button>
                </div>
            );
        }
        return this.props.children;
    }
}
