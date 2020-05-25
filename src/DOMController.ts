import { watch } from "./utils";
import { DOMTemplateBuilder, getTemplateBuilder } from "./DOMTemplateBuilder";
import { updateDOM } from "./DOMUpdater";

export interface DOMControllerArguments<T> {
  element: HTMLElement;
  initialState?: Record<string, T>;
  templateHTML?: string;
  init?: (stateProxy: ProxyHandler<Record<string, T>>) => void;
}

export class DOMController<T=any> {
  private builder: DOMTemplateBuilder;
  public readonly state: ProxyHandler<Record<string, T>>;
  private rafRequest: number;
  private node: HTMLElement;
  private stateObj: Record<string, T> = {};
  private templateHTML?: string;
  private controllerFn?: (stateProxy: ProxyHandler<Record<string, T>>) => void;

  constructor ({ element, initialState, templateHTML, init }: DOMControllerArguments<T>) {
    this.node         = element;
    this.stateObj     = initialState || {};
    this.templateHTML = templateHTML;
    this.controllerFn = init;

    if(!this.templateHTML) {
      this.templateHTML = this.node.outerHTML;
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
    this.templateHTML = templateHTML;
    this.updateTemplateBuilder();
  }

  updateTemplateBuilder (): void {
    this.builder = getTemplateBuilder(this.templateHTML, DOMController.getTemplateArguments());
  }

  setState (newState: Record<string, T>): void {
    Object.assign(this.state, newState);
  }

  private triggerDOMUpdate (): void {
    if(this.rafRequest) {
      window.cancelAnimationFrame(this.rafRequest);
      this.rafRequest = null;
    }
    this.rafRequest = window.requestAnimationFrame(() => {
      this.rafRequest = null;
      const newTemplateNode = this.builder.getTemplateNode(this.state).content;
      updateDOM(this.node, newTemplateNode);
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
