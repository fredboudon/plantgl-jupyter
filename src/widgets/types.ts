export interface IScene {
    drc: DataView;
    offsets: number[];
    scene: string;
    position: number[];
    scale: number;
}

export interface ILsystemScene extends IScene {
    derivationStep: number;
    id: number;
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

export interface IPGLControlState {
    axesHelper: boolean;
    lightHelper: boolean;
    plane: boolean;
    fullscreen: boolean;
    autoRotate: boolean;
    showHeader: boolean;
    showControls: boolean;
}

export interface IPGLControlHandlers {
    onAutoRotateToggled: Function;
    onFullscreenToggled: Function;
    onPlaneToggled: Function;
    onAxesHelperToggled: Function;
    onLightHelperToggled: Function;
}

export interface ILsystemControlState {
    animate: boolean;
    derivationStep: number;
    derivationLength: number;
    showControls: boolean;
    busy: number;
}

export interface ILsystemControlHandlers {
    onAnimateToggled: Function;
    onDeriveClicked: Function;
    onRewindClicked: Function;
}

export enum Unit {
    m = 0,
    cm = 1,
    mm = 2
}
