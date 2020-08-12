
function parse (bgeom) {

    const triangleSets = [];
    if (!(bgeom instanceof Uint8Array)) {
        bgeom = new Uint8Array(bgeom);
    }

    const filename = 'bgeom';
    FS.createDataFile('/', filename, bgeom, true, true);
    const tesselator = new Module.Tesselator(filename);
    const ii = tesselator.trianglesSize();

    for (let i = 0; i < ii; i++) {

        const triangles = tesselator.trianglesAt(i);

        const indexPtr = triangles.indexData();
        const indexSize = triangles.indexSize();

        const pointPtr = triangles.pointData();
        const pointSize = triangles.pointSize();

        const materials = [];
        const jj = triangles.hasMaterialPerInstance ? triangles.noOfInstances() : 1;

        for (let j = 0; j < jj; j++) {
            const material = triangles.getMaterialForInstance(j);
            const ambient = material.getAmbient();
            const specular = material.getSpecular();
            const emission = material.getEmission();
            materials.push({
                ambient: [ambient.getRed(), ambient.getGreen(), ambient.getBlue()],
                specular: [specular.getRed(), specular.getGreen(), specular.getBlue()],
                emission: [emission.getRed(), emission.getGreen(), emission.getBlue()],
                diffuse: material.getDiffuse(),
                shininess: material.getShininess(),
                transparency: material.getTransparency()
            });
        }

        // const normalPtr = triangles.normalData();
        // const normalSize = triangles.normalSize();

        // const colorPtr = triangles.colorData();
        // const colorSize = triangles.colorSize();

        const isInstanced = triangles.isInstanced();
        let instances = new ArrayBuffer();

        if (isInstanced) {
            const instancePtr = triangles.instanceMatrixData();
            const instanceSize = triangles.instanceMatrixSize();
            instances = Module.HEAPF32.buffer.slice(instancePtr.ptr, instancePtr.ptr + instanceSize * 4);
        }


        const index = Module.HEAPU32.buffer.slice(indexPtr.ptr, indexPtr.ptr + indexSize * 4);
        const position = Module.HEAPF32.buffer.slice(pointPtr.ptr, pointPtr.ptr + pointSize * 4);
        // const normal = Module['HEAPF32'].buffer.slice(normalPtr.ptr, normalPtr.ptr + normalSize * 4);
        // const color = Module['HEAPU8'].buffer.slice(colorPtr.ptr, colorPtr.ptr + colorSize);

        triangleSets.push({
            index, position, materials, instances, isInstanced
        });

    }

    Module.destroy(tesselator);
    FS.unlink('/' + filename);
    return triangleSets;
}

Module['parse'] = parse;
