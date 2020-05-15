export interface DOMUpdaterStats {
  equals: number;
  inserted: number;
  appended: number;
  removed: number;
  replaced: number;
  attributes: number;
  time: number;
}

export class DOMUpdater {
  private stats: DOMUpdaterStats;

  constructor (
    private nodeFrom: Node,
    private nodeTo: Node,
    private asContent: boolean
  ) {}

  update (): DOMUpdaterStats {
    this.stats = {
      equals: 0,
      inserted: 0,
      appended: 0,
      removed: 0,
      replaced: 0,
      attributes: 0,
      time: 0
    };

    const startUpdate = performance.now();
    if(this.asContent) {
      this.diffChildNodes(this.nodeFrom as Element, this.nodeTo as Element);
    } else {
      let nodeTo = this.nodeTo;
      if(nodeTo instanceof DocumentFragment) {
        nodeTo = nodeTo.firstElementChild;
      }
      this.diff(this.nodeFrom.parentNode, this.nodeFrom.nextSibling, this.nodeFrom, nodeTo);
    }
    this.stats.time    = performance.now() - startUpdate;
    return this.stats;
  }

  private diff (parentNode: Node, nextNode: Node, nodeFrom: Node, nodeTo: Node): void {
    if(parentNode) {
      if(!nodeTo) {
        parentNode.removeChild(nodeFrom);
        this.stats.removed++;
      } else if(!nodeFrom) {
        if(nextNode) {
          parentNode.insertBefore(nodeTo.cloneNode(true), nextNode);
          this.stats.inserted++;
        } else {
          parentNode.appendChild(nodeTo.cloneNode(true));
          this.stats.appended++;
        }
      } else if(!nodeTo.isEqualNode(nodeFrom)) {
        if(nodeFrom.nodeType === Node.TEXT_NODE || nodeTo.nodeType === Node.TEXT_NODE
        || nodeFrom.nodeType !== nodeTo.nodeType || nodeFrom.nodeName !== nodeTo.nodeName) {
          parentNode.replaceChild(nodeTo.cloneNode(true), nodeFrom);
          this.stats.replaced++;
        } else if(nodeFrom instanceof Element && nodeTo instanceof Element) {
          this.diffAttributes(nodeFrom, nodeTo);
          this.diffChildNodes(nodeFrom, nodeTo);
        }
      } else {
        this.stats.equals++;
      }
    }
  }

  private diffAttributes (nodeFrom: Element, nodeTo: Element): void {
    if(nodeFrom.hasAttributes() || nodeTo.hasAttributes()) {
      for(let i = 0, len = nodeTo.attributes.length; i < len; i++) {
        const attr = nodeTo.attributes[i];
        if(nodeFrom.getAttribute(attr.name) !== attr.value) {
          nodeFrom.setAttribute(attr.name, attr.value);
          this.stats.attributes++;
        }
      }

      const fromAttributesNames = nodeFrom.getAttributeNames();

      for(const name of fromAttributesNames) {
        if(!nodeTo.hasAttribute(name)) {
          nodeFrom.removeAttribute(name);
          this.stats.attributes++;
        }
      }
    }
  }

  private diffChildNodes (fromNode: Element, toNode: Element): void {
    if(fromNode.hasChildNodes() || toNode.hasChildNodes()) {
      const fromChildNodes = Array.from(fromNode.childNodes);
      const toChildNodes   = Array.from(toNode.childNodes);

      // Determine if the position of the nodes has changed after removing or adding new nodes,
      // to avoid removing and recreating them unnecessarily
      const nodePairs: [Node, Node][] = [];
      const fromChildNodesC = fromChildNodes.slice();
      const toChildNodesC   = toChildNodes.slice();

      for(const nodeFrom of fromChildNodesC) {
        let index = 0;
        let found = -1;
        for(const nodeTo of toChildNodesC) {
          if(nodeFrom.isEqualNode(nodeTo)) {
            found = index;
            break;
          }
          index++;
        }
        if(found > -1) {
          for(let i = 0; i < found; i++) {
            nodePairs.push([null, toChildNodesC.shift()]);
          }
          nodePairs.push([nodeFrom, toChildNodesC.shift()]);
        } else {
          nodePairs.push([nodeFrom, null]);
        }
      }

      while(toChildNodesC.length > 0) {
        nodePairs.push([null, toChildNodesC.shift()]);
      }

      // Optimize the positions to perform a single node replace action,
      // instead of removing the old node and adding the new node
      const nodePairsOptim: [Node, Node][] = [];

      for(let i = 0, len = nodePairs.length; i < len - 1; i++) {
        const act = nodePairs[i];
        const nxt = nodePairs[i + 1];
        if(!act[0] && !nxt[1]) {
          nodePairsOptim.push([nxt[0], act[1]]);
          i++;
        } else if(!nxt[0] && !act[1]) {
          nodePairsOptim.push([act[0], nxt[1]]);
          i++;
        } else {
          nodePairsOptim.push(act);
          if(i === len - 1) {
            nodePairsOptim.push(nxt);
          }
        }
      }

      for(let i = 0, len = nodePairsOptim.length, nextNode: Node; i < len; i++) {
        if(nodePairsOptim[i][0]) {
          nextNode = nodePairsOptim[i][0].nextSibling;
        }
        this.diff(fromNode, nextNode, nodePairsOptim[i][0], nodePairsOptim[i][1]);
      }
    }
  }
}


export function updateDOM (nodeFrom: Node, nodeTo: Node): DOMUpdaterStats {
  const updater = new DOMUpdater(
    nodeFrom,
    nodeTo,
    false
  );
  return updater.update();
}


export function updateDOMContent (nodeFrom: Node, nodeTo: Node): DOMUpdaterStats {
  const updater = new DOMUpdater(
    nodeFrom,
    nodeTo,
    true
  );
  return updater.update();
}
