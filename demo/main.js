import { DOMUpdater } from "../dist/esm/index.js";

const list = [];

const getNewTree = () => {
  const tpl = document.createElement("template");
  tpl.innerHTML = /*html*/`
  <div>
    <strong>FOO</strong>
  </div>
  <div>
    ${list.length % 2 === 0 ? "<hr>" : ""}
    <div><em>BAR</em></div>
    ${list.length % 2 === 0 ? "<hr>" : ""}
    ${list.length % 2 === 0 ? "<hr>" : ""}
    ${list.length % 2 === 0 ? "<hr>" : ""}
    <hr>
  </div>
  <div>
    ${Math.random()}
    ${list.map((txt) => `<div>${txt}</div>`).join("")}
    ${Math.random()}
  </div>

  `;
  return [tpl.content.cloneNode(true), tpl.innerHTML];
};

const render = () => {
  console.clear();

  const el = document.getElementById("test");
  const [updEl, html] = getNewTree();
  console.log("html", html);
  // el.innerHTML = html;
  // return;

  const upd = new DOMUpdater(el, updEl, true);
  const num = upd.update();
  console.log("render -> upd.update()", num);

};

// setInterval(render, 3000);


document.addEventListener("click", () => {
  list.push(Math.random());
  render();
});
