import type { CanvasManager } from "./canvas.js"
import { AsyncWork, WorkerPool } from "./workerPool.js"

export interface Entity {
    setup(canvasManager: CanvasManager): void
    draw(elapsed:number, canvasManager: CanvasManager): void
    simulate(elapsed: number, canvasManager: CanvasManager): void
    asyncSimulate(elapsed: number, inplaceArgs: Float64Array, offset: number): void
    incorporate(result: Float64Array, offset: number, canvasManager: CanvasManager): void
}



export class EntityManager<EntityType extends Entity> {
    readonly canvasManager: CanvasManager
    readonly workerPool: WorkerPool
    readonly entityPath: string
    readonly argSize: number
    readonly resultSize: number
    readonly simulationStep: number

    public mode: 'sync' | 'async' = 'async'

    private entities: EntityType[] = []
    constructor(canvasManager: CanvasManager, workerPool: WorkerPool, entityPath: string, argSize: number, resultSize: number, simulationStep: number) {
        this.canvasManager = canvasManager
        this.workerPool = workerPool
        this.entityPath = entityPath
        this.argSize = argSize
        this.resultSize = resultSize
        this.simulationStep = simulationStep
    }

    get entityCount() {
        return this.entities.length
    }

    addEntity(entity: EntityType) {
        this.entities.push(entity)
        entity.setup(this.canvasManager)
    }

    draw(elapsed: number) {
        this.canvasManager.context.fillStyle = "black"
        this.canvasManager.context.beginPath()
        for(const entity of this.entities) {
            entity.draw(elapsed, this.canvasManager)
        }
        this.canvasManager.context.fill()
        this.canvasManager.context.closePath()
    }

    async simulate(elapsed: number) {
        if(this.mode === "sync") {
            for(let entity of this.entities) {
                entity.simulate(elapsed, this.canvasManager)
            }
        } else {
            await this.asyncSimulate(elapsed)
        }  
    }

    private argList: Float64Array[] = []
    private batchSize?: number
    private lastArrayEntityCount?: number
    private async asyncSimulate(elapsed: number) {
        if(this.entities.length > (this.lastArrayEntityCount ?? -1)) {
            this.argList = []
            this.batchSize = Math.ceil(this.entities.length / this.workerPool.poolSize)

            for(let i=0;i<this.workerPool.poolSize;i++) {
                this.argList.push(new Float64Array(this.batchSize * this.argSize + i))
            }
            
            this.lastArrayEntityCount = this.entities.length
        }
        
        let jobs: AsyncWork[] = []
        let entityIndex = 0
        for(let arg of this.argList) {
            let job: AsyncWork = {
                args: arg,
                argSize: this.argSize,
                resultSize: this.resultSize,
                executorPath: this.entityPath,
                count: Math.ceil(this.entities.length / this.workerPool.poolSize)
            }
            
            let currentIndex = 0
            for(let i = 0;i<this.batchSize!;i++) {
                if(entityIndex >= this.entities.length) {
                    break
                }

                this.entities[entityIndex++].asyncSimulate(elapsed, job.args, currentIndex)
    
                currentIndex += this.argSize
            }

            jobs.push(job)
        }

        let results = await this.workerPool.dispatch(jobs)

        entityIndex = 0
        let index = 0
        for(const {result, args} of results) {
            this.argList[index++] = args
            let resultIndex = 0
            const length = result.length
            while(resultIndex < length) {
                if(entityIndex >= this.entities.length) {
                    break
                }

                this.entities[entityIndex++].incorporate(result, resultIndex, this.canvasManager)
                resultIndex += this.resultSize
            }
        }
    }
}