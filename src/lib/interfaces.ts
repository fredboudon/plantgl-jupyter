export interface IScene {
    drc: DataView;
    offsets: number[];
    scene: string;
    position: number[];
    scale: number;
}

export interface IDecodingTask extends ITaskData {
    reject: Function;
    resolve: Function;
}

export interface ITaskData {
    drcs: ArrayBuffer[];
    userData: any;
}

export interface ITaskResult {
    results: {
        geometry: THREE.BufferGeometry;
        instances: { matrices: number[][], metaData: { [key: string]: any } };
        metaData: {[key:string]: any };
    }[];
    userData: any;
}

export interface IControlState {
    axesHelper: boolean;
    lightHelper: boolean;
    plane: boolean;
    fullscreen: boolean;
    autoRotate: boolean;
    showHeader: boolean;
    showControls: boolean;
}

export interface IControlHandlers {
    onAutoRotateToggled: Function;
    onFullscreenToggled: Function;
    onPlaneToggled: Function;
    onAxesHelperToggled: Function;
    onLightHelperToggled: Function;
}

export enum Unit {
    m = 0,
    cm = 1,
    mm = 2
}
