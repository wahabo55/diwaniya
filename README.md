Here's a **detailed prompt** you can use in **VS Code Copilot** to build your **Arabic Diwaniya Kahoot-style game** with **Firebase Realtime Database**, **HTML/CSS/JS**, and **Firebase Authentication (for host only)** — **frontend only**, no backend server needed:

---

### ✅ Prompt for VS Code Copilot:

> 💡 Copy and paste this into a `README.md` file in your project or use it to guide Copilot through comments in your code.

---

## 🎮 Diwaniya Quiz Game (Arabic - Frontend Only)

### ✨ Overview

Create a **multiplayer quiz game** for Diwaniya gatherings in Kuwait, inspired by **Kahoot**, using:

* **HTML, CSS, JavaScript (Vanilla)**
* **Firebase Realtime Database**
* **Firebase Authentication (host only)**

### 🔑 Main Features

#### 🔐 Authentication

* Only the **host** must sign up/log in using **Firebase Auth (email/password)**.
* **Players do not need accounts.**

#### 🏠 Home Page (index.html)

* Two buttons:

  * **\[Host Game]** → leads to login or dashboard if logged in.
  * **\[Join Game]** → leads to game join page (nickname + emoji).

#### 🧑‍💼 Host Dashboard (host.html)

* Show **remaining credits** (initial: 10).
* Button to **create a new game** (costs 2 credits).
* View previously created games.
* Option to **buy credits** (simulate for now, e.g. add 10 credits).

#### 🧩 Create Game Page (create.html)

* Host can add:

  * **Quiz Title**
  * **Questions** (multiple):

    * Text
    * Image (optional, use Firebase Storage)
    * Audio/Video (optional, also via Storage)
    * 4 answer options (A/B/C/D)
    * Choose the correct answer
  * Save all in Realtime DB under a unique game code.

#### 🔗 Join Game Page (join.html)

* Input: Game Code
* Input: Nickname
* Choose: Emoji (simple emoji picker)
* On join → Show waiting screen until host starts the game.

#### 🎮 Game Play (game.html)

* **Host screen**:

  * Shows questions with media and 4 colored options.
  * Tracks player responses, shows who answered fastest.
* **Player screen**:

  * Sees question + color-coded answer buttons.
  * Pressing faster gives more points.

#### 🏁 End Screen (results.html)

* Shows **1st, 2nd, 3rd** with trophy emojis.
* Full **scoreboard table** for all players.
* Fun animations for top 3.

---

### 🔧 Firebase Setup Required

* **Authentication** (Email/Password for host)
* **Realtime Database** (for game data, players, responses, scores)
* **Storage** (for images/videos/audio used in questions)

---

### 📁 Suggested Folder Structure

```
/diwaniya-quiz
├── index.html
├── host.html
├── create.html
├── join.html
├── game.html
├── results.html
├── /css/
│   └── styles.css
├── /js/
│   ├── firebase-config.js
│   ├── auth.js
│   ├── host.js
│   ├── create.js
│   ├── join.js
│   ├── game.js
│   └── results.js
├── /assets/
│   └── (optional emojis/icons/images)
```

---

### 📋 Firebase Database Structure (Example)

```json
{
  "games": {
    "ABC123": {
      "hostId": "uid123",
      "title": "تحدي المعلومات",
      "questions": [
        {
          "text": "ما هي عاصمة الكويت؟",
          "imageUrl": "",
          "videoUrl": "",
          "options": ["الكويت", "الرياض", "الدوحة", "مسقط"],
          "correctIndex": 0
        }
      ],
      "players": {
        "player1": {
          "nickname": "أحمد",
          "emoji": "🔥",
          "score": 1200
        }
      },
      "started": false,
      "currentQuestion": 0
    }
  },
  "hosts": {
    "uid123": {
      "email": "host@example.com",
      "credits": 8
    }
  }
}
```

---

### 🌐 Arabic UI

* All labels, buttons, text should be in **Arabic** (RTL layout).
* Use emoji and colorful styles for fun Diwaniya vibes.

Example:

* "ابدأ اللعبة" for "Start Game"
* "انضم إلى اللعبة" for "Join Game"
* "أدخل الرمز" for "Enter Code"
* "اسم اللاعب" for "Nickname"

---

### 🚀 Bonus Features (optional)

* Add countdown timer per question.
* Display number of players joined.
* Add sound effects (start, correct, wrong).
* Celebrate winner with confetti 🎉.

---

Would you like me to generate the actual HTML/CSS/JS starter files with Firebase setup to help you get going faster?
