// Create Game JavaScript

let currentUser = null;
let questions = [];
let isEditMode = false;
let editGameCode = null;

// Convert file to base64 for database storage
function convertFileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', async function() {
    try {
        // Check authentication
        currentUser = await checkAuth();
        
        if (!currentUser) {
            alert('يجب تسجيل الدخول أولاً');
            window.location.href = 'host.html';
            return;
        }
        
        // Check if this is edit mode
        const urlParams = new URLSearchParams(window.location.search);
        editGameCode = urlParams.get('edit');
        
        if (editGameCode) {
            isEditMode = true;
            await loadGameForEditing(editGameCode);
        } else {
            // Add first question
            addQuestion();
        }
        
        updateProgress();
        
    } catch (error) {
        console.error('Error initializing create page:', error);
        alert('حدث خطأ أثناء تحميل الصفحة');
        window.location.href = 'host.html';
    }
});

// Load game data for editing
async function loadGameForEditing(gameCode) {
    try {
        showLoading();
        const snapshot = await window.database.ref(`games/${gameCode}`).once('value');
        const gameData = snapshot.val();
        
        if (!gameData) {
            throw new Error('اللعبة غير موجودة');
        }
        
        if (gameData.hostId !== currentUser.uid) {
            throw new Error('ليس لديك صلاحية لتعديل هذه اللعبة');
        }
        
        // Load game title
        document.getElementById('gameTitle').value = gameData.title;
        
        // Load questions
        questions = gameData.questions || [];
        questions.forEach((question, index) => {
            addQuestion(question, index);
        });
        
        hideLoading();
        
    } catch (error) {
        hideLoading();
        console.error('Error loading game for editing:', error);
        alert(error.message);
        window.location.href = 'host.html';
    }
}

// Add new question
function addQuestion(questionData = null, index = null) {
    const questionsContainer = document.getElementById('questionsContainer');
    const template = document.getElementById('questionTemplate');
    const questionCard = template.content.cloneNode(true);
    
    const questionIndex = index !== null ? index : questions.length;
    
    // Set question index
    questionCard.querySelector('.question-card').setAttribute('data-question-index', questionIndex);
    questionCard.querySelector('.question-number').textContent = questionIndex + 1;
    
    // Set unique names for radio buttons
    const radioButtons = questionCard.querySelectorAll('input[type="radio"]');
    radioButtons.forEach(radio => {
        radio.name = `correct-answer-${questionIndex}`;
    });
    
    // If editing existing question, populate data
    if (questionData) {
        questionCard.querySelector('.question-text').value = questionData.text || '';
        questionData.options.forEach((option, optIndex) => {
            questionCard.querySelectorAll('.answer-input')[optIndex].value = option;
        });
        
        // Set correct answer
        if (typeof questionData.correctIndex !== 'undefined') {
            radioButtons[questionData.correctIndex].checked = true;
        }
        
        // Load media if exists
        if (questionData.imageUrl) {
            const mediaPreview = questionCard.querySelector('.media-preview');
            mediaPreview.innerHTML = `<img src="${questionData.imageUrl}" alt="صورة السؤال">`;
        }
        if (questionData.videoUrl) {
            const mediaPreview = questionCard.querySelector('.media-preview');
            mediaPreview.innerHTML = `<video src="${questionData.videoUrl}" controls>فيديو السؤال</video>`;
        }
        if (questionData.audioUrl) {
            const mediaPreview = questionCard.querySelector('.media-preview');
            mediaPreview.innerHTML = `<audio src="${questionData.audioUrl}" controls>ملف صوتي</audio>`;
        }
    }
    
    questionsContainer.appendChild(questionCard);
    
    // Add to questions array if not editing
    if (!questionData) {
        questions.push({
            text: '',
            options: ['', '', '', ''],
            correctIndex: 0,
            imageUrl: '',
            videoUrl: '',
            audioUrl: ''
        });
    }
    
    updateProgress();
}

// Remove question
function removeQuestion(button) {
    const questionCard = button.closest('.question-card');
    const questionIndex = parseInt(questionCard.getAttribute('data-question-index'));
    
    // Remove from DOM
    questionCard.remove();
    
    // Remove from questions array
    questions.splice(questionIndex, 1);
    
    // Update question numbers
    updateQuestionNumbers();
    updateProgress();
}

// Update question numbers after removal
function updateQuestionNumbers() {
    const questionCards = document.querySelectorAll('.question-card');
    questionCards.forEach((card, index) => {
        card.setAttribute('data-question-index', index);
        card.querySelector('.question-number').textContent = index + 1;
        
        // Update radio button names
        const radioButtons = card.querySelectorAll('input[type="radio"]');
        radioButtons.forEach(radio => {
            radio.name = `correct-answer-${index}`;
        });
    });
}

// Handle media upload
async function handleMediaUpload(input, mediaType) {
    const file = input.files[0];
    if (!file) return;
    
    // Check file size (limit to 1MB for database storage)
    if (file.size > 1024 * 1024) {
        alert('حجم الملف كبير جداً. يجب أن يكون أقل من 1 ميجابايت');
        return;
    }
    
    try {
        showLoading();
        
        // Convert file to base64
        const base64Data = await convertFileToBase64(file);
        
        // Update preview
        const questionCard = input.closest('.question-card');
        const mediaPreview = questionCard.querySelector('.media-preview');
        
        let previewHTML = '';
        switch (mediaType) {
            case 'image':
                previewHTML = `<img src="${base64Data}" alt="صورة السؤال" style="max-width: 100%; max-height: 200px; border-radius: 10px;">`;
                break;
            case 'video':
                previewHTML = `<video src="${base64Data}" controls style="max-width: 100%; max-height: 200px; border-radius: 10px;">فيديو السؤال</video>`;
                break;
            case 'audio':
                previewHTML = `<audio src="${base64Data}" controls style="width: 100%;">ملف صوتي</audio>`;
                break;
        }
        
        mediaPreview.innerHTML = previewHTML;
        
        // Store base64 data in questions array
        const questionIndex = parseInt(questionCard.getAttribute('data-question-index'));
        questions[questionIndex][`${mediaType}Data`] = base64Data;
        questions[questionIndex][`${mediaType}Type`] = file.type;
        
        hideLoading();
        
    } catch (error) {
        hideLoading();
        console.error('Error processing media:', error);
        alert('حدث خطأ أثناء معالجة الملف');
    }
}

// Update progress bar
function updateProgress() {
    const totalSteps = 3; // Title + At least 1 question + Save
    const currentStep = questions.length > 0 ? 2 : 1;
    const progress = (currentStep / totalSteps) * 100;
    
    document.getElementById('progressFill').style.width = `${progress}%`;
}

// Handle form submission
document.getElementById('createGameForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    try {
        // Validate form
        const gameTitle = document.getElementById('gameTitle').value.trim();
        if (!gameTitle) {
            alert('يجب إدخال عنوان للمسابقة');
            return;
        }
        
        if (questions.length === 0) {
            alert('يجب إضافة سؤال واحد على الأقل');
            return;
        }
        
        // Collect question data
        const questionCards = document.querySelectorAll('.question-card');
        const validQuestions = [];
        
        questionCards.forEach((card, index) => {
            const questionText = card.querySelector('.question-text').value.trim();
            const answerInputs = card.querySelectorAll('.answer-input');
            const correctAnswerRadio = card.querySelector('input[type="radio"]:checked');
            
            if (!questionText) {
                throw new Error(`يجب إدخال نص للسؤال رقم ${index + 1}`);
            }
            
            const options = [];
            answerInputs.forEach(input => {
                const value = input.value.trim();
                if (!value) {
                    throw new Error(`يجب ملء جميع خيارات السؤال رقم ${index + 1}`);
                }
                options.push(value);
            });
            
            if (!correctAnswerRadio) {
                throw new Error(`يجب اختيار الإجابة الصحيحة للسؤال رقم ${index + 1}`);
            }
            
            const questionIndex = parseInt(card.getAttribute('data-question-index'));
            const questionData = questions[questionIndex] || {};
            
            validQuestions.push({
                text: questionText,
                options: options,
                correctIndex: parseInt(correctAnswerRadio.value),
                imageUrl: questionData.imageUrl || '',
                videoUrl: questionData.videoUrl || '',
                audioUrl: questionData.audioUrl || ''
            });
        });
        
        showLoading();
        
        let gameCode;
        
        if (isEditMode && editGameCode) {
            // Update existing game
            gameCode = editGameCode;
            await window.database.ref(`games/${gameCode}`).update({
                title: gameTitle,
                questions: validQuestions,
                updatedAt: firebase.database.ServerValue.TIMESTAMP
            });        } else {
            // Check and deduct credits for new game
            console.log('Checking credits for new game creation...');
            const userData = await getUserData(currentUser.uid);
            console.log('Retrieved user data for credit check:', userData);
            
            const currentCredits = userData?.credits || 0;
            console.log('Current credits:', currentCredits);
            
            if (currentCredits < 2) {
                console.log('Insufficient credits! Current:', currentCredits, 'Required: 2');
                throw new Error(`لا يوجد رصيد كافي. الرصيد الحالي: ${currentCredits} نقطة، تحتاج إلى نقطتين لإنشاء لعبة جديدة.`);
            }
            
            console.log('Deducting 2 credits...');
            await deductCredits(currentUser.uid, 2);
            console.log('Credits deducted successfully');
            
            // Generate unique game code
            gameCode = generateGameCode();
            
            // Save game to database
            const gameData = {
                hostId: currentUser.uid,
                title: gameTitle,
                questions: validQuestions,
                players: {},
                started: false,
                finished: false,
                currentQuestion: 0,
                createdAt: firebase.database.ServerValue.TIMESTAMP
            };
            
            await window.database.ref(`games/${gameCode}`).set(gameData);
        }
        
        hideLoading();
        
        // Show success modal
        document.getElementById('gameCode').textContent = gameCode;
        document.getElementById('successModal').style.display = 'flex';
        
    } catch (error) {
        hideLoading();
        console.error('Error saving game:', error);
        alert(error.message);
    }
});

// Generate random game code
function generateGameCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

// Start game immediately after creation
function startGame() {
    const gameCode = document.getElementById('gameCode').textContent;
    window.location.href = `game.html?code=${gameCode}&role=host`;
}

// Go to host dashboard
function goToHost() {
    window.location.href = 'host.html';
}

// Go back to previous page
function goBack() {
    if (confirm('هل أنت متأكد؟ سيتم فقدان جميع التغييرات غير المحفوظة.')) {
        window.history.back();
    }
}

// Close success modal
function closeModal() {
    document.getElementById('successModal').style.display = 'none';
}

// Add event listener for file inputs
document.addEventListener('change', function(e) {
    if (e.target.classList.contains('file-input')) {
        const mediaType = e.target.classList.contains('image-input') ? 'image' :
                         e.target.classList.contains('video-input') ? 'video' :
                         e.target.classList.contains('audio-input') ? 'audio' : null;
        
        if (mediaType) {
            handleMediaUpload(e.target, mediaType);
        }
    }
});

// Add event listener for file input labels
document.addEventListener('click', function(e) {
    if (e.target.classList.contains('btn') && e.target.previousElementSibling?.classList.contains('file-input')) {
        e.target.previousElementSibling.click();
    }
});
