import "./worker.js" //Importing file so it compiles

export type SharedMemory = Record<string, SharedArrayBuffer>

export interface DispatchTable {
    totalWorkers: number,
    currentWorker: number
}

export interface DispatchData {
    table: DispatchTable,
    dispatcher: string
}

export interface ProvisionData {
    key: string
    buffer: SharedArrayBuffer
}

export type Dispatcher = (memory: SharedMemory, dispatchTable: DispatchTable) => void

type MessageTypes = 'provision' | 'dispatch'
export interface WorkerMessage<T extends MessageTypes> {
    type: T,
    data: T extends 'provision' ? ProvisionData : DispatchData
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

    async provision(buffer: SharedArrayBuffer, key: string) {
        let provisionPromises:Promise<void>[] = []
        for(const worker of this.workers) {
            worker.postMessage(<WorkerMessage<'provision'>>{
                type: 'provision',
                data: {
                    buffer,
                    key
                }
            })

            provisionPromises.push(this.waitUntilDone(worker))
        }
        await Promise.all(provisionPromises)
    }

    async dispatch(dispatcherPath: string): Promise<void> {
        let workerIndex = 0
        let workPromises = []
        for (const worker of this.workers) {
            const data: DispatchData = {
                table: {
                    totalWorkers: this.poolSize,
                    currentWorker: workerIndex
                },
                dispatcher: dispatcherPath
            }
            this.workers[workerIndex].postMessage(<WorkerMessage<'dispatch'>>{
                type: "dispatch",
                data
            })

            workPromises.push(this.waitUntilDone(worker))
                
            workerIndex++
        }
        await Promise.all(workPromises)
    }

    private async waitUntilDone(worker: Worker): Promise<void> {
        return new Promise((resolve) => {
            worker.onmessage = (msg: MessageEvent<any>) => {
                if(msg.data === 'done') {
                    resolve()
                }
            }
        })
    }
}