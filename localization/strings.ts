
// Using dot notation for keys to make them flat and easy to manage.
export const englishStrings: Record<string, string> = {
  // Header
  'header.nav.home': 'Home',
  'header.nav.quiz': 'Quiz',
  'header.nav.lightning': 'Lightning',
  'header.nav.chat': 'Chat',
  'header.nav.profile': 'Profile',
  'header.nav.skillTree': 'Skill Tree',
  'header.toggle.nativeLang': 'Use Native Language UI',
  'header.toggle.targetLang': 'Use Target Language UI',
  'header.back': 'Back to Menu',

  // Home View (Setup)
  'home.title': 'Welcome to LingoAtlas',
  'home.subtitle': 'Your personalized AI-powered journey to mastering a new language. Choose your languages and start your adventure!',
  'home.sourceLangLabel': 'I speak:',
  'home.targetLangLabel': 'I want to learn:',
  'home.startAdventure': 'Start Adventure',

  // Dashboard View (Menu)
  'dashboard.title': 'Atlas Menu',
  'dashboard.quiz.title': 'Daily Quiz',
  'dashboard.quiz.desc': 'Test your knowledge with AI-generated questions tailored to your level.',
  'dashboard.lightning.title': 'Lightning Round',
  'dashboard.lightning.desc': 'Race against the clock! How many questions can you answer in 60 seconds?',
  'dashboard.chat.title': 'AI Tutor Chat',
  'dashboard.chat.desc': 'Practice conversation with a friendly AI tutor in a safe environment.',
  'dashboard.skillTree.title': 'Skill Tree',
  'dashboard.skillTree.desc': 'Visualize your progress and unlock new topics as you level up.',
  'dashboard.profile.title': 'Your Profile',
  'dashboard.profile.desc': 'Check your stats, achievements, and XP progress.',
  'dashboard.changeLanguage': 'Change Language',

  // Quiz View
  'quiz.loading': 'Generating your custom quiz...',
  'quiz.error': 'Could not load quiz.',
  'quiz.tryAgain': 'Try Again',
  'quiz.completeTitle': 'Quiz Complete!',
  'quiz.score': 'You scored {score} out of {total}',
  'quiz.review.yourAnswer': 'Your answer:',
  'quiz.review.correctAnswer': 'Correct answer:',
  'quiz.review.explanation': 'Explanation',
  'quiz.playAgain': 'Play Again',
  'quiz.questionProgress': 'Question {current} of {total}',
  'quiz.checkAnswer': 'Next Question',
  'quiz.nextQuestion': 'Next Question',
  'quiz.finishQuiz': 'Finish Quiz & Review',

  // Lightning Round View
  'lightning.loading': 'Preparing lightning questions...',
  'lightning.title': 'Lightning Round ⚡️',
  'lightning.description': 'Answer as many questions as you can in {duration} seconds!',
  'lightning.start': 'Start',
  'lightning.loadingQuestions': 'Loading Questions...',
  'lightning.timesUp': "Time's Up!",
  'lightning.yourScore': 'Your Score: {score}',
  'lightning.highScore': 'High Score: {highScore}',
  'lightning.playAgain': 'Play Again',
  'lightning.newQuestions': 'New Questions',
  'lightning.score': 'Score:',
  'lightning.highScoreLabel': 'High Score:',

  // Chat View
  'chat.title': 'AI Tutor for {language}',
  'chat.start': 'Start the conversation!',
  'chat.placeholder': 'Message in {language}...',
  'chat.send': 'Send',
  'chat.tutorUnavailable': 'The AI Tutor is unavailable.',
  'chat.tutorError': "Sorry, I couldn't respond. Please try again.",

  // Profile View
  'profile.title': 'Player Profile',
  'profile.level': 'Level {level}',
  'profile.xp': '{xp} / {totalXp} XP',
  'profile.stat.highScore': 'High Score',
  'profile.stat.quizzesCompleted': 'Quizzes Completed',
  'profile.stat.totalXp': 'Total XP',
  'profile.achievements': 'Achievements',
  'profile.locked': 'Locked',

  // Skill Tree View
  'skillTree.title': 'Your Learning Path',
  'skillTree.subtitle': 'Unlock new skills as you level up your language abilities.',
  'skillTree.loading': 'Designing your personal learning path...',
  'skillTree.error': 'Could not generate your skill tree.',
  'skillTree.node.requiresLevel': 'Required Level: {level}',
  'skillTree.node.unlocked': 'Unlocked',
  'skillTree.node.locked': 'Locked',
  'skillTree.node.difficulty': 'Difficulty: {difficulty}/5',
  'skillTree.branch.requiresLevel': 'Requires Level {level}',

  // Common Components
  'common.speaker.label': 'Listen to text',
  'common.loading': 'Loading...',
  'common.error.title': 'An Error Occurred',
  'common.error.dismiss': 'Dismiss',
  'common.error.goHome': 'Go Home',
  'common.quests.title': 'Daily Quests',
  'common.quests.daily': 'Daily',
  'common.quests.completed': 'Completed',
  'common.quests.progress': 'Progress',
  'levelUp.title': 'Level Up!',
  'levelUp.message': 'You have reached a new level of mastery! Keep up the great work.',
  'levelUp.continue': 'Continue Journey',
};