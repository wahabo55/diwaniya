// Join Game JavaScript

let gameCode = '';
let playerData = null;
let gameRef = null;
let playersRef = null;

// Show loading overlay
function showLoading() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        overlay.style.display = 'flex';
    }
}

// Hide loading overlay
function hideLoading() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        overlay.style.display = 'none';
    }
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
    // Wait for Firebase to initialize
    const initFirebase = () => {
        if (typeof window.database !== 'undefined') {
            console.log('Firebase initialized successfully for join page');
            setupEmojiPicker();
            setupFormSubmission();
        } else {
            console.log('Waiting for Firebase to initialize...');
            setTimeout(initFirebase, 100);
        }
    };
    
    initFirebase();
});

// Setup emoji picker functionality
function setupEmojiPicker() {
    const emojiButtons = document.querySelectorAll('.emoji-btn');
    const selectedEmojiInput = document.getElementById('selectedEmoji');
    
    emojiButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            // Remove selected class from all buttons
            emojiButtons.forEach(b => b.classList.remove('selected'));
            
            // Add selected class to clicked button
            this.classList.add('selected');
            
            // Update hidden input
            selectedEmojiInput.value = this.getAttribute('data-emoji');
        });
    });
    
    // Select first emoji by default
    if (emojiButtons.length > 0) {
        emojiButtons[0].classList.add('selected');
        selectedEmojiInput.value = emojiButtons[0].getAttribute('data-emoji');
    }
}

// Setup form submission
function setupFormSubmission() {
    document.getElementById('joinForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        
        gameCode = document.getElementById('gameCode').value.trim().toUpperCase();
        const nickname = document.getElementById('nickname').value.trim();
        const emoji = document.getElementById('selectedEmoji').value;
        
        // Validate inputs
        if (!gameCode) {
            showErrorModal('يجب إدخال رمز اللعبة');
            return;
        }
        
        if (!nickname) {
            showErrorModal('يجب إدخال اسم اللاعب');
            return;
        }
        
        if (nickname.length > 20) {
            showErrorModal('اسم اللاعب يجب أن يكون أقل من 20 حرف');
            return;
        }
        
        if (!emoji) {
            showErrorModal('يجب اختيار رمز تعبيري');
            return;
        }
        
        try {
            await joinGame(gameCode, nickname, emoji);
        } catch (error) {
            showErrorModal(error.message);
        }
    });
}

// Join game function
async function joinGame(code, nickname, emoji) {
    try {
        showLoading();
        
        // Wait for Firebase to be initialized
        if (typeof window.database === 'undefined') {
            // Wait a bit for Firebase to load
            await new Promise(resolve => setTimeout(resolve, 1000));
            if (typeof window.database === 'undefined') {
                throw new Error('خطأ في الاتصال بالخادم، يرجى إعادة تحميل الصفحة');
            }
        }
        
        // Check if game exists
        gameRef = window.database.ref(`games/${code}`);
        const gameSnapshot = await gameRef.once('value');
        const gameData = gameSnapshot.val();
        
        if (!gameData) {
            throw new Error('رمز اللعبة غير صحيح أو اللعبة غير موجودة');
        }
        
        // Check if game has already started
        if (gameData.started) {
            throw new Error('لقد بدأت اللعبة بالفعل، لا يمكن الانضمام الآن');
        }
        
        // Check if game is finished
        if (gameData.finished) {
            throw new Error('انتهت هذه اللعبة، لا يمكن الانضمام إليها');
        }
        
        // Check if nickname is already taken
        if (gameData.players) {
            const existingPlayers = Object.values(gameData.players);
            const nicknameExists = existingPlayers.some(player => 
                player.nickname.toLowerCase() === nickname.toLowerCase()
            );
            
            if (nicknameExists) {
                throw new Error('هذا الاسم مستخدم بالفعل، اختر اسماً آخر');
            }
        }
        
        // Generate unique player ID
        const playerId = generatePlayerId();
        
        // Create player data
        playerData = {
            id: playerId,
            nickname: nickname,
            emoji: emoji,
            score: 0,
            answers: {},
            joinedAt: firebase.database.ServerValue.TIMESTAMP
        };
        
        // Add player to game
        await gameRef.child(`players/${playerId}`).set(playerData);
        
        // Store player data in localStorage for persistence
        localStorage.setItem('playerData', JSON.stringify({
            gameCode: code,
            playerId: playerId,
            nickname: nickname,
            emoji: emoji
        }));
        
        hideLoading();
        
        // Show waiting room
        showWaitingRoom(gameData);
        
        // Listen for game updates
        setupGameListeners();
        
    } catch (error) {
        hideLoading();
        throw error;
    }
}

// Show waiting room
function showWaitingRoom(gameData) {
    document.getElementById('joinSection').style.display = 'none';
    document.getElementById('waitingSection').style.display = 'block';
    
    // Update UI with game info
    document.getElementById('gameTitle').textContent = gameData.title;
    document.getElementById('displayGameCode').textContent = gameCode;
    document.getElementById('playerEmoji').textContent = playerData.emoji;
    document.getElementById('playerName').textContent = playerData.nickname;
    
    // Update players list
    updatePlayersList(gameData.players || {});
}

// Update players list
function updatePlayersList(players) {
    const playersCount = Object.keys(players).length;
    const playersList = document.getElementById('playersList');
    
    document.getElementById('playersCount').textContent = playersCount;
    
    let playersHtml = '';
    Object.values(players).forEach(player => {
        playersHtml += `
            <div class="player-item">
                <span class="player-emoji">${player.emoji}</span>
                <span class="player-name">${player.nickname}</span>
            </div>
        `;
    });
    
    playersList.innerHTML = playersHtml;
}

// Setup game listeners
function setupGameListeners() {
    if (!gameRef) return;
    
    // Listen for players changes
    playersRef = gameRef.child('players');
    playersRef.on('value', (snapshot) => {
        const players = snapshot.val() || {};
        updatePlayersList(players);
    });
    
    // Listen for game start
    gameRef.child('started').on('value', (snapshot) => {
        const started = snapshot.val();
        if (started) {
            // Game has started, redirect to game page
            window.location.href = `game.html?code=${gameCode}&role=player`;
        }
    });
    
    // Listen for game deletion
    gameRef.on('value', (snapshot) => {
        if (!snapshot.exists()) {
            // Game was deleted
            showErrorModal('تم حذف اللعبة من قبل المضيف');
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 3000);
        }
    });
}

// Generate unique player ID
function generatePlayerId() {
    return 'player_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// Leave game
async function leaveGame() {
    const confirmed = confirm('هل أنت متأكد من مغادرة اللعبة؟');
    
    if (confirmed) {
        try {
            if (gameRef && playerData) {
                // Remove player from game
                await gameRef.child(`players/${playerData.id}`).remove();
                
                // Remove listeners
                if (playersRef) {
                    playersRef.off();
                }
                gameRef.off();
            }
            
            // Clear stored data
            localStorage.removeItem('playerData');
            
            // Redirect to home
            window.location.href = 'index.html';
            
        } catch (error) {
            console.error('Error leaving game:', error);
            // Still redirect even if there's an error
            window.location.href = 'index.html';
        }
    }
}

// Show error modal
function showErrorModal(message) {
    document.getElementById('errorMessage').textContent = message;
    document.getElementById('errorModal').style.display = 'flex';
}

// Close error modal
function closeErrorModal() {
    document.getElementById('errorModal').style.display = 'none';
}

// Auto-format game code input
document.getElementById('gameCode').addEventListener('input', function(e) {
    let value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (value.length > 6) {
        value = value.substring(0, 6);
    }
    e.target.value = value;
});

// Handle page unload - remove player from game
window.addEventListener('beforeunload', function() {
    if (gameRef && playerData) {
        // Use sendBeacon for better reliability
        navigator.sendBeacon(`/removePlayer`, JSON.stringify({
            gameCode: gameCode,
            playerId: playerData.id
        }));
    }
});

// Check for existing player data on page load
window.addEventListener('load', function() {
    const storedData = localStorage.getItem('playerData');
    if (storedData) {
        try {
            const data = JSON.parse(storedData);
            // Auto-fill form with stored data
            document.getElementById('gameCode').value = data.gameCode || '';
            document.getElementById('nickname').value = data.nickname || '';
            
            // Select stored emoji
            const emojiBtn = document.querySelector(`[data-emoji="${data.emoji}"]`);
            if (emojiBtn) {
                emojiBtn.click();
            }
        } catch (error) {
            console.error('Error loading stored player data:', error);
            localStorage.removeItem('playerData');
        }
    }
});

// Test Firebase connection
function testFirebaseConnection() {
    console.log('Testing Firebase connection...');
    console.log('Firebase app:', firebase.app());
    console.log('Database instance:', window.database);
    
    if (window.database && typeof window.database.ref === 'function') {
        console.log('Database ref function available');
        try {
            const testRef = window.database.ref('test');
            console.log('Test ref created successfully:', testRef);
        } catch (error) {
            console.error('Error creating test ref:', error);
        }
    } else {
        console.error('Database ref function not available');
    }
}

// Call test function after a delay
setTimeout(testFirebaseConnection, 1000);
