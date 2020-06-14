import { watch } from "./utils";
import { DOMTemplateBuilder, getTemplateBuilder } from "./DOMTemplateBuilder";
import { updateDOM } from "./DOMUpdater";

export interface DOMControllerArguments<T> {
  element: HTMLElement;
  initialState?: Record<string, T>;
  template?: string | DOMTemplateBuilder;
  init?: (stateProxy: ProxyHandler<Record<string, T>>) => void;
}

export class DOMController<T=any> {
  private builder: DOMTemplateBuilder;
  public readonly state: ProxyHandler<Record<string, T>>;
  private rafRequest: number;
  private node: HTMLElement;
  private stateObj: Record<string, T> = {};
  private template?: string | DOMTemplateBuilder;
  private controllerFn?: (stateProxy: ProxyHandler<Record<string, T>>) => void;
  private listeners: Map<string, Map<string, Set<(e: Event) => any>>> = new Map();
  private addedListeners: WeakMap<Element, { eventName: string; listener: (e: Event) => any }[]> = new WeakMap();

  constructor ({ element, initialState, template, init }: DOMControllerArguments<T>) {
    this.node         = element;
    this.stateObj     = initialState || {};
    this.template     = template;
    this.controllerFn = init;

    if(!this.template) {
      this.template = this.node.outerHTML;
    }
    this.updateTemplateBuilder();
    this.state = watch(this.stateObj, () => {
      this.triggerDOMUpdate();
    });

    if(this.controllerFn) {
      this.controllerFn(this.state);
    }
    this.triggerDOMUpdate();
  }

  setTemplateHTML (templateHTML: string): void {
    this.template = templateHTML;
    this.updateTemplateBuilder();
  }

  updateTemplateBuilder (): void {
    if(typeof this.template === "string") {
      this.builder = getTemplateBuilder(this.template, DOMController.getTemplateArguments());
    } else if(this.template instanceof DOMTemplateBuilder) {
      this.builder = this.template;
    }
  }

  setState (newState: Record<string, T>): void {
    Object.assign(this.state, newState);
  }

  private getSelectorListeners (selector: string, eventName: string): Set<(e: Event) => any> {
    let listenerTypes = this.listeners.get(selector);
    if(!listenerTypes) {
      listenerTypes = new Map();
      this.listeners.set(selector, listenerTypes);
    }

    let listenersSet = listenerTypes.get(eventName);
    if(!listenersSet) {
      listenersSet = new Set();
      listenerTypes.set(eventName, listenersSet);
    }
    return listenersSet;
  }

  private addListenerToNode (node: Element, eventName: string, listener: (event: Event) => any): void {
    node.addEventListener(eventName, listener);
    if(!this.addedListeners.has(node)) {
      this.addedListeners.set(node, []);
    }
    this.addedListeners.get(node).push({
      eventName,
      listener
    });
  }

  addListener (selector: string, eventName: string, listener: (event: Event) => any): void {
    const listenersSet = this.getSelectorListeners(selector, eventName);
    listenersSet.add(listener);
    const nodes = Array.from(this.node.querySelectorAll(selector));
    if(this.node.matches(selector)) {
      nodes.unshift(this.node);
    }
    for(const node of nodes) {
      this.addListenerToNode(node, eventName, listener);
    }
  }

  removeListener (selector: string, eventName: string, listener: (event: Event) => any): void {
    const listenersSet = this.getSelectorListeners(selector, eventName);
    listenersSet.delete(listener);
    const nodes = Array.from(this.node.querySelectorAll(selector));
    if(this.node.matches(selector)) {
      nodes.unshift(this.node);
    }
    for(const node of nodes) {
      node.removeEventListener(eventName, listener);
    }
  }

  private addListenersToTree (node: Element): void {
    this.listeners.forEach((listenerTypes, selector) => {
      const nodes = node.querySelectorAll(selector);
      for(let i = 0, len = nodes.length; i < len; i++) {
        const node = nodes[i];
        listenerTypes.forEach((listeners, eventName) => {
          listeners.forEach((listener) => {
            node.removeEventListener(eventName, listener);
            this.addListenerToNode(node, eventName, listener);
          });
        });
      }
    });
  }

  private addListenersToElements (elements: Element[], applyToChildren: boolean): void {
    if(elements.length > 0) {
      this.listeners.forEach((listenerTypes, selector) => {
        elements.forEach((element) => {
          const nodesToApply = [];
          if(element.matches(selector)) {
            nodesToApply.push(element);
          }
          if(applyToChildren) {
            nodesToApply.push(...Array.from(element.querySelectorAll(selector)));
          }
          for(let i = 0, len = nodesToApply.length; i < len; i++) {
            const node = nodesToApply[i];
            listenerTypes.forEach((listeners, eventName) => {
              listeners.forEach((listener) => {
                this.addListenerToNode(node, eventName, listener);
              });
            });
          }
        });
      });
    }
  }

  private updateListenersToElements (elements: Element[]): void {
    if(elements.length > 0) {
      for(const element of elements) {
        const listeners = this.addedListeners.get(element);
        if(listeners) {
          for(const item of listeners) {
            element.removeEventListener(item.eventName, item.listener);
          }
          this.addedListeners.delete(element);
        }
      }
      this.addListenersToElements(elements, false);
    }
  }

  private triggerDOMUpdate (): void {
    if(this.rafRequest) {
      window.cancelAnimationFrame(this.rafRequest);
      this.rafRequest = null;
    }
    this.rafRequest = window.requestAnimationFrame(() => {
      this.rafRequest = null;
      const newTemplateNode = this.builder.getTemplateNode(this.state).content;
      const stats = updateDOM(this.node, newTemplateNode);
      this.addListenersToElements(stats.newElements, true);
      this.updateListenersToElements(stats.updateElements);
    });
  }

  private static args: Map<string, any> = new Map();

  static setTemplateArgument (name: string, value: any): void {
    this.args.set(name, value);
  }

  static getTemplateArguments (): Map<string, any> {
    return new Map(this.args.entries());
  }
}
