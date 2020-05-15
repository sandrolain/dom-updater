import { updateDOMContent, DOMController } from "../dist/esm/index.js";


export function htmlToDOMFragment (html) {
  const tpl = document.createElement("template");
  tpl.innerHTML = html;
  return tpl.content.cloneNode(true);
}



const list = [];


const getNewHTML = () => (/*html*/`
<div>
  <strong>FOO</strong>
</div>
<div>
  ${Math.random()}
  ${list.map((txt) => `<div>${txt}</div>`).join("")}
  ${Math.random()}
</div>
<div>
  <div><em>BAR</em></div>
  <hr>
</div>
`);

const getNewTree = () => {
  return htmlToDOMFragment(getNewHTML());
};

function updateWithInnerHTML (el, html) {
  return new Promise((resolve) => {
    window.requestAnimationFrame(() => {
      const start = performance.now();
      el.innerHTML = html;
      resolve(performance.now() - start);
    });
  });
}

const render = async () => {
  console.clear();
  const el = document.getElementById("test");

  // const stats = updateWithInnerHTML(el, getNewHTML());


  const updEl = getNewTree();
  console.log("updEl", updEl);
  const stats = updateDOMContent(el, updEl, true);

  console.log("stats", JSON.stringify(await stats));

};

// setInterval(render, 3000);


document.addEventListener("click", () => {
  for(let i = 0; i < 10; i++) {
    list.push(Math.random());
  }
  render();
});

DOMController.setTempleteArgument("foo", "bar");


new DOMController(
  document.getElementById("ctrl"),
  (state) => {
    state.test.num = 999;
    setInterval(() => {
      state.test.num = Math.random()
      state.test.num = Math.random()
      state.test.num = Math.random()
      console.log("state.test.num", state.test.num)
    }, 3000);
  },
  {
    test: {
      num: 0
    }
  }
)
