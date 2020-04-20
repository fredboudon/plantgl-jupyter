import {
    DOMWidgetModel, DOMWidgetView, ISerializers, WidgetView
} from '@jupyter-widgets/base';

import {
    MODULE_NAME, MODULE_VERSION
} from '../version';

import '../../css/widget.css';

import decoder from './mesh-decoder';
import * as THREE from 'three';
import { OrbitControls } from './orbit-controls';
import { IScene, IControlState } from './interfaces';
import Controls from './controls';


export class SceneWidgetModel extends DOMWidgetModel {

    defaults() {
        return {
            ...super.defaults(),
            _model_name: SceneWidgetModel.model_name,
            _model_module: SceneWidgetModel.model_module,
            _model_module_version: SceneWidgetModel.model_module_version,
            _view_name: SceneWidgetModel.view_name,
            _view_module: SceneWidgetModel.view_module,
            _view_module_version: SceneWidgetModel.view_module_version,
            scene: null,
            size_display: [400, 400],
            size_world: [10, 10, 10],
            axes_helper: false,
            light_helper: false,
            plane: true
        };
    }

    static serializers: ISerializers = {
        ...DOMWidgetModel.serializers,
        scene: {
            serialize: scene => scene, // async serialization?
            deserialize: scene => scene
        }
    }

    static model_name = 'SceneWidgetModel';
    static model_module = MODULE_NAME;
    static model_module_version = MODULE_VERSION;
    static view_name = 'SceneWidgetView';
    static view_module = MODULE_NAME;
    static view_module_version = MODULE_VERSION;

}

export class SceneWidgetView extends DOMWidgetView {

    camera: THREE.PerspectiveCamera = null;
    scene: THREE.Scene = null;
    renderer: THREE.WebGLRenderer = null;
    plane: THREE.Mesh = null;
    light: THREE.DirectionalLight = null;
    axesHelper: THREE.AxesHelper = null;
    lightHelper: THREE.DirectionalLightHelper = null;
    cameraHelper: THREE.CameraHelper = null;
    orbitControl = null;
    containerEl: HTMLDivElement = null;
    overlay: HTMLDivElement = null;
    header: HTMLDivElement = null;
    controlsEl: HTMLDivElement = null;
    canvas: HTMLCanvasElement= null;

    disposables: THREE.Object3D[] = [];

    sizeDisplay: number[];
    sizeWorld: number[];

    stateControls: Controls = null;
    state: IControlState = null;

    initialize(parameters: WidgetView.InitializeParameters) {
        super.initialize(parameters);
        this.sizeDisplay = parameters.model.attributes['size_display'];
        this.sizeWorld = parameters.model.attributes['size_world'];

        // add required fns for dynamically added scenes after loading the notebook with saved widget state
        Object.keys(parameters.model.attributes).filter(key => key.startsWith('scene_')).forEach(key => {
            SceneWidgetModel.serializers[key] = {
                serialize: scene => scene,
                deserialize: scene => scene
            };
            this.listenTo(this.model, `change:${key}`, ((key) => () => this.addScene(this.model.get(key)))(key));
        });

    }

    render() {

        const initialState: IControlState = {
            axesHelper: this.model.get('axes_helper'),
            lightHelper: this.model.get('light_helper'),
            plane: this.model.get('plane'),
            fullscreen: false,
            autoRotate: false,
            showHeader: false,
            showControls: false
        };

        if (this.renderer) {
            throw new Error('why is there a renderer?');
        }

        super.render();
        this.containerEl = document.createElement('div');
        this.containerEl.setAttribute('class', 'pgl-jupyter-scene-widget');
        this.el.appendChild(this.containerEl);
        this.controlsEl = document.createElement('div');
        this.controlsEl.setAttribute('class', 'pgl-jupyter-scene-widget-controls');
        this.containerEl.appendChild(this.controlsEl);

        this.containerEl.addEventListener('contextmenu', ev => {
            ev.preventDefault();
            ev.stopPropagation();
            return false;
        });

        const [width, height] = this.sizeDisplay;
        const [x_size, y_size, z_size] = this.sizeWorld;

        this.camera = new THREE.PerspectiveCamera(50, width / height, 0.01);
        this.camera.position.set(x_size, Math.max(x_size, z_size) * 1.5, z_size / 2);
        this.camera.lookAt(new THREE.Vector3(0, 0, 0));

        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color('#888888');

        this.plane = new THREE.Mesh(
            new THREE.PlaneBufferGeometry(x_size, z_size),
            new THREE.MeshStandardMaterial({
                color: new THREE.Color('#c4c2c2'),
                roughness: 0.6
            })
        );
        this.plane.name = 'plane';
        this.plane.rotation.x = -Math.PI / 2;
        this.plane.receiveShadow = true;
        this.plane.visible = initialState.plane;
        this.scene.add(this.plane);

        this.axesHelper = new THREE.AxesHelper(Math.max.apply(Math, [x_size, y_size, z_size]) / 2)
        this.axesHelper.visible = initialState.axesHelper;
        this.scene.add(this.axesHelper);

        this.scene.add(new THREE.HemisphereLight(0xFFFFFF, 0xAAAAAA, 0.1));

        this.light = new THREE.DirectionalLight(0xFFFFFF, 1);
        this.light.shadow.bias = -0.001;
        this.light.castShadow = true;
        this.light.position.set(x_size / 2, y_size / 2, z_size / 2);
        this.light.target.position.set(0, 0, 0);
        this.light.shadow.camera.near = 0.01;
        this.light.shadow.camera.far = Math.sqrt(x_size * x_size + z_size * z_size);
        this.light.shadow.camera.top = y_size / 2;
        this.light.shadow.camera.bottom = -y_size / 2;
        this.light.shadow.camera.left = -Math.sqrt(x_size * x_size + z_size * z_size) / 2;
        this.light.shadow.camera.right = Math.sqrt(x_size * x_size + z_size * z_size) / 2;
        this.light.shadow.bias = -0.0001;
        this.scene.add(this.light);

        this.cameraHelper = new THREE.CameraHelper(this.light.shadow.camera);
        this.cameraHelper.visible = initialState.lightHelper;
        this.scene.add(this.cameraHelper);

        this.lightHelper = new THREE.DirectionalLightHelper(this.light);
        this.lightHelper.visible = initialState.lightHelper;
        this.scene.add(this.lightHelper);

        const camLight = new THREE.DirectionalLight(0xFFFFFF, 0.5);
        this.scene.add(camLight);

        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(width, height);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.canvas = this.renderer.domElement;
        this.containerEl.appendChild(this.canvas);
        camLight.position.copy(this.camera.position);
        this.renderer.render(this.scene, this.camera);

        this.orbitControl = new OrbitControls(this.camera, this.renderer.domElement);
        this.orbitControl.enableZoom = true;
        this.orbitControl.addEventListener('change', () => {
            camLight.position.copy(this.camera.position);
            this.renderer.render(this.scene, this.camera)
        });
        this.renderer.render(this.scene, this.camera);
        this.orbitControl.target.set(0, 0, 0);
        this.orbitControl.update();

        this.stateControls = new Controls(initialState, this.header, this.controlsEl, {
            onFullscreenToggled: () => {
                if (document.fullscreenElement === this.containerEl) {
                    document.exitFullscreen();
                } else if (!document.fullscreenElement) {
                    this.containerEl.requestFullscreen();
                }
            },
            onAutoRotateToggled: (value) => {
                this.state.autoRotate = value;
                if (this.orbitControl.autoRotate = this.state.autoRotate) {
                    const rotate = () => {
                        const id = requestAnimationFrame(rotate);
                        if (!this.state.autoRotate) {
                            window.cancelAnimationFrame(id)
                        }
                        this.orbitControl.update();
                        this.renderer.render(this.scene, this.camera);
                    };
                    rotate();
                }
            },
            onPlaneToggled: (value) => {
                this.state.plane = value;
                this.plane.visible = this.state.plane;
                this.renderer.render(this.scene, this.camera);
                this.model.set('plane', this.state.plane);
                this.touch();
            },
            onAxesHelperToggled: (value) => {
                this.state.axesHelper = value;
                this.axesHelper.visible = this.state.axesHelper;
                this.renderer.render(this.scene, this.camera);
                this.model.set('axes_helper', this.state.axesHelper);
                this.touch();
            },
            onLightHelperToggled: (value) => {
                this.state.lightHelper = value;
                this.lightHelper.visible = this.state.lightHelper;
                this.cameraHelper.visible = this.state.lightHelper;
                this.renderer.render(this.scene, this.camera);
                this.model.set('light_helper', this.state.lightHelper);
                this.touch();
            }
        });
        this.state = this.stateControls.state;

        this.containerEl.addEventListener('mouseover', () => this.state.showHeader = true);
        this.containerEl.addEventListener('mouseout', () => this.state.showHeader = false);

        this.scene_changed();
        this.listenTo(this.model, 'change:axes_helper', () => this.stateControls.evtHandlers.onAxesHelperToggled(
            this.model.get('axes_helper')
        ));
        this.listenTo(this.model, 'change:light_helper', () => this.stateControls.evtHandlers.onLightHelperToggled(
            this.model.get('light_helper')
        ));
        this.listenTo(this.model, 'change:plane', () => this.stateControls.evtHandlers.onPlaneToggled(
            this.model.get('plane')
        ));
        this.listenTo(this.model, 'change:size_display', () => {
            this.sizeDisplay = this.model.get('size_display') as number[];
            const [width, height] = this.sizeDisplay;
            this.resizeDisplay(width, height);
        });
        this.listenTo(this.model, 'change:size_world', this.resizeWorld);
        this.listenTo(this.model, 'change:scene', this.scene_changed);
        this.listenTo(this.model, 'msg:custom', msg => {
            if ('new_trait' in msg) {
                const key = msg.new_trait.name;
                SceneWidgetModel.serializers[key] = {
                    serialize: scene => scene,
                    deserialize: scene => scene
                }
                this.listenTo(this.model, `change:${key}`, ((key) => () => this.addScene(this.model.get(key)))(key));
            }
        });
        this.containerEl.onfullscreenchange = () => {
            this.state.fullscreen = (document.fullscreenElement === this.containerEl);
            if (this.state.fullscreen) {
                this.resizeDisplay(window.screen.width, window.screen.height);
            } else {
                const [width, height] = this.sizeDisplay;
                this.resizeDisplay(width, height);
            }
        }
        // there wont be a change event for dynamically added attr after loading the notebook with saved widget state
        // if there are any we add them
        Object.keys(this.model.attributes).filter(key => key.startsWith('scene_')).forEach(key => {
            this.addScene(this.model.get(key));
        });

    }

    resizeDisplay(width, height) {

        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
        this.renderer.render(this.scene, this.camera);
        this.orbitControl.update();

    }

    resizeWorld() {
        const size = this.model.get('size_world');
    }

    scene_changed() {

        const { drc, position, scale } = this.model.get('scene') as IScene;
        this.addMesh(drc.buffer, position, scale);

    }

    addScene(scene: IScene) {

        const { drc, position, scale } = scene;
        this.addMesh(drc.buffer, position, scale);

    }

    addMesh(drc: ArrayBuffer, position=[0, 0, 0], scale=1) {

        if (!(drc instanceof ArrayBuffer) || !drc.byteLength)
            return;

        decoder.decode({ drc, userData: { position, scale }}).then(result => {

            const { geometry, userData: { position, scale } } = result;

            geometry.computeVertexNormals();

            const [x, y, z] = position;
            const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({
                side: THREE.DoubleSide,
                shadowSide: THREE.BackSide,
                vertexColors: true,
                roughness: 0.7
            }));
            mesh.scale.multiplyScalar(scale);
            mesh.position.set(x, y, z);
            mesh.rotation.x = -Math.PI / 2;
            mesh.castShadow = true;
            mesh.receiveShadow = true;

            this.scene.add(mesh);
            this.renderer.render(this.scene, this.camera);
            this.orbitControl.update();
            this.disposables.push(mesh);

            }).catch(err => {
                throw err;
            });

    }

    remove() {

        // TODO: dispose helpers etc.?
        this.disposables.forEach(d => {
            if (d instanceof THREE.Mesh) {
                d.geometry.dispose();
                if (Array.isArray(d.material)) {
                    d.material.forEach(m => m.dispose());
                } else {
                    d.material.dispose();
                }
            }
        });
        this.renderer.dispose();
        this.renderer.forceContextLoss();

    }

}
