let turn = 0;
let num1;
let num2;

function random(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function roll() {
    num1 = random(1,6);
    num2 = random(1,6);
    document.getElementById("dice").innerHTML = num1+","+num2;

}
