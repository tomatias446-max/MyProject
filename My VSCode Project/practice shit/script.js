let counter = 0;
let scale = 1;

function bigger(amount) {
    scale += amount;
    document.getElementById("counting").style.transform = `scale(${scale})`;
}


function reset() {
    scale = 1;
}

function count() {
    counter++;
    document.getElementById("counting").innerHTML = counter;
}