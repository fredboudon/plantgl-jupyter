"""
TODO: Add module docstring
"""

import warnings
import random
import string
import io
import os
import inspect
import textwrap
import zlib
import json
from enum import Enum
from pathlib import Path

from ipywidgets.widgets import DOMWidget, register
from traitlets import (
    Unicode, Instance,
    Bytes, Int, Float, Tuple, Dict, Bool, List, UseEnum
)

import openalea.plantgl.all as pgl
import openalea.lpy as lpy
from openalea.lpy.lsysparameters import LsystemParameters

from .editors import ParameterEditor, make_default_lpy_context, DotDict
from ._frontend import module_name, module_version


class Unit(Enum):
    none = -1
    m = 0
    dm = 1
    cm = 2
    mm = 3


# TODO: serialize in thread?
def scene_to_bytes(scene):
    # serialized = pgl_scene_to_bytes(scene, single_mesh)
    # if not serialized.status:
    #     raise ValueError('scene serialization failed')
    return zlib.compress(pgl.tobinarystring(scene, False), 9)


def scene_to_json(x, obj):
    if isinstance(x, dict):
        return {k: scene_to_json(v, obj) for k, v in x.items()}
    elif isinstance(x, (list, tuple)):
        return [scene_to_json(v, obj) for v in x]
    elif isinstance(x, pgl.Scene):
        return str(x)
    else:
        return x


def to_scene(obj):
    scene = pgl.Scene()
    if obj is None:
        pass
    elif isinstance(obj, pgl.Scene):
        scene = obj
    else:
        if isinstance(obj, list):
            scene = pgl.Scene(obj)
        else:
            scene = pgl.Scene([obj])
    return scene


class PseudoContext(dict):

    __materials = []
    __options = {}
    __items = {}

    def __init__(self, **kwargs):
        self.turtle = DotDict({
            'setMaterial': self.__set_material
        })
        self.options = DotDict({
            'setSelection': self.__set_selection
        })

    def __setitem__(self, key, value):
        self.__items[key] = value

    def __set_material(self, index, material):
        self.__materials.append({
            'index': index,
            'material': material
        })

    def __set_selection(self, key, value):
        self.__options[key] = value

    def get_context_obj(self):
        context = make_default_lpy_context()

        for m in self.__materials:
            material = m['material']
            if isinstance(material, pgl.Material):
                context.materials.append({
                    'index': m['index'],
                    'name': material.name,
                    'ambient': [material.ambient.red, material.ambient.green, material.ambient.blue],
                    'specular': [material.specular.red, material.specular.green, material.specular.blue],
                    'emission': [material.emission.red, material.emission.green, material.emission.blue],
                    'diffuse': material.diffuse,
                    'transparency': material.transparency,
                    'shininess': material.shininess
                })
            else:
                warnings.warn('Texture2D currently not supported')

        category_by_name = {}
        if '__scalars__' in self.__items:
            for s in self.__items['__scalars__']:
                if s[1] == 'Category':
                    context.parameters.append(DotDict({
                        'name': s[0],
                        'enabled': True,
                        'scalars': [],
                        'curves': []
                    }))
                    category_by_name[s[0]] = context.parameters[-1]
                else:
                    if len(context.parameters) == 0:
                        context.parameters.append(DotDict({
                            'name': 'Category',
                            'enabled': True,
                            'scalars': [],
                            'curves': []
                        }))
                    if s[1] == 'Bool':
                        context.parameters[-1].scalars.append({
                            'name': s[0],
                            'value': s[2]
                        })
                    else:
                        context.parameters[-1].scalars.append({
                            'name': s[0],
                            'type': s[1],
                            'value': s[2],
                            'min': s[3],
                            'max': s[4],
                            'step': s[5] if s[1] == 'Float' else 1
                        })
        if '__parameterset__' in self.__items:
            for s in self.__items['__parameterset__']:
                if s[0]['name'] in category_by_name:
                    parameters = category_by_name[s[0]['name']]
                else:
                    parameters = DotDict({
                        'name': s[0]['name'],
                        'enabled': s[0]['active'],
                        'scalars': [],
                        'curves': []
                    })
                    context.parameters.append(parameters)
                for p in s[1]:
                    if isinstance(p[1], pgl.NurbsPatch):
                        warnings.warn('NurbsPatch currently not supported')
                        continue
                    if isinstance(p[1], pgl.BezierCurve2D):
                        type = 'BezierCurve2D'
                    elif isinstance(p[1], pgl.Polyline2D):
                        type = 'Polyline2D'
                    elif isinstance(p[1], pgl.NurbsCurve2D):
                        type = 'NurbsCurve2D'
                    else:
                        raise ValueError(f'{p[1]} not a valid curve instance')
                    if p[0] == 'Curve2D':
                        curve = DotDict({
                            'name': p[1].name,
                            'type': type
                        })
                        if type == 'Polyline2D':
                            curve['points'] = [[v[0], v[1]] for v in p[1].pointList]
                        else:
                            curve['points'] = [[v[0], v[1]] for v in p[1].ctrlPointList]
                        if type == 'NurbsCurve2D':
                            curve['is_function'] = False
                        parameters.curves.append(curve)
                    elif p[0] == 'Function':
                        parameters.curves.append(DotDict({
                            'name': p[1].name,
                            'type': 'NurbsCurve2D',
                            'points': [[v[0], v[1]] for v in p[1].ctrlPointList],
                            'is_function': True
                        }))

        return context


def serialize_scene(scene):
    return scene_to_bytes(scene)


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
    size_world = Float(1.0, min=0.1).tag(sync=True)
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
        'scene': Instance(pgl.Scene),
        'position': Tuple(Float(0.0), Float(0.0), Float(0.0)),
        'scale': Float(1.0)
    })).tag(sync=True, to_json=scene_to_json)
    # compress = Bool(False).tag(sync=False)

    def __init__(self, obj=None, position=(0.0, 0.0, 0.0), scale=1.0, **kwargs):
        scene = to_scene(obj)
        serialized = serialize_scene(scene)  # bytes(scene_to_draco(scene, True).data) if self.compress else scene_to_bytes(scene)
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
    def add(self, obj, position=(0, 0, 0), scale=1.0):
        scene = to_scene(obj)
        serialized = serialize_scene(scene)  # bytes(scene_to_draco(scene, True).data) if self.compress else scene_to_bytes(scene)
        self.scenes.append({
            'id': ''.join(random.choices(string.ascii_letters + string.digits, k=25)),
            'data': serialized,
            'scene': scene,
            'position': position,
            'scale':  scale
        })
        self.send_state('scenes')

    def set_scenes(self, objs, scales=1., positions=(0., 0., 0.)):
        scenes = []
        for i, obj in enumerate(objs):
            scene = to_scene(obj)
            serialized = serialize_scene(scene)
            scenes.append({
                'id': ''.join(random.choices(string.ascii_letters + string.digits, k=25)),
                'data': serialized,
                'scene': scene,
                'position': positions[i] if type(positions) == list else (0., 0., 0.),
                'scale':  scales[i] if type(scales) == list else 1.
            })
        self.scenes = scenes


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

    __trees = []
    __filename = None
    __do_abort = False

    units = Unit
    derivationLength = Int(0, min=0).tag(sync=True)
    unit = UseEnum(Unit, default_value=Unit.none).tag(sync=True, to_json=lambda e, o: e.value)
    scene = Dict(traits={
        'data': Bytes(),
        'scene': Instance(pgl.Scene),
        'derivationStep': Int(0, min=0),
        'id': Int(0, min=0)
    }).tag(sync=True, to_json=scene_to_json)
    animate = Bool(False).tag(sync=True)
    dump = Unicode('').tag(sync=False)
    is_magic = Bool(False).tag(sync=True)
    progress = Float(0.0).tag(sync=True)

    __editor = None
    __codes = []
    __derivationStep = 0
    __in_queue = 0
    __out_queue = 0
    __lsystem = None
    __extra_context = {}

    def __init__(self, filename=None, code=None, unit=Unit.none, animate=False, dump='', context={}, **kwargs):

        if filename:
            if filename.endswith('.lpy'):
                self.__filename = filename
            else:
                self.__filename = str(filename) + '.lpy'

        if not self.__filename and not code:
            raise ValueError('Neither lpy file nor code provided')

        self.__lsystem = lpy.Lsystem()
        self.__extra_context = context
        code_ = ''
        if self.__filename and Path(self.__filename).is_file():
            with io.open(self.__filename, 'r') as file:
                code_ = file.read()
        else:
            self.is_magic = True
            code_ = code

        if not code_:
            raise ValueError('Neither lpy file nor code provided')

        self.__codes = code_.split(lpy.LpyParsing.InitialisationBeginTag)
        initialise_context_code = self.__codes[1] if len(self.__codes) > 1 else ''
        self.__codes.insert(1, f'\n{lpy.LpyParsing.InitialisationBeginTag}\n')

        if self.__filename and Path(self.__filename[0:-3] + 'json').is_file():
            self.__editor = ParameterEditor(self.__filename[0:-3] + 'json')
            self.__editor.on_lpy_context_change = self.__on_lpy_context_change
            self.__on_lpy_context_change(self.__editor.lpy_context)
        elif self.__filename:
            scope = {}
            exec(compile(initialise_context_code + '\n', '<string>', 'exec'), scope)
            if '__initialiseContext__' in scope:
                pc = PseudoContext()
                scope['__initialiseContext__'](pc)
                context_obj = pc.get_context_obj()
                if ParameterEditor.validate_schema(context_obj):
                    with io.open(self.__filename[0:-3] + 'json', 'w') as file:
                        file.write(json.dumps(context_obj, indent=4))
                    self.__editor = ParameterEditor(self.__filename[0:-3] + 'json')
                    self.__editor.on_lpy_context_change = self.__on_lpy_context_change
                    self.__on_lpy_context_change(self.__editor.lpy_context)
            else:
                self.__initialize_lsystem()
                self.__set_scene(0)
        else:
            self.__initialize_lsystem()
            self.__set_scene(0)

        self.unit = unit
        self.animate = animate
        self.dump = dump
        self.on_msg(self.__on_custom_msg)

        super().__init__(**kwargs)

    @property
    def editor(self):
        if self.__filename:
            filename = self.__filename[0:-3] + 'json'
            if self.__editor is None and not Path(filename).exists():
                lpy_context = make_default_lpy_context()
                if ParameterEditor.validate_schema(lpy_context):
                    with io.open(filename, 'w') as file:
                        file.write(json.dumps(lpy_context, indent=4))
                    self.__editor = ParameterEditor(filename)
                    self.__editor.on_lpy_context_change = self.__on_lpy_context_change
            return self.__editor
        else:
            return None

    def get_lstring(self):
        if self.__derivationStep < len(self.__trees):
            return lpy.Lstring(self.__trees[self.__derivationStep])
        return lpy.Lstring()

    def get_namespace(self):
        result = {}
        result.update(self.__lsystem.context().globals())
        return result

    def set_parameters(self, parameters):
        """Update Lsystem parameters in context.

        Parameters
        ----------
        parameters : json
            A valid parameter json string.
        """

        if not self.animate:
            lp = LsystemParameters()
            try:
                lp.loads(parameters)
            except AssertionError:
                return False
            self.__lsystem.clear()
            self.__lsystem.set(''.join([
                self.__codes[0],
                lp.generate_py_code()
            ]), {})
            self.derivationLength = self.__lsystem.derivationLength + 1
            self.__trees = []
            self.__trees.append(self.__lsystem.axiom)
            self.__derivationStep = self.__derivationStep if self.__derivationStep < self.derivationLength else self.derivationLength - 1
            self.__derive(self.__derivationStep)
            return True

        return False

    def __initialize_lsystem(self):
        self.__lsystem.filename = self.__filename if self.__filename else ''
        self.__lsystem.set(''.join(self.__codes), self.__extra_context)
        # context = self.__lsystem.context()
        # for key, value in self.__extra_context.items():
        #     context[key] = value
        self.derivationLength = self.__lsystem.derivationLength + 1
        self.__trees = [self.__lsystem.axiom]

    def __on_lpy_context_change(self, context_obj):
        if not self.animate:
            self.__in_queue = self.__in_queue + 1
            # TODO: find a better solution for progress. Easier if lpy is moved to thread
            self.progress = self.__out_queue / self.__in_queue
            self.send_state('progress')
            if len(self.__codes) == 2:
                self.__codes.append(self.__initialisation_function(context_obj))
            else:
                self.__codes[2] = self.__initialisation_function(context_obj)
            self.__lsystem.clear()
            self.__lsystem.filename = self.__filename
            self.__lsystem.set(''.join(self.__codes), {})
            self.derivationLength = self.__lsystem.derivationLength + 1
            self.__trees = []
            self.__trees.append(self.__lsystem.axiom)
            self.__derivationStep = self.__derivationStep if self.__derivationStep < self.derivationLength else self.derivationLength - 1
            self.__derive(self.__derivationStep)
            self.__out_queue = self.__out_queue + 1
            self.progress = self.__out_queue / self.__in_queue
            if self.progress == 1:
                self.__out_queue = self.__in_queue = 0

    def __initialisation_function(self, context_obj):
        def build_context(context_obj, context):
            for material in context_obj['materials']:
                material = dict(material)
                index = material.pop('index')
                name = material.pop('name')
                context[name] = pgl.Material(**material)
                context.turtle.setMaterial(index, context[name])
            for catergory in context_obj['parameters']:
                if catergory['enabled']:
                    for scalar in catergory['scalars']:
                        context[scalar['name']] = scalar['value']
                    for curve in catergory['curves']:
                        if curve['type'] == 'NurbsCurve2D':
                            if curve['is_function']:
                                context[curve['name']] = pgl.QuantisedFunction(
                                    pgl.NurbsCurve2D(pgl.Point3Array([pgl.Vector3(p[0], p[1], 1) for p in curve['points']]))
                                )
                            else:
                                context[curve['name']] = pgl.NurbsCurve2D(pgl.Point3Array([pgl.Vector3(p[0], p[1], 1) for p in curve['points']]))
                        elif curve['type'] == 'BezierCurve2D':
                            context[curve['name']] = pgl.BezierCurve2D(pgl.Point3Array([pgl.Vector3(p[0], p[1], 1) for p in curve['points']]))
                        elif curve['type'] == 'Polyline2D':
                            context[curve['name']] = pgl.Polyline2D(pgl.Point3Array([pgl.Vector3(p[0], p[1], 1) for p in curve['points']]))

            # for key, value in context_obj.items():
            #     if isinstance(value, dict):
            #         if key == 'scalars':
            #             for name, scalar in value.items():
            #                 context[name] = scalar['value']
            #         elif key == 'materials':
            #             for name, material in value.items():
            #                 m = dict(material)
            #                 index = m.pop('index')
            #                 context[name] = pgl.Material(**m)
            #                 context.turtle.setMaterial(index, context[name])
            #         elif key == 'functions':
            #             for name, function in value.items():
            #                 if 'NurbsCurve2D' in function:
            #                     points = function['NurbsCurve2D']
            #                     context[name] = pgl.QuantisedFunction(
            #                         pgl.NurbsCurve2D(pgl.Point3Array([pgl.Vector3(p[0], p[1], 1) for p in points]))
            #                     )
            #         elif key == 'curves':
            #             for name, curve in value.items():
            #                 if 'NurbsCurve2D' in curve:
            #                     points = curve['NurbsCurve2D']
            #                     context[name] = pgl.NurbsCurve2D(pgl.Point3Array([pgl.Vector3(p[0], p[1], 1) for p in points]))

        codes = [
            '\n__lpy_code_version__ = 1.1',
            f'\ndef {lpy.LsysContext.InitialisationFunctionName}(context):',
            '\n    import openalea.plantgl.all as pgl',
            f'\n{textwrap.indent(textwrap.dedent(inspect.getsource(build_context)), "    ")}',
            f'\n    context_obj={str(context_obj)}',
            '\n    build_context(context_obj, context)'
        ]

        return ''.join(codes)

    # @observe('animate')
    # def on_animate_changed(self, change):
    #     # print('on_animate_changed', change['old'], change['new'])
    #     if change['old'] and not change['new']:
    #         print('__do_abort')
    #         # __do_abort = True

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

        if self.__filename:
            with io.open(self.__filename, 'r') as file:
                self.__codes = file.read().split(lpy.LpyParsing.InitialisationBeginTag)
                self.__codes.insert(1, f'\n{lpy.LpyParsing.InitialisationBeginTag}\n')
            if len(self.__codes) < 2:
                raise ValueError('No L_Py code found')
            if self.__editor is not None:
                self.__on_lpy_context_change(self.__editor.lpy_context)
            elif Path(self.__filename[0:-3] + 'json').is_file():
                self.__editor = ParameterEditor(self.__filename[0:-3] + 'json')
                self.__editor.on_lpy_context_change = self.__on_lpy_context_change
                self.__on_lpy_context_change(self.__editor.lpy_context)
            else:
                self.__initialize_lsystem()
                self.__set_scene(0)
        else:
            self.__initialize_lsystem()
            self.__set_scene(0)

    def __set_scene(self, step):
        # print('__set_scene', step, self.__trees)
        scene = self.__lsystem.sceneInterpretation(self.__trees[step])
        serialized = serialize_scene(scene)  # bytes(scene_to_draco(scene, True).data) if self.compress else scene_to_bytes(scene)
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
                # print('__derive', step)
                if step == len(self.__trees) - 1:
                    self.__set_scene(step)
                    break
                else:
                    self.__trees.append(self.__lsystem.derive(self.__trees[-1], len(self.__trees), 1))
        else:
            raise ValueError(f'derivation step {step} out of Lsystem bounds')
