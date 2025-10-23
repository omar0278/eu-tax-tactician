// Game State
let gameState = {
  phase: 'start', // 'start', 'playing', 'results'
  currentScenario: 0,
  score: 0,
  streak: 0,
  maxStreak: 0,
  timer: 0,
  startTime: 0,
  scenarioStartTime: 0,
  totalTime: 0,
  correctAnswers: 0,
  scenarios: [],
  countries: [],
  traitGlossary: {},
  difficulty: 'easy',
  difficultySettings: {
    easy: { deckSize: 6, timePressure: false, timeLimit: null },
    normal: { deckSize: 12, timePressure: false, timeLimit: null },
    hard: { deckSize: 18, timePressure: true, timeLimit: 30 }
  },
  unlockedAbilities: {
    advisorHint: false,
    treatyTracker: false,
    rdBoost: false,
    smeSaver: false
  },
  usedAbilities: {
    advisorHint: false,
    treatyTracker: false,
    rdBoost: false,
    smeSaver: false
  },
  conceptMastery: {},
  scenarioResults: [],
  achievements: [],
  allTimeStats: null
};

let timerInterval = null;
let tooltipTimeout = null;

// Country Flags (using emoji)
const countryFlags = {
  'IE': '🇮🇪', 'EE': '🇪🇪', 'NL': '🇳🇱', 'LU': '🇱🇺', 'CY': '🇨🇾', 
  'MT': '🇲🇹', 'DE': '🇩🇪', 'FR': '🇫🇷', 'ES': '🇪🇸', 'PT': '🇵🇹',
  'LT': '🇱🇹', 'SE': '🇸🇪', 'DK': '🇩🇰'
};

// Achievement Definitions
const ACHIEVEMENTS = [
  {
    id: 'first_win',
    name: 'First Victory',
    icon: '🎯',
    description: 'Complete your first game',
    check: (stats) => stats.gamesPlayed >= 1
  },
  {
    id: 'perfect_game',
    name: 'Perfect Score',
    icon: '💯',
    description: 'Get 100% accuracy in a game',
    check: (stats, game) => game && game.accuracy === 100
  },
  {
    id: 'speed_demon',
    name: 'Speed Demon',
    icon: '⚡',
    description: 'Complete a game with avg time < 10s per scenario',
    check: (stats, game) => game && game.avgTime < 10
  },
  {
    id: 'streak_master',
    name: 'Streak Master',
    icon: '🔥',
    description: 'Achieve a 10+ streak',
    check: (stats) => stats.bestStreak >= 10
  },
  {
    id: 'expert_complete',
    name: 'Expert Tactician',
    icon: '🏆',
    description: 'Complete Expert difficulty',
    check: (stats) => stats.difficultyCompletions.hard >= 1
  },
  {
    id: 'completionist',
    name: 'Completionist',
    icon: '🌟',
    description: 'Complete all three difficulty levels',
    check: (stats) => stats.difficultyCompletions.easy >= 1 && 
                       stats.difficultyCompletions.normal >= 1 && 
                       stats.difficultyCompletions.hard >= 1
  },
  {
    id: 'veteran',
    name: 'Veteran',
    icon: '🎖️',
    description: 'Play 10 games',
    check: (stats) => stats.gamesPlayed >= 10
  },
  {
    id: 'master',
    name: 'Tax Master',
    icon: '👑',
    description: 'Play 25 games',
    check: (stats) => stats.gamesPlayed >= 25
  }
];

// Initialize game on page load
document.addEventListener('DOMContentLoaded', async () => {
  await loadGameData();
  setupEventListeners();
  showScreen('start');
});

// Load game data from JSON files
async function loadGameData() {
  try {
    const [countriesResponse, scenariosResponse] = await Promise.all([
      fetch('/data/country_traits.json'),
      fetch('/data/scenarios.json')
    ]);
    
    const countriesData = await countriesResponse.json();
    const scenariosData = await scenariosResponse.json();
    
    gameState.countries = countriesData.countries;
    gameState.traitGlossary = countriesData.traitGlossary;
    gameState.allScenarios = scenariosData.scenarios;
    
    // Load all-time stats from localStorage
    const storedStats = localStorage.getItem('euTaxTacticianStats');
    if (storedStats) {
      gameState.allTimeStats = JSON.parse(storedStats);
    } else {
      gameState.allTimeStats = {
        gamesPlayed: 0,
        totalScore: 0,
        totalTime: 0,
        perfectGames: 0,
        achievements: [],
        bestStreak: 0,
        difficultyCompletions: { easy: 0, normal: 0, hard: 0 }
      };
    }
    
    console.log('Game data loaded successfully');
  } catch (error) {
    console.error('Failed to load game data:', error);
    alert('Failed to load game data. Please refresh the page to try again.');
  }
}

// Setup event listeners
function setupEventListeners() {
  // Start screen
  document.getElementById('start-game-btn').addEventListener('click', startGame);
  
  // Difficulty selection
  document.querySelectorAll('.difficulty-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.difficulty-btn').forEach(b => b.classList.remove('active'));
      e.currentTarget.classList.add('active');
      gameState.difficulty = e.currentTarget.dataset.difficulty;
    });
  });
  
  // Play screen abilities
  document.getElementById('advisor-hint-btn').addEventListener('click', () => useAbility('advisorHint'));
  document.getElementById('treaty-tracker-btn').addEventListener('click', () => useAbility('treatyTracker'));
  document.getElementById('rd-boost-btn').addEventListener('click', () => useAbility('rdBoost'));
  document.getElementById('sme-saver-btn').addEventListener('click', () => useAbility('smeSaver'));
  
  // Feedback modal
  document.getElementById('next-scenario-btn').addEventListener('click', nextScenario);
  
  // Results screen
  document.getElementById('play-again-btn').addEventListener('click', restartGame);
  document.getElementById('edit-data-btn').addEventListener('click', openDataEditor);
  
  // Data editor
  document.getElementById('close-editor-btn').addEventListener('click', closeDataEditor);
  document.getElementById('save-data-btn').addEventListener('click', saveGameData);
  document.getElementById('reset-data-btn').addEventListener('click', resetGameData);
  
  // Tab switching in data editor
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const tab = e.target.dataset.tab;
      switchTab(tab);
    });
  });
  
  // Close modals when clicking outside
  document.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal')) {
      closeModal(e.target.id);
    }
  });
  
  // Keyboard navigation
  document.addEventListener('keydown', handleKeyboard);
  
  // Glossary tooltips
  setupGlossaryTooltips();
}

// Keyboard navigation
function handleKeyboard(e) {
  if (gameState.phase === 'playing') {
    const countryButtons = document.querySelectorAll('.country-btn');
    
    // Number keys 1-9 for country selection
    if (e.key >= '1' && e.key <= '9') {
      const index = parseInt(e.key) - 1;
      if (index < countryButtons.length) {
        selectCountry(gameState.countries[index].code);
      }
    }
    
    // Enter to proceed from feedback
    if (e.key === 'Enter' && document.getElementById('feedback-modal').classList.contains('active')) {
      nextScenario();
    }
  }
  
  // Escape to close modals
  if (e.key === 'Escape') {
    const activeModal = document.querySelector('.modal.active');
    if (activeModal) {
      closeModal(activeModal.id);
    }
  }
}

// Utility functions
function shuffleArray(array) {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

function showScreen(screenName) {
  document.querySelectorAll('.screen').forEach(screen => {
    screen.classList.remove('active');
  });
  document.getElementById(`${screenName}-screen`).classList.add('active');
  gameState.phase = screenName === 'start' ? 'start' : screenName === 'play' ? 'playing' : 'results';
}

function showModal(modalId) {
  document.getElementById(modalId).classList.add('active');
}

function closeModal(modalId) {
  document.getElementById(modalId).classList.remove('active');
}

// Game logic
function startGame() {
  // Get difficulty settings
  const settings = gameState.difficultySettings[gameState.difficulty];
  
  // Select scenarios based on difficulty
  gameState.scenarios = shuffleArray([...gameState.allScenarios]).slice(0, settings.deckSize);
  
  // Reset game state
  gameState.currentScenario = 0;
  gameState.score = 0;
  gameState.streak = 0;
  gameState.maxStreak = 0;
  gameState.correctAnswers = 0;
  gameState.startTime = Date.now();
  gameState.totalTime = 0;
  gameState.scenarioResults = [];
  gameState.conceptMastery = {};
  gameState.achievements = [];
  
  // Reset abilities
  Object.keys(gameState.unlockedAbilities).forEach(key => {
    gameState.unlockedAbilities[key] = false;
    gameState.usedAbilities[key] = false;
  });
  
  showScreen('play');
  loadCurrentScenario();
  startTimer();
}

function startTimer() {
  gameState.scenarioStartTime = Date.now();
  gameState.timer = 0;
  
  if (timerInterval) {
    clearInterval(timerInterval);
  }
  
  const settings = gameState.difficultySettings[gameState.difficulty];
  
  timerInterval = setInterval(() => {
    gameState.timer = Math.floor((Date.now() - gameState.scenarioStartTime) / 1000);
    const timerEl = document.getElementById('current-timer');
    
    if (settings.timePressure && settings.timeLimit) {
      const remaining = settings.timeLimit - gameState.timer;
      if (remaining <= 0) {
        // Auto-select wrong answer on timeout
        timerEl.textContent = '0s';
        timerEl.style.color = 'var(--error)';
        handleTimeout();
      } else {
        timerEl.textContent = `${remaining}s`;
        if (remaining <= 10) {
          timerEl.style.color = 'var(--error)';
        } else if (remaining <= 20) {
          timerEl.style.color = 'var(--warning)';
        } else {
          timerEl.style.color = 'var(--text-primary)';
        }
      }
    } else {
      timerEl.textContent = `${gameState.timer}s`;
      timerEl.style.color = 'var(--text-primary)';
    }
  }, 1000);
}

function handleTimeout() {
  stopTimer();
  
  const scenario = gameState.scenarios[gameState.currentScenario];
  const scenarioTime = gameState.difficultySettings[gameState.difficulty].timeLimit;
  
  // Timeout counts as incorrect
  gameState.streak = 0;
  gameState.totalTime += scenarioTime;
  
  // Track concept mastery (all failed on timeout)
  scenario.needs.forEach(need => {
    if (!gameState.conceptMastery[need]) {
      gameState.conceptMastery[need] = { correct: 0, total: 0 };
    }
    gameState.conceptMastery[need].total++;
  });
  
  // Store timeout result
  gameState.scenarioResults.push({
    scenario: scenario.id,
    selected: null,
    result: 'timeout',
    points: 0,
    time: scenarioTime
  });
  
  // Calculate scores for feedback
  const scores = gameState.countries.map(country => ({
    country: country,
    score: calculateSimilarity(scenario.needs, country.traits)
  }));
  scores.sort((a, b) => b.score - a.score);
  
  // Show timeout feedback
  showTimeoutFeedback(scores, scenario);
}

function stopTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

function loadCurrentScenario() {
  const scenario = gameState.scenarios[gameState.currentScenario];
  
  document.getElementById('scenario-title').textContent = scenario.title;
  document.getElementById('scenario-description').textContent = scenario.description;
  
  // Update progress
  const progress = ((gameState.currentScenario + 1) / gameState.scenarios.length) * 100;
  document.getElementById('progress-fill').style.width = `${progress}%`;
  document.getElementById('progress-text').textContent = `${gameState.currentScenario + 1} / ${gameState.scenarios.length}`;
  
  // Reset abilities for this scenario
  Object.keys(gameState.usedAbilities).forEach(key => {
    gameState.usedAbilities[key] = false;
  });
  
  // Clear any previous hints
  document.getElementById('scenario-hints').innerHTML = '';
  
  // Render countries
  renderCountries();
  
  // Update UI
  updateGameUI();
  
  // Start scenario timer
  startTimer();
}

function renderCountries(highlightedCountries = []) {
  const grid = document.getElementById('country-grid');
  grid.innerHTML = '';
  
  gameState.countries.forEach((country, index) => {
    const button = document.createElement('button');
    button.className = 'country-btn';
    button.onclick = () => selectCountry(country.code);
    
    if (highlightedCountries.includes(country.code)) {
      button.classList.add('highlighted');
    }
    
    button.innerHTML = `
      <div class="country-flag">${countryFlags[country.code] || '🏁'}</div>
      <div class="country-info">
        <div class="country-name">${country.name}</div>
        <div class="country-code">${country.code}</div>
      </div>
    `;
    
    // Add keyboard hint
    if (index < 9) {
      button.setAttribute('title', `Press ${index + 1} to select`);
    }
    
    grid.appendChild(button);
  });
}

function selectCountry(countryCode) {
  stopTimer();
  
  const scenario = gameState.scenarios[gameState.currentScenario];
  const selectedCountry = gameState.countries.find(c => c.code === countryCode);
  const scenarioTime = Math.floor((Date.now() - gameState.scenarioStartTime) / 1000);
  
  // Calculate similarity scores for all countries
  const scores = gameState.countries.map(country => ({
    country: country,
    score: calculateSimilarity(scenario.needs, country.traits)
  }));
  
  scores.sort((a, b) => b.score - a.score);
  
  const bestScore = scores[0].score;
  const selectedScore = scores.find(s => s.country.code === countryCode).score;
  
  // Determine result
  let result = 'incorrect';
  let points = 0;
  
  if (selectedScore === bestScore) {
    result = 'correct';
    points = 100;
    gameState.streak++;
    gameState.correctAnswers++;
  } else if (selectedScore >= bestScore - 1 && selectedScore > 0) {
    result = 'close';
    points = Math.max(40, 40 + (selectedScore / bestScore) * 50);
    gameState.streak++;
  } else {
    result = 'incorrect';
    gameState.streak = 0;
  }
  
  // Speed bonus
  if (scenarioTime <= 10 && points > 0) {
    points += 20;
  } else if (scenarioTime <= 20 && points > 0) {
    points += 10;
  }
  
  gameState.score += Math.floor(points);
  gameState.maxStreak = Math.max(gameState.maxStreak, gameState.streak);
  gameState.totalTime += scenarioTime;
  
  // Track concept mastery
  scenario.needs.forEach(need => {
    if (!gameState.conceptMastery[need]) {
      gameState.conceptMastery[need] = { correct: 0, total: 0 };
    }
    gameState.conceptMastery[need].total++;
    if (result === 'correct') {
      gameState.conceptMastery[need].correct++;
    }
  });
  
  // Store scenario result
  gameState.scenarioResults.push({
    scenario: scenario.id,
    selected: countryCode,
    result: result,
    points: Math.floor(points),
    time: scenarioTime
  });
  
  // Check for ability unlocks
  checkAbilityUnlocks();
  
  // Show feedback
  showFeedback(result, selectedCountry, scores, scenario, Math.floor(points), scenarioTime);
}

function calculateSimilarity(needs, traits) {
  return needs.filter(need => traits.includes(need)).length;
}

function showFeedback(result, selectedCountry, scores, scenario, points, time) {
  const modal = document.getElementById('feedback-modal');
  const resultIcon = document.getElementById('result-icon');
  const resultTitle = document.getElementById('result-title');
  const resultPoints = document.getElementById('result-points');
  const bestCountries = document.getElementById('best-countries');
  const explanationText = document.getElementById('explanation-text');
  const missedInfo = document.getElementById('missed-info');
  
  // Result display
  if (result === 'correct') {
    resultIcon.textContent = '🎉';
    resultTitle.textContent = 'Excellent Choice!';
    resultTitle.style.color = 'var(--success)';
  } else if (result === 'close') {
    resultIcon.textContent = '👍';
    resultTitle.textContent = 'Good Choice!';
    resultTitle.style.color = 'var(--warning)';
  } else {
    resultIcon.textContent = '❌';
    resultTitle.textContent = 'Not Quite';
    resultTitle.style.color = 'var(--error)';
  }
  
  resultPoints.innerHTML = `
    <div>+${points} points</div>
    <div style="font-size: 14px; color: var(--text-secondary);">Completed in ${time}s</div>
  `;
  
  // Best countries
  const topScores = scores.slice(0, 3).filter(s => s.score === scores[0].score);
  bestCountries.innerHTML = topScores.map(s => `
    <div class="best-country-tag">
      <span>${countryFlags[s.country.code] || '🏁'}</span>
      <span>${s.country.name}</span>
    </div>
  `).join('');
  
  // Explanation
  explanationText.innerHTML = addGlossaryLinks(scenario.explain);
  
  // What you missed (if not correct)
  if (result !== 'correct') {
    const bestCountry = scores[0].country;
    const missedTraits = scenario.needs.filter(need => !selectedCountry.traits.includes(need));
    const relevantTraits = bestCountry.traits.filter(trait => scenario.needs.includes(trait));
    
    missedInfo.innerHTML = `
      <h5 style="margin-bottom: 8px;">What you missed:</h5>
      <p><strong>${bestCountry.name}</strong> offers: ${relevantTraits.map(trait => 
        `<span class="glossary-term" data-term="${trait}">${trait.replace(/_/g, ' ')}</span>`
      ).join(', ')}</p>
    `;
    missedInfo.style.display = 'block';
  } else {
    missedInfo.style.display = 'none';
  }
  
  // Refresh glossary tooltips for new content
  setupGlossaryTooltips();
  
  showModal('feedback-modal');
}

function addGlossaryLinks(text) {
  let linkedText = text;
  
  // Add links for common terms found in glossary
  Object.keys(gameState.traitGlossary).forEach(term => {
    const displayTerm = term.replace(/_/g, ' ');
    const regex = new RegExp(`\\b${displayTerm}\\b`, 'gi');
    linkedText = linkedText.replace(regex, `<span class="glossary-term" data-term="${term}">${displayTerm}</span>`);
  });
  
  return linkedText;
}

function showTimeoutFeedback(scores, scenario) {
  const modal = document.getElementById('feedback-modal');
  const resultIcon = document.getElementById('result-icon');
  const resultTitle = document.getElementById('result-title');
  const resultPoints = document.getElementById('result-points');
  const bestCountries = document.getElementById('best-countries');
  const explanationText = document.getElementById('explanation-text');
  const missedInfo = document.getElementById('missed-info');
  
  resultIcon.textContent = '⏰';
  resultTitle.textContent = 'Time\'s Up!';
  resultTitle.style.color = 'var(--error)';
  
  resultPoints.innerHTML = `
    <div>+0 points</div>
    <div style="font-size: 14px; color: var(--text-secondary);">Out of time</div>
  `;
  
  const topScores = scores.slice(0, 3).filter(s => s.score === scores[0].score);
  bestCountries.innerHTML = topScores.map(s => `
    <div class="best-country-tag">
      <span>${countryFlags[s.country.code] || '🏁'}</span>
      <span>${s.country.name}</span>
    </div>
  `).join('');
  
  explanationText.innerHTML = addGlossaryLinks(scenario.explain);
  
  missedInfo.innerHTML = `
    <h5 style="margin-bottom: 8px;">Take your time:</h5>
    <p>In Expert mode, you have ${gameState.difficultySettings[gameState.difficulty].timeLimit} seconds per scenario. Speed up your decision making!</p>
  `;
  missedInfo.style.display = 'block';
  
  setupGlossaryTooltips();
  showModal('feedback-modal');
}

function nextScenario() {
  closeModal('feedback-modal');
  
  if (gameState.currentScenario < gameState.scenarios.length - 1) {
    gameState.currentScenario++;
    loadCurrentScenario();
  } else {
    endGame();
  }
}

function endGame() {
  // Calculate final game stats
  const accuracy = Math.round((gameState.correctAnswers / gameState.scenarios.length) * 100);
  const avgTime = Math.round(gameState.totalTime / gameState.scenarios.length);
  
  const currentGame = {
    accuracy: accuracy,
    avgTime: avgTime,
    score: gameState.score,
    streak: gameState.maxStreak,
    difficulty: gameState.difficulty
  };
  
  // Update all-time stats
  gameState.allTimeStats.gamesPlayed++;
  gameState.allTimeStats.totalScore += gameState.score;
  gameState.allTimeStats.totalTime += gameState.totalTime;
  gameState.allTimeStats.bestStreak = Math.max(gameState.allTimeStats.bestStreak, gameState.maxStreak);
  gameState.allTimeStats.difficultyCompletions[gameState.difficulty]++;
  
  if (accuracy === 100) {
    gameState.allTimeStats.perfectGames++;
  }
  
  // Check for new achievements
  const newAchievements = [];
  ACHIEVEMENTS.forEach(achievement => {
    if (!gameState.allTimeStats.achievements.includes(achievement.id)) {
      if (achievement.check(gameState.allTimeStats, currentGame)) {
        gameState.allTimeStats.achievements.push(achievement.id);
        newAchievements.push(achievement);
      }
    }
  });
  
  // Store new achievements for display
  gameState.achievements = newAchievements;
  
  // Save to localStorage
  localStorage.setItem('euTaxTacticianStats', JSON.stringify(gameState.allTimeStats));
  
  showScreen('results');
  displayResults();
  
  // Show achievement notifications
  if (newAchievements.length > 0) {
    setTimeout(() => {
      newAchievements.forEach((achievement, index) => {
        setTimeout(() => {
          showAchievementNotification(achievement);
        }, index * 500);
      });
    }, 1000);
  }
}

function displayResults() {
  const accuracy = Math.round((gameState.correctAnswers / gameState.scenarios.length) * 100);
  const avgTime = Math.round(gameState.totalTime / gameState.scenarios.length);
  
  // Determine rank based on score and accuracy
  let rank = 'Associate';
  if (accuracy >= 90 && gameState.score >= 1000) {
    rank = 'Partner';
  } else if (accuracy >= 75 && gameState.score >= 800) {
    rank = 'Senior';
  } else if (accuracy >= 60 && gameState.score >= 600) {
    rank = 'Analyst';
  }
  
  // Update results display
  document.getElementById('final-rank').textContent = rank;
  document.getElementById('final-score').textContent = gameState.score.toLocaleString();
  document.getElementById('final-accuracy').textContent = `${accuracy}%`;
  document.getElementById('final-avg-time').textContent = `${avgTime}s`;
  document.getElementById('final-streak').textContent = gameState.maxStreak;
  
  // Unlocked abilities
  const unlockedList = document.getElementById('unlocked-abilities');
  const unlockedAbilities = Object.entries(gameState.unlockedAbilities)
    .filter(([key, unlocked]) => unlocked);
  
  if (unlockedAbilities.length > 0) {
    unlockedList.innerHTML = unlockedAbilities.map(([key, unlocked]) => {
      const names = {
        advisorHint: '💡 Advisor Hint',
        treatyTracker: '🤝 Treaty Tracker',
        rdBoost: '🔬 R&D Boost',
        smeSaver: '🏢 SME Saver'
      };
      return `<div class="unlocked-ability">${names[key]}</div>`;
    }).join('');
  } else {
    unlockedList.innerHTML = '<p style="color: var(--text-secondary);">No abilities unlocked this round. Try again to unlock them!</p>';
  }
  
  // Concept mastery heatmap
  const masteryContainer = document.getElementById('mastery-heatmap');
  const masteryItems = Object.entries(gameState.conceptMastery).map(([concept, data]) => {
    const percentage = Math.round((data.correct / data.total) * 100);
    const status = percentage >= 75 ? 'good' : 'needs-review';
    const displayName = concept.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    
    return `
      <div class="mastery-item ${status}">
        <span>${displayName}</span>
        <span>${percentage}%</span>
      </div>
    `;
  }).join('');
  
  masteryContainer.innerHTML = masteryItems || '<p style="color: var(--text-secondary);">Complete more scenarios to see concept mastery.</p>';
  
  // Display all-time statistics
  document.getElementById('stat-games-played').textContent = gameState.allTimeStats.gamesPlayed;
  document.getElementById('stat-total-score').textContent = gameState.allTimeStats.totalScore.toLocaleString();
  document.getElementById('stat-perfect-games').textContent = gameState.allTimeStats.perfectGames;
  document.getElementById('stat-best-streak').textContent = gameState.allTimeStats.bestStreak;
  
  // Difficulty completions
  document.getElementById('stat-easy-count').textContent = gameState.allTimeStats.difficultyCompletions.easy;
  document.getElementById('stat-normal-count').textContent = gameState.allTimeStats.difficultyCompletions.normal;
  document.getElementById('stat-hard-count').textContent = gameState.allTimeStats.difficultyCompletions.hard;
  
  // Achievements display
  const achievementsContainer = document.getElementById('all-achievements');
  const earnedCount = gameState.allTimeStats.achievements.length;
  const totalCount = ACHIEVEMENTS.length;
  
  // Update achievement count in title
  document.querySelector('.achievements-display h4').textContent = `Achievements (${earnedCount}/${totalCount})`;
  
  achievementsContainer.innerHTML = ACHIEVEMENTS.map(achievement => {
    const isUnlocked = gameState.allTimeStats.achievements.includes(achievement.id);
    const isNew = gameState.achievements.some(a => a.id === achievement.id);
    
    return `
      <div class="achievement-badge ${isUnlocked ? 'unlocked' : 'locked'}" title="${achievement.description}">
        <div class="achievement-icon">${achievement.icon}</div>
        <div class="achievement-name">${achievement.name}${isNew ? ' 🆕' : ''}</div>
        <div class="achievement-desc">${achievement.description}</div>
      </div>
    `;
  }).join('');
}

function restartGame() {
  // Restart with same difficulty settings
  startGame();
}

// Ability system
function checkAbilityUnlocks() {
  const streak = gameState.streak;
  
  if (streak >= 3 && !gameState.unlockedAbilities.advisorHint) {
    gameState.unlockedAbilities.advisorHint = true;
    showAbilityUnlock('Advisor Hint', '💡');
  }
  if (streak >= 6 && !gameState.unlockedAbilities.treatyTracker) {
    gameState.unlockedAbilities.treatyTracker = true;
    showAbilityUnlock('Treaty Tracker', '🤝');
  }
  if (streak >= 9 && !gameState.unlockedAbilities.rdBoost) {
    gameState.unlockedAbilities.rdBoost = true;
    showAbilityUnlock('R&D Boost', '🔬');
  }
  if (streak >= 12 && !gameState.unlockedAbilities.smeSaver) {
    gameState.unlockedAbilities.smeSaver = true;
    showAbilityUnlock('SME Saver', '🏢');
  }
}

function showAbilityUnlock(name, icon) {
  // Create temporary notification
  const notification = document.createElement('div');
  notification.innerHTML = `
    <div style="
      position: fixed;
      top: 60px;
      right: 20px;
      background: var(--success);
      color: white;
      padding: 16px;
      border-radius: var(--radius);
      box-shadow: var(--shadow-lg);
      z-index: 1001;
      animation: fadeIn 0.3s ease;
    ">
      <strong>${icon} ${name} Unlocked!</strong>
    </div>
  `;
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    document.body.removeChild(notification);
  }, 3000);
}

function showAchievementNotification(achievement) {
  const notification = document.createElement('div');
  notification.innerHTML = `
    <div style="
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 32px;
      border-radius: var(--radius);
      box-shadow: var(--shadow-lg);
      z-index: 2000;
      animation: fadeIn 0.5s ease;
      text-align: center;
      min-width: 300px;
    ">
      <div style="font-size: 4rem; margin-bottom: 16px;">${achievement.icon}</div>
      <h3 style="font-size: 20px; margin-bottom: 8px;">Achievement Unlocked!</h3>
      <div style="font-size: 18px; font-weight: 600; margin-bottom: 4px;">${achievement.name}</div>
      <div style="opacity: 0.9; font-size: 14px;">${achievement.description}</div>
    </div>
  `;
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.firstElementChild.style.animation = 'fadeOut 0.5s ease';
    setTimeout(() => {
      document.body.removeChild(notification);
    }, 500);
  }, 3000);
}

function useAbility(abilityName) {
  if (!gameState.unlockedAbilities[abilityName] || gameState.usedAbilities[abilityName]) {
    return;
  }
  
  gameState.usedAbilities[abilityName] = true;
  
  const scenario = gameState.scenarios[gameState.currentScenario];
  
  switch (abilityName) {
    case 'advisorHint':
      showAdvisorHint(scenario);
      break;
    case 'treatyTracker':
      showTreatyTracker(scenario);
      break;
    case 'rdBoost':
      showRDBoost(scenario);
      break;
    case 'smeSaver':
      showSMESaver(scenario);
      break;
  }
  
  // Disable the button
  document.getElementById(`${abilityName.replace(/([A-Z])/g, '-$1').toLowerCase()}-btn`).disabled = true;
}

function showAdvisorHint(scenario) {
  // Calculate top 2 candidates
  const scores = gameState.countries.map(country => ({
    country: country,
    score: calculateSimilarity(scenario.needs, country.traits)
  }));
  
  scores.sort((a, b) => b.score - a.score);
  const topTwo = scores.slice(0, 2).map(s => s.country.code);
  
  renderCountries(topTwo);
  
  // Add hint text
  document.getElementById('scenario-hints').innerHTML = `
    <div class="hint-tag">💡 Advisor suggests these top 2 candidates</div>
  `;
}

function showTreatyTracker(scenario) {
  // Highlight countries with strong treaty networks
  const treatyCountries = gameState.countries
    .filter(country => country.traits.includes('treaty_network'))
    .map(country => country.code);
  
  renderCountries(treatyCountries);
  
  document.getElementById('scenario-hints').innerHTML = `
    <div class="hint-tag">🤝 Countries with strong treaty networks highlighted</div>
  `;
}

function showRDBoost(scenario) {
  // Highlight countries with R&D incentives
  const rdCountries = gameState.countries
    .filter(country => 
      country.traits.some(trait => 
        trait.includes('r_and_d') || 
        trait.includes('innovation') || 
        trait.includes('strong_r_and_d')
      )
    )
    .map(country => country.code);
  
  renderCountries(rdCountries);
  
  document.getElementById('scenario-hints').innerHTML = `
    <div class="hint-tag">🔬 Countries with R&D incentives highlighted</div>
  `;
}

function showSMESaver(scenario) {
  // Highlight SME-friendly countries
  const smeCountries = gameState.countries
    .filter(country => 
      country.traits.includes('sme_friendly') || 
      country.traits.includes('startup_friendly') ||
      country.traits.includes('low_cit_for_smes')
    )
    .map(country => country.code);
  
  renderCountries(smeCountries);
  
  document.getElementById('scenario-hints').innerHTML = `
    <div class="hint-tag">🏢 SME-friendly countries highlighted</div>
  `;
}

function updateGameUI() {
  document.getElementById('current-score').textContent = gameState.score.toLocaleString();
  document.getElementById('current-streak').textContent = gameState.streak;
  
  // Update ability buttons
  Object.entries(gameState.unlockedAbilities).forEach(([key, unlocked]) => {
    const btnId = `${key.replace(/([A-Z])/g, '-$1').toLowerCase()}-btn`;
    const btn = document.getElementById(btnId);
    
    if (unlocked && !gameState.usedAbilities[key]) {
      btn.disabled = false;
      btn.classList.add('pulse');
    } else {
      btn.disabled = true;
      btn.classList.remove('pulse');
    }
  });
}

// Data editor functions
function openDataEditor() {
  document.getElementById('countries-editor').value = JSON.stringify({
    countries: gameState.countries,
    traitGlossary: gameState.traitGlossary
  }, null, 2);
  
  document.getElementById('scenarios-editor').value = JSON.stringify({
    deckSize: 12,
    scenarios: gameState.scenarios
  }, null, 2);
  
  showModal('data-editor-modal');
}

function closeDataEditor() {
  closeModal('data-editor-modal');
}

function switchTab(tabName) {
  // Update buttons
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
  
  // Update panels
  document.querySelectorAll('.tab-panel').forEach(panel => {
    panel.classList.remove('active');
  });
  document.getElementById(`${tabName}-tab`).classList.add('active');
}

function saveGameData() {
  try {
    const countriesData = JSON.parse(document.getElementById('countries-editor').value);
    const scenariosData = JSON.parse(document.getElementById('scenarios-editor').value);
    
    gameState.countries = countriesData.countries;
    gameState.traitGlossary = countriesData.traitGlossary;
    gameState.scenarios = scenariosData.scenarios;
    
    alert('Game data saved successfully! Changes will apply to new games.');
    closeDataEditor();
  } catch (error) {
    alert('Invalid JSON format. Please check your data and try again.');
    console.error('JSON parse error:', error);
  }
}

function resetGameData() {
  if (confirm('Are you sure you want to reset to default data? This cannot be undone.')) {
    loadGameData().then(() => {
      alert('Game data reset to defaults.');
      closeDataEditor();
    });
  }
}

// Glossary tooltip system
function setupGlossaryTooltips() {
  // Remove existing listeners to avoid duplicates
  document.querySelectorAll('.glossary-term').forEach(term => {
    term.removeEventListener('mouseenter', showGlossaryTooltip);
    term.removeEventListener('mouseleave', hideGlossaryTooltip);
    term.addEventListener('mouseenter', showGlossaryTooltip);
    term.addEventListener('mouseleave', hideGlossaryTooltip);
  });
}

function showGlossaryTooltip(e) {
  const term = e.target.dataset.term;
  const definition = gameState.traitGlossary[term];
  
  if (!definition) return;
  
  const tooltip = document.getElementById('glossary-tooltip');
  tooltip.textContent = definition;
  tooltip.classList.add('visible');
  
  // Position tooltip
  const rect = e.target.getBoundingClientRect();
  tooltip.style.left = `${rect.left + window.scrollX}px`;
  tooltip.style.top = `${rect.bottom + window.scrollY + 8}px`;
  
  // Clear any existing timeout
  if (tooltipTimeout) {
    clearTimeout(tooltipTimeout);
  }
}

function hideGlossaryTooltip() {
  const tooltip = document.getElementById('glossary-tooltip');
  
  tooltipTimeout = setTimeout(() => {
    tooltip.classList.remove('visible');
  }, 100);
}

// Additional utility functions for accessibility
function announceToScreenReader(message) {
  const announcement = document.createElement('div');
  announcement.setAttribute('aria-live', 'polite');
  announcement.setAttribute('aria-atomic', 'true');
  announcement.style.position = 'absolute';
  announcement.style.left = '-10000px';
  announcement.style.width = '1px';
  announcement.style.height = '1px';
  announcement.style.overflow = 'hidden';
  announcement.textContent = message;
  
  document.body.appendChild(announcement);
  
  setTimeout(() => {
    document.body.removeChild(announcement);
  }, 1000);
}

// Console commands for debugging (can be removed in production)
window.gameDebug = {
  getState: () => gameState,
  unlockAllAbilities: () => {
    Object.keys(gameState.unlockedAbilities).forEach(key => {
      gameState.unlockedAbilities[key] = true;
    });
    updateGameUI();
  },
  skipToResults: () => {
    endGame();
  },
  addScore: (points) => {
    gameState.score += points;
    updateGameUI();
  }
};

console.log('EU Tax Tactician loaded successfully! Type "gameDebug" in console for debug commands.');
