import { CanvasManager } from "./canvas.js"
import { Entity } from "./entity.js"

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
        inplaceArgs[offset] = elapsed
        inplaceArgs[offset + 1] = this.direction
        inplaceArgs[offset + 2] = this.speed
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

export function execute(args: Float64Array, argsOffset: number,  inplaceResults: Float64Array, resultsOffset: number): void {
    const elapsed = args[argsOffset]
    const direction = args[argsOffset + 1]
    const speed = args[argsOffset + 2]
    inplaceResults[resultsOffset] = speed * Math.cos(direction) * elapsed / 1000
    inplaceResults[resultsOffset + 1] = speed * Math.sin(direction) * elapsed / 1000
}