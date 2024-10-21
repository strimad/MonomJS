import Monom from "./monom.js";

const state = {
    track: {
        1: { scene: { 
                1: { 1: true, 2: false, 3: true, 4: false, 5: true },
                2: { 1: false, 2: true, 3: false, 4: true, 5: false }
            }
        },
        2: { scene: {
                1: { 1: false, 2: true, 3: false, 4: true, 5: false },
                2: { 1: true, 2: false, 3: true, 4: false, 5: true }
            }
        }
    }
}

const init = () => {
    state.proxyTest = Monom.createReferenceToObject(state.track[1], state)

    const radios = document.querySelectorAll("[type='radio']")
    radios.forEach((radio, index) => {
        radio.addEventListener("change", () => {
            state.proxyTest = Monom.createReferenceToObject(state.track[index + 1], state)
        })
    })
}

await Monom.init(state, document)
init();


setInterval(() => {
    console.log(state)
}, 3000)
