import type { AsyncWork } from "./workerPool";

let executorCache: Record<string, Function> = {}

async function getExecutor(executorPath: string) {
    if(executorPath in executorCache) {
        return executorCache[executorPath]
    } else {
        const { execute } = await import(executorPath)
        executorCache[executorPath] = execute
        return execute
    }
}

self.addEventListener("message", async (event: MessageEvent<AsyncWork>) => {
    const {args, argSize, resultSize, executorPath, count} = event.data

    const execute = await getExecutor(executorPath)

    let currentArgsIndex = 0
    let currentResultIndex = 0
    let result = new Float64Array(resultSize * count)
    const length = args.length
    while(currentArgsIndex < length) {
        execute(args, currentArgsIndex, result, currentResultIndex)
        currentArgsIndex += argSize
        currentResultIndex += resultSize
    }
    // @ts-ignore
    self.postMessage(<AsyncResult>{result, args}, [result.buffer, args.buffer])
})