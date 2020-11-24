import { Widget } from '@lumino/widgets';
import { IRenderMime } from '@jupyterlab/rendermime-interfaces';
import { imageIcon } from '@jupyterlab/ui-components';

import { THREE, disposeScene, meshify } from './utilities';
import decoder from './decoder';

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

        if (this.scene) {
            disposeScene(this.scene);
        }

        this.mimeType = options.mimeType;
        this.addClass('geom');
        const canvas = document.createElement('canvas');
        canvas.width = 800;
        canvas.height = 800;
        const context = (canvas.getContext('webgl2', { alpha: false }) ||
            canvas.getContext('experimental-webgl', { alpha: false }) ||
            canvas.getContext('webgl', { alpha: false })) as WebGLRenderingContext;
        this.node.appendChild(canvas);

        this.camera = new THREE.PerspectiveCamera(50, canvas.width / canvas.height, 0.01, 5000);
        this.camera.position.set(2, 2, 0);
        this.camera.lookAt(new THREE.Vector3(0, 0, 0));
        this.camera.up = new THREE.Vector3(0, 0, 1);

        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color('#9c9c9c');

        this.scene.add(new THREE.AmbientLight(0xFFFFFF, 0.5));

        this.ligths.push(new THREE.DirectionalLight(0xFFFFFF, 1));
        this.ligths[0].position.set(0, 0, 1);
        this.ligths.push(new THREE.DirectionalLight(0xFFFFFF, 1));
        this.ligths[1].position.set(0, 0, -1);
        this.scene.add(...this.ligths);

        this.renderer = new THREE.WebGLRenderer({ canvas, context, antialias: true });
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(canvas.width, canvas.height);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.render(this.scene, this.camera);

        this.orbitControl = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.orbitControl.enableZoom = true;
        this.orbitControl.addEventListener('change', () => {
            this.renderer.render(this.scene, this.camera)
        });
        this.renderer.render(this.scene, this.camera);
        this.orbitControl.target.set(0, 0, 0);
        this.orbitControl.update();

    }

    processMessage(msg) {
        super.processMessage(msg);

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

    setMeshs(meshs: Array<THREE.Mesh | THREE.InstancedMesh>) {

        this.scene.add(...meshs);
        const box = new THREE.Box3().setFromObject(this.scene);
        const scale = 1 / Math.max.apply(Math, box.max.toArray());
        meshs.forEach((mesh: THREE.Mesh) => {
            mesh.scale.multiplyScalar(scale);
        });
        this.renderer.render(this.scene, this.camera);
        this.orbitControl.update();

    }

    renderModel(model: IRenderMime.IMimeModel): Promise<void> {

        // all data is base64 currently: Change to arraybuffer if supported by jupyter
        const data = Uint8Array.from(atob(model.data[this.mimeType] as any), c => c.charCodeAt(0)).buffer;
        return new Promise((resolve, reject) => {
            decoder.decode({ data })
                .then(res => {
                    this.setMeshs(meshify(res.geoms));
                    resolve();
                })
                .catch(() => reject());
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
        icon: imageIcon,
        iconClass: '',
        fileFormat: 'base64',
        mimeTypes: [MIME_TYPE],
        extensions: ['.bgeom']
    }],
    documentWidgetFactoryOptions: [{
        name: 'plantgl-jupyter bgeom viewer',
        primaryFileType: 'bgeom',
        modelName: 'base64',
        fileTypes: ['bgeom'],
        defaultFor: ['bgeom']
    }]
};

export default extension;
