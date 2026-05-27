// ==========================================
// FIREBASE APP INIT (ES MODULE STANDARD)
// ==========================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
    getFirestore, doc, onSnapshot, setDoc 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { 
    getAuth, onAuthStateChanged, getRedirectResult, signInAnonymously, 
    signOut, signInWithPopup, linkWithPopup, signInWithRedirect,
    signInWithEmailAndPassword, createUserWithEmailAndPassword,
    linkWithCredential, EmailAuthProvider, GoogleAuthProvider
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyBU4dyGo7bd6YKtHwDY9TYalQymYYeydNw",
    authDomain: "backgammon446.firebaseapp.com",
    projectId: "backgammon446",
    storageBucket: "backgammon446.firebasestorage.app",
    messagingSenderId: "224361270596",
    appId: "1:224361270596:web:b4c5ff41d9204d5345db11",
    measurementId: "G-ZRV59E48WM"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('profile');
googleProvider.addScope('email');

// ==========================================
// GAME STATE ENGINE & ISOLATION ROUTING
// ==========================================
let dice = [];
let board;
let selected = null;
let bar = { white: 0, black: 0 };
let borneOff = { white: 0, black: 0 }; 
let currentUser = null;       
let matchListener = null;     

function getLocalMatchKey() {
    let guestId = localStorage.getItem("backgammon_guest_token");
    if (!guestId) {
        guestId = "guest_" + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
        localStorage.setItem("backgammon_guest_token", guestId);
    }
    return "backgammon_match_" + guestId;
}

function start() {
    board = new Board();

    for (let i = 0; i < 24; i++) {
        const pEl = document.getElementById(String(i));
        if(pEl) pEl.onclick = () => handleClick(i);
    }
    
    const barEl = document.querySelector(".bar");
    if(barEl) barEl.onclick = () => handleBarClick();

    onAuthStateChanged(auth, (user) => {
        const actionBtn = document.getElementById("auth-action-btn");
        const userDisplay = document.getElementById("user-display");
        
        if (user) {
            currentUser = user;
            if (user.isAnonymous) {
                if (userDisplay) userDisplay.innerText = "Playing as Guest (Cloud Save)";
                if (actionBtn) actionBtn.innerText = "Save Progress / Login";
            } else {
                let nameStr = user.email || user.displayName || "Logged In";
                if (userDisplay) userDisplay.innerText = `Player: ${nameStr}`;
                if (actionBtn) actionBtn.innerText = "Log Out";
            }
            attachMatchListener(user.uid);
        } else {
            currentUser = null;
            if (matchListener) { matchListener(); matchListener = null; }
            if (userDisplay) userDisplay.innerText = "Playing Offline / Not Logged In";
            if (actionBtn) actionBtn.innerText = "Log In / Sign Up";
            loadLocalMatch();
        }
    });

    getRedirectResult(auth)
        .then((result) => {
            if (result && result.user) {
                closeAuthModal();
            }
        })
        .catch(err => {
            console.error("Redirect resolution handled:", err);
            alert("Google Login Error: " + err.message);
        });

    // Handle screen resize calculation recalculation dynamically
    window.addEventListener("resize", renderAll);
}

window.openAuthModal = openAuthModal;
window.closeAuthModal = closeAuthModal;
window.loginGoogle = loginGoogle;
window.loginEmail = loginEmail;
window.registerEmail = registerEmail;
window.roll = roll;
window.resetBoard = resetBoard;
window.closeResetModal = closeResetModal;
window.confirmResetBoard = confirmResetBoard;
window.handleWinReset = handleWinReset;

function playAsGuest() {
    if (!auth.currentUser) {
        signInAnonymously(auth)
            .then(() => closeAuthModal())
            .catch(err => console.error("Guest startup failed:", err));
    } else {
        closeAuthModal();
    }
}

function setupDefaultBoard() {
    const setup = [
        { i: 23, c: "white", n: 2 }, { i: 18, c: "black", n: 5 },
        { i: 16, c: "black", n: 3 }, { i: 12, c: "white", n: 5 },
        { i: 11, c: "black", n: 5 }, { i: 7, c: "white", n: 3 },
        { i: 5, c: "white", n: 5 },  { i: 0, c: "black", n: 2 },
    ];
    for(let i=0; i<24; i++) {
        board.points[i].setCheckerColor("none");
        board.points[i].setCheckerAmount(0);
    }
    for (let s of setup) {
        board.points[s.i].setCheckerColor(s.c);
        board.points[s.i].setCheckerAmount(s.n);
    }
    dice = [];
    board.turn = 0;
    bar = { white: 0, black: 0 };
    borneOff = { white: 0, black: 0 };
    selected = null;
    clearHighlights();
}

function resetBoard() {
    const rm = document.getElementById("reset-modal");
    if (rm) rm.style.display = "flex";
}

function closeResetModal() {
    const rm = document.getElementById("reset-modal");
    if (rm) rm.style.display = "none";
}

function confirmResetBoard() {
    if (!currentUser) {
        localStorage.removeItem(getLocalMatchKey());
    }
    setupDefaultBoard();
    saveMatchData(); 
    renderAll();
    closeResetModal();
}

function openAuthModal() {
    if(currentUser) {
        signOut(auth).then(() => { currentUser = null; });
    } else {
        const modal = document.getElementById("auth-modal");
        if (modal) modal.style.display = "flex";
    }
}

function closeAuthModal() {
    const modal = document.getElementById("auth-modal");
    if (modal) modal.style.display = "none";
}

function loginGoogle() {
    if (currentUser && currentUser.isAnonymous) {
        linkWithPopup(currentUser, googleProvider)
            .then(() => closeAuthModal())
            .catch(err => {
                if (err.code === 'auth/email-already-in-use' || err.code === 'auth/credential-already-in-use') {
                    signInWithPopup(auth, googleProvider)
                        .then(() => closeAuthModal())
                        .catch(e => alert("Login failed: " + e.message));
                } else if (err.code === 'auth/popup-blocked') {
                    signInWithRedirect(auth, googleProvider).catch(e => console.error(e));
                } else {
                    alert("Linking failed: " + err.message);
                }
            });
    } else {
        signInWithPopup(auth, googleProvider)
            .then(() => closeAuthModal())
            .catch(err => {
                if (err.code === 'auth/popup-blocked') {
                    signInWithRedirect(auth, googleProvider).catch(e => console.error(e));
                } else {
                    alert("Google Login Error: " + err.message);
                }
            });
    }
}

function loginEmail() {
    const email = document.getElementById("auth-email")?.value;
    const pass = document.getElementById("auth-password")?.value;
    if(!email || !pass) return alert("Please fill in both fields.");
    
    signInWithEmailAndPassword(auth, email, pass)
        .then(() => closeAuthModal())
        .catch(err => alert("Login Error: " + err.message));
}

function registerEmail() {
    const email = document.getElementById("auth-email")?.value;
    const pass = document.getElementById("auth-password")?.value;
    if(!email || !pass) return alert("Please fill in both fields.");

    if (currentUser && currentUser.isAnonymous) {
        const credential = EmailAuthProvider.credential(email, pass);
        linkWithCredential(currentUser, credential)
            .then(() => closeAuthModal())
            .catch(err => alert("Link Error: " + err.message));
    } else {
        createUserWithEmailAndPassword(auth, email, pass)
            .then(() => closeAuthModal())
            .catch(err => alert("Registration error: " + err.message));
    }
}

function attachMatchListener(userId) {
    if (matchListener) matchListener();

    const docRef = doc(db, "backgammon", userId);
    matchListener = onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data();
            dice = data.dice || [];
            board.turn = data.turn || 0;
            bar = data.bar || { white: 0, black: 0 };
            borneOff = data.borneOff || { white: 0, black: 0 };
            
            if (data.pointsData) {
                data.pointsData.forEach((p, idx) => {
                    board.points[idx].setCheckerColor(p.color);
                    board.points[idx].setCheckerAmount(p.amount);
                });
            }
            renderAll();
        } else {
            saveMatchData();
        }
    }, err => {
        console.error("Firestore read fault: ", err);
    });
}

function saveMatchData() {
    const pointsData = board.points.map(p => ({
        color: p.getCheckerColor(),
        amount: p.getCheckerAmount()
    }));

    const payload = {
        dice: dice,
        turn: board.turn,
        bar: bar,
        borneOff: borneOff,
        pointsData: pointsData
    };

    if (currentUser) {
        const docRef = doc(db, "backgammon", currentUser.uid);
        setDoc(docRef, payload)
          .catch(err => console.error("Cloud write failed: ", err));
    } else {
        localStorage.setItem(getLocalMatchKey(), JSON.stringify(payload));
        renderAll();
    }
}

function loadLocalMatch() {
    const localDataStr = localStorage.getItem(getLocalMatchKey());
    if (localDataStr) {
        try {
            const data = JSON.parse(localDataStr);
            dice = data.dice || [];
            board.turn = data.turn || 0;
            bar = data.bar || { white: 0, black: 0 };
            borneOff = data.borneOff || { white: 0, black: 0 };
            if (data.pointsData) {
                data.pointsData.forEach((p, idx) => {
                    board.points[idx].setCheckerColor(p.color);
                    board.points[idx].setCheckerAmount(p.amount);
                });
            }
        } catch (e) {
            console.error("Failed parsing local save file", e);
            setupDefaultBoard();
            saveMatchData();
        }
    } else {
        setupDefaultBoard();
        saveMatchData();
    }
    renderAll();
}

function handleBarClick() {
    const color = board.getCurrentColor();
    if (bar[color] > 0) {
        selected = "bar";
        showValidMovesFromBar();
        renderAll();
    }
}

function handleClick(i) {
    const color = board.getCurrentColor();

    if (selected === "bar") {
        const moves = getLegalMovesFromBar();
        if (moves.includes(i)) moveFromBar(i);
        selected = null;
        clearHighlights();
        saveMatchData();
        return;
    }

    const point = board.points[i];
    if (selected === null) {
        if (point.getCheckerColor() !== color) return;
        if (bar[color] > 0) return; 
        selected = i;
        showValidMoves(i);
    } else if (selected === i) {
        if (canBearOff(color)) {
            const legalMoves = board.getLegalMoves(selected, dice);
            if (legalMoves.includes(-1) || legalMoves.includes(24)) {
                executeBearOff(selected);
                return;
            }
        }
        selected = null;
        clearHighlights();
    } else {
        const moves = board.getLegalMoves(selected, dice);
        if (moves.includes(i)) move(selected, i);
        selected = null;
        clearHighlights();
    }
    saveMatchData();
}

function move(from, to) {
    const color = board.getCurrentColor();
    
    if (color === "white" && to >= from) return; 
    if (color === "black" && to <= from) return; 

    const step = Math.abs(to - from);
    const diceIndex = dice.indexOf(step);
    if (diceIndex === -1) return;

    board.points[from].remove();
    if (board.points[from].getCheckerAmount() === 0) board.points[from].setCheckerColor("none");

    handleCapture(to, color);
    board.points[to].setCheckerColor(color);
    board.points[to].add();

    dice.splice(diceIndex, 1);
    resolveTurn();
}

function executeBearOff(from) {
    const color = board.getCurrentColor();
    const legalMoves = board.getLegalMoves(from, dice);
    
    let targetTerminal = color === "white" ? -1 : 24;
    if (!legalMoves.includes(targetTerminal)) return;

    let usedDie = null;
    const uniqueDice = [...new Set(dice)].sort((a, b) => a - b);

    for (let die of uniqueDice) {
        const normalTarget = color === "white" ? from - die : from + die;
        
        if (normalTarget === targetTerminal) {
            usedDie = die;
            break;
        }
        if ((color === "white" && normalTarget < -1) || (color === "black" && normalTarget > 24)) {
            if (isFurthestChecker(from, color)) {
                usedDie = die;
                break;
            }
        }
    }

    if (usedDie !== null) {
        board.points[from].remove();
        if (board.points[from].getCheckerAmount() === 0) board.points[from].setCheckerColor("none");
        
        borneOff[color]++;
        const diceIndex = dice.indexOf(usedDie);
        dice.splice(diceIndex, 1);
        
        selected = null;
        clearHighlights();
        resolveTurn();
    }
}

function isFurthestChecker(index, color) {
    if (color === "white") {
        for (let i = 5; i > index; i--) {
            if (board.points[i].getCheckerColor() === "white") return false;
        }
    } else {
        for (let i = 18; i < index; i++) {
            if (board.points[i].getCheckerColor() === "black") return false;
        }
    }
    return true;
}

function moveFromBar(to) {
    const color = board.getCurrentColor();
    const step = color === "white" ? 24 - to : to + 1;
    const diceIndex = dice.indexOf(step);
    if (diceIndex === -1) return;

    bar[color]--;
    handleCapture(to, color);
    board.points[to].setCheckerColor(color);
    board.points[to].add();

    dice.splice(diceIndex, 1);
    resolveTurn();
}

function handleCapture(to, color) {
    const target = board.points[to];
    if (target.getCheckerColor() !== "none" && target.getCheckerColor() !== color) {
        bar[target.getCheckerColor()]++;
        target.setCheckerAmount(0);
        target.setCheckerColor("none");
    }
}

function resolveTurn() {
    const color = board.getCurrentColor();
    if (borneOff[color] === 15) {
        const winModal = document.getElementById("win-modal");
        const winMessage = document.getElementById("win-message");
        if (winModal && winMessage) {
            winMessage.innerText = `${color} has successfully borne off all checkers!`;
            winModal.style.display = "flex";
        }
        return;
    }
    if (dice.length > 0 && !hasAnyLegalMove(color)) dice = [];
    if (dice.length === 0) {
        board.nextTurn();
        selected = null;
    }
    saveMatchData();
}

function handleWinReset() {
    const winModal = document.getElementById("win-modal");
    if (winModal) winModal.style.display = "none";
    if (!currentUser) {
        localStorage.removeItem(getLocalMatchKey());
    }
    setupDefaultBoard();
    saveMatchData(); 
    renderAll();
}

function hasAnyLegalMove(color) {
    if (bar[color] > 0) return getLegalMovesFromBar().length > 0;
    for (let i = 0; i < 24; i++) {
        if (board.points[i].getCheckerColor() === color && board.getLegalMoves(i, dice).length > 0) return true;
    }
    return false;
}

function getLegalMovesFromBar() {
    const color = board.getCurrentColor();
    const moves = [];
    dice.forEach(step => {
        const to = color === "white" ? 24 - step : step - 1;
        if (isValidTarget(to, color)) moves.push(to);
    });
    return [...new Set(moves)];
}

function isValidTarget(to, color) {
    if (to < 0 || to >= 24) return false; 
    const target = board.points[to];
    return target.getCheckerColor() === "none" || target.getCheckerColor() === color || target.getCheckerAmount() === 1;
}

function canBearOff(color) {
    if (bar[color] > 0) return false;
    for (let i = 0; i < 24; i++) {
        const p = board.points[i];
        if (p.getCheckerColor() === color) {
            if (color === "white" && i > 5) return false;
            if (color === "black" && i < 18) return false;
        }
    }
    return true;
}

function showValidMoves(fromIndex) {
    clearHighlights();
    const moves = board.getLegalMoves(fromIndex, dice);
    moves.forEach(m => {
        const el = document.getElementById(String(m));
        if (el) el.classList.add("valid-move");
    });
}

function showValidMovesFromBar() {
    clearHighlights();
    getLegalMovesFromBar().forEach(m => {
        const el = document.getElementById(String(m));
        if (el) el.classList.add("valid-move");
    });
}

function clearHighlights() {
    document.querySelectorAll('.point').forEach(p => p.classList.remove("valid-move"));
}

function roll() {
    if (dice.length > 0) return; 
    const a = Math.floor(Math.random() * 6) + 1;
    const b = Math.floor(Math.random() * 6) + 1;
    dice = (a === b) ? [a, a, a, a] : [a, b];
    
    if (!hasAnyLegalMove(board.getCurrentColor())) {
        saveMatchData();
        setTimeout(() => { dice = []; board.nextTurn(); saveMatchData(); }, 1500);
    } else {
        saveMatchData();
    }
}

function renderAll() {
    const color = board.getCurrentColor();
    
    for (let i = 0; i < 24; i++) {
        const el = document.getElementById(String(i));
        if (!el) continue;
        el.innerHTML = "";
        
        const p = board.points[i];
        const count = p.getCheckerAmount();
        if (count === 0) continue;

        const isTopRow = (i >= 12);

        // Track point height geometry metrics dynamically
        const pointHeight = el.clientHeight || 240; 
        // 52px is our optimal width/height setup for un-squished checkers
        const checkerDiameter = Math.min(52, window.innerWidth * 0.05); 
        
        // Compute standard incremental layout separation spacing
        let stepSpacing = checkerDiameter + 3; // base spacing including padding
        const totalNeededHeight = count * stepSpacing;

        // If checkers exceed standard point height boundaries, compression scales progressively
        if (totalNeededHeight > pointHeight) {
            const availableSpace = pointHeight - checkerDiameter - 10;
            stepSpacing = availableSpace / (count - 1);
        }

        for (let j = 0; j < count; j++) {
            const d = document.createElement("div");
            d.classList.add("checker", p.getCheckerColor());
            
            // Assign positional coordinate offsets mathematically 
            const calculatedOffset = j * stepSpacing;
            if (isTopRow) {
                d.style.top = `${calculatedOffset}px`;
            } else {
                d.style.bottom = `${calculatedOffset}px`;
            }

            if (selected === i && j === count - 1) {
                d.classList.add("selected");
                
                if (canBearOff(color)) {
                    const legalMoves = board.getLegalMoves(i, dice);
                    if (legalMoves.includes(-1) || legalMoves.includes(24)) {
                        d.classList.add("can-bear-off-glow");
                    }
                }
            }
            el.appendChild(d);
        }
    }

    const barEl = document.querySelector(".bar");
    if (barEl) {
        barEl.innerHTML = "";
        barEl.classList.toggle("active-turn", bar[color] > 0);
        const stacks = { black: document.createElement("div"), white: document.createElement("div") };
        stacks.black.classList.add("bar-stack", "top");
        stacks.white.classList.add("bar-stack", "bottom");

        ['black', 'white'].forEach(c => {
            for (let i = 0; i < bar[c]; i++) {
                const d = document.createElement("div");
                d.classList.add("checker", c);
                if (selected === "bar" && color === c && i === bar[c] - 1) d.classList.add("selected");
                stacks[c].appendChild(d);
            }
            barEl.appendChild(stacks[c]);
        });
    }

    const diceEl = document.getElementById("dice");
    if (diceEl) diceEl.innerText = "Dice: " + (dice.length ? dice.join(",") : "-,-");
    
    const turnDisplayEl = document.getElementById("turnDisplay");
    if (turnDisplayEl) {
        turnDisplayEl.innerText = "Turn: " + color.charAt(0).toUpperCase() + color.slice(1);
    }

    // Render Bear-Off Trays
    ['white', 'black'].forEach(c => {
        const trayEl = document.getElementById(`bear-off-${c}`);
        if (trayEl) {
            trayEl.innerHTML = "";
            for (let i = 0; i < borneOff[c]; i++) {
                const piece = document.createElement("div");
                piece.classList.add("checker", c, "borne-off-piece");
                trayEl.appendChild(piece);
            }
        }
    });
}

class Point {
    constructor(amount, color) { this.amount = amount; this.color = color; }
    setCheckerAmount(v) { this.amount = v; }
    getCheckerAmount() { return this.amount; }
    setCheckerColor(v) { this.color = v; }
    getCheckerColor() { return this.color; }
    add() { this.amount++; }
    remove() { this.amount--; }
}

class Board {
    constructor() { this.turn = 0; this.points = Array.from({ length: 24 }, () => new Point(0, "none")); }
    nextTurn() { this.turn++; }
    getCurrentColor() { return this.turn % 2 === 0 ? "white" : "black"; }
    getLegalMoves(i, diceArr) {
        const color = this.points[i].getCheckerColor();
        if (color !== this.getCurrentColor()) return [];
        
        const validMoves = [];
        const uniqueDice = [...new Set(diceArr)];

        uniqueDice.forEach(step => {
            const target = color === "white" ? i - step : i + step;
            
            if (color === "white" && target < i && isValidTarget(target, color)) {
                validMoves.push(target);
            } else if (color === "black" && target > i && isValidTarget(target, color)) {
                validMoves.push(target);
            } else if (canBearOff(color)) {
                if (color === "white" && target === -1) validMoves.push(-1);
                if (color === "black" && target === 24) validMoves.push(24);
                
                if (color === "white" && target < -1 && isFurthestChecker(i, "white")) validMoves.push(-1);
                if (color === "black" && target > 24 && isFurthestChecker(i, "black")) validMoves.push(24);
            }
        });
        
        return validMoves;
    }
}

start();