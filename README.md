# 🧠 Memento Core (Momento MemorySaver)

> 🧪 **Status:** Currently in Development Mode

Memento Core is an advanced digital consciousness backup system and secure personal memory archive. Designed with a futuristic cyberpunk aesthetic, it allows users to safely preserve, organize, and reflect on their life stories, thoughts, and ideas.

---

## 🔒 Why Memento Core? (Motivation & Privacy)

The core motivation behind building Memento Core is to provide users with a secure, intimate space to store, preserve, and interact with their life memories. In an era where online privacy is constantly under threat, Memento Core is built to protect your personal history:
-   **100% Local Storage First:** By default, all your memories, time capsules, and security settings are stored directly on your own device using browser `LocalStorage`. Your data never leaves your computer unless you explicitly choose to configure cloud synchronization.
-   **Absolute Privacy:** Since data stays local, no external servers, corporations, or AI models have access to your personal thoughts, ensuring your memories remain completely private, secure, and yours alone.

---

## 🌌 Key Features & How They Work

### 1. Interactive Constellation Map
*   **What it is:** A 2D interactive canvas that visualizes saved memories as star-like nodes in a celestial map.
*   **How it works:** Each memory is rendered dynamically on an HTML5 canvas. Connecting lines are drawn between related memories. Clicking on a node shows its detailed emotional state, contents, and allows deleting or updating it. The colors of the nodes represent the emotional accent of the memory (e.g., cyan for serene, purple for nostalgic).

### 2. Memoir Deck
*   **What it is:** A structured digital journal where users record new memories.
*   **How it works:** Users enter a Title, Content, select an Emotional State (nostalgic, existential, joyful, melancholic, serene), and add custom tags. These details are stored in the database (or locally) to build the user's memory database.

### 3. Consciousness Chat Mirror
*   **What it is:** A chatbot interface that allows you to "talk" to your own memories.
*   **How it works:** Running fully client-side and offline, it parses your query for keywords and scans your saved memories. It returns the most contextually relevant memory.
*   **Special Touches:**
    *   **Voice Output:** Text-to-speech synthesis reads the matched memory aloud.
    *   **Real-time Telemetry:** A telemetry HUD displays Match Strength (Congruence), Emotional Accent (Resonance), Matched Node ID, and Linked Keywords.

### 4. Temporal Vault (Time Capsules)
*   **What it is:** A time-locked letter system that lets you send messages to the future (yourself or others).
*   **How it works:** Write a message, set a future unlock date and time, and optionally set a passphrase. The vault encrypts the message and displays a live countdown timer. The message remains locked and hidden until the countdown reaches zero, requiring the passphrase (if set) to decrypt.

### 5. Resource Deck & System Monitor
*   **What it is:** A control panel simulating the system's operational health.
*   **How it works:** Displays simulated CPU and memory load, database sync indicators, and offers options to defragment the local database sector or completely reset the sandboxed data.

### 6. Biometric Login & Web Lock Security
*   **What it is:** Advanced privacy controls protecting your personal archive.
*   **How it works:** Integrates WebAuthn for biometric/passkey verification. Users can also configure a custom passcode/PIN to lock the site automatically on refresh or idle.

---

## 🛠️ Tech Stack & Architecture

-   **Frontend:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS, Framer Motion, Lucide React.
-   **Database:** MongoDB via Mongoose (with fallback to client-side LocalStorage when offline or in Sandbox mode).
-   **Audio:** Web Audio API for synthesized retro sound effects.
-   **Speech:** Web Speech Synthesis API for voice output in Consciousness Mirror.

---

## 🔮 Future Roadmap

We are constantly working to expand the capabilities of Memento Core. Planned future updates include:
-   **Interactive AI Hologram Guide:** In a future release, we plan to implement a fully interactive, animated AI Hologram companion. This hologram will be able to directly chat with you in real time, answer questions about your past entries, and guide you through your interactive constellation map like a digital assistant of your consciousness.

---

## 🚀 Getting Started

### Prerequisites
Make sure you have Node.js installed on your machine.

### Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/hariyanivaidehi/Momento-MemorySaver.git
   cd Momento-MemorySaver
   ```

2. Install the dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   Create a `.env.local` file in the root directory and configure your MongoDB URI if you want cloud sync enabled (otherwise, it will default to LocalStorage sandbox mode):
   ```env
   MONGODB_URI=your_mongodb_connection_string
   ```

4. Run the development server:
   ```bash
   npm run dev
   ```

5. Open the local development server URL shown in your terminal (typically port 3000) to view the application.
