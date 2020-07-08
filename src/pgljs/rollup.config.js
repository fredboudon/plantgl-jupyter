import { terser } from 'rollup-plugin-terser';
import copy from 'rollup-plugin-copy'

export default args => ({
    input: 'src/index.js',
    output: [
        { file: args.configDebug ? 'debug/index.js' : 'dist/index.js', format: 'es', preferConst: true }
    ],
    plugins: args.configDebug ? [
        copy({
            targets: [
                { src: 'build/pgl.js', dest: 'debug' },
                { src: 'build/pgl.wasm', dest: 'debug' },
                { src: 'build/pgl.wasm.map', dest: 'debug' }
            ]
        })
    ] : [
        terser({
            output: { quote_style: 1 }
        }),
        copy({
            targets: [
                // { src: 'build/pgl.wasm', dest: 'dist' }
            ]
        })
    ]
});
