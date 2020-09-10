export interface IScene {
    id: string;
    data: DataView;
    scene: string;
    position: number[];
    scale: number;
}

export interface ILsystemScene extends IScene {
    derivationStep: number;
}

export interface IDecodingTask extends ITaskData {
    bucketID: string;
    reject(arg?: any): any;
    resolve(arg: ITaskResult): any;
}

export interface ITaskData {
    data: ArrayBuffer;
    userData?: any;
}

export interface ITaskResult {
    results: (THREE.Mesh | THREE.InstancedMesh)[];
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
    pyFeed: number;
    comm_live: boolean;
}

export interface ILsystemControlsHandlers {
    onAnimateToggled: Function;
    onDeriveClicked: Function;
    onRewindClicked: Function;
}

export enum LsystemUnit {
    M = 0,
    DM = 1,
    CM = 2,
    MM = 3
}

export interface IMaterial {
    ambient: number[],
    specular: number[],
    emission: number[],
    diffuse: number,
    shininess: number,
    transparency: number
}

export interface IGeom {
    index: ArrayBuffer,
    // color: ArrayBuffer,
    position: ArrayBuffer,
    // normal: ArrayBuffer,
    instances: ArrayBuffer
    isInstanced: boolean,
    material: IMaterial
}
