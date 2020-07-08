
function parse (bgeom) {

    const data = [];
    if (!(bgeom instanceof Uint8Array)) {
        bgeom = new Uint8Array(bgeom);
    }

    const filename = 'bgeom';
    FS.createDataFile('/', filename, bgeom, true, true);
    const bt = new Module['Tesselator'](filename);
    const ii = bt.trianglesSize();

    for (let i = 0; i < ii; i++) {

        const triangles = bt.trianglesAt(i);

        const indexPtr = triangles.indexData();
        const indexSize = triangles.indexSize();

        const pointPtr = triangles.pointData();
        const pointSize = triangles.pointSize();

        const colorPtr = triangles.colorData();
        const colorSize = triangles.colorSize();

        const isInstanced = triangles.isInstanced();
        let instances = new ArrayBuffer();

        if (isInstanced) {
            const instancePtr = triangles.instanceMatrixData();
            const instanceSize = triangles.instanceMatrixSize();
            instances = Module['HEAPF32'].buffer.slice(instancePtr.ptr, instancePtr.ptr + instanceSize * 4);
            Module['_free'](instancePtr);
        }


        const index = Module['HEAPU32'].buffer.slice(indexPtr.ptr, indexPtr.ptr + indexSize * 4);
        const position = Module['HEAPF32'].buffer.slice(pointPtr.ptr, pointPtr.ptr + pointSize * 4);
        const color = Module['HEAPU8'].buffer.slice(colorPtr.ptr, colorPtr.ptr + colorSize);

        // TODO: Test if array memory is realy freed
        Module['_free'](indexPtr);
        Module['_free'](pointPtr);
        Module['_free'](colorPtr);

        data.push({
            index, position, color, instances, isInstanced
        });

    }

    FS.unlink('/' + filename);
    return data;
}

Module['parse'] = parse;
