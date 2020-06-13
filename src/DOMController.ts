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

  addListener (selector: string, eventName: string, listener: (event: Event) => any): void {
    const listenersSet = this.getSelectorListeners(selector, eventName);
    listenersSet.add(listener);
    const nodes = this.node.querySelectorAll(selector);
    for(const node of Array.from(nodes)) {
      node.addEventListener(eventName, listener);
    }
  }

  removeListener (selector: string, eventName: string, listener: (event: Event) => any): void {
    const listenersSet = this.getSelectorListeners(selector, eventName);
    listenersSet.delete(listener);
    const nodes = this.node.querySelectorAll(selector);
    for(const node of Array.from(nodes)) {
      node.removeEventListener(eventName, listener);
    }
  }

  private addListenersToTree (): void {
    this.listeners.forEach((listenerTypes, selector) => {
      const nodes = this.node.querySelectorAll(selector);
      for(let i = 0, len = nodes.length; i < len; i++) {
        const node = nodes[i];
        listenerTypes.forEach((listeners, eventName) => {
          listeners.forEach((listener) => {
            node.removeEventListener(eventName, listener);
            node.addEventListener(eventName, listener);
          });
        });
      }
    });
  }

  private addListenersToElements (elements: Element[]): void {
    this.listeners.forEach((listenerTypes, selector) => {
      elements.forEach((element) => {
        if(element.matches(selector)) {
          listenerTypes.forEach((listeners, eventName) => {
            listeners.forEach((callback) => {
              element.addEventListener(eventName, callback);
            });
          });
        }
      });
    });
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
      this.addListenersToElements(stats.newElements);
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
