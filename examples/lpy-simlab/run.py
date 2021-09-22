import xsimlab as xs
from lpy_simlab_process import xs_lpyprocess
import numpy as np


LpyDevel = xs_lpyprocess('LpyDevel', '/home/jvail/dev/jvail/plantgl-jupyter/examples/lpy-simlab/.devel.lpy')

@xs.process
class Light():


    # process input
    Metamer = xs.foreign(LpyDevel, 'Metamer')
    lscene = xs.foreign(LpyDevel, 'lscene')

    #leaf_opt_properties = xs.variable()

    # process output
    Metamer_lighting = xs.variable(dims='Metamer', global_name='Metamer_lighting', intent='inout')

    def initialize(self):
        self.Metamer_lighting = np.zeros(len(self.Metamer))

    @xs.runtime()
    def run_step(self):
        from openalea.plantgl.light import diffuseInterception
        res = diffuseInterception(self.lscene)
        self.Metamer_lighting = np.array([res[i] for i in range(len(self.Metamer))])


model = xs.Model({
    'devel': LpyDevel,
    'light': Light
})


ds = xs.create_setup(
    model=model,
    clocks={ 'time': np.linspace(0, 25, 250) },
    input_vars={
        'devel__flush_delay': 4.,
        'devel__nb_metamers': 5.,
        'light__Metamer_lighting': np.arange(0, 5)
    },
    output_vars={
        'devel__Metamer_leaf_size': 'time',
        'devel__Metamer_internode_size': 'time',
        'devel__Apex_t': 'time',
    }
)

ds.xsimlab.run(model=model)
