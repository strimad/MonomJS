# Monom JavaScript Library

## Introduction
Monom is a JavaScript library for dynamically creating and manipulating HTML elements with two-way data binding. It allows seamless synchronization between a model object and the DOM using custom attributes.

## Features
- **Two-way data binding**: Sync data between the model and UI.
- **Attribute and property bindings**: Bind element attributes and properties dynamically.
- **Automatic DOM updates**: Reflect changes in the model instantly in the UI.
- **Custom components support**: Load and initialize components dynamically.
- **Mutation observation**: Detect and process DOM changes automatically.

---

## Installation
Include Monom in your project by importing the script:

```js
import { Monom } from './monom.js';
```

---

## Getting Started
### Initializing Monom
To start using Monom, initialize it with a model and a root view:

```js
const model = { username: "JohnDoe", isDarkMode: false };
const view = document.getElementById("app");

Monom.init(model, view).then(() => {
    console.log("Monom is initialized!");
});
```

---

## Data Binding
### Binding Attributes
Use `data-bind` to link an attribute to a model property:

```html
<input type="text" data-bind="prop_value:username">
```

Whenever `model.username` changes, the input field’s `value` attribute updates automatically.

### Binding Properties
Bind element properties using `prop_`:

```html
<input type="checkbox" data-bind="prop_checked:isDarkMode">
```

Toggling the checkbox updates `model.isDarkMode` and vice versa.

### Binding Events
Monom listens for changes and updates the model accordingly:

```html
<input type="text" data-bind="prop_value:username">
```

Changing the input updates `model.username` instantly.

---

## Working with Components
Monom supports dynamic component loading with `AbstractComponent`.

### Creating a Component
Extend `AbstractComponent` to create custom UI elements:

```js
import { AbstractComponent } from './monom.js';

class UserProfile extends AbstractComponent {
    constructor(view, model) {
        super(view, model);
    }
}
```

### Using Components in HTML
Define components in HTML and let Monom handle initialization:

```html
<UserProfile></UserProfile>
```

---

## Conclusion
Monom simplifies UI reactivity with minimal effort. By binding model properties directly to the DOM, it eliminates the need for manual updates, ensuring a smoother user experience.

