class Monom {
    static state = {};
    static bindedElements = {};

    static setStateModel(model) {
        Monom.state = model;
    }

    static init(view) {
        const elements = view.querySelectorAll('[data-bind]')
        elements.forEach(element => {
            //const id = crypto.randomUUID();
            //element.setAttribute("data-id", id);
            const allBinders = element.getAttribute('data-bind').split(";")
            element.removeAttribute("data-bind")
            allBinders.forEach(binder => {
                const [prop, bindAttr] = binder.split(':');
                const [propType, propName] = prop.split("_");
                if (!Monom.bindedElements[bindAttr]) {
                    Monom.bindedElements[bindAttr] = [];
                }
                Monom.bindedElements[bindAttr].push({ element, propType, propName });
                const [model, object] = Monom.pathFromObject(Monom.state, bindAttr)
                if (propType == "attr") {
                    Monom.getMutationObserver(bindAttr).observe(element, { attributes: true, attributeOldValue: true });
                } else {
                    const [listener, property] = Monom.getListenerForElement(element);
                    Monom.setElementListener(element, listener, property, bindAttr);
                    Monom.updateDomElement(element, propName, propType, model, object);
                }
            })
        });
    }

    static updateDomElement(element, property, type, model, object) {
        if (type == "attr") {
            if (element.getAttribute(property) != model[object] && model[object] != null && model[object] != undefined) {
                element.setAttribute(property, model[object]);
            } else if (model[object] == null || model[object] == undefined) {
                model[object] = element.getAttribute(property)
            }
        } else {
            if (element[property] != model[object] && model[object] != null && model[object] != undefined) {
                element[property] = model[object];
            } else if (model[object] == null || model[object] == undefined) {
                model[object] = element[property]
            }
        }
    }

    static updateDom(proxyObject, paths) {
        paths.keys.forEach(key => {
            const objects = Monom.bindedElements[paths.objKey + '.' + key];
            if (!objects) return
            objects.forEach(obj => {
                const [model, object] = Monom.pathFromObject(proxyObject, key)
                Monom.updateDomElement(obj.element, obj.propName, obj.propType, model, object)
            })
        })
    }

    static createReferenceToObject(obj, objBase, objKey = null) {
        if (objKey) {
            const allKeys = { objKey, keys: Monom.objectToPaths(objBase[objKey]) };
            Monom.updateDom(obj, allKeys);
        }
        return obj;
    }

    static setNewValue(key, value, sender) {
        const [model, object] = Monom.pathFromObject(Monom.state, key)
        model[object] = value;
        const elements = Monom.bindedElements[key];
        elements.forEach(element => {
            if(element.element != sender) {
                Monom.updateDomElement(element.element, element.propName, element.propType, model, object);
            }
        })
    }

    static objectToPaths(obj, keyString = "", allKeys = []) {
        const keys = Object.keys(obj)
        keys.forEach(key => {
            if (typeof obj[key] == "object") {
                const newKeyString = keyString + key + ".";
                Monom.objectToPaths(obj[key], newKeyString, allKeys)
            }
            const newKeyString = keyString + key
            allKeys.push(newKeyString)
        })
        return allKeys;
    }

    static pathFromObject(model, path) {
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

    static getMutationObserver(path) {
        return new MutationObserver(entries => {
            entries.forEach(entry => {
                const attributeName = entry.attributeName;
                if (attributeName == "data-id") return
                const value = entry.target.getAttribute(attributeName);
                if (value == entry.oldValue) return;
                /*const id = entry.target.getAttribute("data-id");
                if (Monom.elements[id][attributeName]) {
                    Monom.elements[id][attributeName].model[Monom.elements[id][attributeName].object] = value;
                }*/
                Monom.setNewValue(path, value, entry.target)
            })
        });
    }

    static setElementListener(element, listener, property, path) {
        element.addEventListener(listener, (event) => {
            event.preventDefault();
            Monom.setNewValue(path, element[property], element)
        })
    }

    static getListenerForElement(element) {
        switch (element.nodeName.toLowerCase()) {
            case "input":
                switch (element.getAttribute("type")) {
                    case "text":
                        return ["input", "value"]
                    case "checkbox":
                        return ["change", "checked"]
                    case "radio":
                        return ["change", "checked"]
                    case "range":
                        return ["change", "value"]
                    default:
                        return ["input", "value"]
                }
            default:
                return { listener: null, property: null }
        }
    }
}

export default Monom