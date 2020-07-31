"""
TODO: Add module docstring
"""

from ipywidgets.widgets import (
    DOMWidget, Widget, register, VBox, HBox, Tab, Output, GridBox, Layout, Accordion,
    FloatText, IntText, Text, widget_serialization, Label, ColorPicker, Checkbox, IntSlider, FloatSlider,
    Dropdown, Button
)
from ipywidgets.widgets.widget_description import DescriptionStyle
from traitlets import Unicode, Instance, Bytes, Int, Float, Tuple, Dict, Bool, List, observe, UseEnum
from openalea.plantgl.all import Scene, Color3, tobinarystring as scene_to_bgeom, NurbsCurve2D, Point3Array, Vector3, QuantisedFunction
from openalea.lpy import Lsystem, LpyParsing, LsysContext
import random, string, io, os, toml, warnings, pprint, json, inspect, textwrap, zlib
from enum import Enum
from pathlib import Path
from jsonschema import validate, RefResolver, exceptions, draft7_format_checker
import openalea.plantgl.all as pgl

from ._frontend import module_name, module_version
from .editors import CurveEditor, CurveType

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
    return zlib.compress(scene_to_bgeom(scene, False), 9)

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

    size_display = Tuple(Int(400, min=400), Int(400, min=400), default_value=(400, 400)).tag(sync=True)
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
    derivationLength = Int(0, min=0).tag(sync=True)
    unit = UseEnum(Unit).tag(sync=True, to_json=lambda e, o: e.value)
    scene = Dict(traits={
        'data': Bytes(),
        'scene': Instance(Scene),
        'derivationStep': Int(0, min=0),
        'id': Int(0, min=0)
    }).tag(sync=True, to_json=scene_to_json)
    animate = Bool(False).tag(sync=True)
    dump = Unicode('').tag(sync=False)
    editor = None
    __codes = []
    __derivationStep = 0
    __lsystem = None

    def __init__(self, filename, options={}, unit=Unit.m, animate=False, dump='', **kwargs):
        self.__filename = filename if filename.endswith('.lpy') else filename + '.lpy'
        self.__lsystem = Lsystem()
        with io.open(self.__filename, 'r') as file:
            self.__codes = file.read().split(LpyParsing.InitialisationBeginTag)
            self.__codes.insert(1, f'\n{LpyParsing.InitialisationBeginTag}\n')
        if len(self.__codes) < 2:
            raise ValueError('No L-Py code found')
        # if a json file with the same name is present load context from the json file
        if Path(self.__filename[0:-3] + 'json').is_file():
            self.editor = ParameterEditor(self.__filename[0:-3] + 'json')
            self.editor.on_lpy_context_change = self.__on_lpy_context_change
            self.__on_lpy_context_change(self.editor.lpy_context)
        else:
            self.__initialize_lsystem()
            self.__set_scene(0)

        self.unit = unit
        self.animate = animate
        self.dump = dump
        self.on_msg(self.__on_custom_msg)

        super().__init__(**kwargs)

    def __initialize_lsystem(self):
        self.__lsystem.filename = self.__filename
        self.__lsystem.set(''.join(self.__codes), {})
        self.derivationLength = self.__lsystem.derivationLength
        self.__trees = []
        self.__trees.append(self.__lsystem.axiom)

    def __on_lpy_context_change(self, context_obj):
        if not self.animate:
            self.__codes[2] = self.__initialisation_function(context_obj)
            self.__lsystem.clear()
            self.__lsystem.filename = self.__filename
            self.__lsystem.set(''.join(self.__codes), {})
            self.derivationLength = self.__lsystem.derivationLength
            self.__trees = []
            self.__trees.append(self.__lsystem.axiom)
            self.__derivationStep = self.__derivationStep if self.__derivationStep < self.derivationLength else self.derivationLength - 1
            self.__derive(self.__derivationStep)

    def __initialisation_function(self, context_obj):
        def build_context(context_obj, context):
            for key, value in context_obj.items():
                if isinstance(value, dict):
                    if key == 'scalars':
                        for name, scalar in value.items():
                            context[name] = scalar['value']
                    elif key == 'materials':
                        for name, material in value.items():
                            context[name] = pgl.Material(
                                name=name,
                                ambient=material['ambient']
                            )
                            context.turtle.setMaterial(material['index'], context[name])
                    elif key == 'functions':
                        for name, function in value.items():
                            if 'NurbsCurve2D' in function:
                                points = function['NurbsCurve2D']
                                context[name] = pgl.QuantisedFunction(
                                    pgl.NurbsCurve2D(pgl.Point3Array([pgl.Vector3(p[0], p[1], 1) for p in points]))
                                )
                    elif key == 'curves':
                        for name, curve in value.items():
                            if 'NurbsCurve2D' in curve:
                                points = curve['NurbsCurve2D']
                                context[name] = pgl.NurbsCurve2D(pgl.Point3Array([pgl.Vector3(p[0], p[1], 1) for p in points]))

        codes = [
            f'\n__lpy_code_version__ = 1.1',
            f'\ndef {LsysContext.InitialisationFunctionName}(context):',
            f'\n    import openalea.plantgl.all as pgl',
            f'\n{textwrap.indent(textwrap.dedent(inspect.getsource(build_context)), "    ")}',
            f'\n    context_obj={str(context_obj)}',
            f'\n    build_context(context_obj, context)'
        ]

        return ''.join(codes)


    # @observe('animate')
    # def on_animate_changed(self, change):
    #     # print('on_animate_changed', change['old'], change['new'])
    #     if change['old'] and not change['new'] and self.scene['derivationStep'] < self.lsystem.derivationLength - 1:
    #         # print('__do_abort')
    #         __do_abort = True

    def __on_custom_msg(self, widget, content, buffers):
        if 'derive' in content:
            step = content['derive']
            if step < self.derivationLength:
                if step < len(self.__trees):
                    self.__set_scene(step)
                else:
                    self.__derive(step)
        elif 'rewind' in content:
            self.__rewind()

    def __rewind(self):
        self.__lsystem.clear()
        self.__derivationStep = 0
        with io.open(self.__filename, 'r') as file:
            self.__codes = file.read().split(LpyParsing.InitialisationBeginTag)
            self.__codes.insert(1, f'\n{LpyParsing.InitialisationBeginTag}\n')
        if len(self.__codes) < 2:
            raise ValueError('No L_Py code found')
        # if a json file with the same name is present load context from the json file
        if Path(self.__filename[0:-3] + 'json').is_file():
            self.editor = ParameterEditor(self.__filename[0:-3] + 'json')
            self.editor.on_lpy_context_change = self.__on_lpy_context_change
            self.__on_lpy_context_change(self.editor.lpy_context)
        else:
            self.__initialize_lsystem()
            self.__set_scene(0)

    def __set_scene(self, step):
        scene = self.__lsystem.sceneInterpretation(self.__trees[step])
        serialized = scene_to_bytes(scene) # bytes(scene_to_draco(scene, True).data) if self.compress else scene_to_bytes(scene)
        serialized_scene = {
            'data': serialized,
            'scene': scene,
            'derivationStep': step,
            'id': step
        }
        self.__derivationStep = step
        self.scene = serialized_scene
        if len(self.dump) > 0:
            os.makedirs(self.dump, exist_ok=True)
            file_type = 'bgeom'
            with io.open(os.path.join(self.dump, f'{self.__filename}_{step}.{file_type}'), 'wb') as file:
                file.write(zlib.decompress(serialized))

    def __derive(self, step):
        if step < self.derivationLength:
            while True:
                if step == len(self.__trees) - 1:
                    self.__set_scene(step)
                    break
                else:
                    self.__trees.append(self.__lsystem.derive(self.__trees[-1], len(self.__trees), 1))
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

class ParameterEditor(VBox):
    """TODO: Add docstring here
    """
    _model_name = Unicode('ParameterEditorModel').tag(sync=True)
    _model_module = Unicode(module_name).tag(sync=True)
    _model_module_version = Unicode(module_version).tag(sync=True)
    _view_name = Unicode('ParameterEditorView').tag(sync=True)
    _view_module = Unicode(module_name).tag(sync=True)
    _view_module_version = Unicode(module_version).tag(sync=True)

    # values = List([]).tag(sync=False)
    # widget = Instance(VBox).tag(sync=True, **widget_serialization)
    # files = {}
    # status = Output(layout={'border': '1px solid black'})
    lpy_context = {}
    __auto_update = False
    __auto_save = False
    __tab = Tab()
    __auto_update_cbx = Checkbox(description='Auto apply')
    __auto_save_cbx = Checkbox(description='Auto save')
    __apply_btn = Button(description='Apply changes')
    __save_btn = Button(description='Save changes')

    def __init__(self, filename, context=None, **kwargs):

        self.load_from_file(filename)
        super().__init__([VBox([
            HBox([
                self.__apply_btn,
                self.__auto_update_cbx,
                self.__save_btn,
                self.__auto_save_cbx
            ], layout=Layout(flex_flow='row wrap')),
            self.__tab
        ])], **kwargs)

    def load_from_file(self, filename):

        self.__filename = filename
        self.__tab = Tab()

        with io.open(self.__filename, 'r') as file:
            obj = {}
            if Path(self.__filename).suffix == '.toml':
                obj = toml.loads(file.read(), decoder=toml.TomlPreserveCommentDecoder())
            elif Path(self.__filename).suffix == '.json':
                obj = json.loads(file.read())
                if self.__validate(obj):
                    self.lpy_context = obj
                    children, titles = self.__build_gui(obj)
                    self.__tab .children = children
                    for i, title in enumerate(titles):
                        self.__tab .set_title(i, title)
                    self.__auto_update_cbx.observe(self.__on_auto_update_cbx_change, names='value')
                    self.__auto_save_cbx.observe(self.__on_auto_save_cbx_change, names='value')
                    self.__apply_btn.on_click(lambda x: self.on_lpy_context_change(self.lpy_context))
                    self.__save_btn.on_click(lambda x: self.__save_files())

    def __on_auto_update_cbx_change(self, change):
        self.__auto_update = change['owner'].value
        self.__apply_btn.disabled = self.__auto_update
        if self.__auto_update:
            self.on_lpy_context_change(self.lpy_context)

    def __on_auto_save_cbx_change(self, change):
        self.__auto_save = change['owner'].value
        self.__save_btn.disabled = self.__auto_save
        if self.__auto_save:
            self.__save_files()

    def on_lpy_context_change(self, context):
        pass

    def __build_gui(self, obj):
        path = os.path.normpath(os.path.abspath(self.__filename))
        files = {
            path: obj
        }
        self.__gather_files(obj, os.path.dirname(path), files)
        # self.values = [{ 'filename': os.path.basename(key), 'path': key, 'obj': files[key] } for key in files.keys()]

        children = []
        titles = []
        for path, obj in files.items():
            titles.append(os.path.basename(path))
            item_layout = Layout(
                margin='20px',
                flex_flow='row wrap'
            )
            menu_layout = Layout(
                margin='20px',
                flex_flow='row wrap'
            )
            # box = VBox((GridBox(layout=grid_layout), Accordion()))
            schema = ''
            if 'schema' in obj and obj['schema'] == 'lpy':
                schema = 'lpy'
                box_scalars = HBox(layout=item_layout)
                box_materials = HBox(layout=item_layout)
                box_functions = HBox(layout=item_layout)
                box_curves = HBox(layout=item_layout)
                acc = Accordion([
                    GridBox(layout=item_layout),
                    VBox([
                        HBox(self.__menu('scalars', box_scalars), layout=menu_layout),
                        box_scalars
                    ]),
                    VBox([
                        HBox(self.__menu('materials', box_materials), layout=menu_layout),
                        box_materials
                    ]),
                    VBox([
                        HBox(self.__menu('functions', box_functions), layout=menu_layout),
                        box_functions
                    ]),
                    VBox([
                        HBox(self.__menu('curves', box_curves), layout=menu_layout),
                        box_curves
                    ]),
                ])
                acc.set_title(0, 'misc')
                acc.set_title(1, 'scalars')
                acc.set_title(2, 'materials')
                acc.set_title(3, 'functions')
                acc.set_title(4, 'curves')
                # box = VBox((HBox(layout=Layout(
                #     width='100%',
                #     flex_flow='row wrap'
                # )), Accordion()))
            for key in obj.keys():
                self.__widgets(obj[key], acc, key, obj, path, schema)
            children.append(acc)

        return (children, titles)

    def __menu(self, section, box):
        btn = Button(description='Add')
        item = None
        ddn = Dropdown()
        if (section == 'scalars'):
            def add(self):
                if ddn.value == 'Integer':
                    item = IntSlider(value=5, min=0, max=10)
                elif ddn.value == 'Float':
                    item = FloatSlider(value=0.5, min=0, max=1, step=0.01)
                elif ddn.value == 'Bool':
                    item = Checkbox()
                box.children = (*box.children, item)
            ddn.options = ['Integer', 'Float', 'Bool']
        elif (section == 'materials'):
            def add(self):
                if ddn.value == 'Color':
                    item = ColorPicker(value='#eeeeee')
                box.children = (*box.children, item)
            ddn.options = ['Color']
        elif (section == 'functions'):
            def add(self):
                if ddn.value == 'NurbsCurve2D':
                    item = CurveEditor('new', CurveType.NURBS, [[-0.5,0], [-0.25, 0.25], [0.25, -0.25], [0.5,0]], is_function=True)
                box.children = (*box.children, item)
            ddn.options = ['NurbsCurve2D']
        elif (section == 'curves'):
            def add(self):
                if ddn.value == 'NurbsCurve2D':
                    item = CurveEditor('new', CurveType.NURBS, [[-0.5,0], [-0.25, 0.25], [0.25, -0.25], [0.5,0]], is_function=False)
                elif ddn.value == 'BezierCurve2D':
                    item = CurveEditor('new', CurveType.BEZIER, [[-0.5,0], [-0.25, 0.25], [0.25, -0.25], [0.5,0]], is_function=False)
                elif ddn.value == 'PolyLine2D':
                    item = CurveEditor('new', CurveType.POLY_LINE, [[-0.5,0], [-0.25, 0.25], [0.25, -0.25], [0.5,0]], is_function=False)
                box.children = (*box.children, item)
            ddn.options = ['NurbsCurve2D', 'BezierCurve2D', 'PolyLine2D']

        btn.on_click(add if add else lambda _: print('no item assigned'))

        return (btn, ddn)



    def __validate(self, obj):
        is_valid = False
        schema_path = os.path.join(os.path.dirname(__file__), 'schema')
        with io.open(os.path.join(schema_path, 'lpy.json'), 'r') as schema_file:
            schema = json.loads(schema_file.read())
            resolver = RefResolver(f'file:///{schema_path}/', schema)
            try:
                validate(obj, schema, format_checker=draft7_format_checker, resolver=resolver)
                is_valid = True
            except exceptions.ValidationError as e:
                print('L-Py schema validation failed:', e.message)
            except exceptions.RefResolutionError as e:
                print('JSON schema $ref file not found:', e)
        return is_valid


    def __gather_files(self, thing, dirname, files={}):
        if isinstance(thing, (dict, list)):
            for key in thing:
                if isinstance(key, str):
                    self.__gather_files(thing[key], dirname, files)
        elif isinstance(thing, str) and thing[-5:] == '.toml':
            path = os.path.normpath(os.path.join(dirname, thing))
            if path not in files:
                with io.open(path, 'r') as file:
                    files[path] = toml.loads(file.read())
                    self.__gather_files(files[path], os.path.dirname(path), files)


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
    #         txt = widgets.Label(key + ' :')
    #         ipt = widgets.FloatText(toml) if isinstance(toml, (int, float)) else widgets.Text(toml)
    #         ipt.observe(on_change(file, toml, path))
    #         cmt = widgets.Label(toml.trivia.comment[1:].strip())
    #         return widgets.HBox([txt, ipt, cmt])

    # def __on_lpy_change(self, change):
    #     owner = change['owner']
    #     if isinstance(owner, ColorPicker):
    #         hex = owner.value[1:] # rgb as hex
    #         color = [int(v, 16) for v in [hex[i:i+2] for i in range(0, 6, 2)]]
    #         print(owner.value)

        # if isinstance(owner, CurveEditor):
        #     if not self.on_lpy_context_change is None:
        #         curve = NurbsCurve2D(Point3Array([Vector3(p[0], p[1], 1) for p in owner.control_points]))
        #         if owner.is_function:
        #             curve = QuantisedFunction(curve)
        #         self.on_lpy_context_change(owner.name, curve)



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

    def __save_files(self):
        with io.open(self.__filename, 'w') as file:
            file.write(json.dumps(self.lpy_context, indent=4))

    def __observe_lpy(self, name, key):
        def fn(change):
            owner = change['owner']
            value = None
            if isinstance(owner, ColorPicker):
                rgb = owner.value[1:] # rgb as hex
                self.lpy_context[key][name]['ambient'] = [int(v, 16) for v in [rgb[i:i+2] for i in range(0, 6, 2)]]
            elif isinstance(owner, (Checkbox, IntSlider, FloatSlider)):
                self.lpy_context[key][name]['value'] = owner.value
            elif isinstance(owner, CurveEditor):
                self.lpy_context[key][name][owner.curve_type.value[0]] = owner.control_points
            if not value is None:
                self.lpy_context[key][name] = value

            if self.__auto_update:
                self.on_lpy_context_change(self.lpy_context)
            if self.__auto_save:
                self.__save_files()

        return fn

    def __widgets(self, thing, box, key='', file=None, path='', schema='', category=''):
        # print(thing)
        if isinstance(thing, (dict, list)):
            # print(key)
            if schema == 'lpy':
                if key == 'scalars':
                    layout = box.children[1].children[1]
                    for name in thing.keys():
                        ipt = None
                        txt = Text(name)
                        val = None
                        if isinstance(thing[name]['value'], bool):
                            val = thing[name]['value']
                            ipt = Checkbox(value=val)
                            layout.children = (*layout.children, VBox((txt, ipt)))
                        elif isinstance(thing[name]['value'], (int, float)):
                            val = thing[name]['value']
                            if thing[name]['type'] == 'Integer':
                                ipt = IntSlider(
                                    value=val,
                                    min=thing[name]['min'],
                                    max=thing[name]['max']
                                )
                                layout.children = (*layout.children, VBox((txt, ipt)))
                            elif thing[name]['type'] == 'Float':
                                ipt = FloatSlider(
                                    value=val,
                                    min=thing[name]['min'],
                                    max=thing[name]['max'],
                                    step=thing[name]['step']
                                )
                                layout.children = (*layout.children, VBox((txt, ipt)))

                        if not ipt is None and not txt is None:
                            ipt.observe(self.__observe_lpy(name, key), names='value')

                elif key == 'materials':
                    layout = box.children[2].children[1]
                    for name in thing.keys():
                        ipt = None
                        txt = Text(name)
                        val = None
                        if 'ambient' in thing[name]:
                            val = thing[name]['ambient']
                            ipt = ColorPicker(
                                value='#' + ''.join(format(v, "02x") for v in val),
                                description='ambient'
                            )
                            layout.children = (*layout.children, VBox((txt, ipt)))

                        if not ipt is None and not txt is None:
                            ipt.observe(self.__observe_lpy(name, key), names='value')

                elif key == 'functions':
                    layout = box.children[3].children[1]
                    for name in thing.keys():
                        ipt = None
                        txt = Text(name)
                        if 'NurbsCurve2D' in thing[name]:
                            control_points = thing[name]['NurbsCurve2D']
                            ipt = CurveEditor(name, CurveType.NURBS, control_points, key == 'functions')
                            layout.children = (*layout.children, VBox((txt, ipt)))

                        if not ipt is None and not txt is None:
                            ipt.observe(self.__observe_lpy(name, key), names='control_points')


                elif key == 'curves':
                    layout = box.children[4].children[1]
                    for name in thing.keys():
                        ipt = None
                        txt = Text(name)
                        val = None
                        if 'NurbsCurve2D' in thing[name]:
                            val = thing[name]['NurbsCurve2D']
                            ipt = CurveEditor(name, CurveType.NURBS, val, key == 'functions')
                            layout.children = (*layout.children, VBox((txt, ipt)))

                        if not ipt is None and not txt is None:
                            ipt.observe(self.__observe_lpy(name, key), names='control_points')

            else:
                for key in thing.keys():
                    self.__widgets(thing[key], box, key, file, path)
            # pass
            # acc = widgets.Accordion
            # box = widgets.VBox([self.__widgets(toml[key], key, file, path) for key in toml])
            # acc.children = [box]
            # return acc
        else:
            if key != 'schema':
                value = thing.val if hasattr(thing, 'comment') else thing
                comment = thing.comment if hasattr(thing, 'comment') else ''
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
