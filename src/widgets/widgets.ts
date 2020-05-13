import {
    DOMWidgetView, WidgetView
} from '@jupyter-widgets/base';
import * as THREE from 'three';

import '../../css/widget.css';

import decoder from './mesh-decoder';
import { PGLControls, LsystemControls } from './controls';
import { OrbitControls } from './orbit-controls';
import { IScene, IPGLControlsState, LsystemUnit, ILsystemControlsState, ILsystemScene } from './types';
import { SceneWidgetModel } from './models';
import { disposeScene } from './utilities';

const MIN_DELAY = 250;

export class PGLWidgetView extends DOMWidgetView {

    camera: THREE.PerspectiveCamera = null;
    scene: THREE.Scene = null;
    renderer: THREE.WebGLRenderer = null;
    plane: THREE.Mesh = null;
    light: THREE.DirectionalLight = null;
    camLight: THREE.DirectionalLight = null;
    axesHelper: THREE.AxesHelper = null;
    lightHelper: THREE.DirectionalLightHelper = null;
    cameraHelper: THREE.CameraHelper = null;
    orbitControl = null;

    containerEl: HTMLDivElement = null;

    sizeDisplay: number[];
    sizeWorld: number[];

    pglControls: PGLControls = null;
    pglControlsState: IPGLControlsState = null;
    pglControlsEl: HTMLDivElement = null;

    disposables: THREE.Scene[] = [];

    initialize(parameters: WidgetView.InitializeParameters) {
        super.initialize(parameters);
        this.sizeDisplay = parameters.model.attributes['size_display'];
        this.sizeWorld = parameters.model.attributes['size_world'];
    }

    render() {

        super.render();

        const initialState: IPGLControlsState = {
            axesHelper: this.model.get('axes_helper'),
            lightHelper: this.model.get('light_helper'),
            plane: this.model.get('plane'),
            fullscreen: false,
            autoRotate: false,
            showHeader: false,
            showControls: false
        };

        const [width, height] = this.sizeDisplay;
        this.containerEl = document.createElement('div');
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height
        const context = (canvas.getContext('webgl2', { alpha: false }) ||
            canvas.getContext('experimental-webgl', { alpha: false }) ||
            canvas.getContext('webgl', { alpha: false })) as WebGLRenderingContext;
        this.containerEl.appendChild(canvas);
        this.containerEl.setAttribute('class', 'pgl-jupyter-pgl-widget');
        this.el.appendChild(this.containerEl);

        this.pglControlsEl = document.createElement('div');
        this.pglControlsEl.setAttribute('class', 'pgl-jupyter-pgl-widget-controls');
        this.containerEl.appendChild(this.pglControlsEl);

        this.containerEl.addEventListener('contextmenu', ev => {
            ev.preventDefault();
            ev.stopPropagation();
            return false;
        });

        const [x_size, y_size, z_size] = this.sizeWorld;

        this.camera = new THREE.PerspectiveCamera(50, width / height, 0.01);
        this.camera.position.set(x_size, Math.max(x_size, z_size) * 1.5, z_size / 2);
        this.camera.lookAt(new THREE.Vector3(0, 0, 0));
        this.camera.up = new THREE.Vector3(0, 0, 1);

        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color('#cccccc');

        this.plane = new THREE.Mesh(
            new THREE.PlaneBufferGeometry(x_size, z_size),
            new THREE.MeshPhongMaterial({
                color: new THREE.Color(0xFFFFFF)
            })
        );
        this.plane.name = 'plane';
        this.plane.receiveShadow = true;
        this.plane.visible = initialState.plane;
        this.scene.add(this.plane);

        this.axesHelper = new THREE.AxesHelper(Math.max.apply(Math, [x_size, y_size, z_size]) / 2)
        this.axesHelper.visible = initialState.axesHelper;
        this.scene.add(this.axesHelper);

        this.scene.add(new THREE.AmbientLight(0xFFFFFF, 0.4));

        const lightBottom = new THREE.DirectionalLight(0xFFFFFF, 0.9);
        lightBottom.position.set(0, -y_size, 0);
        this.scene.add(lightBottom);
        const lightTop = new THREE.DirectionalLight(0xFFFFFF, 0.9);
        lightTop.position.set(0, y_size, 0);
        this.scene.add(lightTop);

        this.light = new THREE.DirectionalLight(0xFFFFFF, 0.9);
        this.light.shadow.bias = -0.001;
        this.light.castShadow = true;
        this.light.position.set(x_size / 2, y_size / 2, z_size / 2);
        this.light.target.position.set(0, 0, 0);
        this.light.shadow.camera.near = 0.01;
        this.light.shadow.camera.far = Math.sqrt(Math.pow(Math.sqrt(x_size * x_size + z_size * z_size), 2) + Math.pow(y_size, 2));
        this.light.shadow.camera.top = Math.sqrt(x_size * x_size + z_size * z_size) / 2;
        this.light.shadow.camera.bottom = -Math.sqrt(x_size * x_size + z_size * z_size) / 2;
        this.light.shadow.camera.left = -Math.sqrt(x_size * x_size + z_size * z_size) / 2;
        this.light.shadow.camera.right = Math.sqrt(x_size * x_size + z_size * z_size) / 2;
        this.scene.add(this.light);

        this.cameraHelper = new THREE.CameraHelper(this.light.shadow.camera);
        this.cameraHelper.visible = initialState.lightHelper;
        this.scene.add(this.cameraHelper);

        this.lightHelper = new THREE.DirectionalLightHelper(this.light);
        this.lightHelper.visible = initialState.lightHelper;
        this.scene.add(this.lightHelper);

        this.renderer = new THREE.WebGLRenderer({ canvas, context, antialias: true });
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(width, height);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.render(this.scene, this.camera);

        this.orbitControl = new OrbitControls(this.camera, this.renderer.domElement);
        this.orbitControl.enableZoom = true;
        this.orbitControl.addEventListener('change', () => {
            this.renderer.render(this.scene, this.camera)
        });
        this.renderer.render(this.scene, this.camera);
        this.orbitControl.target.set(0, 0, 0);
        this.orbitControl.update();

        this.pglControls = new PGLControls(initialState, {
            onFullscreenToggled: () => {
                if (document.fullscreenElement === this.containerEl) {
                    document.exitFullscreen();
                } else if (!document.fullscreenElement) {
                    this.containerEl.requestFullscreen();
                }
            },
            onAutoRotateToggled: (value: boolean) => {
                this.pglControlsState.autoRotate = value;
                if (this.orbitControl.autoRotate = this.pglControlsState.autoRotate) {
                    const rotate = () => {
                        const id = requestAnimationFrame(rotate);
                        if (!this.pglControlsState.autoRotate) {
                            window.cancelAnimationFrame(id)
                        }
                        this.orbitControl.update();
                        this.renderer.render(this.scene, this.camera);
                    };
                    rotate();
                }
            },
            onPlaneToggled: (value: boolean) => {
                this.pglControlsState.plane = value;
                this.plane.visible = this.pglControlsState.plane;
                this.renderer.render(this.scene, this.camera);
                this.model.set('plane', this.pglControlsState.plane);
                this.touch();
            },
            onAxesHelperToggled: (value: boolean) => {
                this.pglControlsState.axesHelper = value;
                this.axesHelper.visible = this.pglControlsState.axesHelper;
                this.renderer.render(this.scene, this.camera);
                this.model.set('axes_helper', this.pglControlsState.axesHelper);
                this.touch();
            },
            onLightHelperToggled: (value: boolean) => {
                this.pglControlsState.lightHelper = value;
                this.lightHelper.visible = this.pglControlsState.lightHelper;
                this.cameraHelper.visible = this.pglControlsState.lightHelper;
                this.renderer.render(this.scene, this.camera);
                this.model.set('light_helper', this.pglControlsState.lightHelper);
                this.touch();
            }
        }, this.pglControlsEl);
        this.pglControlsState = this.pglControls.state;

        this.containerEl.addEventListener('mouseover', () => this.pglControlsState.showHeader = true);
        this.containerEl.addEventListener('mouseout', () => this.pglControlsState.showHeader = false);

        this.listenTo(this.model, 'change:axes_helper', () => this.pglControls.evtHandlers.onAxesHelperToggled(
            this.model.get('axes_helper')
        ));
        this.listenTo(this.model, 'change:light_helper', () => this.pglControls.evtHandlers.onLightHelperToggled(
            this.model.get('light_helper')
        ));
        this.listenTo(this.model, 'change:plane', () => this.pglControls.evtHandlers.onPlaneToggled(
            this.model.get('plane')
        ));
        this.listenTo(this.model, 'change:size_display', () => {
            this.sizeDisplay = this.model.get('size_display') as number[];
            const [width, height] = this.sizeDisplay;
            this.resizeDisplay(width, height);
        });
        this.listenTo(this.model, 'change:size_world', this.resizeWorld);
        this.containerEl.onfullscreenchange = () => {
            this.pglControlsState.fullscreen = (document.fullscreenElement === this.containerEl);
            if (this.pglControlsState.fullscreen) {
                this.resizeDisplay(window.screen.width, window.screen.height);
            } else {
                const [width, height] = this.sizeDisplay;
                this.resizeDisplay(width, height);
            }
        }

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

    remove() {

        // TODO: use a context pool for all widget instances in a notebook?
        this.renderer.dispose();
        super.remove();

    }

}

export class SceneWidgetView extends PGLWidgetView {

    initialize(parameters: WidgetView.InitializeParameters) {
        super.initialize(parameters);

        // add required fns for dynamically added scenes after loading the notebook with saved widget state
        Object.keys(parameters.model.attributes).filter(key => key.startsWith('scene_')).forEach(key => {
            SceneWidgetModel.serializers[key] = {
                serialize: (scene, model) => {
                    return Object.keys(model.views).length ? scene : undefined;
                },
                deserialize: scene => scene
            };
            this.listenTo(this.model, `change:${key}`, ((key) => () => this.addScene(this.model.get(key)))(key));
        });

    }

    render() {

        super.render();

        this.scene_changed();
        this.listenTo(this.model, 'change:scene', this.scene_changed);
        this.listenTo(this.model, 'msg:custom', msg => {
            if ('new_trait' in msg) {
                const key = msg.new_trait.name;
                SceneWidgetModel.serializers[key] = {
                    serialize: (scene, model) => {
                        return Object.keys(model.views).length ? scene : undefined;
                    },
                    deserialize: scene => scene
                }
                this.listenTo(this.model, `change:${key}`, ((key) => () => this.addScene(this.model.get(key)))(key));
            }
        });

        // there wont be a change event for dynamically added attr after loading the notebook with saved widget state
        // if there are any we add them
        Object.keys(this.model.attributes).filter(key => key.startsWith('scene_')).forEach(key => {
            this.addScene(this.model.get(key));
        });

    }

    scene_changed() {

        this.addScene(this.model.get('scene') as IScene);

    }

    addScene(scene: IScene) {

        const { drc, offsets, position, scale } = scene;
        const drcs = offsets.map((begin, idx, arr) => {
            return drc.buffer.slice(begin, arr[idx + 1] || drc.buffer.byteLength);
        }).filter(drc => drc instanceof ArrayBuffer && !!drc.byteLength);

        if (drcs.length) {

            const scene = new THREE.Scene();

            decoder.decode({ drcs, userData: { position, scale } }).then(result => {

                const { results, userData: { position, scale } } = result;
                results.forEach(result => {
                    const { geometry, metaData, instances } = result;
                    let mesh: THREE.InstancedMesh | THREE.Mesh = null;
                    const material = new THREE.MeshStandardMaterial({
                        side: THREE.DoubleSide,
                        shadowSide: THREE.BackSide,
                        vertexColors: true,
                        roughness: 0.7
                    });
                    if (metaData.type === 'instanced_mesh') {
                        mesh = new THREE.InstancedMesh(geometry, material, instances.matrices.length);
                        for (let i = 0; i < instances.matrices.length; i++) {
                            (mesh as THREE.InstancedMesh).setMatrixAt(i, (new THREE.Matrix4() as any).set(...instances.matrices[i]));
                        }
                    } else if (metaData.type === 'mesh') {
                        mesh = new THREE.Mesh(geometry, material);
                    }
                    mesh.userData = metaData;
                    geometry.computeVertexNormals();

                    const [x, y, z] = position;

                    mesh.scale.multiplyScalar(scale);
                    mesh.position.set(x, y, z);
                    // mesh.rotation.x = -Math.PI / 2;
                    mesh.castShadow = true;
                    mesh.receiveShadow = true;

                    scene.add(mesh);
                });

                this.scene.add(scene);
                this.disposables.push(scene);
                this.renderer.render(this.scene, this.camera);
                this.orbitControl.update();

            }).catch(err => {
                throw err;
            });

        }

    }

    remove() {

        // TODO: dispose helpers etc.?
        this.disposables.forEach(scene => disposeScene(scene));

        super.remove();

    }

}

export class LsystemWidgetView extends PGLWidgetView {

    unit: LsystemUnit = LsystemUnit.M;

    lsystemScenes: {[key: number]: ILsystemScene} = {};

    initialize(parameters: WidgetView.InitializeParameters) {
        super.initialize(parameters);
    }

    removeScenes() {
        this.scene.remove(...this.scene.children
            .filter(obj => obj instanceof THREE.Scene)
            .map(obj => {
                obj.visible = false;
                return obj;
            }));
        this.disposables.forEach(scene => disposeScene(scene));
    }

    render() {

        super.render();

        const initialState: ILsystemControlsState = {
            animate: this.model.get('animate'),
            derivationStep: this.model.get('scene').derivationStep,
            derivationLength: this.model.get('lsystem').derivationLength,
            showControls: false,
            busy: 0,
            comm_live: this.model.comm_live
        };

        const controlsEl = document.createElement('div');
        controlsEl.setAttribute('class', 'pgl-jupyter-lsystem-widget-controls');
        this.containerEl.appendChild(controlsEl);

        const animation = (step) => {
            if (lsysState.animate) {
                const scene = this.lsystemScenes[step];
                if (scene) {
                    if (lsysState.busy && step - lsysState.derivationStep > 1) {
                        return setTimeout(() => animation(step), MIN_DELAY);
                    }
                    lsysState.derivationStep = step;
                    this.setSceneVisible(scene.id);
                } else {
                    lsysState.busy++;
                    this.send({ derive: step });
                }
                lsysState.animate = step + 1 < lsysState.derivationLength;
                setTimeout(() => animation(step + 1), MIN_DELAY);
            }
        }

        const controls = new LsystemControls(initialState, {
            onAnimateToggled: (animate: boolean) => {
                lsysState.animate = animate;
                if (animate) {
                    const next = lsysState.derivationStep + 1;
                    animation(next >= lsysState.derivationLength ? 0 : next);
                }
            },
            onDeriveClicked: (step: number) => {
                const scene = this.lsystemScenes[step];
                if (scene) {
                    lsysState.derivationStep = step;
                    this.setSceneVisible(scene.id);
                } else {
                    lsysState.busy++;
                    this.send({ derive: step });
                }
            },
            onRewindClicked: () => {
                this.lsystemScenes = [];
                lsysState.busy = 1;
                lsysState.derivationStep = 0;
                this.send({ rewind: true });
                this.removeScenes();
                this.renderer.render(this.scene, this.camera);
            }
        }, controlsEl);
        const lsysState = controls.state;

        this.containerEl.addEventListener('mouseover', () => lsysState.showControls = true);
        this.containerEl.addEventListener('mouseout', () => lsysState.showControls = false);

        this.unit = this.model.get('unit');
        const scene = this.model.get('scene') as ILsystemScene;
        const drcs = scene.offsets.map((begin, idx, arr) => {
            return scene.drc.buffer.slice(begin, arr[idx + 1] || scene.drc.buffer.byteLength);
        })
        decoder.decode({ drcs, userData: { id: scene.id } })
            .then(res => {
                const { results, userData: { id } } = res;
                this.lsystemScenes[scene.derivationStep] = scene;
                this.addScene(id, results);
            })
            .catch(err => console.log(err));

        if (lsysState.animate) {
            this.send({ derive: true });
        }
        this.listenTo(this.model, 'change:unit', () => {
            this.unit = this.model.get('unit')
        });
        this.listenTo(this.model, 'change:lsystem', () => {
            lsysState.derivationLength = this.model.get('lsystem').derivationLength;
        });
        this.listenTo(this.model, 'comm_live_update', () => {
            lsysState.comm_live = this.model.comm_live;
        });

        this.listenTo(this.model, 'change:scene', () => {
            const scene = this.model.get('scene') as ILsystemScene;
            this.lsystemScenes[scene.derivationStep] = scene;
            const drcs = scene.offsets.map((begin, idx, arr) => {
                return scene.drc.buffer.slice(begin, arr[idx + 1] || scene.drc.buffer.byteLength);
            })
            setTimeout(() => {
                decoder.decode({ drcs, userData: { step: scene.derivationStep } }, true)
                    .then(res => {
                        const { results, userData: { step } } = res;
                        setTimeout(((step, mesh) => {
                            return () => {
                                this.addScene(step, mesh);
                                lsysState.derivationStep = step;
                                lsysState.busy--;
                            };
                        })(step, results), MIN_DELAY);
                    })
                    .catch(err => console.log(err));
            }, 1000);
        });

    }

    setSceneVisible(id: number) {
        this.scene.children.forEach(obj => {
            if (obj.name === 'lsystem') {
                obj.visible = obj.userData.id === id;
            }
        });
        this.renderer.render(this.scene, this.camera);
    }

    addScene(id: number, meshs, position = [0, 0, 0]) {

        const scene = new THREE.Scene();
        scene.userData = { id };
        scene.name = 'lsystem';
        meshs.forEach(result => {
            const { geometry, metaData, instances } = result;
            let mesh: THREE.InstancedMesh | THREE.Mesh = null;
            const material = new THREE.MeshStandardMaterial({
                side: THREE.DoubleSide,
                shadowSide: THREE.BackSide,
                vertexColors: true,
                roughness: 0.7
            });
            if (metaData.type === 'instanced_mesh') {
                mesh = new THREE.InstancedMesh(geometry, material, instances.matrices.length);
                for (let i = 0; i < instances.matrices.length; i++) {
                    (mesh as THREE.InstancedMesh).setMatrixAt(i, (new THREE.Matrix4() as any).set(...instances.matrices[i]));
                }
            } else if (metaData.type === 'mesh') {
                mesh = new THREE.Mesh(geometry, material);
            }
            mesh.userData = {
                id,
                metaData
            };
            mesh.name = 'lsystem';
            geometry.computeVertexNormals();

            const [x, y, z] = position;
            const scale = this.unit === LsystemUnit.CM ? 0.1 : (this.unit === LsystemUnit.MM ? 0.01 : 1);

            mesh.scale.multiplyScalar(scale);
            mesh.position.set(x, y, z);
            mesh.castShadow = true;
            mesh.receiveShadow = true;

            scene.add(mesh);
        });

        this.scene.add(scene);
        this.setSceneVisible(id);
        this.disposables.push(scene);
        this.renderer.render(this.scene, this.camera);
        this.orbitControl.update();

    }

    remove() {

        // TODO: dispose helpers etc.?
        this.disposables.forEach(scene => disposeScene(scene));

        super.remove();

    }

}
