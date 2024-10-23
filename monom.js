export class Monom {
    static model = {};
    static subscribers = {};

    static init(model, view) {
        return new Promise((resolve, reject) => {
            Monom.model = model;
            //Monom.model = Object.assign(model);
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

                    Monom.subscribers[propPath].push({ element, callback: (value) => { element.setAttribute(propName, value); } });

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

                    Monom.subscribers[propPath].push({ element, callback: (value) => { element[propName] = value; } });

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

                    Monom.subscribers[propPath].push({ element, callback: (value) => { element[propName] = value; } });

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
        const paths = Monom.#objectToPath(Monom.model, objProxy);
        const objRef = obj;
        Object.keys(objRef).forEach(key => {
            paths.forEach(path => {
                Monom.#updateDom(`${path}.${keyProxy}.${key}`, objRef[key]);
            })

            let _value = objRef[key];
            Object.defineProperty(objRef, key, {
                get: () => {
                    return _value;
                },
                set: (value) => {
                    //if (_value !== value && value != null && value != undefined) {
                        _value = value;
                        paths.forEach(path => {
                            console.log(`${path}.${keyProxy}.${key}`)
                            Monom.#updateDom(`${path}.${keyProxy}.${key}`, value);
                        })
                    //}
                }
            })
        })
        objProxy[keyProxy] = objRef;
    }

    static #updateDom(path, value) {
        if (Monom.subscribers[path]) {
            Monom.subscribers[path].forEach(subscriber => {
                subscriber.callback(value);
            })
        }
    }

    static #objectFromPath(model, path) {
        const levels = path.split(".");
        const object = levels.pop();
        levels.forEach(level => {
            if (!model[level]) {
                model[level] = {};
            }
            model = model[level];
        });
        return [model, object];
    }

    static #objectToPath(obj, target, path = null) {
        let paths = [];
        for (let key in obj) {
            const currentPath = path ? `${path}.${key}` : key;
            if (obj[key] === target) {
                paths.push(currentPath);
            }
            if (typeof obj[key] === "object") {
                const result = Monom.#objectToPath(obj[key], target, currentPath);
                if(result.length > 0) {
                    paths.push(...result)
                }
            }
        }
        if(paths.length > 1) {
            console.log(paths)
        }
        
        return paths;
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