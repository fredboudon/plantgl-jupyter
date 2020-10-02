import {
    Scene,
    Mesh,
    InstancedMesh,
    BufferGeometry,
    BufferAttribute,
    Matrix4,
    Color,
    DoubleSide,
    MeshPhongMaterial,
    PerspectiveCamera,
    Vector3,
    AmbientLight,
    DirectionalLight,
    WebGLRenderer,
    PCFSoftShadowMap,
    Box3,
    PlaneBufferGeometry,
    AxesHelper,
    CameraHelper,
    DirectionalLightHelper
} from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

import { IMeshOptions,
    IGeom } from './interfaces';

const THREE = {
    Scene,
    Mesh,
    InstancedMesh,
    BufferGeometry,
    BufferAttribute,
    Matrix4,
    Color,
    DoubleSide,
    MeshPhongMaterial,
    OrbitControls,
    PerspectiveCamera,
    Vector3,
    AmbientLight,
    DirectionalLight,
    WebGLRenderer,
    PCFSoftShadowMap,
    Box3,
    PlaneBufferGeometry,
    AxesHelper,
    CameraHelper,
    DirectionalLightHelper
}

function disposeScene(scene: THREE.Scene) {
    scene.children.forEach(child => {
        if (child instanceof THREE.Mesh || child instanceof THREE.InstancedMesh) {
            child.geometry.dispose();
            if (Array.isArray(child.material)) {
                child.material.forEach(m => m.dispose());
            } else {
                child.material.dispose();
            }
        }
    });
}

// function merge(geoms: IGeom[]): THREE.BufferGeometry {

//     const len = geoms.reduce((len, geom) => {
//         len.idx = len.idx + geom.index.byteLength / 4;
//         len.pos = len.pos + geom.position.byteLength / 4;
//         return len;
//     }, { idx: 0, pos: 0 });

//     const idx = new Uint32Array(len.idx);
//     const pos = new Float32Array(len.pos);
//     const col = new Uint8Array(len.pos);
//     // const nrl = new Float32Array(len.pos);
//     let offset_idx = 0;
//     let offset_pos = 0;

//     for (let i = 0; i < geoms.length; i++) {
//         const geom = geoms[i];
//         const geom_idx = new Uint32Array(geom.index);
//         const geom_pos = new Float32Array(geom.position);
//         // const geom_nrl = new Float32Array(geoms[i].normal);
//         // const geom_col = new Uint8Array(geoms[i].color);
//         // in non instanced geoms we have currently only one material
//         // const ambient = geom.materials[0].ambient;
//         // const geom_col = new Uint8Array(geom.position.byteLength / 4);
//         // for (let c = 0; c < len.pos; c += 3) {
//         //     geom_col[c] = ambient[0];
//         //     geom_col[c + 1] = ambient[1];
//         //     geom_col[c + 2] = ambient[2];
//         // }
//         for (let j = 0; j < geom_idx.length; j++) {
//             idx[j + offset_idx] = geom_idx[j] + offset_pos;
//         }
//         pos.set(geom_pos, offset_pos * 3);
//         // col.set(geom_col, offset_pos * 3);
//         // nrl.set(geom_nrl, offset_pos * 3);
//         offset_pos += geom_pos.length / 3;
//         offset_idx += geom_idx.length;
//     }

//     const geometry = new THREE.BufferGeometry();
//     geometry.setIndex(new THREE.BufferAttribute(idx, 1));
//     geometry.setAttribute('position', new THREE.BufferAttribute(pos, 3));
//     // geometry.setAttribute('color', new THREE.BufferAttribute(col, 3, true));
//     // geometry.setAttribute('normal', new THREE.BufferAttribute(nrl, 3));
//     geometry.computeVertexNormals();

//     return geometry;

// }

// function isDracoFile(data: ArrayBuffer) {
//     return 'DRACO' === String.fromCharCode(...Array.from(new Uint8Array(data.slice(0, 5))));
// }

function debounce(fn: Function, delay: number): Function {

    // @ts-ignore
    if (!new.target) return new debounce(fn, delay);

    let time = 0;
    let _args = [];
    let id = null;

    return function (...args) {
        _args = args || [];
        if (id) return;
        const now = Date.now();
        if (now - time < delay) {
            id = setTimeout(() => {
                id = null;
                time = Date.now();
                fn(..._args);
            }, delay - (now - time));
        } else {
            time = now;
            fn(...args);
        }
    };

};

const meshOptions: IMeshOptions = {
    flatShading: false,
    wireframe: false
};

function meshify(geoms: IGeom[], options: IMeshOptions = meshOptions):  Array<THREE.Mesh | THREE.InstancedMesh> {

    let meshs = geoms.map((geom: IGeom) => {
        let mesh;
        const geometry = new THREE.BufferGeometry();
        geometry.setIndex(new THREE.BufferAttribute(new Uint32Array(geom.index), 1));
        geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(geom.position), 3));
        const material = new THREE.MeshPhongMaterial({
            side: THREE.DoubleSide,
            shadowSide: THREE.DoubleSide,
            color: new THREE.Color(...geom.material.color),
            emissive: new THREE.Color(...geom.material.emission),
            specular: new THREE.Color(...geom.material.specular),
            shininess: geom.material.shininess * 100,
            transparent: geom.material.transparency > 0,
            opacity: 1 - geom.material.transparency,
            vertexColors: false,
            flatShading: options.flatShading,
            wireframe: options.wireframe
        });
        if (geom.isInstanced) {
            const instances = new Float32Array(geom.instances);
            mesh = new THREE.InstancedMesh(geometry, material, instances.length / 16);
            for (let i = 0; i < instances.length / 16; i++) {
                mesh.setMatrixAt(i, (new THREE.Matrix4() as any).set(...instances.slice(i * 16, i * 16 + 16)));
            }
        } else {
            mesh = new THREE.Mesh(geometry, material);
        }
        geometry.computeVertexNormals();
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        return mesh;
    });

    return meshs;
}

export {
    THREE,
    disposeScene,
    debounce,
    meshify
}
