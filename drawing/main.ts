import { draw } from "./eventLoop.js"

let lastCall: number | undefined
async function animate(time: number) {
    const elapsed = time - (lastCall ?? time)
    lastCall = time
    await draw(elapsed)

    window.requestAnimationFrame(animate)
}
window.requestAnimationFrame(animate)