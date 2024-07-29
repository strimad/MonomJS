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
document.addEventListener('DOMContentLoaded', () => {
    const monom = new Monom(state)
    init();
    monom.init(document)
});

const init = () => {
    Monom.state.proxyTest = Monom.createReferenceObject(Monom.state.track[1], Monom.state.proxyTest)

    const radios = document.querySelectorAll("[type='radio']")
    radios.forEach((radio, index) => {
        radio.addEventListener("change", () => {
            Monom.state.proxyTest = Monom.createReferenceObject(Monom.state.track[index + 1], Monom.state, "proxyTest")
        })
    })
}