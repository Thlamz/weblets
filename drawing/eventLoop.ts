import { Ant } from "./ant.js";
import { CanvasManager } from "./canvas.js";
import { Entity, EntityManager } from "./entity.js";
import { WorkerPool } from "./workerPool.js";

const canvasManager = new CanvasManager(
  <HTMLCanvasElement> document.getElementById("canvas"),
);
const workerPool = new WorkerPool();
const antEntityManager = new EntityManager(
  canvasManager,
  workerPool,
  "./ant.js",
  2,
  2,
  1,
  (elapsed, _manager, globalArgs) => {
    globalArgs[0] = elapsed;
  },
);

let stop = false;
let shouldDraw = true;
addEventListener("keypress", async (event) => {
  if (event.key === "a") {
    for (let i = 0; i < 5000; i++) {
      antEntityManager.addEntity(new Ant());
    }
    await antEntityManager.compile();
  } else if (event.key === "s") {
    antEntityManager.mode = antEntityManager.mode === "sync" ? "async" : "sync";
  } else if (event.key === "p") {
    stop = !stop
  } else if (event.key === "d") {
    shouldDraw = !draw
  }
});
const last_fps: number[] = [];
export async function draw(elapsed: number) {
  if (stop) {
    return;
  }

  await antEntityManager.simulate(elapsed);

  if(shouldDraw) {

      canvasManager.context.clearRect(
        0,
        0,
        canvasManager.pixelWidth,
        canvasManager.pixelHeight,
      );
      antEntityManager.draw(elapsed);
      canvasManager.context.clearRect(0, 0, 40, 40);
      canvasManager.context.fillText(
        antEntityManager.entityCount.toString(),
        10,
        10,
      );
      if (elapsed > 0) {
        const current_fps = 1 / (elapsed / 1000);
    
        if (last_fps.length > 100) {
          last_fps.shift();
        }
        last_fps.push(current_fps);
      }
    
      const fps = last_fps.reduce((a, b) => a + b, 0) / last_fps.length;
      canvasManager.context.fillText(
        fps.toLocaleString(undefined, {
          maximumFractionDigits: 0,
        }),
        10,
        20,
      );
      canvasManager.context.fillText(antEntityManager.mode, 10, 30);
  }
}
