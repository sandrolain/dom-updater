import { getDescendantProp, executeSourceWithArguments, htmlEntitiesDecode } from "./utils";

function parseTemplateString (tpl: string, args: Map<string, any>): [string[], any[]] {
  const strings: string[] = [];
  const values: string[] = [];
  let index = tpl.indexOf("${");
  while(index > -1) {
    let scopeNum = 0;
    const str = tpl.substring(0, index);
    strings.push(str);
    tpl = tpl.substring(index + 2);
    for(let i = 0, len = tpl.length; i < len; i++) {
      const cha = tpl[i];
      if(cha === "}") {
        if(scopeNum === 0) {
          const arg = tpl.substring(0, i);
          values.push(htmlEntitiesDecode(arg));
          tpl = tpl.substring(i + 1);
          break;
        }
        scopeNum--;
      } else if(cha === "{") {
        scopeNum++;
      }
    }
    index = tpl.indexOf("${");
  }
  strings.push(tpl);

  const valuesStrings: any[] = values.map((scriptStr): any => {
    return executeSourceWithArguments(`return ${scriptStr};`, args);
  });

  return [strings, valuesStrings];
}

export function getTemplateBuilder (tokens: string[] | string, ...values: any[] | [Map<string, any>]): DOMTemplateBuilder {
  if(typeof tokens === "string") {
    const args = values[0] || new Map();
    [tokens, values] = parseTemplateString(tokens, args);
  }
  return new DOMTemplateBuilder(tokens, values);
}

export class DOMTemplateBuilder {
  constructor (private tokens: string[], private values: any[]) {}

  getTemplateNode (vars = {}): HTMLTemplateElement {
    const html = this.getHTML(vars);
    const node = document.createElement("template");
    node.innerHTML = html;
    return node;
  }

  getHTML (vars: Record<string | number, any> = {}): string  {
    const html = [];
    const len = this.tokens.length;
    for(let i = 0; i < len; i++) {
      html.push(this.tokens[i]);
      const value = this.values[i];
      if(value !== null && value !== undefined) {
        const type: string = typeof value;
        let result;
        if(type === "function") {
          result = value(vars);
        } else if(type === "number") {
          result = vars[value];
        } else if(type === "string") {
          result = getDescendantProp(vars, value);
        }
        if(result !== null && result !== undefined) {
          html.push(result);
        }
      }
    }
    return html.join("");
  }
}

