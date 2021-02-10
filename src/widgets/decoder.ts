import pgljs from '../pgljs/dist/index.js';
import draco from 'draco-web-decoder';
import { IDecodingTask, ITaskData, ITaskResult, IWorker } from './interfaces';
import { isDraco } from './utilities';

let MAX_WORKER = 10;
const workers: Map<IWorker, IDecodingTask[]> = new Map();

const getWorker = (isDraco: boolean): IWorker => {

    const workers_ = Array.from(workers.keys()).filter(w => w.isDraco === isDraco);
    const avg = workers_.length ? workers_.reduce((n, w) => n + workers.get(w).length, 0) / workers_.length : 0;

    if ((workers_.length === 0 || avg >= 1) && workers_.length < MAX_WORKER) {
        const worker = isDraco ? draco() : pgljs();
        worker.isDraco = isDraco;
        workers.set(worker, []);
        worker.onerror = function (evt) {
            console.log(evt);
        }
        worker.onmessage = function(this: IWorker, evt) {

            if (evt.data && 'initialized' in evt.data) {
                if (evt.data.initialized) {
                    workers.get(this).forEach(task => this.postMessage(this.isDraco ? { drc: task.data } : task.data));
                    this.initialized = true;
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
                        if (this.isDraco) {
                            resolve({ geoms: [{
                                index: evt.data[0].index.array,
                                position: evt.data[0].attributes.find(attr => attr.name === 'position').array,
                                color: evt.data[0].attributes.find(attr => attr.name === 'color').array,
                            }], userData });
                        } else {
                            resolve({ ...evt.data, userData });
                        }
                    }
                }
            }

            if (workers.get(this).length === 0) {
                setTimeout((self => (() => {
                    if (workers.get(self) && workers.get(self).length === 0) {
                        workers.delete(self);
                        self.terminate();
                    }
                }))(this), 60000);
            }
        };
        return worker;

    } else {
        let worker: IWorker = workers_[0];
        for (let i = 1; i < workers_.length; i++) {
            if (workers.get(workers_[i]).length === 0) {
                worker = workers_[i];
                break;
            }
            if (workers.get(worker).length > workers.get(workers_[i]).length) {
                worker = workers_[i];
            }
        }
        return worker;
    }

};

class Decoder {

    decode(task: ITaskData, taskId: string = ''): Promise<ITaskResult> {
        const worker = getWorker(isDraco(task.data));
        return new Promise((resolve, reject) => {
            workers.get(worker).push({ taskId: taskId, resolve, reject, ...task });
            if (worker.initialized) {
                worker.postMessage(worker.isDraco ? { drc: task.data } : task.data);
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
