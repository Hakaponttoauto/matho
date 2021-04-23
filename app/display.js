const fs = require('fs');
const path = require('path');
const { remote, app } = require('electron');

const userDataPath = (app || remote.app).getPath('userData');

function createElement(str) {
    var div = document.createElement('div');
    div.innerHTML = str;
    var container = document.createDocumentFragment();
    for (var i=0; i < div.childNodes.length; i++) {
        var node = div.childNodes[i].cloneNode(true);
        container.appendChild(node);
    }
    return container;
}

let data = fs.readFileSync(path.join(userDataPath,'session.html'), 'utf8');
node = createElement(data);
document.getElementById("console-container").appendChild(node);

document.getElementById("container").scrollTop = document.getElementById("console-container").lastChild.offsetTop + 1000;