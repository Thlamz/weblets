import type { CanvasManager } from "./canvas.js";
import { WorkerPool } from "./workerPool.js";

export interface Entity {
  setup(canvasManager: CanvasManager): void;
  draw(elapsed: number, canvasManager: CanvasManager): void;
  simulate(elapsed: number, canvasManager: CanvasManager): void;
  asyncSimulate(
    elapsed: number,
    inplaceArgs: Float64Array,
    offset: number,
  ): void;
  incorporate(
    result: Float64Array,
    offset: number,
    canvasManager: CanvasManager,
  ): void;
}

type GlobalArgSetter = (elapsed: number, canvasManager: CanvasManager, globalArgsInplace: Float64Array) => void;

export class EntityManager<EntityType extends Entity> {
  readonly canvasManager: CanvasManager;
  readonly workerPool: WorkerPool;
  readonly dispatcherPath: string;
  readonly argSize: number;
  readonly resultSize: number;
  readonly globalArgSize: number;
  readonly setGlobalArgs: GlobalArgSetter;

  protected isCompiled: boolean = false;

  public mode: "sync" | "async" = "async";

  private entities: EntityType[] = [];
  constructor(
    canvasManager: CanvasManager,
    workerPool: WorkerPool,
    dispatcherPath: string,
    argSize: number,
    resultSize: number,
    globalArgSize: number,
    setGlobalArgs: GlobalArgSetter,
  ) {
    this.canvasManager = canvasManager;
    this.workerPool = workerPool;
    this.dispatcherPath = dispatcherPath;
    this.argSize = argSize;
    this.resultSize = resultSize;
    this.globalArgSize = globalArgSize;
    this.setGlobalArgs = setGlobalArgs;
  }

  get entityCount() {
    return this.entities.length;
  }

  addEntity(entity: EntityType) {
    this.entities.push(entity);
    entity.setup(this.canvasManager);
    this.isCompiled = false;
  }

  draw(elapsed: number) {
    if (!this.isCompiled) {
      return;
    }
    this.canvasManager.context.fillStyle = "black";
    this.canvasManager.context.beginPath();
    for (const entity of this.entities) {
      entity.draw(elapsed, this.canvasManager);
    }
    this.canvasManager.context.fill();
    this.canvasManager.context.closePath();
  }

  async simulate(elapsed: number) {
    if (!this.isCompiled) {
      return;
    }

    if (this.mode === "sync") {
      for (let entity of this.entities) {
        entity.simulate(elapsed, this.canvasManager);
      }
    } else {
      await this.asyncSimulate(elapsed);
    }
  }

  private args?: Float64Array;
  private results?: Float64Array;
  private batchSize?: number;
  async compile() {
    const argBuffer = new SharedArrayBuffer(
      (this.argSize * this.entities.length + this.globalArgSize) * 8
    );
    this.args = new Float64Array(argBuffer);
    await this.workerPool.provision(argBuffer, "args");

    const resultBuffer = new SharedArrayBuffer(
      (this.resultSize * this.entities.length) * 8
    );
    this.results = new Float64Array(resultBuffer);
    await this.workerPool.provision(resultBuffer, "results");

    this.batchSize = Math.ceil(
      this.entities.length / this.workerPool.poolSize,
    );

    this.isCompiled = true
  }

  private async asyncSimulate(elapsed: number) {
    if (!this.isCompiled) {
      return;
    }

    this.setGlobalArgs(elapsed, this.canvasManager, this.args!);

    let index = 0
    let entityIndex = 0
    while(entityIndex < this.entityCount) {
      this.entities[entityIndex++].asyncSimulate(elapsed, this.args!, index + this.globalArgSize)

      index += this.argSize
    }

    await this.workerPool.dispatch(this.dispatcherPath);

    index = 0;
    entityIndex = 0;
    while (entityIndex < this.entityCount) {
      this.entities[entityIndex++].incorporate(
        this.results!,
        index,
        this.canvasManager,
      );
      index += this.resultSize;
    }
  }
}
