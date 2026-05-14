let dice = [];
let board;
let selected = null;
let bar = { white: 0, black: 0 };

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
    
    // BAR CLICK
    document.querySelector(".bar").onclick = () => handleBarClick();

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
        if (bar[color] > 0) return; // Must click bar first
        selected = i;
        showValidMoves(i);
    } else if (selected === i) {
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

function showValidMoves(fromIndex) {
    clearHighlights();
    board.getLegalMoves(fromIndex, dice).forEach(m => document.getElementById(String(m)).classList.add("valid-move"));
}

function showValidMovesFromBar() {
    clearHighlights();
    getLegalMovesFromBar().forEach(m => document.getElementById(String(m)).classList.add("valid-move"));
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
        renderAll();
        setTimeout(() => { dice = []; board.nextTurn(); renderAll(); }, 1000);
    } else {
        renderAll();
    }
}

function renderAll() {
    const color = board.getCurrentColor();
    
    // Points
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

    // Bar
    const barEl = document.querySelector(".bar");
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
        return [...new Set(diceArr)].map(step => color === "black" ? i + step : i - step).filter(to => isValidTarget(to, color));
    }
}

start();