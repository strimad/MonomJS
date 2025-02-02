import { Settings } from "./settings.js";

export class Monom {
    static model = {};
    static subscribers = {};

    static init(model, view) {
        return new Promise((resolve, reject) => {
            Monom.model = model;
            Monom.#getViewMutationObserver().observe(view, { childList: true, subtree: true });
            Monom.#getBindedElements(view)
            resolve();
        })
    }

    static #getBindedElements(view) {
        const elements = view.querySelectorAll("[data-bind]");
        elements.forEach(element => {
            const allBinders = element.getAttribute("data-bind").trim().split(";");
            element.removeAttribute("data-bind");

            allBinders.forEach(binder => {
                const [prop, propPath] = binder.trim().split(":");
                const [propType, propName] = prop.trim().split("_");

                if (!Monom.subscribers[propPath]) {
                    Monom.subscribers[propPath] = [];
                }

                const [model, object] = Monom.#objectFromPath(Monom.model, propPath)
                let _value = model[object];

                if (propType == "attr") {
                    if (_value != null && _value != undefined) {
                        element.setAttribute(propName, model[object]);
                    } else {
                        model[object] = element.getAttribute(propName);
                    }

                    Monom.subscribers[propPath].push({ element, callback: (value) => { element.setAttribute(propName, value) }});

                    Monom.#getElementMutationObserver(propType, propName, (value) => {
                        const [model, object] = Monom.#objectFromPath(Monom.model, propPath)
                        model[object] = value;
                    }).observe(element, {
                        attributes: true,
                        attributeOldValue: true
                    });
                } else if (propType == "prop") {
                    if (_value != null && _value != undefined) {
                        element[propName] = model[object];
                    } else {
                        model[object] = element[propName];
                    }

                    Monom.subscribers[propPath].push({ element, callback: (value) => { element[propName] = value }});

                    Monom.#getElementMutationObserver(propType, propName, (value) => {
                        const [model, object] = Monom.#objectFromPath(Monom.model, propPath)
                        model[object] = value;
                    }).observe(element, {
                        attributes: true,
                        attributeOldValue: true,
                        characterData: true,
                        characterDataOldValue: true,
                        childList: true
                    });
                } else {
                    if (_value != null && _value != undefined) {
                        element[propName] = model[object];
                    } else {
                        model[object] = element[propName];
                    }

                    Monom.subscribers[propPath].push({ element, callback: (value) => { element[propName] = value }});

                    const [listener, property] = Monom.#getListenerForElement(element);
                    element.addEventListener(listener, (event) => {
                        event.preventDefault();
                        const [model, object] = Monom.#objectFromPath(Monom.model, propPath);
                        model[object] = element[property];
                    })
                }

                Object.defineProperty(model, object, {
                    get: () => {
                        if (_value != null && _value != undefined) {
                            return _value;
                        }
                        if (propType == "attr") {
                            return element.getAttribute(propName);
                        } else {
                            return element[propName];
                        }
                    },
                    set: (value) => {
                        if (value !== _value && value != null && value != undefined) {
                            _value = value;
                            Monom.#updateDom(propPath, value);
                        }
                    }
                })
            })
        })
    }

    static createReferenceToObject(obj, objProxy, keyProxy) {
        Monom.#setDefaultSetter(objProxy[keyProxy]);
        objProxy[keyProxy] = obj;
        Monom.#setNewSetter(obj);
    }

    static #setDefaultSetter(obj) {
        Object.keys(obj).forEach(key => {
            if(typeof obj[key] == 'object') {
                Monom.#setDefaultSetter(obj[key]);
                return;
            }
            let _value = obj[key];
            Object.defineProperty(obj, key, {
                get: () => {
                    return _value;
                },
                set: (value) => {
                    _value = value;
                }
            })
        })
    }

    static #setNewSetter(obj) {
        const paths = Monom.#objectToPaths(Monom.model, obj);
        Object.keys(obj).forEach(key => {
            if(typeof obj[key] == 'object') {
                Monom.#setNewSetter(obj[key]);
                return;
            }
            let _value = obj[key];
            Object.defineProperty(obj, key, {
                get: () => {
                    return _value;
                },
                set: (value) => {
                    if (_value !== value && value != null && value != undefined) {
                        _value = value;
                        paths.forEach(path => {
                            Monom.#updateDom(`${path}.${key}`, value);
                        })
                    }
                }
            })
            paths.forEach(path => {
                Monom.#updateDom(`${path}.${key}`, obj[key]);
            })
        })
    }

    static #objectToPaths(objBase, target, path = null) {
        let paths = [];
        for (const key in objBase) {
            const currentPath = path ? `${path}.${key}` : key;
            if (objBase[key] === target) {
                paths.push(currentPath);
            } else if (typeof objBase[key] === "object") {
                const result = Monom.#objectToPaths(objBase[key], target, currentPath);
                if (result.length > 0) {
                    paths.push(...result)
                }
            }
        }
        return paths;
    }

    static #objectFromPath(model, path) {
        const levels = path.split(".");
        const object = levels.pop();
        for (const level of levels) {
            if (!model[level]) {
                model[level] = {};
            }
            model = model[level];
        }
        return [model, object];
    }

    static #updateDom(path, value) {
        if (Monom.subscribers[path]) {
            Monom.subscribers[path].forEach(subscriber => {
                subscriber.callback(value);
            })
        }
    }

    static #getViewMutationObserver() {
        return new MutationObserver(entries => {
            entries.forEach(entry => {
                if (entry.addedNodes.length > 0) {
                    Monom.#getBindedElements(entry.target)
                }/* else if (entry.removedNodes.length > 0) {
                    entry.removedNodes.forEach(node => {
                        if(node.nodeType != Node.ELEMENT_NODE) return;
                        const elements = node.querySelectorAll("*")
                        Monom.unsubscribe(elements);
                    })
                }*/
            })
        });
    }

    static unsubscribe(elements) {
        elements.forEach(element => {
            Object.entries(Monom.subscribers).forEach(([key, subscribers]) => {
                Monom.subscribers[key] = subscribers.filter(subscriber => subscriber.element !== element);
            });
        });
    }

    static #getElementMutationObserver(propType, propName, callback) {
        return new MutationObserver(entries => {
            entries.forEach(entry => {
                if (entry.type == "attributes") {
                    const attributeName = entry.attributeName;
                    if (attributeName !== propName) return;
                    if (attributeName == "data-id") return;
                    const value = entry.target.attributes[attributeName].value;
                    if (value == entry.oldValue) return;
                    callback(value);
                } else if (entry.type == "childList") {
                    const value = entry.target[propName];
                    callback(value);
                }
            })
        });
    }

    static #getListenerForElement(element) {
        const nodeName = element.nodeName.toLowerCase();
        if (nodeName === "input") {
            const type = element.getAttribute("type");
            const inputTypes = {
                "text": ["input", "value"],
                "checkbox": ["change", "checked"],
                "radio": ["change", "checked"],
                "range": ["change", "value"]
            };
            return inputTypes[type] || ["input", "value"];
        }
        return [null, null];
    }
}

/*************************************************************************************************/
export class AbstractComponent {
    constructor(view, model = null) {
        this.model = model;
        this.className = this.constructor.name;
        return new Promise(async (resolve, reject) => {
            await this.#loadHtml(view);
            resolve(this);
        })
    }
    async #loadHtml(view) {
        const htmlContent = await this.#getHtml(`${Settings.COMPONENTS_FOLDER_PATH}/${this.className}/${this.className}.html`);
        const updatedHtml = this.#replaceVariablesInHtml(htmlContent, this);
        const part = this.#parseHtml(htmlContent);
        const styles = part.querySelectorAll("style [mno-href]");
        const scripts = part.querySelectorAll("script [mno-src]");
        styles.forEach(style => {
            view.head.appendChild(style);
        })
        scripts.forEach(script => {

        })
        this.html = part.querySelector("body > *");
        view.querySelector(this.className).replaceWith(this.html);
        this.init();
    }
    #replaceVariablesInHtml(htmlContent, context) {
        return htmlContent.replace(/\$\{([^}]+)\}/g, (match, expression) => {
            try {
                const fn = new Function('with(this) { return ' + expression + '; }');
                return fn.call(context);
            } catch (error) {
                console.error(`Failed to evaluate expression: ${expression}`, error);
                return match;
            }
        });
    }
    async #getHtml(url) {
        const request = await fetch(url);
        return (await request.text()).trim();
    }
    #parseHtml(html, querySelector = null) {
        const parser = new DOMParser();
        if(!querySelector) {
            return parser.parseFromString(html, 'text/html');
        }
        return parser.parseFromString(html, 'text/html').querySelector(querySelector);
    }

    fireEvent(name, params = {}, source = null) {
        if (!source) {
            dispatchEvent(new CustomEvent(name, { detail: params }));
            return;
        }
        source.dispatchEvent(new CustomEvent(name, { detail: params }));
    }
}

const initCustomElements = () => {
    Settings.CUSTOM_ELEMENTS.forEach(element => {
        import(Settings.CUSTOM_ELEMENTS_PATH + "/" + element.name + "/" + element.name + ".js");
        if(element.style) {
            const style = document.createElement("link");
            style.rel = "stylesheet";
            style.href = Settings.CUSTOM_ELEMENTS_PATH + "/" + element.name + "/" + element.name + ".css";
            document.head.appendChild(style);
        }
    })
}
initCustomElements();