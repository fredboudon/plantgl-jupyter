import * as THREE from 'three';
import { IGeom } from './interfaces';

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

function merge(geoms: IGeom[]) {

    const len = geoms.reduce((len, geom) => {
        len.idx = len.idx + geom.index.byteLength / 4;
        len.pos = len.pos + geom.position.byteLength / 4;
        return len;
    }, { idx: 0, pos: 0 });
    const index = new Uint32Array(len.idx);
    const position = new Float32Array(len.pos);
    const color = new Uint8Array(len.pos);
    let offset_idx = 0;
    let offset_pos = 0;
    for (let i = 0; i < geoms.length; i++) {
        const geom_index = new Uint32Array(geoms[i].index);
        const geom_pos = new Float32Array(geoms[i].position);
        const geom_col = new Uint8Array(geoms[i].color);
        for (let j = 0; j < geom_index.length; j++) {
            index[j + offset_idx] = geom_index[j] + offset_pos;
        }
        position.set(geom_pos, offset_pos * 3);
        color.set(geom_col, offset_pos * 3);
        offset_pos += geom_pos.length / 3;
        offset_idx += geom_index.length;
    }

    const geometry = new THREE.BufferGeometry();
    const material = new THREE.MeshStandardMaterial({
        side: THREE.DoubleSide,
        shadowSide: THREE.BackSide,
        vertexColors: true,
        roughness: 0.7
    });

    geometry.setIndex(new THREE.BufferAttribute(index, 1));
    geometry.setAttribute('position', new THREE.BufferAttribute(position, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(color, 3, true));
    geometry.computeVertexNormals();

    return geometry;

}

function isDracoFile(data: ArrayBuffer) {
    return 'DRACO' === String.fromCharCode(...Array.from(new Uint8Array(data.slice(0, 5))));
}

export {
    disposeScene,
    merge,
    isDracoFile
}
