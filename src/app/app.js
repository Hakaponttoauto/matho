const { remote, clipboard, app } = require('electron');
const { Menu, MenuItem } = remote;
const fs = require('fs');
const path = require('path');

const AlgebraLatex = require('algebra-latex')
const nerdamer = require("nerdamer/all");
const mexp = require('math-expression-evaluator');

const userDataPath = (app || remote.app).getPath('userData');

let config = {
    handlers: {
    edit: function(mathField) {
        updateLatex();
    },
    }
}


try {
    input.latex(document.getElementById("refresh").getAttribute("math-content"))
} catch {
    //AGAIN
}

function latexMath(input) {
    return new AlgebraLatex().parseLatex(input).toMath()
}
function mathLatex(input) {
    return new AlgebraLatex().parseMath(input).toLatex()
}

function calc(input,alg) {
    switch(alg) {
        case "run":
            return mathLatex(nerdamer.expand(latexMath(input)).evaluate().toString())
        case "eval":
            try {
                return mexp.eval(nerdamer.expand(latexMath(input)).toString())
            } catch {
                return mathLatex(nerdamer.expand(latexMath(input)).evaluate().toString())
            }
        case "factor":
            return mathLatex(nerdamer.factor(latexMath(input)).toString())
        case "simplify":
            try {
                return mathLatex(nerdamer.simplify(latexMath(input)).toString())
            } catch {
                return mathLatex(nerdamer.simplify(input).toString())
            }
    }
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

function save() {
    fs.writeFileSync(path.join(userDataPath,'session.html'), document.getElementById("console-container").innerHTML, (err) => {
        // throws an error, you could also catch it here
        if (err) throw err;
    });
}

function load() {
    try {
        let data = fs.readFileSync(path.join(userDataPath,'session.html'), 'utf8');
        node = createElement(data);
        removeChilds(document.getElementById("console-container"));
        document.getElementById("console-container").appendChild(node);
        //document.getElementById("container").scrollTop = document.getElementById("console-container").lastChild.offsetTop + 1000;

    } catch {
        //Errors on startup, but who cares if the execution continues
    }
}
load();

let MQ = MathQuill.getInterface(2);

let input = MQ.MathField(document.getElementById("math-input"),config);

input.focus();

function createMathField(content,comment,target) {
    if (comment===undefined) {comment=""}
    let node = document.createElement("DIV");
    node.setAttribute("class","latex-row");
    node.setAttribute("math-content",content);
    node.setAttribute("onclick", "setFocus(this)");

    let mqel = document.createElement("SPAN");
    mqel.setAttribute("class","mathcont")

    node.appendChild(mqel);
    node.appendChild(createElement('<span role="textbox" spellcheck="false" class="note" contenteditable onclick="event.stopPropagation();">'+comment+'</span>'));
    try {
        insertAfter(node, target);
    } catch {
        document.getElementById("console-container").appendChild(node);
    }
    let mq = MQ.StaticMath(mqel);
    mq.latex(content);

    return node;
}

function updateLatex() {
    if (document.getElementById("refresh")==undefined) {
        newLine(true);
    }
    let content="";
    content=input.latex();
    
    try {
        let mq = MQ.StaticMath(document.getElementById("refresh").firstChild);
        mq.latex(content);
    } catch {
        let mqel = document.createElement("SPAN");
        mqel.setAttribute("class","mathcont");
        document.getElementById("refresh").firstChild.replaceWith(mqel);
        let mq = MQ.StaticMath(mqel);
        mq.latex(content)
    }
    
    document.getElementById("refresh").setAttribute("math-content",content);
    scrollAt(document.getElementById("refresh"))
}

function newLine(update) {
    if (document.getElementById("console-container").lastChild != null && "getAttribute" in document.getElementById("console-container").lastChild && document.getElementById("console-container").lastChild.getAttribute("math-content")=="") {
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
        node.setAttribute("id", "refresh");
        if (update===undefined) {
            input.latex("");
        }
        scrollAt(node)
    }
}

function respond(element, content, comment) {
    element.removeAttribute("id");
    input.latex("");
    let target = element.nextElementSibling
    let node = createMathField(content,comment,element);
    node.setAttribute("response","");
    if (target != null && "hasAttribute" in target && (target.hasAttribute("response") || target.getAttribute("math-content") == "")) {
        target.replaceWith(node)
    }

    scrollAt(node);
}

function setFocus(element) {
    if (document.getElementById("refresh") != undefined) {
        document.getElementById("refresh").removeAttribute("id");
    }
    element.setAttribute("id", "refresh");

    input.latex(element.getAttribute("math-content"));
    input.focus();
    scrollAt(element)
}

function scrollAt(element) {
    let topPosition = element.offsetTop-document.getElementById("container").clientHeight+element.clientHeight;

    if (document.getElementById("container").scrollTop-topPosition>document.getElementById("container").clientHeight || document.getElementById("container").scrollTop-topPosition<0) {

        document.getElementById("container").scrollTo({
            top: topPosition,
            behavior: 'smooth'
        });
    }
}

document.getElementById("math-input").addEventListener("keyup", function(event) {
    if (event.key === "Enter") {
        if (event.shiftKey) {
            event.preventDefault();
            respond(document.getElementById("refresh"), calc(input.latex(),"eval"));
            input.latex("");
        } else {
            event.preventDefault();
            newLine();
            calc(input.latex(),"run");
        }
    }
    if (event.ctrlKey) {
        if (event.key === "ArrowUp") {
            let target = (document.getElementById("refresh") && document.getElementById("refresh").previousElementSibling) || document.getElementById("console-container").lastElementChild;
            setFocus(target);
        }
        if (event.key === "ArrowDown") {
            let target = document.getElementById("refresh").nextElementSibling
            setFocus(target);
        }
        if (event.key === "Delete") {
            input.latex("");
            document.getElementById("console-container").removeChild(document.getElementById("refresh"));
        }
    }
    
  }); 


window.addEventListener('contextmenu', (e) => {
    let target = e.target.closest('div[class="latex-row"]');
    if (target) {
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
                e.target.closest('div[class="latex-row"]').setAttribute("response","")
            }
            }));
        } else {
            menu.append(new MenuItem({
            label: "Poista muotoilu",
            click: function(){
                e.target.closest('div[class="latex-row"]').removeAttribute("response")
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
            let target = e.target.closest('div[class="latex-row"]');
            let expr=target.getAttribute("math-content");
            respond(target, calc(expr,"run"));
        }}));
        menu.append(new MenuItem({
        label: "Laske desimaalilukuna",
        click: function(){
            let target = e.target.closest('div[class="latex-row"]');
            let expr=target.getAttribute("math-content");
            respond(target, calc(expr,"eval"),"≈");
        }}));

        menu.append(new MenuItem({type: "separator"}));
        menu.append(new MenuItem({
        label: "Sievennä",
        click: function(){
            let target = e.target.closest('div[class="latex-row"]');
            let expr=target.getAttribute("math-content");
            respond(target, calc(expr,"simplify").toString(),"Sievennä()");
        }}));
        menu.append(new MenuItem({
        label: "Jaa tekijöihin",
        click: function(){
            let target = e.target.closest('div[class="latex-row"]');
            let expr=target.getAttribute("math-content");
            respond(target, calc(expr,"factor").toString(),"JaaTekijöihin()");
        }}));
        menu.popup({ window: remote.getCurrentWindow() })
    }
}, false)

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
        case "light":
            document.getElementById('css').href = 'light.css';
            break;
        case "dark":
            document.getElementById('css').href = '';
            break;
    }
});

window.onbeforeunload = () => {
    save();
}