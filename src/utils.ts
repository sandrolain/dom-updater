


export function executeSourceWithArguments<T=any> (source: string, argsMap: Map<string, any>): T {
  const argsNames = [];
  const argsValues = [];
  for(const [name, value] of argsMap.entries()) {
    argsNames.push(name);
    argsValues.push(value);
  }
  argsNames.push(source);
  const func = new Function(...argsNames);
  return func(...argsValues);
}


// TODO: from utils module
export function watch<T=any> (object: Record<string | number, T>, callback: (propertyName: string | number) => void): ProxyHandler<Record<string | number, T>> {
  const handler = {
    get (target: Record<string | number, T>, property: string | number, receiver: any): any {
      if(typeof target === "object") {
        try {
          return new Proxy(target[property] as unknown as Record<string | number, T>, handler);
        } catch(err) {
          err;
        }
      }
      return Reflect.get(target, property, receiver);
    },
    defineProperty (target: Record<string | number, T>, property: string | number, descriptor: PropertyDescriptor): boolean {
      const res = Reflect.defineProperty(target, property, descriptor);
      callback(property);
      return res;
    },
    deleteProperty (target: Record<string | number, T>, property: string | number): boolean {
      const res = Reflect.deleteProperty(target, property);
      callback(property);
      return res;
    }
  };
  return new Proxy(object, handler);
}


export function htmlEntitiesDecode (value: string): string {
  const textarea = document.createElement("textarea");
  textarea.innerHTML = value;
  return textarea.value;
}

export function getDescendantProp (obj: Record<any, any>, desc: string): any {
  const arr = desc.split(/[.[]/);
  while(arr.length > 0 && obj) {
    let prop: string | number = arr.shift();
    if(prop.length === 0) {
      continue;
    }
    if(prop.match(/[0-9]\]$/)) {
      prop = parseInt(prop.replace("]", ""), 10);
    }
    obj = obj[prop];
  }
  return obj;
}

