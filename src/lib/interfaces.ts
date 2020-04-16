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
