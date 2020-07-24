"""
TODO: Add module docstring
"""

from ipywidgets.widgets import (
    DOMWidget, Widget, register, VBox, HBox, Tab, Output, GridBox, Layout, Accordion,
    FloatText, IntText, Text, widget_serialization, Label
)
from ipywidgets.widgets.widget_description import DescriptionStyle
from traitlets import Unicode, Instance, Bytes, Int, Float, Tuple, Dict, Bool, List, observe, UseEnum
from openalea.plantgl.all import Scene, tobinarystring as scene_to_bgeom, NurbsCurve2D, Point3Array, Vector3, QuantisedFunction
from openalea.lpy import Lsystem, LpyParsing
import random, string, io, os, toml, warnings, pprint
from enum import Enum

from ._frontend import module_name, module_version
from .editors import CurveEditorWidget

pp = pprint.PrettyPrinter(indent=4)

class Unit(Enum):
    m = 0
    dm = 1
    cm = 2
    mm = 3

def scene_to_json(x, obj):
    if isinstance(x, dict):
        return {k: scene_to_json(v, obj) for k, v in x.items()}
    elif isinstance(x, (list, tuple)):
        return [scene_to_json(v, obj) for v in x]
    elif isinstance(x, Scene):
        return str(x)
    else:
        return x

def to_scene(obj):
    scene = Scene()
    if obj is None:
        pass
    elif isinstance(obj, Scene):
        scene = obj
    else:
        if isinstance(obj, list):
            scene = Scene(obj)
        else:
            scene = Scene([obj])
    return scene

# TODO: serialize in thread
def scene_to_bytes(scene):
    # serialized = pgl_scene_to_bytes(scene, single_mesh)
    # if not serialized.status:
    #     raise ValueError('scene serialization failed')
    return scene_to_bgeom(scene, False)

@register
class PGLWidget(DOMWidget):
    """TODO: Add docstring here
    """
    _model_name = Unicode('PGLWidgetModel').tag(sync=True)
    _model_module = Unicode(module_name).tag(sync=True)
    _model_module_version = Unicode(module_version).tag(sync=True)
    _view_name = Unicode('PGLWidgetView').tag(sync=True)
    _view_module = Unicode(module_name).tag(sync=True)
    _view_module_version = Unicode(module_version).tag(sync=True)

    size_display = Tuple(Int(400, min=300), Int(400, min=300), default_value=(400, 400)).tag(sync=True)
    size_world = Tuple(Int(1, min=1), Int(1, min=1), Int(1, min=1), default_value=(10, 10, 10)).tag(sync=True)
    axes_helper = Bool(False).tag(sync=True)
    light_helper = Bool(False).tag(sync=True)
    plane = Bool(True).tag(sync=True)
    single_mesh = False

    def __init__(self, **kwargs):
        super().__init__(**kwargs)

@register
class SceneWidget(PGLWidget):
    """TODO: Add docstring here
    """
    _model_name = Unicode('SceneWidgetModel').tag(sync=True)
    _model_module = Unicode(module_name).tag(sync=True)
    _model_module_version = Unicode(module_version).tag(sync=True)
    _view_name = Unicode('SceneWidgetView').tag(sync=True)
    _view_module = Unicode(module_name).tag(sync=True)
    _view_module_version = Unicode(module_version).tag(sync=True)

    scenes = List(trait=Dict(traits={
        'id': Unicode(),
        'data': Bytes(),
        'scene': Instance(Scene),
        'position': Tuple(Float(0), Float(0), Float(0)),
        'scale': Float(1)
    })).tag(sync=True, to_json=scene_to_json)
    # compress = Bool(False).tag(sync=False)

    def __init__(self, obj=None, position=(0,0,0), scale=(1.0), **kwargs):
        scene = to_scene(obj)
        serialized = scene_to_bytes(scene) # bytes(scene_to_draco(scene, True).data) if self.compress else scene_to_bytes(scene)
        # self.compress = compress
        self.scenes = [{
            'id': ''.join(random.choices(string.ascii_letters + string.digits, k=25)),
            'data': serialized,
            'scene': scene,
            'position': position,
            'scale':  scale
        }]
        super().__init__(**kwargs)

    # TODO: avoid re-sending all scenes after a scene was added.
    # - Partially syncing a state is not available out of the box
    # - Dynamic traits are discouraged: https://github.com/ipython/traitlets/issues/585
    def add(self, obj, position=(0,0,0), scale=1.0):
        scene = to_scene(obj)
        serialized = scene_to_bytes(scene) # bytes(scene_to_draco(scene, True).data) if self.compress else scene_to_bytes(scene)
        self.scenes.append({
            'id': ''.join(random.choices(string.ascii_letters + string.digits, k=25)),
            'data': serialized,
            'scene': scene,
            'position': position,
            'scale':  scale
        })
        self.send_state('scenes')


@register
class LsystemWidget(PGLWidget):
    """TODO: Add docstring here
    """
    _model_name = Unicode('LsystemWidgetModel').tag(sync=True)
    _model_module = Unicode(module_name).tag(sync=True)
    _model_module_version = Unicode(module_version).tag(sync=True)
    _view_name = Unicode('LsystemWidgetView').tag(sync=True)
    _view_module = Unicode(module_name).tag(sync=True)
    _view_module_version = Unicode(module_version).tag(sync=True)

    __visualparameters = []
    __scalars = []
    __trees = []
    __filename = ''
    __do_abort = False

    units = Unit
    lsystem = Instance(Lsystem).tag(sync=True, to_json=lambda e, o: {
        'derivationLength': e.derivationLength
    })
    unit = UseEnum(Unit).tag(sync=True, to_json=lambda e, o: e.value)
    scene = Dict(traits={
        'data': Bytes(),
        'scene': Instance(Scene),
        'derivationStep': Int(0, min=0),
        'id': Int(0, min=0)
    }).tag(sync=True, to_json=scene_to_json)
    animate = Bool(False).tag(sync=True)
    dump = Unicode('').tag(sync=False)
    # compress = Bool(False).tag(sync=False)

    def __init__(self, filename, options={}, unit=Unit.m, animate=False, dump='', **kwargs):
        self.__filename = filename if filename.endswith('.lpy') else filename + '.lpy'
        self.lsystem = Lsystem()
        # self.__initialize_lsystem()
        if isinstance(options, ParameterEditorWidget):
            options.on_lpy_context_change = self.__on_options_changed
            self.lsystem = Lsystem(self.__filename)
        else:
            self.lsystem = Lsystem(self.__filename, options)
        self.__trees.append(self.lsystem.axiom)
        self.unit = unit
        self.animate = animate
        self.dump = dump
        # self.compress = compress
        self.__set_scene(0)
        self.on_msg(self.__on_custom_msg)
        super().__init__(**kwargs)

    def __on_options_changed(self, name, obj):
        if name in self.lsystem.execContext().globals():
            self.lsystem.execContext().globals()[name] = obj
            self.__trees = []
            self.__trees.append(self.lsystem.axiom)
            self.__derive(max(1, self.scene['derivationStep']))

    def __initialize_lsystem(self):
        with io.open(self.__filename, 'r') as file:
            codes = file.read().split(LpyParsing.InitialisationBeginTag)
            if len(codes) == 2:
                context = self.lsystem.context()
                try:
                    init = context.initialiseFrom(LpyParsing.InitialisationBeginTag+codes[1])
                except:
                    init = None
            lpy_code_version = 1.0
            if '__lpy_code_version__' in context:
                lpy_code_version = context['__lpy_code_version__']
            if '__functions__' in context and lpy_code_version <= 1.0 :
                functions = context['__functions__']
                for n,c in functions: c.name = n
                self.__visualparameters += [ ({'name':'Functions'}, [func for n, func in functions]) ]
            if '__curves__' in context and lpy_code_version <= 1.0 :
                curves = context['__curves__']
                for n,c in curves: c.name = n
                self.__visualparameters += [ ({'name':'Curve2D'}, [curve for n, curve in curves]) ]
            if '__scalars__' in context:
                self.__scalars = [ v for v in context['__scalars__'] ]
            if '__parameterset__' in context:
                def checkinfo(info):
                    if type(info) == str:
                        return {'name':info}
                    return info
                parameterset = context['__parameterset__']
                parameterset = [ (checkinfo(panelinfo), [obj for typename, obj in objects]) for panelinfo,objects in parameterset]
                self.__visualparameters += parameterset
            if init is None:
                warnings.warn('initialisation failed')

    @observe('animate')
    def on_animate_changed(self, change):
        # print('on_animate_changed', change['old'], change['new'])
        if change['old'] and not change['new'] and self.scene['derivationStep'] < self.lsystem.derivationLength - 1:
            # print('__do_abort')
            __do_abort = True

    def __on_custom_msg(self, widget, content, buffers):
        # print('__on_custom_msg', content)
        if 'derive' in content:
            step = content['derive']
            if step < self.lsystem.derivationLength:
                if step < len(self.__trees):
                    self.__set_scene(step)
                else:
                    self.__derive(step)
        elif 'rewind' in content:
            self.__rewind()

    def __rewind(self):
        self.lsystem.clear()
        with io.open(self.__filename, 'r') as lpy:
            self.lsystem.setCode(lpy.read())
        self.send_state('lsystem')
        self.__clear()
        self.__trees.append(self.lsystem.axiom)
        self.__set_scene(0)

    def __clear(self):
        self.__trees = []

    def __set_scene(self, step):
        # print('__set_scene', step)
        scene = self.lsystem.sceneInterpretation(self.__trees[step])
        serialized = scene_to_bytes(scene) # bytes(scene_to_draco(scene, True).data) if self.compress else scene_to_bytes(scene)
        serialized_scene = {
            'data': serialized,
            'scene': scene,
            'derivationStep': step,
            'id': step
        }
        self.scene = serialized_scene
        if len(self.dump) > 0:
            os.makedirs(self.dump, exist_ok=True)
            file_type = 'bgeom' # 'cgeom' if self.compress else 'bgeom'
            with io.open(os.path.join(self.dump, f'{self.__filename}_{step}.{file_type}'), 'wb') as file:
                file.write(serialized)

    def __derive(self, step):
        # print('__derive', step)
        if step < self.lsystem.derivationLength:
            while True:
                if step == len(self.__trees) - 1:
                    self.__set_scene(step)
                    break
                else:
                    self.__trees.append(self.lsystem.derive(self.__trees[-1], len(self.__trees), 1))
        else:
            raise ValueError(f'derivation step {step} out of Lsystem bounds')


# def to_json(tomls, _):
#     return [_to_json(toml) for toml in tomls]

# def _to_json(thing):
#     if hasattr(thing, 'body'):
#         json = {}
#         for key in thing.keys():
#             json[key] = _to_json(thing[key])
#     elif isinstance(thing, dict):
#         a_dict = {
#             'value': {},
#             'comment': thing.trivia.comment[1:].strip()
#         }
#         for key in thing:
#             a_dict['value'][key] = _to_json(thing[key])
#         return a_dict
#     elif isinstance(thing, list):
#         a_list = {
#             'value': [],
#             'comment': thing.trivia.comment[1:].strip()
#         }
#         for item in thing:
#             a_list['value'].append(_to_json(item))
#         return a_list
#     else:
#         return {
#             'value':  'nan' if isinstance(thing, (int, float)) and math.isnan(thing) else thing.value,
#             'comment': thing.trivia.comment[1:].strip()
#         }
#     return json

class ParameterEditorWidget(VBox):
    """TODO: Add docstring here
    """
    _model_name = Unicode('ParameterEditorWidgetModel').tag(sync=True)
    _model_module = Unicode(module_name).tag(sync=True)
    _model_module_version = Unicode(module_version).tag(sync=True)
    _view_name = Unicode('ParameterEditorWidgetView').tag(sync=True)
    _view_module = Unicode(module_name).tag(sync=True)
    _view_module_version = Unicode(module_version).tag(sync=True)

    values = List([]).tag(sync=False)
    # widget = Instance(VBox).tag(sync=True, **widget_serialization)
    tomls = {}
    # status = Output(layout={'border': '1px solid black'})
    on_lpy_context_change = lambda a, b: 1


    def __init__(self, filename, **kwargs):
        self.__filename = filename if filename.endswith('.toml') else filename + '.toml'
        tab = Tab()
        with io.open(self.__filename, 'r') as file:
            path = os.path.normpath(os.path.abspath(filename))
            toml_obj = toml.loads(
                file.read(),
                decoder=toml.TomlPreserveCommentDecoder()
            )
            self.tomls[path] = toml_obj
            self.__files(toml_obj, os.path.dirname(path), self.tomls)
            self.values = [{ 'file': os.path.basename(key),'path': key, 'toml': self.tomls[key] } for key in self.tomls.keys()]

            children = []
            for obj in self.values:
                layout =  Layout(
                    width='100%',
                    grid_template_rows='auto auto',
                    grid_template_columns='35% 65%'
                )
                box = VBox((GridBox(layout=layout), Accordion()))
                schema = ''
                if 'schema' in obj['toml'] and obj['toml']['schema'] == 'lpy':
                    schema = 'lpy'
                    box = VBox((HBox(layout=Layout(
                        width='100%',
                        flex_flow='row wrap'
                    )), Accordion()))
                for key in obj['toml'].keys():
                    self.__widgets(obj['toml'][key], box, key, obj['file'], obj['path'], schema)
                children.append(box)

            tab.children = children
            for i in range(len(tab.children)):
                tab.set_title(i, self.values[i]['file'])

        super().__init__([tab], **kwargs)


    def __files(self, toml_thing, dirname, tomls={}):
        if isinstance(toml_thing, (dict, list)):
            for key in toml_thing:
                if isinstance(key, str):
                    self.__files(toml_thing[key], dirname, tomls)
        elif isinstance(toml_thing, str) and toml_thing[-5:] == '.toml':
            path = os.path.normpath(os.path.join(dirname, toml_thing))
            if path not in tomls:
                with io.open(path, 'r') as file:
                    tomls[path] = toml.loads(file.read())
                    self.__files(tomls[path], os.path.dirname(path), tomls)


    # def __widgets(self, toml, key='', file=None, path=''):
    #     if hasattr(toml, 'body'):
    #         return widgets.VBox([self.__widgets(toml[key], key, file, path) for key in toml.keys()])
    #     elif isinstance(toml, (dict, list)):
    #         acc = widgets.Accordion
    #         box = widgets.VBox([self.__widgets(toml[key], key, file, path) for key in toml])
    #         acc.children = [box]
    #         return acc
    #     else:
    #         print(key)
    #         lbl = widgets.Label(key + ' :')
    #         ipt = widgets.FloatText(toml) if isinstance(toml, (int, float)) else widgets.Text(toml)
    #         ipt.observe(on_change(file, toml, path))
    #         cmt = widgets.Label(toml.trivia.comment[1:].strip())
    #         return widgets.HBox([lbl, ipt, cmt])

    def __on_lpy_change(self, change):
        # print(change)
        owner = change['owner']
        if isinstance(owner, CurveEditorWidget):
            if not self.on_lpy_context_change is None:
                curve = NurbsCurve2D(Point3Array([Vector3(p[0], p[1], 1) for p in owner.control_points]))
                if owner.is_function:
                    curve = QuantisedFunction(curve)
                self.on_lpy_context_change(owner.name, curve)



    def __on_change(self, file, toml, key, path, is_comment=False):
    #    _file = file
    #    _toml = toml
    #    _path = path
        def fn(change):
            print(change)
            # if change['name'] == 'value':
            #     comment = 'comment' if is_comment else ''
            #     if is_comment:
            #         if len(toml.trivia.comment) == 0:
            #             toml.trivia.comment_ws = '  '
            #         toml.trivia.comment = '# ' + change['new']
            #     elif isinstance(toml, (int, float)):
            #         toml._raw = str(change['new'])
            #     elif isinstance(toml, str):
            #         toml._original = change['new']

            #     try:
            #         self.status.clear_output()
            #         with io.open(path, 'w') as toml_file:
            #             toml_file.write(tomlkit.dumps(file))
            #             with self.status:
            #                 print(f'saved "{key}" {comment} to {path} ...')
            #     except:
            #         print(f'error saving "{key}" {comment} to {path}')
        return fn

    def __widgets(self, toml_thing, box, key='', file=None, path='', schema=''):
        # print(toml_thing)
        if isinstance(toml_thing, (dict, list)):
            # print(key)
            if schema == 'lpy':
                for name in toml_thing.keys():
                    if 'NurbsCurve2D' in toml_thing[name]:
                        curve = toml_thing[name]['NurbsCurve2D']
                        grid = box.children[0]
                        ipt = CurveEditorWidget(name, curve, key == 'functions')
                        ipt.observe(self.__on_lpy_change, names='control_points')
                        # comment = curve.comment if hasattr(curve, 'comment') else ''
                        # cmt = Text(comment[comment.find('#')+1:].strip(), placeholder='comment', continuous_update=False, layout=Layout(width='auto', height='auto'))
                        grid.children = (*grid.children, VBox((Label(name), ipt)))
            else:
                for key in toml_thing.keys():
                    self.__widgets(toml_thing[key], box, key, file, path)
            # pass
            # acc = widgets.Accordion
            # box = widgets.VBox([self.__widgets(toml[key], key, file, path) for key in toml])
            # acc.children = [box]
            # return acc
        else:
            if key != 'schema':
                value = toml_thing.val if hasattr(toml_thing, 'comment') else toml_thing
                comment = toml_thing.comment if hasattr(toml_thing, 'comment') else ''
                grid = box.children[0]
                ipt = None
                layout=Layout(width='auto', height='auto')
                if isinstance(value, str):
                    #  style=DescriptionStyle(description_width='width:200px')
                    ipt = Text(value, description=key, continuous_update=False, layout=layout, style={'description_width': '150px'})
                elif isinstance(value, float):
                    ipt = FloatText(value, description=key, layout=layout, style={'description_width': '150px'})
                elif isinstance(value, int):
                    ipt = IntText(value, description=key, layout=layout, style={'description_width': '150px'})
                if ipt is not None:
                    ipt.observe(self.__on_change(file, toml, key, path))
                    cmt = Text(comment[comment.find('#')+1:].strip(), placeholder='comment', continuous_update=False, layout=Layout(width='auto', height='auto'))
                    cmt.observe(self.__on_change(file, toml, key, path, is_comment=True))
                    grid.children = (*grid.children, ipt, cmt)
