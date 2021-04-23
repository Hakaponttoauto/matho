const katex = require("katex");
const nerdamer = require("nerdamer");
const KAS = require("kas-meri");
const { remote, clipboard } = require('electron');
const { Menu, MenuItem } = remote;

const removeChilds = (parent) => {
    while (parent.lastChild) {
        parent.removeChild(parent.lastChild);
    }
};


function updateLatex() {
    let html = katex.renderToString(document.getElementById("math-input").value, {
        throwOnError: false,
        displayMode: true
    });
    document.getElementById("refresh").innerHTML = html;
    document.getElementById("refresh").setAttribute("math-content",document.getElementById("math-input").value)
    let topPosition = document.getElementById("refresh").offsetTop;
    if (topPosition>document.getElementById("container").scrollTop) {
        document.getElementById("container").scrollTop = topPosition+100;
    }
}

function newLine() {
    if (document.getElementById("console-container").lastChild != null && "getAttribute" in document.getElementById("console-container").lastChild && document.getElementById("console-container").lastChild.getAttribute("math-input")=="") {
        setFocus(document.getElementById("console-container").lastChild);
    } else {
        if (document.getElementById("refresh") != undefined) {
            document.getElementById("refresh").removeAttribute("id");
        }
        let node = document.createElement("DIV");
        node.setAttribute("class","latex-row");
        node.setAttribute("id", "refresh");
        node.setAttribute("onclick", "setFocus(this)");
        document.getElementById("console-container").appendChild(node);
        document.getElementById("math-input").value="";
    }
    document.getElementById("container").scrollTop = document.getElementById("refresh").offsetTop + 1000;
}

function respond(element, content) {
    let node = document.createElement("DIV");
    node.setAttribute("class","latex-row");
    node.setAttribute("response","");
    node.setAttribute("onclick", "setFocus(this)");
    node.setAttribute("math-content",content);
    let html = katex.renderToString(content, {
        throwOnError: false,
        displayMode: true
    });
    node.innerHTML = html;

    let target=element.nextElementSibling;

    if (target != null && "hasAttribute" in target && target.hasAttribute("response")) {
        target.replaceWith(node)
    } else {
        document.getElementById("console-container").appendChild(node);
    }
    newLine();
}

function setFocus(element) {
    document.getElementById("refresh").removeAttribute("id");
    element.setAttribute("id", "refresh");

    document.getElementById("math-input").value = element.getAttribute("math-content");
    document.getElementById("math-input").focus();
    let topPosition = document.getElementById("refresh").offsetTop;
    if (topPosition>document.getElementById("container").scrollTop) {
        document.getElementById("container").scrollTop = topPosition+100;
    }
}

document.getElementById("math-input").addEventListener("keyup", function(event) {
    if (event.key === "Enter") {
        if (event.shiftKey) {
            event.preventDefault();
            let expr=KAS.parse(document.getElementById("math-input").value).expr;
            respond(document.getElementById("refresh"),nerdamer(expr.print()).toTeX());
        } else {
            event.preventDefault();
            newLine();
        }
    }
    if (event.key === "ArrowUp") {
        let target = document.getElementById("refresh").previousElementSibling;
        document.getElementById("math-input").value+=target.getAttribute("math-content");
        updateLatex();
    }
  }); 


window.addEventListener('contextmenu', (e) => {
    console.log(e.target.getAttribute("class"))
    if (e.target.closest('div[class="latex-row"]')) {
        e.preventDefault();
        const menu = new Menu();
        menu.append(new MenuItem({
        label: "Kopioi Latex-tekstinä",
        click: function(){
            clipboard.writeText(e.target.closest('div[class="latex-row"]').getAttribute("math-content"), 'selection');
        }
        }));
        menu.append(new MenuItem({
        label: "Laske",
        click: function(){
            let expr=KAS.parse(e.target.closest('div[class="latex-row"]').getAttribute("math-content")).expr;
            respond(document.getElementById("refresh"),nerdamer(expr.print()).toTeX());        }
        }));
        menu.append(new MenuItem({
        label: "Sievennä",
        click: function(){
            let expr=KAS.parse(e.target.closest('div[class="latex-row"]').getAttribute("math-content")).expr;
            respond(document.getElementById("refresh"),nerdamer.convertToLaTeX(expr.collect().print()));        }
        }));
        menu.append(new MenuItem({
        label: "Jaa tekijöihin",
        click: function(){
            let expr=KAS.parse(e.target.closest('div[class="latex-row"]').getAttribute("math-content")).expr;
            respond(document.getElementById("refresh"),nerdamer.convertToLaTeX(expr.expand().factor().print()));        }
        }));
        menu.popup({ window: remote.getCurrentWindow() })
    }
}, false)

let electron=require('electron');

electron.ipcRenderer.on('command', function(event, message) {
    switch(message) {
        case "clear":
            removeChilds(document.getElementById("console-container"));
            newLine();
            break;
    }
});