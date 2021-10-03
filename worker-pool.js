const { AsyncResource } = require("async_hooks");
const { EventEmitter } = require("events");
const path = require("path");
const { Worker } = require("worker_threads");

const kTaskInfo = Symbol("kTaskInfo");
const kWorkerFreeEvent = Symbol("kWorkerFreeEvent");

class WorkerPoolTaskInfo extends AsyncResource {
  constructor(callback) {
    super("WorkerPoolTaskInfo");
    this.callback = callback;
  }

  done(err, result) {
    this.runInAsyncScope(this.callback, null, err, result);
    this.emitDestroy();
  }
}

class WorkerPool extends EventEmitter {
  constructor(numThreads, workerFile) {
    super();
    this.numThreads = numThreads;
    this.workerFile = workerFile;
    this.workers = [];
    this.freeWorkers = [];
  
    for (let i = 0; i < numThreads; i++) {
      this.addNewWorker();
    }
  }

  addNewWorker() {
    const worker = new Worker(path.resolve(this.workerFile));
    worker.on("message", (result) => {
      worker[kTaskInfo].done(null, result);
      worker[kTaskInfo] = null;
      this.freeWorkers.push(worker);
      this.emit(kWorkerFreeEvent);
    });
    worker.on("error", (error) => {
      if (worker[kTaskInfo]) {
        worker[kTaskInfo].done(err, null);
      } else {
        this.emit("error", error);
      }
      this.workers.splice(this.workers.indexOf(worker), 1);
      this.addNewWorker();
    });
    this.workers.push(worker);
    this.freeWorkers.push(worker);
    this.emit(kWorkerFreeEvent);
  }

  runTask(task, callback) {
    if (this.freeWorkers.length === 0) {
      this.once(kWorkerFreeEvent, () => this.runTask(task, callback));
      return;
    }

    const worker = this.freeWorkers.pop();
    worker[kTaskInfo] = new WorkerPoolTaskInfo(callback);
    worker.postMessage(task);
  }

  close() {
    for (const worker of this.workers) worker.terminate();
  }
}

module.exports = WorkerPool;