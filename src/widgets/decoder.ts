import pgljs from '../pgljs/dist/index.js';
import { IDecodingTask, ITaskData, ITaskResult, IWorker } from './interfaces';

let MAX_WORKER = 10;
const workers: Map<IWorker, IDecodingTask[]> = new Map();

const getWorker = (): IWorker => {

    const avg = Array.from(workers.values()).reduce((s, v) => s + v.length / workers.size, 0);

    if ((workers.size === 0 || avg >= 1) && workers.size < MAX_WORKER) {
        const worker = pgljs();
        workers.set(worker, []);
        worker.onerror = function (evt) {
            console.log(evt);
        }
        worker.onmessage = function (this: IWorker, evt) {

            if (evt.data && 'initialized' in evt.data) {
                if (evt.data.initialized) {
                    workers.get(this).forEach(task => this.postMessage(task.data));
                    this.initialized = true;
                    this.processed = 0;
                } else {
                    workers.get(this).forEach(task => task.reject({ err: 'initialization failed', userData: task.userData }));
                    this.terminate();
                    workers.delete(this);
                }
            } else {
                if (workers.get(this).length) {
                    const { resolve, reject, userData } = workers.get(this).shift();
                    if (evt.data.error) {
                        reject({ error: evt.data.error, userData});
                    } else {
                        resolve({ ...evt.data, userData });
                    }
                }
            }

            if (workers.get(this).length === 0) {
                // avoid mem issues in long running workers:
                // terminate if it has processed a certain amount of data or it is idle for a certain time
                if (this.processed > 50) {
                    workers.delete(this);
                    this.terminate();
                } else {
                    setTimeout((self => (() => {
                        if (workers.get(self) && workers.get(self).length === 0) {
                            workers.delete(self);
                            self.terminate();
                        }
                    }))(this), 60000);
                }
            }
        };
        return worker;

    } else {
        let worker: IWorker = workers.keys().next().value;
        for (const key of workers.keys()) {
            if (!workers.get(key).length) {
                worker = key;
                break;
            }
            if (workers.get(worker).length > workers.get(key).length) {
                worker = key;
            }
        }
        return worker;
    }

};

class Decoder {

    decode(task: ITaskData, taskId: string = ''): Promise<ITaskResult> {
        const worker = getWorker();
        return new Promise((resolve, reject) => {
            workers.get(worker).push({ taskId: taskId, resolve, reject, ...task });
            if (worker.initialized) {
                worker.processed += task.data.byteLength / (1024 * 1024);
                worker.postMessage(task.data);
            }
        });
    }

    abort(taskId: string) {
        let tasks: IDecodingTask[] = [];
        for (const worker of workers.keys()) {
            tasks = [...tasks, ...workers.get(worker).filter(task => task.taskId === taskId)];
            workers.set(worker, workers.get(worker).filter(task => task.taskId !== taskId));
        }
        // reject in order
        tasks.sort((a, b) => a.userData.no - b.userData.no)
            .forEach(task => task.reject({ abort: true, userData: task.userData }))
    }

};

export default new Decoder();
