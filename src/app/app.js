const katex = require("katex");
const nerdamer = require("nerdamer/all");
const KAS = require("kas-meri");
const { remote, clipboard, app } = require('electron');
const { Menu, MenuItem } = remote;
const fs = require('fs');
const path = require('path');

const userDataPath = (app || remote.app).getPath('userData');

let globalStore = {
    eventTarget: null
}

function removeChilds(parent) {
    while (parent.lastChild) {
        parent.removeChild(parent.lastChild);
    }
}

function insertAfter(newNode, existingNode) {
    existingNode.parentNode.insertBefore(newNode, existingNode.nextSibling);
}

function formatAnswer(ans) {
    let count = 0;
    let res="";
    for (x in ans) {
        if (count==0) {
            res+=`${x}=${ans[x]}`
        } else {
            res+=`, ${x}=${ans[x]}`
        }
        count++;
    }
    return res;
}

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

function createMathField(content,comment) {
    if (comment===undefined) {comment=""}
    let node = document.createElement("DIV");
    node.setAttribute("class","latex-row");
    node.setAttribute("math-content",content);
    node.setAttribute("onclick", "setFocus(this)");
    let html = katex.renderToString(content, {
        throwOnError: false,
        displayMode: true
    });
    node.appendChild(createElement('<div class="mathcont">'+html+'</div><span role="textbox" spellcheck="false" class="note" contenteditable onclick="event.stopPropagation();">'+comment+'</span>'));
    document.getElementById("console-container").appendChild(node);
    return node;
}

function updateLatex() {
    if (document.getElementById("refresh")==undefined) {
        newLine(true);
    }
    let content="";
    if (!document.getElementById("math-input").hasAttribute("raw")) {
        content=document.getElementById("math-input").value;
    } else {
        content=nerdamer.convertToLaTeX(document.getElementById("math-input").value).toString();
    }
    let html = katex.renderToString(content, {
        throwOnError: false,
        displayMode: true
    });
    document.getElementById("refresh").firstChild.innerHTML=html;
    document.getElementById("refresh").setAttribute("math-content",content)
    let topPosition = document.getElementById("refresh").offsetTop;
    if (topPosition>document.getElementById("container").scrollTop) {
        document.getElementById("container").scrollTop = topPosition+100;
    }
}

function newLine(update) {
    if (document.getElementById("console-container").lastChild != null && "getAttribute" in document.getElementById("console-container").lastChild && document.getElementById("console-container").lastChild.getAttribute("math-input")=="") {
        setFocus(document.getElementById("console-container").lastChild);
    } else {
        if (document.getElementById("refresh") != undefined) {
            if (document.getElementById("refresh").getAttribute("math-content")=="") {
                document.getElementById("console-container").removeChild(document.getElementById("refresh"));
            } else {
                document.getElementById("refresh").removeAttribute("id");
            }
        }
        node=createMathField("");
        node.setAttribute("id", "refresh")
        if (update===undefined) {
            document.getElementById("math-input").value="";
        }
    }
    document.getElementById("container").scrollTop = document.getElementById("refresh").offsetTop + 1000;
}

function respond(element, content, comment) {
    element.removeAttribute("id");
    document.getElementById("math-input").value="";
    let node = createMathField(content,comment);
    node.setAttribute("response","");

    let target=element.nextElementSibling;

    if (target != null && "hasAttribute" in target && (target.hasAttribute("response") || target.getAttribute("math-content") == "")) {
        target.replaceWith(node)
    } else {
        insertAfter(node, element);
    }
    let topPosition = node.offsetTop;
    if (topPosition>document.getElementById("container").scrollTop) {
        document.getElementById("container").scrollTop = topPosition+100;
    }
}

function setFocus(element) {
    if (document.getElementById("refresh") != undefined) {
        document.getElementById("refresh").removeAttribute("id");
    }
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
            let expr=nerdamer.convertFromLaTeX(document.getElementById("math-input").value).toString();
            let children = document.getElementById("console-container").childNodes;
            let args = {};
            for (let i = 0; i < children.length; i++) {
                let child = children[i];
                let content = child.getAttribute("math-content");
                if (expr.includes(content.charAt(0)) && /^[A-Za-z]=.*$/.test(content)) {
                    args[content.charAt(0)]=content.slice(2);
                }
            }
            respond(document.getElementById("refresh"),nerdamer(expr,args).toTeX(),formatAnswer(args));        
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
    if (event.key === "Backspace" && document.getElementById("math-input").value === "") {
        document.getElementById("console-container").removeChild(document.getElementById("refresh"));
    }
  }); 


window.addEventListener('contextmenu', (e) => {
    let target = e.target.closest('div[class="latex-row"]');
    if (target) {
        globalStore.eventTarget=target;
        e.preventDefault();
        const menu = new Menu();
        menu.append(new MenuItem({
        label: "Kopioi Latex-tekstinä",
        click: function(){
            clipboard.writeText(e.target.closest('div[class="latex-row"]').getAttribute("math-content"), 'selection');
        }
        }));

        if (!target.hasAttribute("response")) {
            menu.append(new MenuItem({
            label: "Muotoile vastauksena",
            click: function(){
                globalStore.eventTarget.setAttribute("response","")
            }
            }));
        } else {
            menu.append(new MenuItem({
            label: "Poista muotoilu",
            click: function(){
                globalStore.eventTarget.removeAttribute("response")
            }
            }));
        }
        menu.append(new MenuItem({
            label: "Poista",
            click: function(){
                document.getElementById("console-container").removeChild(e.target.closest('div[class="latex-row"]'));
            }
        }));
        menu.append(new MenuItem({type: "separator"}));
        menu.append(new MenuItem({
        label: "Laske murtolukuna",
        click: function(){
            let expr=KAS.parse(e.target.closest('div[class="latex-row"]').getAttribute("math-content")).expr;
            respond(e.target.closest('div[class="latex-row"]'),nerdamer(expr.print()).toTeX(),"=");        }
        }));
        menu.append(new MenuItem({
        label: "Laske desimaalilukuna",
        click: function(){
            let expr=KAS.parse(e.target.closest('div[class="latex-row"]').getAttribute("math-content")).expr;
            respond(e.target.closest('div[class="latex-row"]'),nerdamer(expr.print()).evaluate().toTeX('decimal'),"≈");        }
        }));
        menu.append(new MenuItem({
            label: "Laske muuttujien perusteella",
            click: function(){
                let expr=KAS.parse(e.target.closest('div[class="latex-row"]').getAttribute("math-content")).expr.print();
                let children = document.getElementById("console-container").childNodes;
                let args = {};
                for (let i = 0; i < children.length; i++) {
                    let child = children[i];
                    let content = child.getAttribute("math-content");
                    if (expr.includes(content.charAt(0)) && /^[A-Za-z]=.*$/.test(content)) {
                        args[content.charAt(0)]=content.slice(2);
                    }
                }
                respond(e.target.closest('div[class="latex-row"]'),nerdamer(expr,args).toTeX(),formatAnswer(args));        
            }
        }));
        menu.append(new MenuItem({type: "separator"}));
        menu.append(new MenuItem({
        label: "Sievennä",
        click: function(){
            let expr=KAS.parse(e.target.closest('div[class="latex-row"]').getAttribute("math-content")).expr;
            respond(e.target.closest('div[class="latex-row"]'),nerdamer.convertToLaTeX(expr.collect().print()),"Sievennä()");        }
        }));
        menu.append(new MenuItem({
        label: "Jaa tekijöihin",
        click: function(){
            let expr=nerdamer.convertFromLaTeX(e.target.closest('div[class="latex-row"]').getAttribute("math-content")).toString();
            respond(e.target.closest('div[class="latex-row"]'),nerdamer.convertToLaTeX(nerdamer.factor(expr).text()),"JaaTekijöihin()");        }
        }));
        menu.popup({ window: remote.getCurrentWindow() })
    }
}, false)

function save() {
    fs.writeFileSync(path.join(userDataPath,'session.html'), document.getElementById("console-container").innerHTML, (err) => {
        // throws an error, you could also catch it here
        if (err) throw err;
    });
}

function load() {
    let data = fs.readFileSync(path.join(userDataPath,'session.html'), 'utf8');
    node = createElement(data);
    removeChilds(document.getElementById("console-container"));
    document.getElementById("console-container").appendChild(node);
    document.getElementById("container").scrollTop = document.getElementById("console-container").lastChild.offsetTop + 1000;
}

let electron=require('electron');

electron.ipcRenderer.on('command', function(event, message) {
    switch(message) {
        case "clear":
            removeChilds(document.getElementById("console-container"));
            newLine();
            nerdamer.flush();
            break;
        case "save":
            save();
            break;
        case "load":
            load()
            break;
        case "raw":
            document.getElementById("math-input").setAttribute("raw","");
            document.getElementById("math-input").setAttribute("placeholder","Kirjoita matematiikkaa...");
            break;
        case "latex":
            document.getElementById("math-input").removeAttribute("raw");
            document.getElementById("math-input").setAttribute("placeholder","Kirjoita Latexia...");
            break;
        case "light":
            document.getElementById('css').href = 'light.css';
            break;
        case "dark":
            document.getElementById('css').href = 'style.css';
            break;
    }
});

load();

window.onbeforeunload = () => {
    save();
}