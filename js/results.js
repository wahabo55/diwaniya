// results.js - Results and Scoreboard functionality
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getDatabase, ref, onValue, off } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';

class ResultsManager {
    constructor() {
        this.gameId = null;
        this.database = null;
        this.auth = null;
        this.isHost = false;
        this.gameData = null;
        this.playersData = {};
        this.finalScores = [];
        
        // Initialize Firebase
        this.initializeFirebase();
        
        // Get game ID from URL
        this.gameId = this.getGameIdFromUrl();
        if (!this.gameId) {
            this.showError('لم يتم العثور على معرف اللعبة');
            return;
        }
        
        this.setupEventListeners();
        this.loadGameResults();
    }
    
    async initializeFirebase() {
        // Import Firebase config
        const { firebaseConfig } = await import('./firebase-config.js');
        const app = initializeApp(firebaseConfig);
        this.database = getDatabase(app);
        this.auth = getAuth(app);
        
        // Check authentication state
        onAuthStateChanged(this.auth, (user) => {
            if (user) {
                this.isHost = true;
            }
        });
    }
    
    getGameIdFromUrl() {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('gameId');
    }
    
    setupEventListeners() {
        // New Game button
        const newGameBtn = document.getElementById('newGameBtn');
        if (newGameBtn) {
            newGameBtn.addEventListener('click', () => {
                if (this.isHost) {
                    window.location.href = 'create.html';
                } else {
                    window.location.href = 'join.html';
                }
            });
        }
        
        // Home button
        const homeBtn = document.getElementById('homeBtn');
        if (homeBtn) {
            homeBtn.addEventListener('click', () => {
                window.location.href = 'index.html';
            });
        }
        
        // Share Results button
        const shareBtn = document.getElementById('shareResultsBtn');
        if (shareBtn) {
            shareBtn.addEventListener('click', () => {
                this.shareResults();
            });
        }
        
        // Download Results button
        const downloadBtn = document.getElementById('downloadResultsBtn');
        if (downloadBtn) {
            downloadBtn.addEventListener('click', () => {
                this.downloadResults();
            });
        }
    }
    
    loadGameResults() {
        if (!this.gameId || !this.database) return;
        
        const gameRef = ref(this.database, `games/${this.gameId}`);
        
        onValue(gameRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                this.gameData = data;
                this.playersData = data.players || {};
                this.calculateFinalScores();
                this.displayResults();
                this.displayGameStats();
            } else {
                this.showError('لم يتم العثور على بيانات اللعبة');
            }
        }, (error) => {
            console.error('Error loading game results:', error);
            this.showError('خطأ في تحميل النتائج');
        });
    }
    
    calculateFinalScores() {
        const players = Object.entries(this.playersData);
        this.finalScores = players.map(([playerId, playerData]) => ({
            id: playerId,
            name: playerData.name,
            emoji: playerData.emoji,
            score: playerData.score || 0,
            correctAnswers: playerData.correctAnswers || 0,
            totalAnswers: playerData.totalAnswers || 0,
            averageTime: playerData.averageTime || 0,
            streak: playerData.maxStreak || 0
        })).sort((a, b) => b.score - a.score);
    }
    
    displayResults() {
        this.displayPodium();
        this.displayLeaderboard();
        this.displayAchievements();
    }
    
    displayPodium() {
        const podiumContainer = document.getElementById('podium');
        if (!podiumContainer || this.finalScores.length === 0) return;
        
        const top3 = this.finalScores.slice(0, 3);
        const positions = ['second', 'first', 'third'];
        const medals = ['🥈', '🥇', '🥉'];
        
        podiumContainer.innerHTML = '';
        
        // Create podium structure
        const podiumHTML = `
            <div class="podium-container">
                ${top3.map((player, index) => {
                    const position = index === 0 ? 'first' : index === 1 ? 'second' : 'third';
                    const height = index === 0 ? '120px' : index === 1 ? '100px' : '80px';
                    const rank = index === 0 ? 1 : index === 1 ? 2 : 3;
                    
                    return `
                        <div class="podium-player ${position}">
                            <div class="player-info">
                                <div class="player-emoji">${player.emoji}</div>
                                <div class="player-name">${player.name}</div>
                                <div class="player-score">${player.score} نقطة</div>
                                <div class="medal">${medals[index]}</div>
                            </div>
                            <div class="podium-base" style="height: ${height}">
                                <div class="rank-number">${rank}</div>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
        
        podiumContainer.innerHTML = podiumHTML;
        
        // Add animation
        setTimeout(() => {
            const podiumPlayers = podiumContainer.querySelectorAll('.podium-player');
            podiumPlayers.forEach((player, index) => {
                setTimeout(() => {
                    player.classList.add('animate-in');
                }, index * 300);
            });
        }, 100);
    }
    
    displayLeaderboard() {
        const leaderboard = document.getElementById('leaderboard');
        if (!leaderboard) return;
        
        const leaderboardHTML = this.finalScores.map((player, index) => {
            const rank = index + 1;
            const accuracy = player.totalAnswers > 0 ? 
                Math.round((player.correctAnswers / player.totalAnswers) * 100) : 0;
            
            return `
                <div class="leaderboard-item ${rank <= 3 ? 'top-three' : ''}" data-rank="${rank}">
                    <div class="rank">
                        <span class="rank-number">${rank}</span>
                        ${rank === 1 ? '<span class="crown">👑</span>' : ''}
                    </div>
                    <div class="player-avatar">
                        <span class="emoji">${player.emoji}</span>
                    </div>
                    <div class="player-details">
                        <div class="player-name">${player.name}</div>
                        <div class="player-stats">
                            <span class="stat">
                                <i class="fas fa-bullseye"></i>
                                ${accuracy}% دقة
                            </span>
                            <span class="stat">
                                <i class="fas fa-fire"></i>
                                ${player.streak} متتالي
                            </span>
                        </div>
                    </div>
                    <div class="player-score">
                        <span class="score-number">${player.score}</span>
                        <span class="score-label">نقطة</span>
                    </div>
                </div>
            `;
        }).join('');
        
        leaderboard.innerHTML = leaderboardHTML;
        
        // Add staggered animation
        const items = leaderboard.querySelectorAll('.leaderboard-item');
        items.forEach((item, index) => {
            setTimeout(() => {
                item.classList.add('animate-in');
            }, index * 100);
        });
    }
    
    displayAchievements() {
        if (this.finalScores.length === 0) return;
        
        const achievements = this.calculateAchievements();
        const achievementsContainer = document.getElementById('achievements');
        
        if (!achievementsContainer || achievements.length === 0) return;
        
        const achievementsHTML = achievements.map(achievement => `
            <div class="achievement-item">
                <div class="achievement-icon">${achievement.icon}</div>
                <div class="achievement-content">
                    <div class="achievement-title">${achievement.title}</div>
                    <div class="achievement-description">${achievement.description}</div>
                    <div class="achievement-player">
                        <span class="player-emoji">${achievement.player.emoji}</span>
                        <span class="player-name">${achievement.player.name}</span>
                    </div>
                </div>
            </div>
        `).join('');
        
        achievementsContainer.innerHTML = achievementsHTML;
    }
    
    calculateAchievements() {
        const achievements = [];
        
        if (this.finalScores.length === 0) return achievements;
        
        // Highest Score
        const winner = this.finalScores[0];
        achievements.push({
            icon: '🏆',
            title: 'البطل الأول',
            description: `حقق أعلى نتيجة: ${winner.score} نقطة`,
            player: winner
        });
        
        // Best Accuracy
        const bestAccuracy = this.finalScores.reduce((best, player) => {
            const accuracy = player.totalAnswers > 0 ? 
                (player.correctAnswers / player.totalAnswers) : 0;
            const bestAcc = best.totalAnswers > 0 ? 
                (best.correctAnswers / best.totalAnswers) : 0;
            return accuracy > bestAcc ? player : best;
        });
        
        const accuracy = bestAccuracy.totalAnswers > 0 ? 
            Math.round((bestAccuracy.correctAnswers / bestAccuracy.totalAnswers) * 100) : 0;
        
        if (accuracy > 0) {
            achievements.push({
                icon: '🎯',
                title: 'الأكثر دقة',
                description: `دقة ${accuracy}% في الإجابات`,
                player: bestAccuracy
            });
        }
        
        // Longest Streak
        const bestStreak = this.finalScores.reduce((best, player) => 
            player.streak > best.streak ? player : best
        );
        
        if (bestStreak.streak > 1) {
            achievements.push({
                icon: '🔥',
                title: 'السلسلة الذهبية',
                description: `${bestStreak.streak} إجابات صحيحة متتالية`,
                player: bestStreak
            });
        }
        
        // Speed Demon (if we have timing data)
        const fastestPlayer = this.finalScores.reduce((fastest, player) => {
            if (player.averageTime > 0 && (fastest.averageTime === 0 || player.averageTime < fastest.averageTime)) {
                return player;
            }
            return fastest;
        });
        
        if (fastestPlayer.averageTime > 0) {
            achievements.push({
                icon: '⚡',
                title: 'البرق',
                description: `أسرع متوسط إجابة: ${fastestPlayer.averageTime.toFixed(1)} ثانية`,
                player: fastestPlayer
            });
        }
        
        return achievements;
    }
    
    displayGameStats() {
        const gameTitle = document.getElementById('gameTitle');
        const totalQuestions = document.getElementById('totalQuestions');
        const totalPlayers = document.getElementById('totalPlayers');
        const gameDuration = document.getElementById('gameDuration');
        
        if (gameTitle && this.gameData) {
            gameTitle.textContent = this.gameData.title || 'ديوانية كاهوت';
        }
        
        if (totalQuestions && this.gameData) {
            totalQuestions.textContent = this.gameData.questions ? 
                Object.keys(this.gameData.questions).length : 0;
        }
        
        if (totalPlayers) {
            totalPlayers.textContent = this.finalScores.length;
        }
        
        if (gameDuration && this.gameData) {
            const duration = this.calculateGameDuration();
            gameDuration.textContent = duration;
        }
    }
    
    calculateGameDuration() {
        if (!this.gameData.startTime) return '0 دقيقة';
        
        const startTime = new Date(this.gameData.startTime);
        const endTime = this.gameData.endTime ? new Date(this.gameData.endTime) : new Date();
        const duration = Math.round((endTime - startTime) / (1000 * 60)); // minutes
        
        return `${duration} دقيقة`;
    }
    
    shareResults() {
        const gameTitle = this.gameData?.title || 'ديوانية كاهوت';
        const winner = this.finalScores[0];
        const totalPlayers = this.finalScores.length;
        
        const shareText = `🎉 نتائج ${gameTitle}!\n\n` +
            `🏆 الفائز: ${winner?.name} ${winner?.emoji}\n` +
            `📊 النتيجة: ${winner?.score} نقطة\n` +
            `👥 عدد اللاعبين: ${totalPlayers}\n\n` +
            `#ديوانية_كاهوت #كويز_عربي`;
        
        if (navigator.share) {
            navigator.share({
                title: `نتائج ${gameTitle}`,
                text: shareText,
                url: window.location.href
            });
        } else {
            // Fallback: copy to clipboard
            navigator.clipboard.writeText(shareText).then(() => {
                this.showMessage('تم نسخ النتائج للحافظة!');
            });
        }
    }
    
    downloadResults() {
        const gameTitle = this.gameData?.title || 'ديوانية كاهوت';
        const date = new Date().toLocaleDateString('ar-SA');
        
        let csvContent = 'الترتيب,الاسم,الرمز التعبيري,النقاط,الإجابات الصحيحة,إجمالي الإجابات,الدقة,أطول سلسلة\n';
        
        this.finalScores.forEach((player, index) => {
            const accuracy = player.totalAnswers > 0 ? 
                Math.round((player.correctAnswers / player.totalAnswers) * 100) : 0;
            
            csvContent += `${index + 1},${player.name},${player.emoji},${player.score},${player.correctAnswers},${player.totalAnswers},${accuracy}%,${player.streak}\n`;
        });
        
        const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `نتائج_${gameTitle}_${date}.csv`;
        link.style.display = 'none';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        this.showMessage('تم تحميل النتائج بنجاح!');
    }
    
    showError(message) {
        const errorContainer = document.getElementById('errorContainer');
        if (errorContainer) {
            errorContainer.innerHTML = `
                <div class="error-message">
                    <i class="fas fa-exclamation-circle"></i>
                    <span>${message}</span>
                </div>
            `;
            errorContainer.style.display = 'block';
        }
    }
    
    showMessage(message) {
        // Create temporary message element
        const messageEl = document.createElement('div');
        messageEl.className = 'success-message';
        messageEl.innerHTML = `
            <i class="fas fa-check-circle"></i>
            <span>${message}</span>
        `;
        
        document.body.appendChild(messageEl);
        
        // Remove after 3 seconds
        setTimeout(() => {
            if (messageEl.parentNode) {
                messageEl.parentNode.removeChild(messageEl);
            }
        }, 3000);
    }
    
    // Cleanup when leaving the page
    cleanup() {
        if (this.database && this.gameId) {
            const gameRef = ref(this.database, `games/${this.gameId}`);
            off(gameRef);
        }
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.resultsManager = new ResultsManager();
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (window.resultsManager) {
        window.resultsManager.cleanup();
    }
});

export default ResultsManager;
