let dice = [];
let board;
let selected = null;
let bar = { white: 0, black: 0 };
let borneOff = { white: 0, black: 0 }; 

function start() {
    board = new Board();
    const setup = [
        { i: 0, c: "black", n: 2 }, { i: 5, c: "white", n: 5 },
        { i: 7, c: "white", n: 3 }, { i: 11, c: "black", n: 5 },
        { i: 12, c: "white", n: 5 }, { i: 16, c: "black", n: 3 },
        { i: 18, c: "black", n: 5 }, { i: 23, c: "white", n: 2 },
    ];

    for (let s of setup) {
        board.points[s.i].setCheckerColor(s.c);
        board.points[s.i].setCheckerAmount(s.n);
    }

    for (let i = 0; i < 24; i++) {
        document.getElementById(String(i)).onclick = () => handleClick(i);
    }
    
    document.querySelector(".bar").onclick = () => handleBarClick();
    
    if (!document.getElementById("modal-styles")) {
        const style = document.createElement("style");
        style.id = "modal-styles";
        style.innerHTML = `
            .win-modal-overlay {
                position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
                background: rgba(0, 0, 0, 0.75); display: flex; justify-content: center;
                align-items: center; z-index: 9999; backdrop-filter: blur(4px);
            }
            .win-modal {
                background: #2d0047; padding: 40px; border-radius: 16px;
                text-align: center; border: 4px solid #ffe066; color: white;
                box-shadow: 0 10px 30px rgba(0,0,0,0.6); max-width: 400px; width: 90%;
            }
            .win-modal h1 { font-size: 2.5rem; margin-bottom: 10px; color: #ffe066; text-transform: uppercase; }
            .win-modal p { font-size: 1.2rem; margin-bottom: 25px; color: #fff; }
            .win-modal button { padding: 12px 30px; font-size: 1.1rem; }
            .bear-off-glow {
                background: radial-gradient(circle, rgba(242, 156, 17, 0.8) 30%, transparent 70%) !important;
                animation: bearPulse 1.5s infinite alternate;
            }
            @keyframes bearPulse {
                0% { opacity: 0.5; }
                100% { opacity: 0.9; }
            }
        `;
        document.head.appendChild(style);
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
        renderAll();
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
    renderAll();
}

function move(from, to) {
    const color = board.getCurrentColor();
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
    const remainingDice = [...new Set(dice)];
    
    let usedDie = null;
    for (let die of remainingDice) {
        const target = color === "black" ? from + die : from - die;
        if ((color === "black" && target >= 24) || (color === "white" && target < 0)) {
            usedDie = die;
            break;
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

function moveFromBar(to) {
    const color = board.getCurrentColor();
    const step = color === "black" ? to + 1 : 24 - to;
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
        renderAll();
        showWinScreen(color);
        return;
    }

    // Crucial Check: If there are remaining dice but NO moves are legally possible anywhere, wipe dice and pass turn.
    if (dice.length > 0 && !hasAnyLegalMove(color)) {
        dice = [];
    }

    if (dice.length === 0) {
        board.nextTurn();
        selected = null;
    }
    renderAll();
}

function showWinScreen(winnerColor) {
    const overlay = document.createElement("div");
    overlay.className = "win-modal-overlay";
    
    const modal = document.createElement("div");
    modal.className = "win-modal";
    
    const title = document.createElement("h1");
    title.innerText = "Victory!";
    
    const text = document.createElement("p");
    text.innerText = `${winnerColor.toUpperCase()} has borne off all checkers and won the match!`;
    
    const btn = document.createElement("button");
    btn.innerText = "Play Again";
    btn.onclick = () => location.reload();
    
    modal.appendChild(title);
    modal.appendChild(text);
    modal.appendChild(btn);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
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
        const to = color === "black" ? step - 1 : 24 - step;
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
            if (color === "black" && i < 18) return false;
            if (color === "white" && i > 5) return false;
        }
    }
    return true;
}

function showValidMoves(fromIndex) {
    clearHighlights();
    const color = board.getCurrentColor();
    const moves = board.getLegalMoves(fromIndex, dice);
    
    moves.forEach(m => {
        const el = document.getElementById(String(m));
        if (el) el.classList.add("valid-move");
    });

    if (canBearOff(color) && (moves.includes(-1) || moves.includes(24))) {
        document.getElementById(String(fromIndex)).classList.add("bear-off-glow");
    }
}

function showValidMovesFromBar() {
    clearHighlights();
    getLegalMovesFromBar().forEach(m => {
        const el = document.getElementById(String(m));
        if (el) el.classList.add("valid-move");
    });
}

function clearHighlights() {
    document.querySelectorAll('.point').forEach(p => {
        p.classList.remove("valid-move");
        p.classList.remove("bear-off-glow");
    });
}

function roll() {
    if (dice.length > 0) return;
    const a = Math.floor(Math.random() * 6) + 1;
    const b = Math.floor(Math.random() * 6) + 1;
    dice = (a === b) ? [a, a, a, a] : [a, b];
    
    // Catch immediately blocked states straight out of the roll
    if (!hasAnyLegalMove(board.getCurrentColor())) {
        renderAll();
        setTimeout(() => { dice = []; board.nextTurn(); renderAll(); }, 1500);
    } else {
        renderAll();
    }
}

function renderAll() {
    const color = board.getCurrentColor();
    
    for (let i = 0; i < 24; i++) {
        const el = document.getElementById(String(i));
        if (!el) continue;
        el.innerHTML = "";
        const p = board.points[i];
        for (let j = 0; j < p.getCheckerAmount(); j++) {
            const d = document.createElement("div");
            d.classList.add("checker", p.getCheckerColor());
            if (selected === i && j === p.getCheckerAmount() - 1) d.classList.add("selected");
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

    document.getElementById("dice").innerText = "Dice: " + (dice.length ? dice.join(" | ") : "none");
    document.getElementById("turnDisplay").innerText = color.toUpperCase() + (bar[color] > 0 ? " (Move from Bar)" : " to play");
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
        
        return [...new Set(diceArr)].map(step => {
            const target = color === "black" ? i + step : i - step;
            
            if (canBearOff(color)) {
                if (color === "black" && target >= 24) return 24;
                if (color === "white" && target < 0) return -1;
            }
            return target;
        }).filter(to => to === -1 || to === 24 || isValidTarget(to, color));
    }
}

start();