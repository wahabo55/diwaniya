// Game JavaScript

let gameCode = '';
let userRole = ''; // 'host' or 'player'
let gameRef = null;
let gameData = null;
let currentUser = null;
let playerData = null;
let currentQuestionIndex = 0;
let questionTimer = null;
let questionStartTime = 0;

// Initialize when page loads
document.addEventListener('DOMContentLoaded', async function() {
    try {
        // Get URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        gameCode = urlParams.get('code');
        userRole = urlParams.get('role') || 'player';
        
        if (!gameCode) {
            alert('رمز اللعبة مطلوب');
            window.location.href = 'index.html';
            return;
        }
        
        // Initialize based on role
        if (userRole === 'host') {
            await initializeHost();
        } else {
            await initializePlayer();
        }
        
        // Setup game listener
        setupGameListener();
        
    } catch (error) {
        console.error('Error initializing game:', error);
        alert('حدث خطأ أثناء تحميل اللعبة');
        window.location.href = 'index.html';
    }
});

// Initialize host view
async function initializeHost() {
    try {
        // Check authentication
        currentUser = await checkAuth();
        if (!currentUser) {
            alert('يجب تسجيل الدخول كمضيف');
            window.location.href = 'host.html';
            return;
        }
        
        // Show host view
        document.getElementById('hostView').style.display = 'block';
        document.getElementById('playerView').style.display = 'none';
        
        showLoading();
        
        // Load game data
        gameRef = database.ref(`games/${gameCode}`);
        const snapshot = await gameRef.once('value');
        gameData = snapshot.val();
        
        if (!gameData) {
            throw new Error('اللعبة غير موجودة');
        }
        
        if (gameData.hostId !== currentUser.uid) {
            throw new Error('ليس لديك صلاحية لاستضافة هذه اللعبة');
        }
        
        // Update host UI
        updateHostUI();
        
        hideLoading();
        
    } catch (error) {
        hideLoading();
        throw error;
    }
}

// Initialize player view
async function initializePlayer() {
    try {
        // Show player view
        document.getElementById('hostView').style.display = 'none';
        document.getElementById('playerView').style.display = 'block';
        
        // Get player data from localStorage
        const storedData = localStorage.getItem('playerData');
        if (!storedData) {
            alert('لم يتم العثور على بيانات اللاعب');
            window.location.href = 'join.html';
            return;
        }
        
        const data = JSON.parse(storedData);
        if (data.gameCode !== gameCode) {
            alert('رمز اللعبة غير متطابق');
            window.location.href = 'join.html';
            return;
        }
        
        playerData = data;
        
        showLoading();
        
        // Load game data
        gameRef = database.ref(`games/${gameCode}`);
        const snapshot = await gameRef.once('value');
        gameData = snapshot.val();
        
        if (!gameData) {
            throw new Error('اللعبة غير موجودة');
        }
        
        // Update player UI
        updatePlayerUI();
        
        hideLoading();
        
    } catch (error) {
        hideLoading();
        throw error;
    }
}

// Setup game listener for real-time updates
function setupGameListener() {
    if (!gameRef) return;
    
    gameRef.on('value', (snapshot) => {
        const newGameData = snapshot.val();
        
        if (!newGameData) {
            alert('تم حذف اللعبة');
            window.location.href = 'index.html';
            return;
        }
        
        gameData = newGameData;
        
        if (userRole === 'host') {
            updateHostUI();
        } else {
            updatePlayerUI();
            handlePlayerGameState();
        }
    });
}

// Update host UI
function updateHostUI() {
    if (!gameData) return;
    
    // Update basic info
    document.getElementById('hostGameTitle').textContent = gameData.title;
    document.getElementById('hostGameCode').textContent = gameCode;
    document.getElementById('hostTotalQ').textContent = gameData.questions?.length || 0;
    document.getElementById('hostCurrentQ').textContent = currentQuestionIndex + 1;
    
    // Update players count
    const playersCount = gameData.players ? Object.keys(gameData.players).length : 0;
    document.getElementById('hostPlayersCount').textContent = playersCount;
    
    // Update current question
    if (gameData.questions && gameData.questions[currentQuestionIndex]) {
        displayHostQuestion(gameData.questions[currentQuestionIndex]);
    }
    
    // Update live responses
    updateLiveResponses();
    
    // Update control buttons based on game state
    updateHostControls();
}

// Display question for host
function displayHostQuestion(question) {
    document.getElementById('hostQuestionText').textContent = question.text;
      // Display media if exists
    const mediaContainer = document.getElementById('hostQuestionMedia');
    let mediaHtml = '';
    
    if (question.imageData) {
        mediaHtml += `<img src="${question.imageData}" alt="صورة السؤال" style="max-width: 100%; max-height: 300px; border-radius: 15px;">`;
    }
    if (question.videoData) {
        mediaHtml += `<video src="${question.videoData}" controls style="max-width: 100%; max-height: 300px; border-radius: 15px;">فيديو السؤال</video>`;
    }
    if (question.audioData) {
        mediaHtml += `<audio src="${question.audioData}" controls style="width: 100%;">ملف صوتي</audio>`;
    }
    
    mediaContainer.innerHTML = mediaHtml;
    
    // Display answer options
    const optionLabels = ['أ', 'ب', 'ج', 'د'];
    const optionElements = ['hostAnswerA', 'hostAnswerB', 'hostAnswerC', 'hostAnswerD'];
    
    question.options.forEach((option, index) => {
        const element = document.getElementById(optionElements[index]);
        element.querySelector('.option-text').textContent = option;
        element.querySelector('.answer-count').textContent = '0';
        
        // Highlight correct answer
        if (index === question.correctIndex) {
            element.classList.add('correct-answer');
        } else {
            element.classList.remove('correct-answer');
        }
    });
}

// Update live responses
function updateLiveResponses() {
    const livePlayersList = document.getElementById('livePlayersList');
    
    if (!gameData.players) {
        livePlayersList.innerHTML = '<p>لا يوجد لاعبون منضمون</p>';
        return;
    }
    
    let playersHtml = '';
    Object.values(gameData.players).forEach(player => {
        const hasAnswered = player.answers && player.answers[currentQuestionIndex] !== undefined;
        const statusClass = hasAnswered ? 'answered' : '';
        const statusText = hasAnswered ? 'أجاب' : 'لم يجب بعد';
        
        playersHtml += `
            <div class="live-player ${statusClass}">
                <span class="player-emoji">${player.emoji}</span>
                <div class="player-info">
                    <div class="player-name">${player.nickname}</div>
                    <div class="player-status">${statusText}</div>
                </div>
            </div>
        `;
    });
    
    livePlayersList.innerHTML = playersHtml;
    
    // Update answer counts
    updateAnswerCounts();
}

// Update answer counts on host screen
function updateAnswerCounts() {
    const answerCounts = [0, 0, 0, 0];
    
    if (gameData.players) {
        Object.values(gameData.players).forEach(player => {
            if (player.answers && player.answers[currentQuestionIndex] !== undefined) {
                const answerIndex = player.answers[currentQuestionIndex].selectedOption;
                if (answerIndex >= 0 && answerIndex < 4) {
                    answerCounts[answerIndex]++;
                }
            }
        });
    }
    
    const optionElements = ['hostAnswerA', 'hostAnswerB', 'hostAnswerC', 'hostAnswerD'];
    answerCounts.forEach((count, index) => {
        document.getElementById(optionElements[index]).querySelector('.answer-count').textContent = count;
    });
}

// Update host controls
function updateHostControls() {
    const startBtn = document.getElementById('startQuestionBtn');
    const nextBtn = document.getElementById('nextQuestionBtn');
    const endBtn = document.getElementById('endGameBtn');
    
    if (!gameData.started) {
        startBtn.style.display = 'block';
        nextBtn.style.display = 'none';
        endBtn.style.display = 'none';
        startBtn.textContent = '▶️ بدء اللعبة';
    } else if (gameData.currentQuestionActive) {
        startBtn.style.display = 'none';
        nextBtn.style.display = 'none';
        endBtn.style.display = 'block';
    } else {
        startBtn.style.display = 'none';
        
        if (currentQuestionIndex < (gameData.questions?.length || 0) - 1) {
            nextBtn.style.display = 'block';
            endBtn.style.display = 'none';
        } else {
            nextBtn.style.display = 'none';
            endBtn.style.display = 'block';
            endBtn.textContent = '🏁 عرض النتائج';
        }
    }
}

// Start question (or game if first question)
async function startQuestion() {
    try {
        if (!gameData.started) {
            // Start the game
            await gameRef.update({
                started: true,
                currentQuestion: 0,
                currentQuestionActive: true,
                questionStartTime: firebase.database.ServerValue.TIMESTAMP
            });
            
            currentQuestionIndex = 0;
        } else {
            // Start current question
            await gameRef.update({
                currentQuestionActive: true,
                questionStartTime: firebase.database.ServerValue.TIMESTAMP
            });
        }
        
        // Start timer
        startQuestionTimer();
        
    } catch (error) {
        console.error('Error starting question:', error);
        alert('حدث خطأ أثناء بدء السؤال');
    }
}

// Start question timer
function startQuestionTimer() {
    let timeLeft = 30; // 30 seconds per question
    questionStartTime = Date.now();
    
    document.getElementById('timerDisplay').textContent = timeLeft;
    
    questionTimer = setInterval(() => {
        timeLeft--;
        document.getElementById('timerDisplay').textContent = timeLeft;
        
        if (timeLeft <= 0) {
            clearInterval(questionTimer);
            endCurrentQuestion();
        }
    }, 1000);
}

// End current question
async function endCurrentQuestion() {
    try {
        if (questionTimer) {
            clearInterval(questionTimer);
            questionTimer = null;
        }
        
        await gameRef.update({
            currentQuestionActive: false,
            questionEndTime: firebase.database.ServerValue.TIMESTAMP
        });
        
    } catch (error) {
        console.error('Error ending question:', error);
    }
}

// Next question
async function nextQuestion() {
    try {
        currentQuestionIndex++;
        
        await gameRef.update({
            currentQuestion: currentQuestionIndex
        });
        
        // Update UI
        updateHostUI();
        
    } catch (error) {
        console.error('Error going to next question:', error);
        alert('حدث خطأ أثناء الانتقال للسؤال التالي');
    }
}

// End game
async function endGame() {
    try {
        await gameRef.update({
            finished: true,
            currentQuestionActive: false,
            endTime: firebase.database.ServerValue.TIMESTAMP
        });
        
        // Redirect to results
        window.location.href = `results.html?code=${gameCode}`;
        
    } catch (error) {
        console.error('Error ending game:', error);
        alert('حدث خطأ أثناء إنهاء اللعبة');
    }
}

// Update player UI
function updatePlayerUI() {
    if (!playerData || !gameData) return;
    
    // Update player info
    document.getElementById('playerEmoji').textContent = playerData.emoji;
    document.getElementById('playerNickname').textContent = playerData.nickname;
    
    // Update score
    const player = gameData.players?.[playerData.playerId];
    const score = player?.score || 0;
    document.getElementById('playerScore').textContent = score;
}

// Handle player game state
function handlePlayerGameState() {
    if (!gameData) return;
    
    if (gameData.finished) {
        // Game finished, redirect to results
        window.location.href = `results.html?code=${gameCode}`;
        return;
    }
    
    if (!gameData.started) {
        // Game not started yet
        showPlayerWaiting();
        return;
    }
    
    currentQuestionIndex = gameData.currentQuestion || 0;
    
    if (gameData.currentQuestionActive) {
        // Question is active
        showPlayerQuestion();
        startPlayerTimer();
    } else {
        // Between questions or showing results
        const player = gameData.players?.[playerData.playerId];
        const hasAnswered = player?.answers?.[currentQuestionIndex] !== undefined;
        
        if (hasAnswered) {
            showQuestionResults();
        } else {
            showPlayerWaiting();
        }
    }
}

// Show player waiting state
function showPlayerWaiting() {
    document.getElementById('waitingForQuestion').style.display = 'block';
    document.getElementById('questionActive').style.display = 'none';
    document.getElementById('answerSubmitted').style.display = 'none';
    document.getElementById('questionResults').style.display = 'none';
}

// Show player question
function showPlayerQuestion() {
    const question = gameData.questions?.[currentQuestionIndex];
    if (!question) return;
    
    document.getElementById('waitingForQuestion').style.display = 'none';
    document.getElementById('questionActive').style.display = 'block';
    document.getElementById('answerSubmitted').style.display = 'none';
    document.getElementById('questionResults').style.display = 'none';
    
    // Display question
    document.getElementById('playerQuestionText').textContent = question.text;
      // Display media
    const mediaContainer = document.getElementById('playerQuestionMedia');
    let mediaHtml = '';
    
    if (question.imageData) {
        mediaHtml += `<img src="${question.imageData}" alt="صورة السؤال" style="max-width: 100%; max-height: 200px; border-radius: 15px;">`;
    }
    if (question.videoData) {
        mediaHtml += `<video src="${question.videoData}" controls style="max-width: 100%; max-height: 200px; border-radius: 15px;">فيديو السؤال</video>`;
    }
    if (question.audioData) {
        mediaHtml += `<audio src="${question.audioData}" controls style="width: 100%;">ملف صوتي</audio>`;
    }
    
    mediaContainer.innerHTML = mediaHtml;
    
    // Display answer options
    const answerElements = ['playerAnswerA', 'playerAnswerB', 'playerAnswerC', 'playerAnswerD'];
    question.options.forEach((option, index) => {
        document.getElementById(answerElements[index]).textContent = option;
    });
    
    // Reset answer buttons
    document.querySelectorAll('.answer-btn').forEach(btn => {
        btn.classList.remove('selected');
        btn.disabled = false;
    });
}

// Start player timer
function startPlayerTimer() {
    let timeLeft = 30;
    document.getElementById('playerTimer').textContent = timeLeft;
    
    const timer = setInterval(() => {
        timeLeft--;
        document.getElementById('playerTimer').textContent = timeLeft;
        
        if (timeLeft <= 0) {
            clearInterval(timer);
            // Disable answer buttons
            document.querySelectorAll('.answer-btn').forEach(btn => {
                btn.disabled = true;
            });
        }
    }, 1000);
}

// Select answer
async function selectAnswer(optionIndex) {
    try {
        const responseTime = Date.now() - questionStartTime;
        
        // Update UI
        document.querySelectorAll('.answer-btn').forEach((btn, index) => {
            btn.classList.remove('selected');
            if (index === optionIndex) {
                btn.classList.add('selected');
            }
        });
        
        // Save answer to database
        const answerData = {
            selectedOption: optionIndex,
            responseTime: responseTime,
            timestamp: firebase.database.ServerValue.TIMESTAMP
        };
        
        await gameRef.child(`players/${playerData.playerId}/answers/${currentQuestionIndex}`).set(answerData);
        
        // Calculate and update score
        const question = gameData.questions[currentQuestionIndex];
        let points = 0;
        
        if (optionIndex === question.correctIndex) {
            // Correct answer: base points + time bonus
            const basePoints = 1000;
            const timeBonus = Math.max(0, 30 - Math.floor(responseTime / 1000)) * 10;
            points = basePoints + timeBonus;
        }
        
        // Update player score
        const currentScore = gameData.players[playerData.playerId]?.score || 0;
        const newScore = currentScore + points;
        await gameRef.child(`players/${playerData.playerId}/score`).set(newScore);
        
        // Show answer submitted
        showAnswerSubmitted(question.options[optionIndex]);
        
    } catch (error) {
        console.error('Error submitting answer:', error);
        alert('حدث خطأ أثناء إرسال الإجابة');
    }
}

// Show answer submitted
function showAnswerSubmitted(selectedAnswer) {
    document.getElementById('questionActive').style.display = 'none';
    document.getElementById('answerSubmitted').style.display = 'block';
    document.getElementById('submittedAnswer').textContent = selectedAnswer;
}

// Show question results
function showQuestionResults() {
    const question = gameData.questions[currentQuestionIndex];
    const player = gameData.players[playerData.playerId];
    const answer = player.answers[currentQuestionIndex];
    
    document.getElementById('waitingForQuestion').style.display = 'none';
    document.getElementById('questionActive').style.display = 'none';
    document.getElementById('answerSubmitted').style.display = 'none';
    document.getElementById('questionResults').style.display = 'block';
    
    const isCorrect = answer.selectedOption === question.correctIndex;
    const correctAnswerText = question.options[question.correctIndex];
    
    // Calculate points earned
    let pointsEarned = 0;
    if (isCorrect) {
        const basePoints = 1000;
        const timeBonus = Math.max(0, 30 - Math.floor(answer.responseTime / 1000)) * 10;
        pointsEarned = basePoints + timeBonus;
    }
    
    // Update UI
    const resultIcon = document.getElementById('resultIcon');
    const resultText = document.getElementById('resultText');
    
    if (isCorrect) {
        resultIcon.textContent = '✅';
        resultText.textContent = 'إجابة صحيحة! 🎉';
        resultText.style.color = '#28a745';
    } else {
        resultIcon.textContent = '❌';
        resultText.textContent = 'إجابة خاطئة';
        resultText.style.color = '#dc3545';
    }
    
    document.getElementById('correctAnswerText').textContent = correctAnswerText;
    document.getElementById('pointsEarned').textContent = pointsEarned;
}

// Handle page unload
window.addEventListener('beforeunload', function() {
    if (questionTimer) {
        clearInterval(questionTimer);
    }
    
    if (gameRef) {
        gameRef.off();
    }
});
