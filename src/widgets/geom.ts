import { Widget } from '@lumino/widgets';
import { IRenderMime } from '@jupyterlab/rendermime-interfaces';
import * as THREE from 'three';
import geomDecoder from './bgeom-decoder';
import dracoDecoder from './draco-decoder';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { disposeScene, isDracoFile } from './utilities';

const MIME_TYPE = 'application/octet-stream';

export class GeomWidget extends Widget implements IRenderMime.IRenderer {

    mimeType: string;
    camera: THREE.PerspectiveCamera = null;
    scene: THREE.Scene = null;
    renderer: THREE.WebGLRenderer = null;
    orbitControl = null;
    ligths: THREE.DirectionalLight[] = [];

    constructor(options: IRenderMime.IRendererOptions) {
        super();
        this.mimeType = options.mimeType;
        this.addClass('geom');
        const canvas = document.createElement('canvas');
        canvas.width = 800;
        canvas.height = 800;
        const context = (canvas.getContext('webgl2', { alpha: false }) ||
            canvas.getContext('experimental-webgl', { alpha: false }) ||
            canvas.getContext('webgl', { alpha: false })) as WebGLRenderingContext;
        this.node.appendChild(canvas);

        const [x_size, y_size, z_size] = [1, 1, 1];

        this.camera = new THREE.PerspectiveCamera(50, canvas.width / canvas.height, 0.01);
        this.camera.position.set(x_size / 2, y_size, z_size * 2);
        this.camera.lookAt(new THREE.Vector3(0, 0, 0));
        this.camera.up = new THREE.Vector3(0, 0, 1);

        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color('#9c9c9c');

        this.ligths.push(new THREE.DirectionalLight(0xFFFFFF, 1.5));
        this.ligths[0].position.set(x_size, y_size, z_size);
        this.ligths.push(new THREE.DirectionalLight(0xFFFFFF, 1.5));
        this.ligths[1].position.set(-x_size, -y_size, -z_size);
        this.scene.add(...this.ligths);

        this.renderer = new THREE.WebGLRenderer({ canvas, context, antialias: true });
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(canvas.width, canvas.height);
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

    }

    processMessage(msg) {
        switch (msg.type) {
            case 'resize':
                if (this.renderer) {
                    this.renderer.setSize(msg.width, msg.height);
                    this.camera.aspect = msg.width / msg.height;
                    this.camera.updateProjectionMatrix();
                    this.renderer.render(this.scene, this.camera);
                    this.orbitControl.update();
                }
                break;
            case 'before-detach':
                disposeScene(this.scene);
                this.renderer.dispose();
            default:
                break;
        }
    }

    addMesh(meshs) {

        let max = 1;
        meshs.forEach((mesh: THREE.Mesh) => {
            // bug in bbox with instanced mesh: https://github.com/mrdoob/three.js/issues/18334
            mesh.geometry.computeBoundingBox();
            max = Math.max.apply(Math, [max, ...mesh.geometry.boundingBox.max.toArray()])
        });

        meshs.forEach((mesh: THREE.Mesh) => {
            mesh.scale.multiplyScalar(1 / max);
        });

        this.scene.add(...meshs);
        this.renderer.render(this.scene, this.camera);
        this.orbitControl.update();

    }

    renderModel(model: IRenderMime.IMimeModel): Promise<void> {

        // all data is base64 currently: Change to arraybuffer if supported by jupyter
        const data = Uint8Array.from(atob(model.data[this.mimeType] as any), c => c.charCodeAt(0)).buffer;
        return new Promise(resolve => {
            const decoder = isDracoFile(data) ? dracoDecoder : geomDecoder;
            decoder.decode({ data }).then(res => {
                this.addMesh(res.results);
                resolve();
            });
        });

    }

};

export const rendererFactory: IRenderMime.IRendererFactory = {
    safe: true,
    mimeTypes: [MIME_TYPE],
    createRenderer: options => new GeomWidget(options)
};


const extension: IRenderMime.IExtension = {
    id: 'plantgl-jupyter-geom:plugin',
    rendererFactory,
    rank: 0,
    dataType: 'string',
    fileTypes: [{
        name: 'bgeom',
        iconClass: '',
        fileFormat: 'base64',
        mimeTypes: [MIME_TYPE],
        extensions: ['.bgeom', '.cgeom']
    }],
    documentWidgetFactoryOptions: [{
        name: 'plantgl-jupyter bgeom viewer',
        primaryFileType: 'bgeom',
        modelName: 'base64',
        fileTypes: ['bgeom', 'cgeom'],
        defaultFor: ['bgeom', 'cgeom']
    }]
};

export default extension;
