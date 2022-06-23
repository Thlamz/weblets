import { CanvasManager } from "./canvas.js"
import { Entity } from "./entity.js"
import { Dispatcher } from "./workerPool.js"

export class Ant implements Entity {
    private x: number = 0
    private y: number = 0
    private direction: number = Math.random() * 2 * Math.PI
    private speed: number = Math.random() * 5 + 2
    setup(canvasManager: CanvasManager): void {
        this.x = Math.random() * canvasManager.tileWidth
        this.y = Math.random() * canvasManager.tileHeight
    }

    draw(_elapsed: number, canvasManager: CanvasManager): void {
        const ctx = canvasManager.context
        const unit = canvasManager.unit
        
        ctx.rect(this.x * unit, this.y * unit, unit, unit)
    }
    
    simulate(elapsed: number, canvasManager: CanvasManager): void {
        this.x += this.speed * Math.cos(this.direction) * elapsed / 1000
        this.y += this.speed * Math.sin(this.direction) * elapsed / 1000

        if(this.x > canvasManager.tileWidth) {
            this.x = 0
        } else if(this.x < -canvasManager.unit) {
            this.x = canvasManager.tileWidth
        }

        if(this.y > canvasManager.tileHeight) {
            this.y = 0
        } else if(this.y < -canvasManager.unit) {
            this.y = canvasManager.tileHeight
        }
    }

    asyncSimulate(elapsed: number, inplaceArgs: Float64Array, offset: number): void {
        inplaceArgs[offset] = this.direction
        inplaceArgs[offset + 1] = this.speed
    }

    incorporate(result: Float64Array, offset: number, canvasManager: CanvasManager): void {
        const dx = result[offset]
        const dy = result[offset + 1]
        this.x += dx
        this.y += dy

        if(this.x > canvasManager.tileWidth) {
            this.x = 0
        } else if(this.x < -canvasManager.unit) {
            this.x = canvasManager.tileWidth
        }

        if(this.y > canvasManager.tileHeight) {
            this.y = 0
        } else if(this.y < -canvasManager.unit) {
            this.y = canvasManager.tileHeight
        }
    }
}

const cache: Map<number, Map<number,[number, number]>> = new Map()

function execute(elapsed: number, speed: number, direction: number): [number, number] {
    if(!cache.has(speed)) {
        cache.set(speed, new Map())
    }
    const speedCache = cache.get(speed)!
    if(!speedCache.has(direction)) {
        speedCache.set(direction, [speed * Math.cos(direction), speed * Math.sin(direction)])
    }
    const directionCache = speedCache.get(direction)!

    const x = directionCache[0] * elapsed / 1000
    const y = directionCache[1] * elapsed / 1000
    return [x, y]
}

export const dispatch: Dispatcher = (memory, table) => {
    const args = new Float64Array(memory["args"])
    const results = new Float64Array(memory["results"])
    const elapsed = args[0]
    const entityCount = (args.length - 1) / 2
    const batchSize = Math.ceil(entityCount / table.totalWorkers) 
    const offset = batchSize * table.currentWorker

    let index = 0
    let entityIndex = 0
    while(entityIndex < entityCount) {
        const [x,y] = execute(elapsed, args[index + 1 + offset], args[index + 2 + offset])


        results[index + offset] = x
        results[index + 1 + offset] = y

        index+=2
        entityIndex++
    }
}