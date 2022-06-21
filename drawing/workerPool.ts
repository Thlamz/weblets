import "./worker.js" //Importing file so it compiles

export interface AsyncWork {
    args: Float64Array,
    argSize: number,
    resultSize: number
    executorPath: string,
    count: number
}

export interface AsyncResult {
    args: Float64Array,
    result: Float64Array
}

export class WorkerPool {
    readonly poolSize: number
    private workers: Worker[] = []
    constructor(poolSize:number = navigator.hardwareConcurrency) {
        let workerPath = import.meta.url
        workerPath = workerPath.substring(0, workerPath.lastIndexOf('/'))
        workerPath += "/worker.js"

        this.poolSize = poolSize
        for(let i=0; i < this.poolSize; i++) {
            this.workers.push(new Worker(workerPath, {
                type: "module"
            }))
        }
    }

    async dispatch(work: AsyncWork[]): Promise<AsyncResult[]> {
        let workerIndex = 0
        let workPromises = []
        for (const job of work) {
            workPromises.push(new Promise<AsyncResult>((resolve, reject) => {   
                this.workers[workerIndex].postMessage(job, [job.args.buffer])
                this.workers[workerIndex].onmessage = (msg: MessageEvent<AsyncResult>) => {
                    resolve(msg.data)
                }
            }))
                
            workerIndex++
        }
        return (await Promise.all(workPromises))
    }
}