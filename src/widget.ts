import {
  DOMWidgetModel, DOMWidgetView, ISerializers, WidgetView
} from '@jupyter-widgets/base';

import {
  MODULE_NAME, MODULE_VERSION
} from './version';

// import { html, render } from 'lit-html';

import '../css/widget.css';

import decoder from './mesh-decoder';
import * as THREE from 'three';
import * as OrbitControls_ from 'three-orbit-controls';
import { IScene } from './interfaces';

const OrbitControls = OrbitControls_(THREE);

export class SceneWidgetModel extends DOMWidgetModel {

  defaults() {
    return {...super.defaults(),
      _model_name: SceneWidgetModel.model_name,
      _model_module: SceneWidgetModel.model_module,
      _model_module_version: SceneWidgetModel.model_module_version,
      _view_name: SceneWidgetModel.view_name,
      _view_module: SceneWidgetModel.view_module,
      _view_module_version: SceneWidgetModel.view_module_version,
      scene: null,
      size_display: [400, 400],
      size_world: [10, 10, 10],
      helper_axis: false,
      helpe_shadow: false,
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
  controls = null;
  sizeDisplay: number[];
  sizeWorld: number[];
  showAxisHelper: boolean;
  showLightHelper: boolean;
  showPlane: boolean;

  initialize(parameters: WidgetView.InitializeParameters) {
    super.initialize(parameters);
    this.sizeDisplay = parameters.model.attributes['size_display'];
    this.sizeWorld = parameters.model.attributes['size_world'];
    this.showAxisHelper = parameters.model.attributes['helper_axis'];
    this.showLightHelper = parameters.model.attributes['helper_light'];
    this.showPlane = parameters.model.attributes['plane'];

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

    if (!this.renderer) {
      super.render();
      this.pWidget.addClass('.pgl-jupyter-scene-widget');
      const div = document.createElement('div');
      this.el.appendChild(div);

      const [width, height] = this.sizeDisplay;
      const [x_size, y_size, z_size] = this.sizeWorld;

      this.camera = new THREE.PerspectiveCamera(50, width / height, 0.01);
      this.camera.position.set(x_size * 1.5, y_size * 2/3, z_size * 1.5);
      this.camera.lookAt(new THREE.Vector3(0, 0, 0));

      this.scene = new THREE.Scene();
      this.scene.background = new THREE.Color('grey');

      this.plane = new THREE.Mesh(
        new THREE.PlaneBufferGeometry(x_size, y_size),
        new THREE.MeshStandardMaterial({
          color: new THREE.Color('lightgrey'),
          roughness: 0.6
        })
      );
      this.plane.name = 'plane';
      this.plane.rotation.x = -Math.PI / 2;
      this.plane.receiveShadow = true;
      this.plane.visible = this.showPlane;
      this.scene.add(this.plane);

      const axisHelper = new THREE.AxesHelper(Math.max.apply(Math, [x_size, y_size, z_size]) / 2)
      axisHelper.visible = this.showAxisHelper;
      this.scene.add(axisHelper);

      this.scene.add(new THREE.HemisphereLight(0xFFFFFF, 0xAAAAAA, 0.2));

      this.light = new THREE.DirectionalLight(0xFFFFFF, 1);
      this.light.shadow.bias = -0.001;
      this.light.castShadow = true;
      this.light.position.set(0, y_size, z_size);
      this.light.target.position.set(0, 0, 0);
      this.light.shadow.camera.near = 0.01;
      this.light.shadow.camera.far = z_size * Math.SQRT2 * 2;
      this.light.shadow.camera.top = z_size;
      this.light.shadow.camera.bottom = -z_size;
      this.light.shadow.camera.left = -x_size;
      this.light.shadow.camera.right = x_size;
      this.light.shadow.bias = -0.0001;
      this.scene.add(this.light);

      const cameraHelper = new THREE.CameraHelper(this.light.shadow.camera);
      cameraHelper.visible = this.showLightHelper;
      this.scene.add(cameraHelper);

      const lightHelper = new THREE.DirectionalLightHelper(this.light);
      lightHelper.visible = this.showLightHelper;
      this.scene.add(lightHelper);

      const camLight = new THREE.DirectionalLight(0xFFFFFF, 0.5);
      this.scene.add(camLight);

      this.renderer = new THREE.WebGLRenderer({ antialias: true });
      this.renderer.setPixelRatio(window.devicePixelRatio);
      this.renderer.setSize(width, height);
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      div.appendChild(this.renderer.domElement);
      camLight.position.copy(this.camera.position);
      this.renderer.render(this.scene, this.camera);

      this.controls = new OrbitControls(this.camera, this.renderer.domElement);
      this.controls.enableZoom = true;
      this.controls.addEventListener('change', () => {
        camLight.position.copy(this.camera.position);
        this.renderer.render(this.scene, this.camera)
      });
      this.renderer.render(this.scene, this.camera);
      this.controls.target.set(0, 0, 0);
      this.controls.update();

    }

    this.scene_changed();
    this.listenTo(this.model, 'change:size_display', this.resizeDisplay);
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

    // there wont be a change event for dynamically added attr after loading the notebook with saved widget state
    // if there are any we add them
    Object.keys(this.model.attributes).filter(key => key.startsWith('scene_')).forEach(key => {
      this.addScene(this.model.get(key));
    });

  }

  resizeDisplay() {

    this.sizeDisplay = this.model.get('size_display') as number[];
    const [width, height] = this.sizeDisplay;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
    this.renderer.render(this.scene, this.camera);
    this.controls.update();
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

      // TODO: dispose if we allow mesh removal

      this.scene.add(mesh);
      this.renderer.render(this.scene, this.camera);
      this.controls.update();

    }).catch(err => {
      console.log(err);
    });

  }

}
