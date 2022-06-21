export class CanvasManager {
    readonly canvasElement: HTMLCanvasElement
    readonly context: CanvasRenderingContext2D

    // Width of the screen in tiles. This is a fixed number and
    // represents the canvas width resolution at scale 1.
    readonly tileWidth: number = 500
    private _tileHeight: number = 0
    private calc_tileheight(): void {
        this._tileHeight = this.pixelHeight / this.unit
    }
    get tileHeight(): number {
        return this._tileHeight
    }
    
    // Canvas scale. Allows zooming in our out
    private _scale: number = 1
    get scale() {
        return this._scale
    }
    set scale(value) {
        this._scale = value
        this.calc_unit()
    }

    get pixelWidth() {
        return this.canvasElement.width
    }
    set pixelWidth(value) {
        this.canvasElement.width = value
        this.calc_unit()
    }

    get pixelHeight() {
        return this.canvasElement.height
    }
    set pixelHeight(value) {
        this.canvasElement.height = value
        this.calc_unit()
        this.calc_tileheight()
    }

    // Represents a single unit in the canvas
    private _unit: number = 0
    private calc_unit(): void {
        this._unit = this.pixelWidth / this.tileWidth * this.scale
    }
    get unit() {
        return this._unit
    }
    
    // FPS cap, affects the time between frames
    private _max_fps: number = 60
    get max_fps() {
        return this._max_fps
    }
    set max_fps(value) {
        this._max_fps = value
        this._timestep = 1000 / this._max_fps
    }
    
    // Time between frames
    private _timestep: number = 1000 / this._max_fps
    get timestep() {
        return this._timestep
    }

    constructor(canvasElement: HTMLCanvasElement) {
        this.canvasElement = canvasElement
        const ctx = canvasElement.getContext("2d")
        if(!ctx) {
            throw new Error("Your browser does not support the canvas API")
        }

        this.context = ctx

        this.calc_unit()
        this.calc_tileheight()
        
        this.resizeCanvas()

        document.addEventListener("resize", this.resizeCanvas)
    }

    // Resize canvas to fill whole screen
    resizeCanvas() {
        this.pixelWidth = window.innerWidth
        this.pixelHeight = window.innerHeight
    }
}