import type { DispatchData, Dispatcher, ProvisionData, SharedMemory, WorkerMessage } from "./workerPool";

let sharedMemory: SharedMemory = {}

let dispatcherCache: Record<string, Function> = {}

async function getDispatcher(dispatcher: string) {
    if(dispatcher in dispatcherCache) {
        return dispatcherCache[dispatcher]
    } else {
        const { dispatch } = await import(dispatcher)
        dispatcherCache[dispatcher] = dispatch
        return dispatch
    }
}

self.addEventListener("message", async (event: MessageEvent<WorkerMessage<'dispatch' | 'provision'>>) => {
    const { type } = event.data

    switch(type) {
        case "provision":
            const { buffer, key } = event.data.data as ProvisionData
            sharedMemory[key] = buffer
            break
        case "dispatch":
            const data = event.data.data as DispatchData
            const dispatch: Dispatcher = await getDispatcher(data.dispatcher)
        
            dispatch(sharedMemory, data.table)
            
            break
    }
        
    self.postMessage("done")
})