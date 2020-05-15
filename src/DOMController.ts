import { watch } from "./utils";
import { DOMTemplateBuilder, getTemplateBuilder } from "./DOMTemplateBuilder";
import { updateDOM } from "./DOMUpdater";

export class DOMController<T=any> {
  private builder: DOMTemplateBuilder;
  private stateProxy: ProxyHandler<Record<string, T>>;
  private rafNum: number;

  constructor (
    private node: HTMLElement,
    private controllerFn: (stateProxy: ProxyHandler<Record<string, T>>) => void,
    private state: Record<string, T> = {},
    private templateHTML?: string
  ) {
    if(!this.templateHTML) {
      this.templateHTML = this.node.outerHTML;
    }
    this.updateTemplateBuilder();
    this.stateProxy = watch(this.state, () => {
      this.triggerDOMUpdate();
    });

    this.controllerFn(this.stateProxy);
    this.triggerDOMUpdate();
  }

  setTemplateHTML (templateHTML: string): void {
    this.templateHTML = templateHTML;
    this.updateTemplateBuilder();
  }

  updateTemplateBuilder (): void {
    this.builder = getTemplateBuilder(this.templateHTML, DOMController.getTemplateArguments());
  }

  private triggerDOMUpdate (): void {
    if(this.rafNum) {
      window.cancelAnimationFrame(this.rafNum);
      this.rafNum = null;
    }
    this.rafNum = window.requestAnimationFrame(() => {
      this.rafNum = null;
      const newTemplateNode = this.builder.getTemplateNode(this.state).content;
      updateDOM(this.node, newTemplateNode);
    });
  }

  private static args: Map<string, any> = new Map();

  static setTempleteArgument (name: string, value: any): void {
    this.args.set(name, value);
  }

  static getTemplateArguments (): Map<string, any> {
    return new Map(this.args.entries());
  }

  // private static controllers: Map<string, DOMController> = new Map();

  // static register (selector: string, controller: DOMController): void {
  //   this.controllers.set(selector, controller);
  //   this.activate(selector);
  // }

  // static async activate (selector: string): Promise<DOMController> {
  //   if(!this.controllers.has(selector)) {
  //     throw new Error("");
  //   }

  //   const controller = this.controllers.get(selector);

  //   controller

  //   return controller;
  // }
}
