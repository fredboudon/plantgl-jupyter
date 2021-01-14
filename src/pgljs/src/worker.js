import PGL from '../build/pgl.js';
import * as pako from 'pako';

function merge(geoms) {

    const len = geoms.reduce((len, geom) => {
        len.idx = len.idx + geom.index.byteLength / 4;
        len.pos = len.pos + geom.position.byteLength / 4;
        return len;
    }, { idx: 0, pos: 0 });

    const idx = new Uint32Array(len.idx);
    const pos = new Float32Array(len.pos);
    // const col = new Uint8Array(len.pos);
    // const nrl = new Float32Array(len.pos);
    let offset_idx = 0;
    let offset_pos = 0;

    for (let i = 0; i < geoms.length; i++) {
        const geom = geoms[i];
        const geom_idx = new Uint32Array(geom.index);
        const geom_pos = new Float32Array(geom.position);
        // const geom_nrl = new Float32Array(geoms[i].normal);
        // const geom_col = new Uint8Array(geoms[i].color);
        // in non instanced geoms we have currently only one material
        // const color = geom.materials[0].color;
        // const geom_col = new Uint8Array(geom.position.byteLength / 4);
        // for (let c = 0; c < len.pos; c += 3) {
        //     geom_col[c] = color[0];
        //     geom_col[c + 1] = color[1];
        //     geom_col[c + 2] = color[2];
        // }
        for (let j = 0; j < geom_idx.length; j++) {
            idx[j + offset_idx] = geom_idx[j] + offset_pos;
        }
        pos.set(geom_pos, offset_pos * 3);
        // col.set(geom_col, offset_pos * 3);
        // nrl.set(geom_nrl, offset_pos * 3);
        offset_pos += geom_pos.length / 3;
        offset_idx += geom_idx.length;
    }

    return {
        index: idx.buffer,
        position: pos.buffer
    };

}

function splitAndMerge(triangleSets) {
    // debugger;
    // - merge non-instanced if they share the same material
    // - split instanced if they do not share the same material

    return triangleSets.reduce((gs, g) => {
        if (g.isInstanced) {
            if (g.materials.length === 1) {
                gs[0].push({
                    ...g,
                    material: {
                        ...g.materials[0],
                        color: g.materials[0].color.map(c => c / 255),
                        specular: g.materials[0].specular.map(c => c / 255),
                        emission: g.materials[0].emission.map(c => c / 255)
                    },
                    materials: undefined
                });
            } else {
                gs[1].push(g);
            }
        } else {
            gs[2].push(g);
        }
        return gs;
    }, [[], [], []]).reduce((gss, gs, i) => {
        switch (i) {
            case 0:
                gss.push(...gs);
                break;
            case 1:
                const len = 16 * 4; // instance matrix in bytes
                gss.push(...gs.reduce((gss, g, i, gs) => {
                    gss.push(...g.materials.reduce((grs, m, j) => {
                        const gr = grs.find(gr => {
                            const gm = gr.material;
                            return !(gm.transparency !== m.transparency ||
                                gm.shininess !== m.shininess ||
                                gm.color.join('') !== m.color.join('') ||
                                gm.specular.join('') !== m.specular.join('') ||
                                gm.emission.join('') !== m.emission.join(''));
                        });
                        const instance = new Uint8Array(g.instances.slice(j * len, j * len + len));
                        if (gr) {
                            gr.instances.push(...instance);
                        } else {
                            grs.push({ ...g, instances: [...instance], material: m });
                        }
                        return grs;
                    }, []));
                    return gss;
                }, []).map(g => ({
                    ...g,
                    index: g.index.slice(),
                    position: g.position.slice(),
                    instances: new Uint8Array(g.instances).buffer,
                    material: {
                        ...g.material,
                        color: g.material.color.map(c => c / 255),
                        specular: g.material.specular.map(c => c / 255),
                        emission: g.material.emission.map(c => c / 255)
                    },
                    materials: undefined
                })));
                break;
            case 2:
                gss.push(...gs.reduce((gss, g, i, gs) => {
                    const m = g.materials[0];
                    const gr = gss.find(gr => {
                        return !(gr.m.transparency !== m.transparency ||
                            gr.m.shininess !== m.shininess ||
                            gr.m.color.join('') !== m.color.join('') ||
                            gr.m.specular.join('') !== m.specular.join('') ||
                            gr.m.emission.join('') !== m.emission.join(''));
                    });
                    if (gr) {
                        gr.gs.push(g);
                    } else {
                        gss.push({ gs: [g], m });
                    }
                    return gss;
                }, []).map(gr => ({
                    isInstanced: false,
                    instances: [],
                    material: {
                        ...gr.m,
                        color: gr.m.color.map(c => c / 255),
                        specular: gr.m.specular.map(c => c / 255),
                        emission: gr.m.emission.map(c => c / 255)
                    },
                    ...merge(gr.gs)
                })));
                break;
            default:
                break;
        }
        return gss;
    }, []);

}
let pgl = null;
self.onmessage = function (evt) {
    let data = evt.data;
    if (pgl) {
        let inflated;
        try {
            if (!(data instanceof ArrayBuffer)) {
                throw new Error('data not an ArrayBuffer');
            }
            try {
                inflated = pako.inflate(new Uint8Array(data));
            } catch(err) { } finally {
                if (inflated instanceof Uint8Array) {
                    data = inflated
                }
                const { triangleSets, bbox } = pgl.parse(data);
                const geoms = splitAndMerge(triangleSets);
                postMessage({ geoms, bbox }, geoms.reduce((arr, geom) =>  {
                    // arr.push(mesh.color);
                    arr.push(geom.index);
                    arr.push(geom.position);
                    // arr.push(mesh.normal);
                    if (geom.isInstanced) {
                        arr.push(geom.instances);
                    }
                    return arr;
                }, []));
            };
        } catch (err) {
            postMessage({ error: err.toString() });
        }
    } else {
        const { wasmBinary } = data;
        if (wasmBinary) {
            try {
                PGL({ wasmBinary })
                    .then(pgl_ => {
                        pgl = pgl_;
                        self.postMessage({ initialized: true });
                    });
            } catch (err) {
                console.log(err)
            }
        }
    }

}
