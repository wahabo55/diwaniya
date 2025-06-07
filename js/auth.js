// Authentication Helper Functions

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

// Show error message
function showError(message) {
    alert(message); // Simple alert for now, can be enhanced with custom modals
}

// Check if user is authenticated
function checkAuth() {
    return new Promise((resolve) => {
        // Wait for Firebase to be initialized
        if (typeof window.auth === 'undefined') {
            // Firebase not ready yet, wait a bit
            setTimeout(() => {
                if (typeof window.auth !== 'undefined') {
                    window.auth.onAuthStateChanged((user) => {
                        resolve(user);
                    });
                } else {
                    console.error('Firebase auth not initialized');
                    resolve(null);
                }
            }, 100);
        } else {
            window.auth.onAuthStateChanged((user) => {
                resolve(user);
            });
        }
    });
}

// Sign up new user
async function signUp(email, password) {
    try {
        showLoading();
        const userCredential = await window.auth.createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;
        
        console.log('Creating user account for:', user.uid);
        
        // Initialize user data in database
        const userData = {
            email: user.email,
            credits: 10,
            createdAt: firebase.database.ServerValue.TIMESTAMP
        };
        
        await window.database.ref(`hosts/${user.uid}`).set(userData);
        console.log('User data created successfully:', userData);
        
        // Verify the data was written
        const verification = await window.database.ref(`hosts/${user.uid}`).once('value');
        const verifyData = verification.val();
        console.log('Verification - User data in database:', verifyData);
        
        hideLoading();
        return user;
    } catch (error) {
        hideLoading();
        console.error('Sign up error:', error);
        
        // Translate error messages to Arabic
        let errorMessage = 'حدث خطأ أثناء إنشاء الحساب';
        switch (error.code) {
            case 'auth/email-already-in-use':
                errorMessage = 'البريد الإلكتروني مستخدم بالفعل';
                break;
            case 'auth/invalid-email':
                errorMessage = 'البريد الإلكتروني غير صحيح';
                break;
            case 'auth/weak-password':
                errorMessage = 'كلمة المرور ضعيفة جداً';
                break;
            case 'auth/operation-not-allowed':
                errorMessage = 'تسجيل الحسابات الجديدة غير مفعل';
                break;
        }
        
        throw new Error(errorMessage);
    }
}

// Sign in existing user
async function signIn(email, password) {
    try {
        showLoading();
        const userCredential = await window.auth.signInWithEmailAndPassword(email, password);
        hideLoading();
        return userCredential.user;
    } catch (error) {
        hideLoading();
        console.error('Sign in error:', error);
        
        // Translate error messages to Arabic
        let errorMessage = 'حدث خطأ أثناء تسجيل الدخول';
        switch (error.code) {
            case 'auth/user-not-found':
                errorMessage = 'المستخدم غير موجود';
                break;
            case 'auth/wrong-password':
                errorMessage = 'كلمة المرور غير صحيحة';
                break;
            case 'auth/invalid-email':
                errorMessage = 'البريد الإلكتروني غير صحيح';
                break;
            case 'auth/user-disabled':
                errorMessage = 'تم تعطيل هذا الحساب';
                break;
            case 'auth/too-many-requests':
                errorMessage = 'تم تجاوز عدد المحاولات المسموح، حاول لاحقاً';
                break;
        }
        
        throw new Error(errorMessage);
    }
}

// Sign out user
async function signOut() {
    try {
        await auth.signOut();
        console.log('User signed out successfully');
    } catch (error) {
        console.error('Sign out error:', error);
        throw new Error('حدث خطأ أثناء تسجيل الخروج');
    }
}

// Get current user
function getCurrentUser() {
    return auth.currentUser;
}

// Get user data from database
async function getUserData(uid) {
    try {
        console.log('Getting user data for UID:', uid);
        const snapshot = await window.database.ref(`hosts/${uid}`).once('value');
        const userData = snapshot.val();
        console.log('Retrieved user data:', userData);
        
        if (!userData) {
            console.log('No user data found, creating default user data...');
            // If user data doesn't exist, create it
            const defaultUserData = {
                email: window.auth.currentUser?.email || '',
                credits: 10,
                createdAt: firebase.database.ServerValue.TIMESTAMP
            };
            await window.database.ref(`hosts/${uid}`).set(defaultUserData);
            console.log('Created default user data:', defaultUserData);
            return { ...defaultUserData, createdAt: Date.now() };
        }
        
        return userData;
    } catch (error) {
        console.error('Error getting user data:', error);
        throw new Error('حدث خطأ أثناء جلب بيانات المستخدم');
    }
}

// Update user credits
async function updateCredits(uid, newCredits) {
    try {
        await window.database.ref(`hosts/${uid}/credits`).set(newCredits);
        console.log('Credits updated successfully');
    } catch (error) {
        console.error('Error updating credits:', error);
        throw new Error('حدث خطأ أثناء تحديث النقاط');
    }
}

// Add credits to user account
async function addCredits(uid, amount) {
    try {
        const userData = await getUserData(uid);
        const currentCredits = userData.credits || 0;
        const newCredits = currentCredits + amount;
        await updateCredits(uid, newCredits);
        return newCredits;
    } catch (error) {
        console.error('Error adding credits:', error);
        throw new Error('حدث خطأ أثناء إضافة النقاط');
    }
}

// Deduct credits from user account
async function deductCredits(uid, amount) {
    try {
        console.log('Deducting credits - UID:', uid, 'Amount:', amount);
        const userData = await getUserData(uid);
        console.log('User data before deduction:', userData);
        
        const currentCredits = userData?.credits || 0;
        console.log('Current credits:', currentCredits);
        
        if (currentCredits < amount) {
            console.log('Insufficient credits! Current:', currentCredits, 'Required:', amount);
            throw new Error('لا يوجد رصيد كافي');
        }
        
        const newCredits = currentCredits - amount;
        console.log('New credits after deduction:', newCredits);
        
        await updateCredits(uid, newCredits);
        console.log('Credits updated successfully');
        return newCredits;
    } catch (error) {
        console.error('Error deducting credits:', error);
        throw error;
    }
}
