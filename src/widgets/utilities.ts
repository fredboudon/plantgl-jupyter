import * as THREE from 'three'

export function disposeScene(scene: THREE.Scene) {
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
