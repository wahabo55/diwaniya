// Host Dashboard JavaScript

let currentUser = null;
let userCredits = 0;

// Initialize when page loads
document.addEventListener('DOMContentLoaded', async function() {
    try {
        // Check authentication status
        currentUser = await checkAuth();
        
        if (currentUser) {
            showDashboard();
            await loadUserData();
        } else {
            showLoginSection();
        }
    } catch (error) {
        console.error('Error initializing host page:', error);
        showLoginSection();
    }
});

// Show login section
function showLoginSection() {
    document.getElementById('loginSection').style.display = 'block';
    document.getElementById('registerSection').style.display = 'none';
    document.getElementById('dashboardSection').style.display = 'none';
}

// Show register section
function showRegister() {
    document.getElementById('loginSection').style.display = 'none';
    document.getElementById('registerSection').style.display = 'block';
    document.getElementById('dashboardSection').style.display = 'none';
}

// Show login section
function showLogin() {
    document.getElementById('loginSection').style.display = 'block';
    document.getElementById('registerSection').style.display = 'none';
    document.getElementById('dashboardSection').style.display = 'none';
}

// Show dashboard section
function showDashboard() {
    document.getElementById('loginSection').style.display = 'none';
    document.getElementById('registerSection').style.display = 'none';
    document.getElementById('dashboardSection').style.display = 'block';
}

// Handle login form submission
document.getElementById('loginForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    try {
        currentUser = await signIn(email, password);
        showDashboard();
        await loadUserData();
    } catch (error) {
        showError(error.message);
    }
});

// Handle register form submission
document.getElementById('registerForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const email = document.getElementById('regEmail').value;
    const password = document.getElementById('regPassword').value;
    
    try {
        currentUser = await signUp(email, password);
        showDashboard();
        await loadUserData();
    } catch (error) {
        showError(error.message);
    }
});

// Load user data and update UI
async function loadUserData() {
    try {
        if (!currentUser) {
            console.log('No current user found');
            return;
        }
        
        console.log('Loading user data for:', currentUser.uid);
        const userData = await getUserData(currentUser.uid);
        console.log('Loaded user data:', userData);
        
        userCredits = userData?.credits || 0;
        console.log('User credits:', userCredits);
        
        // Update UI
        document.getElementById('userEmail').textContent = `مرحباً، ${currentUser.email}`;
        document.getElementById('creditsCount').textContent = userCredits;
        
        // Enable/disable create game button based on credits
        const createGameBtn = document.getElementById('createGameBtn');
        if (userCredits < 2) {
            console.log('Insufficient credits, disabling create game button');
            createGameBtn.disabled = true;
            createGameBtn.textContent = 'رصيد غير كافي (2 نقاط مطلوبة)';
            createGameBtn.classList.add('btn-disabled');
        } else {
            console.log('Sufficient credits, enabling create game button');
            createGameBtn.disabled = false;
            createGameBtn.textContent = 'إنشاء لعبة جديدة (2 نقاط)';
            createGameBtn.classList.remove('btn-disabled');
        }
        
        // Load user's games
        await loadUserGames();
        
    } catch (error) {
        console.error('Error loading user data:', error);
        showError('حدث خطأ أثناء تحميل بيانات المستخدم');
    }
}

// Load user's games
async function loadUserGames() {
    try {
        if (!currentUser) return;
          const gamesRef = window.database.ref('games');
        const snapshot = await gamesRef.orderByChild('hostId').equalTo(currentUser.uid).once('value');
        const games = snapshot.val();
        
        const gamesList = document.getElementById('gamesList');
        
        if (!games) {
            gamesList.innerHTML = '<p class="no-games">لم تقم بإنشاء أي ألعاب بعد</p>';
            return;
        }
        
        let gamesHtml = '';
        Object.keys(games).forEach(gameCode => {
            const game = games[gameCode];
            const createdDate = game.createdAt ? new Date(game.createdAt).toLocaleDateString('ar-SA') : 'غير محدد';
            const playersCount = game.players ? Object.keys(game.players).length : 0;
            const questionsCount = game.questions ? game.questions.length : 0;
            
            gamesHtml += `
                <div class="game-item">
                    <div class="game-header">
                        <h4>${game.title}</h4>
                        <span class="game-code">الرمز: ${gameCode}</span>
                    </div>
                    <div class="game-details">
                        <span>📅 ${createdDate}</span>
                        <span>❓ ${questionsCount} سؤال</span>
                        <span>👥 ${playersCount} لاعب</span>
                    </div>
                    <div class="game-actions">
                        <button class="btn btn-small btn-host" onclick="startExistingGame('${gameCode}')">
                            ▶️ بدء اللعبة
                        </button>
                        <button class="btn btn-small btn-secondary" onclick="editGame('${gameCode}')">
                            ✏️ تعديل
                        </button>
                        <button class="btn btn-small btn-outline" onclick="deleteGame('${gameCode}')">
                            🗑️ حذف
                        </button>
                    </div>
                </div>
            `;
        });
        
        gamesList.innerHTML = gamesHtml;
        
    } catch (error) {
        console.error('Error loading user games:', error);
        document.getElementById('gamesList').innerHTML = '<p class="no-games">حدث خطأ أثناء تحميل الألعاب</p>';
    }
}

// Create new game
function createNewGame() {
    if (userCredits < 2) {
        showError('لا يوجد رصيد كافي. تحتاج إلى نقطتين لإنشاء لعبة جديدة.');
        return;
    }
    
    window.location.href = 'create.html';
}

// Buy credits (simulate for now)
async function buyCredits() {
    try {
        if (!currentUser) return;
        
        const confirmed = confirm('هل تريد شراء 10 نقاط إضافية؟');
        if (confirmed) {
            showLoading();
            const newCredits = await addCredits(currentUser.uid, 10);
            userCredits = newCredits;
            document.getElementById('creditsCount').textContent = userCredits;
            
            // Re-enable create game button if it was disabled
            const createGameBtn = document.getElementById('createGameBtn');
            if (userCredits >= 2) {
                createGameBtn.disabled = false;
                createGameBtn.textContent = 'إنشاء لعبة جديدة (2 نقاط)';
                createGameBtn.classList.remove('btn-disabled');
            }
            
            hideLoading();
            alert('تم شراء 10 نقاط بنجاح!');
        }
    } catch (error) {
        hideLoading();
        showError(error.message);
    }
}

// View my games
function viewMyGames() {
    // Scroll to games list
    document.querySelector('.games-list').scrollIntoView({ 
        behavior: 'smooth' 
    });
}

// Start existing game
function startExistingGame(gameCode) {
    window.location.href = `game.html?code=${gameCode}&role=host`;
}

// Edit game
function editGame(gameCode) {
    window.location.href = `create.html?edit=${gameCode}`;
}

// Delete game
async function deleteGame(gameCode) {
    const confirmed = confirm('هل أنت متأكد من حذف هذه اللعبة؟ لن تتمكن من استردادها.');
    
    if (confirmed) {
        try {        showLoading();
            await window.database.ref(`games/${gameCode}`).remove();
            hideLoading();
            alert('تم حذف اللعبة بنجاح');
            await loadUserGames(); // Reload games list
        } catch (error) {
            hideLoading();
            console.error('Error deleting game:', error);
            showError('حدث خطأ أثناء حذف اللعبة');
        }
    }
}

// Logout
async function logout() {
    try {
        await signOut();
        currentUser = null;
        userCredits = 0;
        showLoginSection();
    } catch (error) {
        showError(error.message);
    }
}

// Add CSS for game items
const style = document.createElement('style');
style.textContent = `
    .game-item {
        border: 2px solid #e0e0e0;
        border-radius: 10px;
        padding: 1.5rem;
        margin-bottom: 1rem;
        background: #f8f9fa;
        transition: all 0.3s ease;
    }
    
    .game-item:hover {
        border-color: #667eea;
        transform: translateY(-2px);
    }
    
    .game-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1rem;
    }
    
    .game-header h4 {
        margin: 0;
        color: #333;
        font-size: 1.2rem;
    }
    
    .game-code {
        background: #667eea;
        color: white;
        padding: 0.25rem 0.75rem;
        border-radius: 15px;
        font-size: 0.9rem;
        font-weight: 600;
    }
    
    .game-details {
        display: flex;
        gap: 1rem;
        margin-bottom: 1rem;
        color: #666;
        font-size: 0.9rem;
    }
    
    .game-actions {
        display: flex;
        gap: 0.5rem;
        flex-wrap: wrap;
    }
    
    .btn-disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }
    
    @media (max-width: 768px) {
        .game-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 0.5rem;
        }
        
        .game-details {
            flex-direction: column;
            gap: 0.25rem;
        }
        
        .game-actions {
            justify-content: center;
        }
    }
`;
document.head.appendChild(style);
