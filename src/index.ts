
export class DOMUpdater {
  constructor (
    private nodeFrom: Node,
    private nodeTo: Node,
    private asContent: boolean
  ) {}

  update (): number {
    if(this.asContent) {
      return this.diffChildNodes(this.nodeFrom as Element, this.nodeTo as Element);
    }

    return this.diff(this.nodeFrom.parentNode, this.nodeFrom.nextSibling, this.nodeFrom, this.nodeTo);
  }

  private diff (parentNode: Node, nextNode: Node, nodeFrom: Node, nodeTo: Node): number {
    let mods: number = 0;

    if(!parentNode) {
      return mods;
    }

    if(!nodeTo) {
      parentNode.removeChild(nodeFrom);
      mods++;
    } else if(!nodeFrom) {
      if(nextNode) {
        parentNode.insertBefore(nodeTo.cloneNode(true), nextNode);
      } else {
        parentNode.appendChild(nodeTo.cloneNode(true));
      }
      mods++;
    } else if(!nodeTo.isEqualNode(nodeFrom)) {
      if(nodeFrom.nodeType === Node.TEXT_NODE || nodeTo.nodeType === Node.TEXT_NODE
      || nodeFrom.nodeType !== nodeTo.nodeType || nodeFrom.nodeName !== nodeTo.nodeName) {
        parentNode.replaceChild(nodeTo.cloneNode(true), nodeFrom);
        mods++;
      } else if(nodeFrom instanceof Element && nodeTo instanceof Element) {
        mods += this.diffAttributes(nodeFrom, nodeTo);
        mods += this.diffChildNodes(nodeFrom, nodeTo);
      }
    } else {
      console.log("Node equals", nodeTo, nodeFrom);
    }

    return mods;
  }

  private diffAttributes (nodeFrom: Element, nodeTo: Element): number {
    let mods: number = 0;

    if(nodeFrom.hasAttributes() || nodeTo.hasAttributes()) {
      const toAttributesEntries = Object.entries(nodeTo.attributes);

      for(const [name, attr] of toAttributesEntries) {
        if(nodeFrom.getAttribute(name) !== attr.value) {
          nodeFrom.setAttribute(name, attr.value);
          mods++;
        }
      }

      const fromAttributesNames = nodeFrom.getAttributeNames();

      for(const name of fromAttributesNames) {
        if(!nodeTo.hasAttribute(name)) {
          nodeFrom.removeAttribute(name);
          mods++;
        }
      }
    }

    return mods;
  }

  private diffChildNodes (fromNode: Element, toNode: Element): number {
    let mods = 0;

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

      console.log("DOMUpdater -> arr2", nodePairsOptim);

      for(let i = 0, len = nodePairsOptim.length, nextNode: Node; i < len; i++) {
        if(nodePairsOptim[i][0]) {
          nextNode = nodePairsOptim[i][0].nextSibling;
        }
        mods += this.diff(fromNode, nextNode, nodePairsOptim[i][0], nodePairsOptim[i][1]);
      }
    }

    return mods;
  }
}
