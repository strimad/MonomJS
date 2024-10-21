export class Monom {
    static model = {};
    static subscribers = {};

    static init(model, view) {
        return new Promise((resolve, reject) => {
            Monom.model = model;
            model.reference = {};
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

                if (propType == "attr") {
                    if (model[object] != null && model[object] != undefined) {
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
                    if (model[object] != null && model[object] != undefined) {
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
                    if (model[object] != null && model[object] != undefined) {
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
                let  _value = model[object];
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
                        if (model[object] !== _value && value != null && value != undefined) {
                            _value = value;
                            Monom.subscribers[propPath].forEach(subscriber => {
                                subscriber.callback(value);
                            })
                        }
                    },
                    enumerable: true,
                    configurable: true
                })
            })
        })
    }

    static createReferenceToObject(obj, objProxy, notObject = null) {
        const path = Monom.#objectToPath(Monom.model, objProxy, notObject);
        const path2 = Monom.#objectToPath(Monom.model, obj);
        
        console.log(path)
        console.log(path2)

        if (path) {
            Object.keys(obj).forEach(key => {
                if (Monom.subscribers[`${path}.${key}`]) {
                    Monom.subscribers[`${path}.${key}`].forEach(subscriber => {
                        subscriber.callback(obj[key]);
                    })
                }

                let _value = obj[key];
                Object.defineProperty(obj, key, {
                    get: () => {
                        return _value;
                    },
                    set: (value) => {
                        if (_value !== value && value != null && value != undefined) {
                            _value = value;
                            objProxy[key] = value;    
                            if (Monom.subscribers[`${path}.${key}`]) {
                                Monom.subscribers[`${path}.${key}`].forEach(subscriber => {
                                    subscriber.callback(value);
                                })
                            }
                        }
                    }
                })

                
            })
            /*Object.keys(objProxy).forEach(key => {
                if (Monom.subscribers[`${path2}.${key}`]) {
                    Monom.subscribers[`${path2}.${key}`].forEach(subscriber => {
                        subscriber.callback(objProxy[key]);
                    })
                }
                let _value = objProxy[key]
                Object.defineProperty(objProxy, key, {
                    get: () => {
                        return _value;
                    },
                    set: (value) => {
                        if (_value !== value && value != null && value != undefined) {
                            _value = value;
                            obj[key] = value;
                            if (Monom.subscribers[`${path2}.${key}`]) {
                                Monom.subscribers[`${path2}.${key}`].forEach(subscriber => {
                                    subscriber.callback(value);
                                })
                            }
                        }
                    }
                })
            })*/
        }

        return obj;

        return new Proxy(obj, {
            get(target, prop) {
                return Reflect.get(target, prop)
                //return target[prop]
            },
            set(target, prop, value) {
                if(target[prop] == value) return true;
                console.log(value)
                
                /*if (Monom.subscribers[`${path}.${prop}`]) {
                    Monom.subscribers[`${path}.${prop}`].forEach(subscriber => {
                        subscriber.callback(value);
                    })
                }*/
                //Reflect.set(target, prop, value)

                //target[prop] = value;
                console.log(target[prop])
                console.log(prop)
                /*Object.keys(target).forEach(key => {
                    if (Monom.subscribers[`${path}.${key}`]) {
                        Monom.subscribers[`${path}.${key}`].forEach(subscriber => {
                            subscriber.callback(value);
                        })
                    }  
                })*/
                return true;
            }
        })
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

    static #objectToPath(obj, target, notObject, path = null) {
        for (let key in obj) {
            const currentPath = path ? `${path}.${key}` : key;
            if (obj[key] === target) {
                return currentPath;
            }
            if (typeof obj[key] === "object" && obj[key] !== notObject) {
                const result = Monom.#objectToPath(obj[key], target, notObject, currentPath);
                if (result) return result;
            }
        }
        return null;
    }

    static #createProxy(target, element, propType, propPath) {
        return new Proxy(target, {
            get(obj, prop, receiver) {
                if (!(prop in obj)) {
                    if (propType == "attr") {
                        return element.getAttribute(propName)
                    }
                    return element[propName];
                }
                return obj[prop];
            },
            set(obj, prop, value) {
                if (value === null) return true;
                if (value === undefined) return true;
                if (obj[prop] === value) return true;
                obj[prop] = value;
                Monom.subscribers[propPath].forEach(subscriber => {
                    subscriber.callback(value);
                })
                return true;
            }
        })
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