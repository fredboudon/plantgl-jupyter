import '../../css/widget.css';
import {
    DOMWidgetView, WidgetView
} from '@jupyter-widgets/base';
import decoder from './decoder';
import { PGLControls, LsystemControls, PGLProgress } from './controls';
import {
    IScene,
    IPGLControlsState,
    ILsystemControlsState,
    ILsystemScene,
    ITaskResult, IPGLProgressState
} from './interfaces';
import { THREE, OrbitControls, disposeScene, meshify } from './utilities';
import { SCALES, LsystemUnit } from './consts';

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
    sizeWorld: number;
    isMagic: boolean;

    pglControls: PGLControls = null;
    pglControlsState: IPGLControlsState = null;
    pglControlsEl: HTMLDivElement = null;

    pglProgressState: IPGLProgressState = null;

    isDetached = false;
    mediaRecorder = null;
    mediaData = []

    initialize(parameters: WidgetView.InitializeParameters) {
        super.initialize(parameters);
        this.sizeDisplay = parameters.model.attributes['size_display'];
        this.sizeWorld = parameters.model.attributes['size_world'];
        this.isMagic = parameters.model.attributes['is_magic'];
    }

    render() {
        super.render();

        const initialState: IPGLControlsState = {
            axesHelper: this.model.get('axes_helper'),
            lightHelper: this.model.get('light_helper'),
            plane: this.model.get('plane'),
            flatShading: false,
            wireframe: false,
            fullscreen: false,
            autoRotate: false,
            showHeader: false,
            showControls: false,
            capturingVideo: false
        };

        const [width, height] = this.sizeDisplay;
        this.pWidget.addClass('pgl-widget');
        this.containerEl = document.createElement('div');
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
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

        const progressEl = document.createElement('div');
        progressEl.setAttribute('class', 'pgl-jupyter-pgl-widget-progress');
        this.containerEl.appendChild(progressEl);
        const pglProgress = new PGLProgress({ busy: 0 }, progressEl);
        this.pglProgressState = pglProgress.state;

        const x_size = this.sizeWorld;
        const y_size = this.sizeWorld;
        const z_size = this.sizeWorld;

        this.camera = new THREE.PerspectiveCamera(50, width / height, 0.01);
        this.camera.position.set(x_size / 2, y_size, z_size);
        this.camera.lookAt(new THREE.Vector3(0, 0, 0));
        this.camera.up = new THREE.Vector3(0, 0, 1);

        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color('#9c9c9c');

        this.plane = new THREE.Mesh(
            new THREE.PlaneBufferGeometry(x_size, y_size),
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

        const lightBottom = new THREE.DirectionalLight(0xFFFFFF, 0.75);
        lightBottom.position.set(0, -z_size, 0);
        this.scene.add(lightBottom);
        const lightTop = new THREE.DirectionalLight(0xFFFFFF, 0.75);
        lightTop.position.set(0, z_size, 0);
        this.scene.add(lightTop);

        this.light = new THREE.DirectionalLight(0xFFFFFF, 1);
        this.light.shadow.bias = -0.0018
        this.light.castShadow = true;
        this.light.position.set(x_size / 2, y_size / 2, Math.max(x_size, y_size) / 2);
        this.light.target.position.set(0, 0, 0);
        this.light.shadow.camera.up = new THREE.Vector3(0, 0, 1);
        this.light.shadow.camera.near = 0.01;
        this.light.shadow.camera.far = Math.sqrt(Math.pow(Math.sqrt(x_size * x_size + y_size * y_size), 2) + Math.pow(z_size, 2));
        this.light.shadow.camera.top = Math.sqrt(x_size * x_size + y_size * y_size) / 2;
        this.light.shadow.camera.bottom = -Math.sqrt(x_size * x_size + y_size * y_size) / 2;
        this.light.shadow.camera.left = -Math.sqrt(x_size * x_size + y_size * y_size) / 2;
        this.light.shadow.camera.right = Math.sqrt(x_size * x_size + y_size * y_size) / 2;
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

        // @ts-ignore
        this.mediaRecorder = new MediaRecorder(this.renderer.domElement.captureStream(), {
            mimeType: 'video/webm'
        });
        this.mediaRecorder.ondataavailable = (evt) => this.mediaData.push(evt.data);
        this.mediaRecorder.onstop = () => {
            const url = URL.createObjectURL(new Blob(this.mediaData, { type: "video/webm" }));
            this.download(url, 'webm');
            this.mediaData = []
        };

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
                        const [x, y, z] = this.camera.position.toArray();
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
            },
            onFlatShadingToggled: (value: boolean) => {
                this.pglControlsState.flatShading = value;
                this.scene.children.forEach(child => {
                    if (child instanceof THREE.Scene) {
                        child.children.forEach(child => {
                            if (child instanceof THREE.Mesh || child instanceof THREE.InstancedMesh) {
                                if (Array.isArray(child.material)) {
                                    child.material.forEach(material => {
                                        material.flatShading = value;
                                        material.needsUpdate = true;
                                    });
                                } else {
                                    child.material.flatShading = value;
                                    child.material.needsUpdate = true;
                                }
                            }
                        });
                    }
                });
                this.renderer.render(this.scene, this.camera);
            },
            onWireframeToggled: (value: boolean) => {
                this.pglControlsState.wireframe = value;
                this.scene.children.forEach(child => {
                    if (child instanceof THREE.Scene) {
                        child.children.forEach(child => {
                            if (child instanceof THREE.Mesh || child instanceof THREE.InstancedMesh) {
                                if (Array.isArray(child.material)) {
                                    child.material.forEach(material => {
                                        material.wireframe = value;
                                        child.material.needsUpdate = true;
                                    });
                                } else {
                                    child.material.wireframe = value;
                                    child.material.needsUpdate = true;
                                }
                            }
                        });
                    }
                });
                this.renderer.render(this.scene, this.camera);
            },
            onCaptureVideoClicked: (capture: boolean) => {
                this.pglControlsState.capturingVideo = capture;
                if (capture) {
                    this.mediaRecorder.start();
                } else {
                    this.mediaRecorder.stop();
                }
            },
            onCaptureImageClicked: () => {
                this.renderer.render(this.scene, this.camera);
                this.download(this.renderer.domElement.toDataURL('image/png'), 'png');
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
        // this.listenTo(this.model, 'change:size_world', this.resizeWorld);
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

    download(objectUrl: string, suffix: string) {
        const a = document.createElement('a');
        a.href = objectUrl;
        a.download = `${(new Date(Date.now()).toISOString())}.${suffix}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(objectUrl)
    }

    resizeDisplay(width, height) {
        if (width > 0 && height > 0) {
            this.camera.aspect = width / height;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(width, height);
            this.renderer.render(this.scene, this.camera);
            this.orbitControl.update();
        }
    }

    processPhosphorMessage(msg) {
        super.processPhosphorMessage(msg);
        switch (msg.type) {
            case 'resize':
                if (this.isDetached) {
                    const { width, height } = this.containerEl.getBoundingClientRect();
                    this.resizeDisplay(width, height - 5);
                }
                break;
            case 'after-attach':
                if (this.el.closest('.jp-LinkedOutputView') && !this.isMagic) {
                    this.pWidget.addClass('pgl-resizable');
                    this.containerEl.classList.add('pgl-resizable');
                    this.isDetached = true;
                    const output = this.containerEl.closest('.jp-OutputArea') as HTMLElement;
                    if (output) {
                        output.style.overflow = 'hidden';
                    }

                }
                break;
            default:
                break;
        }
    }

    // resizeWorld() {
    //     const size = this.model.get('size_world');
    // }

    fitBounds(bbox: number[][]) {

        this.orbitControl.target = new THREE.Vector3(
            0,
            (bbox[0][1] + bbox[1][1]) / 2,
            (bbox[0][2] + bbox[1][2]) / 2
        );

        this.camera.position.set(
            Math.max((bbox[1][1] - bbox[0][1]), (bbox[1][2] - bbox[0][2])) * 2,
            (bbox[0][1] + bbox[1][1]) / 2,
            (bbox[0][2] + bbox[1][2]) / 2
        );

        this.camera.updateProjectionMatrix();
        this.renderer.render(this.scene, this.camera);
        this.orbitControl.update();

    }

    remove() {
        // TODO: use a context pool for all widget instances in a notebook?
        this.renderer.dispose();
        super.remove();
    }

}

export class SceneWidgetView extends PGLWidgetView {

    in = 0;
    out = 0;
    queue = []
    interval = null

    initialize(parameters: WidgetView.InitializeParameters) {
        super.initialize(parameters);
    }

    render() {
        super.render();
        this.decode(this.model.get('scenes') as IScene[]);
        this.listenTo(this.model, 'change:scenes', () => {
            this.decode(this.model.get('scenes') as IScene[]);
        });
    }

    updateProgress() {
        this.pglProgressState.busy = 1 - (this.out / this.in);
    }

    decode(scenes: IScene[]) {

        if (!this.interval) {
            this.interval = (() => {
                return setInterval(() => {
                    if (this.queue.length > 0 && this.queue[0].result) {
                        const render = this.queue.shift()
                        this.renderScene(render.result, render.keep)
                    }
                }, 10)
            })();
        }


        const keep = scenes.map(s => s.id)
        // ignore scenes that are already rendered or still being decoded
        const toDecode = scenes.filter(scene => !this.scene.getObjectByName(scene.id) && !this.queue.some(q => q.id === scene.id));
        if (toDecode.length > 0) {
            this.in = this.in - this.out;
            this.out = 0;
            toDecode.forEach(scene => {
                const { id, data, position, scale } = scene;
                this.queue.push({
                    id,
                    result: null,
                    keep
                })
                this.in++;
                this.updateProgress();
                decoder.decode({ data: data.buffer, userData: { position, scale, id } })
                    .then(result => {
                        for (let i = 0; i < this.queue.length; i++) {
                            if (this.queue[i].id === result.userData.id) {
                                this.queue[i].result = result
                                break;
                            }
                        }
                    }) // TODO: remove from queue on error
                    .catch(err => console.log(err));
            })

        }

    }

    renderScene(result: ITaskResult, keep: string[]) {

        const scene = new THREE.Scene();
        const { geoms: results, userData: { position, scale, id } } = result;
        const [x, y, z] = position;

        const toRemove = this.scene.children.filter(obj => {
            return obj instanceof THREE.Scene && keep.indexOf(obj.name) === -1
        })

        window.requestAnimationFrame(() => {
            if (results.length > 0) {
                scene.add(...meshify(results, {
                    flatShading: this.pglControlsState.flatShading,
                    wireframe: this.pglControlsState.wireframe,
                }));
                scene.name = id;
                scene.position.set(x, y, z);
                scene.scale.multiplyScalar(scale);
                toRemove.forEach(scene => scene.visible = false);
                this.scene.add(scene);
            }
            // clear scenes already rendered but not in new scenes array
            this.renderer.render(this.scene, this.camera);
            this.orbitControl.update();
            this.scene.remove(...toRemove);
            toRemove.forEach(scene => disposeScene(scene as THREE.Scene));
        });

        this.out++;
        this.updateProgress();

    }

    remove() {
            // TODO: dispose helpers etc.?
        this.scene.children.forEach(child => {
            if (child instanceof THREE.Scene) {
                disposeScene(child)
            }
        })
        super.remove();
        clearInterval(this.interval)
    }

}

export class LsystemWidgetView extends PGLWidgetView {

    unit: LsystemUnit = LsystemUnit.NONE;
    controls: LsystemControls = null;
    queue: {[key:number]: ITaskResult} = {};
    no = 0;
    in = 0;
    out = 0;

    initialize(parameters: WidgetView.InitializeParameters) {
        super.initialize(parameters);
    }

    removeScenes() {
        this.scene.remove(...this.scene.children
            .filter(obj => obj instanceof THREE.Scene)
            .map(scene => {
                scene.visible = false;
                disposeScene(scene as THREE.Scene);
                return scene;
            }));
    }

    render() {
        super.render();

        const initialState: ILsystemControlsState = {
            animate: this.model.get('animate'),
            derivationStep: this.model.get('scene').derivationStep,
            derivationLength: this.model.get('derivationLength'),
            isMagic: this.model.get('is_magic'),
            showControls: false,
            busy: 1,
            pyFeed: 0,
            comm_live: this.model.comm_live
        };

        const controlsEl = document.createElement('div');
        controlsEl.setAttribute('class', 'pgl-jupyter-lsystem-widget-controls');
        this.containerEl.appendChild(controlsEl);

        this.controls = new LsystemControls(initialState, {
            onAnimateToggled: (animate: boolean) => {
                this.controls.state.animate = animate;
                this.model.set('animate', animate);
                this.touch();
                if (animate) {
                    const pyFeedMax = Math.ceil(this.controls.state.derivationLength / 10);
                    const animation = (step) => {
                        if (this.controls.state.animate) {
                            this.controls.state.busy++;
                            this.controls.state.pyFeed++;
                            this.send({ derive: step });
                            if (step + 1 < this.controls.state.derivationLength) {
                                const next = (step) => {
                                    if (this.controls.state.pyFeed > pyFeedMax) {
                                        setTimeout(() => {
                                            next(step);
                                        }, 100);
                                    } else {
                                        animation(step)
                                    }
                                }
                                setTimeout(() => {
                                    next(step + 1);
                                    /*  work around: animation for reseting
                                        the progress bar to 0 might take
                                        longer than the computation of the
                                        next step which gives strange effects */
                                }, step === 0 ? 500 : 10);
                            }
                        }
                    }
                    const next = this.controls.state.derivationStep + 1;
                    animation(next >= this.controls.state.derivationLength ? 0 : next);
                } else {
                    this.controls.state.busy -= Object.keys(this.queue).length;
                    this.queue = {};
                    decoder.abort(this.model.model_id);
                }
            },
            onDeriveClicked: (step: number) => {
                this.controls.state.busy++;
                this.controls.state.pyFeed++;
                this.send({ derive: step });
            },
            onRewindClicked: () => {
                this.controls.state.busy = 1;
                this.controls.state.pyFeed = 0;
                this.controls.state.derivationStep = 0;
                this.send({ rewind: true });
                this.removeScenes();
                this.renderer.render(this.scene, this.camera);
                this.queue = {};
                this.no = 0;
            }
        }, controlsEl);
        if (initialState.animate) {
            this.controls.evtHandlers.onAnimateToggled(true);
        }

        this.containerEl.addEventListener('mouseover', () => this.controls.state.showControls = true);
        this.containerEl.addEventListener('mouseout', () => this.controls.state.showControls = false);

        this.unit = this.model.get('unit');
        const scene = this.model.get('scene') as ILsystemScene;
        try {
            this.decode(scene);
        } catch (err) {
            console.log(err);
        }

        this.listenTo(this.model, 'change:unit', () => {
            this.unit = this.model.get('unit')
        });
        this.listenTo(this.model, 'change:derivationLength', () => {
            this.controls.state.derivationLength = this.model.get('derivationLength');
        });
        this.listenTo(this.model, 'comm_live_update', () => {
            this.controls.state.comm_live = this.model.comm_live;
        });
        this.listenTo(this.model, 'change:scene', () => {
            const scene = this.model.get('scene') as ILsystemScene;
            this.decode(scene);
            if (this.controls.state.pyFeed > 0) {
                this.controls.state.pyFeed--;
            }
        });
    }

    getFromQueue(no) {
        setTimeout((no) => {
            const decoded = this.queue[no];
            if (decoded) {
                delete this.queue[no];
                this.setScene(decoded.userData.step, meshify(decoded.geoms, {
                    flatShading: this.pglControlsState.flatShading,
                    wireframe: this.pglControlsState.wireframe,
                }), decoded.bbox);
                this.controls.state.derivationStep = decoded.userData.step;
                if (this.controls.state.busy > 0) {
                    this.controls.state.busy--;
                }
                if (this.controls.state.animate && this.controls.state.derivationStep === this.controls.state.derivationLength - 1) {
                    this.controls.state.animate = false;
                    this.model.set('animate', false);
                    this.touch();
                }
                if (this.queue[no + 1]) {
                    this.getFromQueue(no + 1);
                }
            }
        }, 10, no);
    }

    decode(scene: ILsystemScene) {
        this.pglProgressState.busy = 1 - (this.out / ++this.in);
        decoder.decode({ data: scene.data.buffer, userData: { step: scene.derivationStep, no: this.no++ } }, this.model.model_id)
            .then(res => {
                // TODO: use increasing number for a seq. of tasks and not step
                const { geoms, bbox, userData: { step, no } } = res;
                if (this.controls.state.animate && step - this.controls.state.derivationStep > 1) {
                    this.queue[no] = res;
                } else {
                    this.setScene(step, meshify(geoms, {
                        flatShading: this.pglControlsState.flatShading,
                        wireframe: this.pglControlsState.wireframe,
                    }), bbox);
                    this.controls.state.derivationStep = step;
                    if (this.controls.state.busy > 0) {
                        this.controls.state.busy--;
                    }
                    if (this.controls.state.animate && this.controls.state.derivationStep === this.controls.state.derivationLength - 1) {
                        this.controls.state.animate = false;
                        this.model.set('animate', false);
                        this.touch();
                    }
                    if (this.queue[no + 1]) {
                        this.getFromQueue(no + 1);
                    }
                }
            })
            .catch(err => {
                this.controls.state.busy--;
                if (err.abort) {
                    this.controls.state.derivationStep = err.userData.step;
                } else {
                    console.log(err)
                }
            });
    }

    setScene(step: number, meshs: Array<THREE.Mesh | THREE.InstancedMesh>, bbox=null, position=[0, 0, 0]) {
        this.pglProgressState.busy = 1 - (++this.out / this.in);
        if (this.in === this.out) {
            this.in = this.out = 0;
        }
        const currentScene = new THREE.Scene();
        const [x, y, z] = position;
        const scale = SCALES[this.unit];
        currentScene.scale.multiplyScalar(scale);
        currentScene.position.set(x, y, z);
        if (meshs.length) {
            if (bbox && this.unit === LsystemUnit.NONE) {
                this.fitBounds(bbox);
            }
            currentScene.add(...meshs);
        }
        currentScene.userData = { step };
        currentScene.name = 'lsystem';

        const previousScene = this.scene.getObjectByName('lsystem') as THREE.Scene;
        if (previousScene) {
            previousScene.visible = false;
        }

        this.scene.add(currentScene);
        this.renderer.render(this.scene, this.camera);
        this.orbitControl.update();

        if (previousScene) {
            this.scene.remove(previousScene);
            disposeScene(previousScene);
        }

    }

    remove() {
        this.scene.children.forEach(child => {
            if (child instanceof THREE.Scene) {
                disposeScene(child)
            }
        })
        super.remove();
    }

}
