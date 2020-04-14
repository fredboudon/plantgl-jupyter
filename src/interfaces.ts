export interface IScene {
    drc: DataView;
    scene: string;
    position: number[];
    scale: number;
}

export interface IDecodingTask extends ITaskData {
    reject: Function;
    resolve: Function;
}

export interface ITaskData {
    drc: ArrayBuffer;
    userData: any;
}

export interface ITaskResult {
    geometry: THREE.BufferGeometry;
    userData: any;
}
