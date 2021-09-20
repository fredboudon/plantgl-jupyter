import xsimlab as xs
from paramtable import ParamTable, ArrayParameterSet
import openalea.lpy as lpy

def get_caller_namespace():
    """ Retrieve namespace of the caller function to insert it elements """
    import inspect
    return inspect.getouterframes(inspect.currentframe())[2][0].f_locals
 
def gen_param_structs(modules, process):
    """ Generate Parameter structure, based on ArrayParameterSet,  for the given modules """
    return dict([(module+'Params', type(module+'Params', (ArrayParameterSet,), {'table' : ParamTable(process, module) })) for module in modules])

def gen_initialize(lpyfile):
    """ Generate an initialize function for xs Process build from the given lpyfile """
    def initialize(self):
        parameters = { 'process': self }
        for n in self.externs:
            parameters[n]=getattr(self, n)
        parameters.update(gen_param_structs(self.modules, self))
        self.lsystem = lpy.Lsystem(lpyfile, parameters)
        self.lstring = self.lsystem.axiom
        self.scene = self.lsystem.sceneInterpretation(self.lstring)
    return initialize

def run_step(self, nsteps, step, step_start, step_delta):
    """ A run step function to run an lsystem """
    parameters = {}
    for n in ['nsteps', 'step', 'step_start', 'step_delta']:
        parameters[n]=locals()[n]
    # Do we need to set it before each iteration ?
    for n in self.externs:
        parameters[n]=getattr(self, n)
    self.lsystem.execContext().updateNamespace(parameters)
    self.lstring = self.lsystem.derive(self.lstring, 1)
    # How to setup the display delay ?
    self.lscene = self.lsystem.sceneInterpretation(self.lstring)

def parse_file(lpyfile, modulestoconsider = None):
    """ Parse an lpyfile to retrieve its modules and expected extern parameters """
    lines = list(open(lpyfile).readlines())
    externs = set()
    def f(**kwd):
        nonlocal externs
        externs = externs.union(set(kwd.keys()))
    code = ''.join([l for l in lines if l.startswith('extern')])
    n = {'extern' : f, 'externs' : externs}
    exec(code, n, n)
            
    code2 = ''.join([l for l in lines if l.startswith('module')])
    from openalea.lpy import Lsystem
    l = Lsystem()
    l.setCode(code2)
    l.makeCurrent()
    modules = {}
    for m in l.execContext().declaredModules():
        if modulestoconsider is None or m.name in modulestoconsider:
            modules[m.name] = m.parameterNames
    l.done()
    return externs, modules
        
def gen_properties(lpyfile, modulestoconsider = None):
    """ Generate the properties of the xs Process class that will run the lpyfile """
    properties = {}
    externs, modules = parse_file(lpyfile, modulestoconsider)
    properties['modules'] = modules
    for m, v in modules.items():
        properties[m] = xs.index(dims=m)
        for p in v:
            properties[m+'_'+p] = xs.variable( dims=m, intent='out')
    properties['externs'] = externs
    for e in externs:
        properties[e] = xs.variable()
    return properties

def xs_lpyprocess(name, lpyfile,  modulestoconsider = None):
    """ Generate the xs process class under the given name with adequate properties from the lpy file. """
    properties = gen_properties(lpyfile, modulestoconsider)
    properties['initialize'] = gen_initialize(lpyfile)
    properties['run_step'] = xs.runtime(run_step, args=('nsteps', 'step', 'step_start', 'step_delta'))
    properties['lscene'] = xs.any_object()
    properties['lstring']  = xs.any_object()
    process = xs.process(type(name, (), properties))
    get_caller_namespace()[name] = process
    return process

def xs_lpydisplay_hook(processname, scales):
    """ Generate a hook to display the lpy simulation from process given by processname """
    import pgljupyter
    from IPython.display import display
    from xsimlab.monitoring import ProgressBar

    view = pgljupyter.SceneWidget()
    display(view)

    @xs.runtime_hook('run_step')
    def hook(model, context, state):
        view.set_scenes([state[('devel', 'lscene')]], scales=scales)

    return [hook, ProgressBar()]

__all__ = ['xs_lpyprocess', 'xs_lpydisplay_hook']
