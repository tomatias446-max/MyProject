let turn = 0;
let num1;
let num2;
let board;

function start() {
  board = new Board();
  for (let i = 0; i < 24; i++) {
    switch (i) {
      case 0:
        board.points[i].setChekerAmount(2);
        board.points[i].setChekerColor("black");
        break;
      case 5:
        board.points[i].setChekerAmount(5);
        board.points[i].setChekerColor("white");
        break;
      case 7:
        board.points[i].setChekerAmount(3);
        board.points[i].setChekerColor("white");
        break;
      case 11:
        board.points[i].setChekerAmount(5);
        board.points[i].setChekerColor("black");
        break;
      case 12:
        board.points[i].setChekerAmount(5);
        board.points[i].setChekerColor("white");
        break;
      case 16:
        board.points[i].setChekerAmount(3);
        board.points[i].setChekerColor("black");
        break;
      case 18:
        board.points[i].setChekerAmount(5);
        board.points[i].setChekerColor("black");
        break;
      case 23:
        board.points[i].setChekerAmount(2);
        board.points[i].setChekerColor("white");
        break;
    }
  turn+=2;
  }
}

function random(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function roll() {
    num1 = random(1,6);
    num2 = random(1,6);
    if (turn == 0){
      start();
    }
    document.getElementById("dice").innerHTML = num1+","+num2;
}

function updateTurn() {
  if (turn%2 == 0) {
   document.getElementById("turnDisplay").innerHTML = "It's white's turn";
  }
  else {
    document.getElementById("turnDisplay").innerHTML = "It's black's turn";
  }
}

class Point {
  chekerAmount;
  chekerColor;

  constructor(chekerAmount, chekerColor) {
    this.chekerAmount = chekerAmount;
    this.chekerColor = chekerColor;
  }

  setChekerAmount(chekerAmount) {
    this.chekerAmount = chekerAmount;
  }

  getChekerAmount() {
    return this.chekerAmount;
  }

  setChekerColor(chekerColor) {
    this.chekerColor = chekerColor;
  }

  getChekerColor() {
    return this.chekerColor;
  }

  add() {
    this.chekerAmount++;
  }

  remove() {
    this.chekerAmount--;
  }
}

class Board {
  turn;
  points;

  constructor() {
    this.turn = 0;
    this.points = new Array (24);
    for (let i = 0; i < 24; i++) {
      this.points[i] = new Point (0 , "none");
    }
  }

  nextTurn() {
    this.turn++;
  }

  getTurn() {
    return this.turn;
  }

  getPoints() {
    return this.points;
  }

  addChecker(i) {
    this.points[i].add();
  }

  removeChecker(i) {
    this.points[i].remove();
  }

  canMoveTo(i) {
    if (this.points[i].getChekerColor == "black") {
      
    }
    if (this.points[i].getChekerColor == "white") {

    }
  }
}
