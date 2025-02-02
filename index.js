import { Monom } from "./monom.js";

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
    },
    proxyTrack: {}
}

const init = () => {
    state.proxyTest = Monom.createReferenceToObject(state.track[1], state, "proxyTest")

    const radios = document.querySelectorAll("[type='radio']")
    radios.forEach((radio, index) => {
        radio.addEventListener("change", () => {
            state.proxyTest = Monom.createReferenceToObject(state.track[index + 1], state, "proxyTest")
        })
    })
}

await Monom.init(state, document)
init();
