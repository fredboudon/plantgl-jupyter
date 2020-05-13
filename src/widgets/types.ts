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

export interface IPGLControlsState {
    axesHelper: boolean;
    lightHelper: boolean;
    plane: boolean;
    fullscreen: boolean;
    autoRotate: boolean;
    showHeader: boolean;
    showControls: boolean;

}

export interface IPGLControlsHandlers {
    onAutoRotateToggled: Function;
    onFullscreenToggled: Function;
    onPlaneToggled: Function;
    onAxesHelperToggled: Function;
    onLightHelperToggled: Function;
}

export interface ILsystemControlsState {
    animate: boolean;
    derivationStep: number;
    derivationLength: number;
    showControls: boolean;
    busy: number;
    comm_live: boolean;
}

export interface ILsystemControlsHandlers {
    onAnimateToggled: Function;
    onDeriveClicked: Function;
    onRewindClicked: Function;
}

export enum LsystemUnit {
    M = 0,
    CM = 1,
    MM = 2
}
