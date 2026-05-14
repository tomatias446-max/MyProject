let dice = [];
let board;
let selected = null;
let bar = { white: 0, black: 0 };

/* =========================
   START
========================= */
function start() {
    board = new Board();

    // Standard Backgammon Setup
    const setup = [
        { i: 0, c: "black", n: 2 },
        { i: 5, c: "white", n: 5 },
        { i: 7, c: "white", n: 3 },
        { i: 11, c: "black", n: 5 },
        { i: 12, c: "white", n: 5 },
        { i: 16, c: "black", n: 3 },
        { i: 18, c: "black", n: 5 },
        { i: 23, c: "white", n: 2 },
    ];

    for (let s of setup) {
        board.points[s.i].setCheckerColor(s.c);
        board.points[s.i].setCheckerAmount(s.n);
    }

    // Attach listeners to points
    for (let i = 0; i < 24; i++) {
        document.getElementById(String(i)).onclick = () => handleClick(i);
    }

    renderAll();
}

/* =========================
   CLICK HANDLING
========================= */
function handleClick(i) {
    const color = board.getCurrentColor();

    // 1. If player has checkers on bar, they MUST move from bar first
    if (bar[color] > 0) {
        // We simulate a 'selected' state from the bar
        selected = "bar";
        showValidMovesFromBar();
        
        // If they click a valid destination for the bar piece
        const moves = getLegalMovesFromBar();
        if (moves.includes(i)) {
            moveFromBar(i);
        } else if (selected === "bar" && i !== null) {
             // Just reset if they click an invalid point
             // selected = null; 
        }
        return;
    }

    // 2. Normal movement logic
    const point = board.points[i];

    if (selected === null) {
        if (point.getCheckerColor() !== color) return;
        selected = i;
        showValidMoves(i);
    } else if (selected === i) {
        selected = null;
        clearHighlights();
    } else {
        const moves = board.getLegalMoves(selected, dice);
        if (moves.includes(i)) {
            move(selected, i);
        }
        selected = null;
        clearHighlights();
    }
    renderAll();
}

/* =========================
   MOVE ENGINE
========================= */
function move(from, to) {
    const color = board.getCurrentColor();
    const step = Math.abs(to - from);
    
    // Find which die was used
    const diceIndex = dice.indexOf(step);
    if (diceIndex === -1) return;

    // Execution
    board.points[from].remove();
    if (board.points[from].getCheckerAmount() === 0) {
        board.points[from].setCheckerColor("none");
    }

    handleCapture(to, color);

    board.points[to].setCheckerColor(color);
    board.points[to].add();

    dice.splice(diceIndex, 1);
    resolveTurn();
}

function moveFromBar(to) {
    const color = board.getCurrentColor();
    // For Black (starts at -1), to move to 0 is 1 step. 
    // For White (starts at 24), to move to 23 is 1 step.
    const step = color === "black" ? to + 1 : 24 - to;

    const diceIndex = dice.indexOf(step);
    if (diceIndex === -1) return;

    bar[color]--;
    handleCapture(to, color);
    
    board.points[to].setCheckerColor(color);
    board.points[to].add();

    dice.splice(diceIndex, 1);
    selected = null;
    clearHighlights();
    resolveTurn();
}

function handleCapture(to, color) {
    const target = board.points[to];
    if (target.getCheckerColor() !== "none" && target.getCheckerColor() !== color) {
        const enemy = target.getCheckerColor();
        bar[enemy]++;
        target.setCheckerAmount(0);
        target.setCheckerColor("none");
    }
}

/* =========================
   TURN LOGIC
========================= */
function resolveTurn() {
    const color = board.getCurrentColor();
    
    // Switch turn if no dice left OR no possible moves with remaining dice
    if (dice.length === 0 || !hasAnyLegalMove(color)) {
        dice = [];
        board.nextTurn();
        selected = null;
    }
    renderAll();
}

function hasAnyLegalMove(color) {
    if (bar[color] > 0) return getLegalMovesFromBar().length > 0;

    for (let i = 0; i < 24; i++) {
        if (board.points[i].getCheckerColor() === color) {
            if (board.getLegalMoves(i, dice).length > 0) return true;
        }
    }
    return false;
}

/* =========================
   LEGAL MOVES LOGIC
========================= */
function getLegalMovesFromBar() {
    const color = board.getCurrentColor();
    const moves = [];
    dice.forEach(step => {
        const to = color === "black" ? step - 1 : 24 - step;
        if (isValidTarget(to, color)) moves.push(to);
    });
    return moves;
}

function isValidTarget(to, color) {
    if (to < 0 || to >= 24) return false;
    const target = board.points[to];
    // Can move if empty, own color, or 1 enemy (blot)
    return target.getCheckerColor() === "none" || 
           target.getCheckerColor() === color || 
           target.getCheckerAmount() === 1;
}

function showValidMoves(fromIndex) {
    clearHighlights();
    const moves = board.getLegalMoves(fromIndex, dice);
    moves.forEach(m => document.getElementById(String(m)).classList.add("valid-move"));
}

function showValidMovesFromBar() {
    clearHighlights();
    const moves = getLegalMovesFromBar();
    moves.forEach(m => document.getElementById(String(m)).classList.add("valid-move"));
}

function clearHighlights() {
    document.querySelectorAll('.point').forEach(p => p.classList.remove("valid-move"));
}

/* =========================
   DICE
========================= */
function roll() {
    if (dice.length > 0) return; // Prevent rolling mid-turn
    const a = Math.floor(Math.random() * 6) + 1;
    const b = Math.floor(Math.random() * 6) + 1;
    dice = (a === b) ? [a, a, a, a] : [a, b];
    
    // Check if the roll actually has moves
    if (!hasAnyLegalMove(board.getCurrentColor())) {
        renderAll();
        setTimeout(() => {
            alert("No moves possible!");
            dice = [];
            board.nextTurn();
            renderAll();
        }, 500);
    } else {
        renderAll();
    }
}

/* =========================
   RENDER PIPELINE
========================= */
/* =========================
   RENDER PIPELINE
========================= */
function renderAll() {
    // 1. Render Points (Existing logic)
    for (let i = 0; i < 24; i++) {
        const el = document.getElementById(String(i));
        el.innerHTML = "";
        const p = board.points[i];
        for (let j = 0; j < p.getCheckerAmount(); j++) {
            const d = document.createElement("div");
            d.classList.add("checker", p.getCheckerColor());
            if (selected === i && j === p.getCheckerAmount() - 1) d.classList.add("selected");
            el.appendChild(d);
        }
    }

    // 2. Render Bar (Improved Visuals)
    const barEl = document.querySelector(".bar");
    if (barEl) {
        barEl.innerHTML = ""; 

        // Create two stacks: Top for Black, Bottom for White (standard layout)
        const blackStack = document.createElement("div");
        blackStack.classList.add("bar-stack", "top");

        const whiteStack = document.createElement("div");
        whiteStack.classList.add("bar-stack", "bottom");

        // Render Black captured checkers
        for (let i = 0; i < bar.black; i++) {
            const d = document.createElement("div");
            d.classList.add("checker", "black");
            if (selected === "bar" && board.getCurrentColor() === "black" && i === bar.black - 1) d.classList.add("selected");
            blackStack.appendChild(d);
        }

        // Render White captured checkers
        for (let i = 0; i < bar.white; i++) {
            const d = document.createElement("div");
            d.classList.add("checker", "white");
            if (selected === "bar" && board.getCurrentColor() === "white" && i === bar.white - 1) d.classList.add("selected");
            whiteStack.appendChild(d);
        }

        barEl.appendChild(blackStack);
        barEl.appendChild(whiteStack);
    }

    // 3. Update Text UI
    document.getElementById("dice").innerText = "Dice: " + (dice.length ? dice.join(" | ") : "none");
    document.getElementById("turnDisplay").innerText = board.getCurrentColor().toUpperCase() + " to play";
}

/* =========================
   CLASSES
========================= */
class Point {
    constructor(amount, color) {
        this.amount = amount;
        this.color = color;
    }
    setCheckerAmount(v) { this.amount = v; }
    getCheckerAmount() { return this.amount; }
    setCheckerColor(v) { this.color = v; }
    getCheckerColor() { return this.color; }
    add() { this.amount++; }
    remove() { this.amount--; }
}

class Board {
    constructor() {
        this.turn = 0;
        this.points = Array.from({ length: 24 }, () => new Point(0, "none"));
    }
    nextTurn() { this.turn++; }
    getCurrentColor() { return this.turn % 2 === 0 ? "white" : "black"; }
    getLegalMoves(i, diceArr) {
        const color = this.points[i].getCheckerColor();
        if (color !== this.getCurrentColor() || diceArr.length === 0) return [];
        
        // Filter unique dice to avoid duplicate move calculations
        const uniqueDice = [...new Set(diceArr)];
        return uniqueDice
            .map(step => color === "black" ? i + step : i - step)
            .filter(to => isValidTarget(to, color));
    }
}

start();