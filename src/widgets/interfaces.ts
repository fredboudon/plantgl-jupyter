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
    taskId: string;
    reject(arg?: any): any;
    resolve(arg: ITaskResult): any;
}

export interface ITaskData {
    data: ArrayBuffer;
    userData?: any;
}

export interface IMeshOptions {
    wireframe: boolean;
    flatShading: boolean;
}

export interface ITaskResult {
    geoms: IGeom[];
    bbox: number[][];
    userData: any;
}

export interface IPGLControlsState {
    axesHelper: boolean;
    lightHelper: boolean;
    plane: boolean;
    flatShading: boolean;
    wireframe: boolean;
    fullscreen: boolean;
    autoRotate: boolean;
    showHeader: boolean;
    showControls: boolean;
}

export interface IPGLProgressState {
    busy: number;
}

export interface IPGLControlsHandlers {
    onAutoRotateToggled: Function;
    onFullscreenToggled: Function;
    onPlaneToggled: Function;
    onAxesHelperToggled: Function;
    onLightHelperToggled: Function;
    onFlatShadingToggled: Function;
    onWireframeToggled: Function;
}

export interface ILsystemControlsState {
    animate: boolean;
    derivationStep: number;
    derivationLength: number;
    isMagic: boolean;
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

export interface IMaterial {
    color: number[],
    specular: number[],
    emission: number[],
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
