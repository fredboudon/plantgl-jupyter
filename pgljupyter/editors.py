"""
TODO: Add module docstring
"""

import os
import io
import json
import re
import toml
from pathlib import Path
from enum import Enum

from ipywidgets.widgets import (
    register, DOMWidget,  VBox, HBox, Tab, Layout, Accordion, Dropdown, Button,
    FloatText, IntText, Text, ColorPicker, Checkbox, IntSlider, FloatSlider, BoundedFloatText,
    BoundedIntText
)
from jsonschema import validate, RefResolver, exceptions, draft7_format_checker
from traitlets import Unicode, List, Float, Bool, UseEnum, Int

from ._frontend import module_name, module_version


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

class CurveType(Enum):
    NURBS = 'NurbsCurve2D',
    BEZIER = 'BezierCurve2D',
    POLY_LINE = 'Polyline2D'


_property_name_regex = re.compile('^[^\\d\\W]\\w*\\Z')


@register
class _CurveEditor(DOMWidget):
    """TODO: Add docstring here
    """
    _model_name = Unicode('_CurveEditorModel').tag(sync=True)
    _model_module = Unicode(module_name).tag(sync=True)
    _model_module_version = Unicode(module_version).tag(sync=True)
    _view_name = Unicode('_CurveEditorView').tag(sync=True)
    _view_module = Unicode(module_name).tag(sync=True)
    _view_module_version = Unicode(module_version).tag(sync=True)

    curve_type = UseEnum(CurveType).tag(sync=True, to_json=lambda e, o: e.value)
    control_points = List(trait=List(trait=Float(), minlen=2, maxlen=2), minlen=2).tag(sync=True)
    is_function = Bool(False).tag(sync=True)

    def __init__(self, curve_type, control_points, is_function=False, **kwargs):
        self.curve_type = curve_type
        self.control_points = control_points
        self.is_function = is_function
        super().__init__(**kwargs)


@register
class CurveEditor(HBox):
    """TODO: Add docstring here
    """
    _model_name = Unicode('CurveEditorModel').tag(sync=True)
    _model_module = Unicode(module_name).tag(sync=True)
    _model_module_version = Unicode(module_version).tag(sync=True)
    _view_name = Unicode('CurveEditorView').tag(sync=True)
    _view_module = Unicode(module_name).tag(sync=True)
    _view_module_version = Unicode(module_version).tag(sync=True)

    __text = None
    __curve_editor = None
    __validator = None

    name = Unicode('').tag(sync=False)
    value = List(trait=List(trait=Float(), minlen=2, maxlen=2), minlen=2).tag(sync=False)

    def __init__(self, name, validator, curve_type, control_points, is_function=False, **kwargs):
        self.name = name
        self.__validator = validator
        self.__text = Text(name, description='name')
        self.__text.continuous_update = False
        self.__curve_editor = _CurveEditor(curve_type, control_points, is_function)
        self.__text.observe(self.__on_name_changed, names='value')
        self.__curve_editor.observe(self.__on_curve_changed, names='control_points')
        kwargs['children'] = [
            self.__text,
            self.__curve_editor
        ]
        kwargs['layout'] = Layout(margin='20px 0px')
        super().__init__(**kwargs)

    def __on_name_changed(self, change):
        if self.__validator(self.__text.value):
            self.name = self.__text.value
        else:
            self.__text.unobserve(self.__on_name_changed, names='value')
            self.__text.value = change['old']
            self.__text.observe(self.__on_name_changed, names='value')

    def __on_curve_changed(self, change):
        self.value = self.__curve_editor.control_points

    @property
    def curve_type(self):
        return self.__curve_editor.curve_type.value[0]


@register
class IntEditor(HBox):
    """TODO: Add docstring here
    """
    _model_name = Unicode('IntEditorModel').tag(sync=True)
    _model_module = Unicode(module_name).tag(sync=True)
    _model_module_version = Unicode(module_version).tag(sync=True)
    _view_name = Unicode('IntEditorView').tag(sync=True)
    _view_module = Unicode(module_name).tag(sync=True)
    _view_module_version = Unicode(module_version).tag(sync=True)

    __text = None
    __slider = None
    __min_ipt = None
    __max_ipt = None
    __validator = None

    name = Unicode('').tag(sync=False)
    value = Int(0).tag(sync=False)

    def __init__(self, name, validator, value, min=1, max=10, **kwargs):
        self.name = name
        self.value = value
        self.__validator = validator
        self.__text = Text(name, description='name')
        self.__text.continuous_update = False
        self.__slider = IntSlider(value, min, max, description='value')
        self.__min_ipt = IntText(min, description='min')
        self.__max_ipt = IntText(max, description='max')
        self.__text.observe(self.__on_name_changed, names='value')
        self.__slider.observe(self.__on_slider_changed, names='value')
        self.__min_ipt.observe(self.__on_min_changed, names='value')
        self.__max_ipt.observe(self.__on_max_changed, names='value')
        kwargs['children'] = [
            self.__text,
            self.__slider,
            self.__min_ipt,
            self.__max_ipt
        ]
        kwargs['layout'] = Layout(margin='20px 0px')
        super().__init__(**kwargs)

    def __on_min_changed(self, change):
        if self.__min_ipt.value < self.__slider.max:
            self.__slider.min = self.__min_ipt.value
        else:
            self.__min_ipt.value = self.__slider.max - 1

    def __on_max_changed(self, change):
        if self.__max_ipt.value > self.__slider.min:
            self.__slider.max = self.__max_ipt.value
        else:
            self.__max_ipt.value = self.__slider.min + 1

    def __on_slider_changed(self, change):
        self.value = self.__slider.value

    def __on_name_changed(self, change):
        if self.__validator(self.__text.value):
            self.name = self.__text.value
        else:
            self.__text.unobserve(self.__on_name_changed, names='value')
            self.__text.value = change['old']
            self.__text.observe(self.__on_name_changed, names='value')


@register
class FloatEditor(HBox):
    """TODO: Add docstring here
    """
    _model_name = Unicode('FloatEditorModel').tag(sync=True)
    _model_module = Unicode(module_name).tag(sync=True)
    _model_module_version = Unicode(module_version).tag(sync=True)
    _view_name = Unicode('FloatEditorView').tag(sync=True)
    _view_module = Unicode(module_name).tag(sync=True)
    _view_module_version = Unicode(module_version).tag(sync=True)

    __text = None
    __slider = None
    __min_ipt = None
    __max_ipt = None
    __step_ipt = None
    __validator = None

    name = Unicode('').tag(sync=False)
    value = Float(0.0).tag(sync=False)

    def __init__(self, name, validator, value, min=0, max=1, step=0.01, **kwargs):
        self.name = name
        self.value = value
        self.__validator = validator
        self.__text = Text(name, description='name')
        self.__text.continuous_update = False
        self.__slider = FloatSlider(value, min=min, max=max, step=step, description='value')
        self.__min_ipt = FloatText(min, description='min')
        self.__max_ipt = FloatText(max, description='max')
        self.__step_ipt = BoundedFloatText(step, description='step', min=0.01, max=1, step=step)
        self.__text.observe(self.__on_name_changed, names='value')
        self.__slider.observe(self.__on_slider_changed, names='value')
        self.__min_ipt.observe(self.__on_min_changed, names='value')
        self.__max_ipt.observe(self.__on_max_changed, names='value')
        self.__step_ipt.observe(self.__on_step_changed, names='value')

        kwargs['children'] = [
            self.__text,
            self.__slider,
            self.__min_ipt,
            self.__max_ipt,
            self.__step_ipt
        ]
        kwargs['layout'] = Layout(margin='20px 0px')
        super().__init__(**kwargs)

    def __on_min_changed(self, change):
        if self.__min_ipt.value < self.__slider.max:
            self.__slider.min = self.__min_ipt.value
        else:
            self.__min_ipt.value = self.__slider.max - self.__step_ipt.value

    def __on_max_changed(self, change):
        if self.__max_ipt.value > self.__slider.min:
            self.__slider.max = self.__max_ipt.value
        else:
            self.__max_ipt.value = self.__slider.min + self.__step_ipt.value

    def __on_step_changed(self, change):
        self.__slider.step = self.__step_ipt.value

    def __on_slider_changed(self, change):
        self.value = self.__slider.value

    def __on_name_changed(self, change):
        if self.__validator(self.__text.value):
            self.name = self.__text.value
        else:
            self.__text.unobserve(self.__on_name_changed, names='value')
            self.__text.value = change['old']
            self.__text.observe(self.__on_name_changed, names='value')


@register
class BoolEditor(HBox):
    """TODO: Add docstring here
    """
    _model_name = Unicode('BoolEditorModel').tag(sync=True)
    _model_module = Unicode(module_name).tag(sync=True)
    _model_module_version = Unicode(module_version).tag(sync=True)
    _view_name = Unicode('BoolEditorView').tag(sync=True)
    _view_module = Unicode(module_name).tag(sync=True)
    _view_module_version = Unicode(module_version).tag(sync=True)

    __text = None
    __checkbox = None

    name = Unicode('').tag(sync=False)
    value = Bool(False).tag(sync=False)

    def __init__(self, name, validator, value, **kwargs):
        self.name = name
        self.value = value
        self.__validator = validator
        self.__text = Text(name, description='name')
        self.__text.continuous_update = False
        self.__text.observe(self.__on_name_changed, names='value')
        self.__checkbox = Checkbox(value, description='value')
        self.__checkbox.observe(self.__on_checkbox_changed, names='value')
        kwargs['children'] = [
            self.__text,
            self.__checkbox
        ]
        kwargs['layout'] = Layout(margin='20px 0px')
        super().__init__(**kwargs)

    def __on_checkbox_changed(self, change):
        self.value = change['new']

    def __on_name_changed(self, change):
        if self.__validator(self.__text.value):
            self.name = self.__text.value
        else:
            self.__text.unobserve(self.__on_name_changed, names='value')
            self.__text.value = change['old']
            self.__text.observe(self.__on_name_changed, names='value')


@register
class StringEditor(HBox):
    """TODO: Add docstring here
    """
    _model_name = Unicode('StringEditorModel').tag(sync=True)
    _model_module = Unicode(module_name).tag(sync=True)
    _model_module_version = Unicode(module_version).tag(sync=True)
    _view_name = Unicode('StringEditorView').tag(sync=True)
    _view_module = Unicode(module_name).tag(sync=True)
    _view_module_version = Unicode(module_version).tag(sync=True)

    __text = None
    __text_2 = None

    name = Unicode('').tag(sync=False)
    value = Unicode('').tag(sync=False)

    def __init__(self, name, validator, value, **kwargs):
        self.name = name
        self.value = value
        self.__validator = validator
        self.__text = Text(name, description='name')
        self.__text.continuous_update = False
        self.__text.observe(self.__on_name_changed, names='value')
        self.__text_2 = Text(value, description='value')
        self.__text_2.observe(self.__on_text_2_changed, names='value')
        kwargs['children'] = [
            self.__text,
            self.__text_2
        ]
        kwargs['layout'] = Layout(margin='20px 0px')
        super().__init__(**kwargs)

    def __on_text_2_changed(self, change):
        self.value = change['new']

    def __on_name_changed(self, change):
        if self.__validator(self.__text.value):
            self.name = self.__text.value
        else:
            self.__text.unobserve(self.__on_name_changed, names='value')
            self.__text.value = change['old']
            self.__text.observe(self.__on_name_changed, names='value')


@register
class MaterialEditor(HBox):
    """TODO: Add docstring here
    """
    _model_name = Unicode('MaterialEditorModel').tag(sync=True)
    _model_module = Unicode(module_name).tag(sync=True)
    _model_module_version = Unicode(module_version).tag(sync=True)
    _view_name = Unicode('MaterialEditorView').tag(sync=True)
    _view_module = Unicode(module_name).tag(sync=True)
    _view_module_version = Unicode(module_version).tag(sync=True)

    __text = None
    __index = None
    __ambient = None
    __specular = None
    __emission = None
    __diffuse = None
    __transparency = None
    __shininess = None
    __validator = None

    name = Unicode('').tag(sync=False)
    index = Int().tag(sync=False)
    ambient = List().tag(sync=False)
    specular = List().tag(sync=False)
    emission = List().tag(sync=False)
    diffuse = Float().tag(sync=False)
    transparency = Float().tag(sync=False)
    shininess = Float().tag(sync=False)

    def __init__(self, name, validator, index, ambient=[80, 80, 80], specular=[40, 40, 40], emission=[0, 0, 0], diffuse=0.75, transparency=0, shininess=0.5, **kwargs):
        self.name = name
        self.index = index
        self.ambient = ambient
        self.specular = specular
        self.emission = emission
        self.diffuse = diffuse
        self.transparency = transparency
        self.shininess = shininess
        self.__validator = validator
        self.__text = Text(name, description='name')
        self.__text.continuous_update = False
        self.__index = BoundedIntText(value=index, description='index', min=0)
        self.__ambient = ColorPicker(value='#' + ''.join(format(v, "02x") for v in ambient), description='ambient')
        self.__specular = ColorPicker(value='#' + ''.join(format(v, "02x") for v in specular), description='specular')
        self.__emission = ColorPicker(value='#' + ''.join(format(v, "02x") for v in emission), description='emission')
        self.__diffuse = FloatSlider(value=diffuse, description='diffuse', min=0, max=1)
        self.__transparency = FloatSlider(value=transparency, description='transparency', min=0, max=1)
        self.__shininess = FloatSlider(value=shininess, description='shininess', min=0, max=1)
        self.__text.observe(self.__on_name_changed, names='value')
        self.__index.observe(self.__on_index_changed, names='value')
        self.__ambient.observe(self.__on_ambient_changed, names='value')
        self.__specular.observe(self.__on_specular_changed, names='value')
        self.__emission.observe(self.__on_emission_changed, names='value')
        self.__diffuse.observe(self.__on_diffuse_changed, names='value')
        self.__transparency.observe(self.__on_transparency_changed, names='value')
        self.__shininess.observe(self.__on_shininess_changed, names='value')

        super().__init__([
            self.__text,
            self.__index,
            self.__ambient,
            self.__specular,
            self.__emission,
            self.__diffuse,
            self.__transparency,
            self.__shininess
        ], **kwargs)

    def __rgb_to_list(self, rgb):
        return [int(v, 16) for v in [rgb[1:][i:i+2] for i in range(0, 6, 2)]]

    def __on_name_changed(self, change):
        if self.__validator(self.__text.value):
            self.name = self.__text.value
        else:
            self.__text.unobserve(self.__on_name_changed, names='value')
            self.__text.value = change['old']
            self.__text.observe(self.__on_name_changed, names='value')

    def __on_index_changed(self, change):
        self.index = self.__index.value

    def __on_ambient_changed(self, change):
        self.ambient = self.__rgb_to_list(self.__ambient.value)

    def __on_specular_changed(self, change):
        self.specular = self.__rgb_to_list(self.__specular.value)

    def __on_emission_changed(self, change):
        self.emission = self.__rgb_to_list(self.__emission.value)

    def __on_diffuse_changed(self, change):
        self.diffuse = self.__diffuse.value

    def __on_transparency_changed(self, change):
        self.transparency = self.__transparency.value

    def __on_shininess_changed(self, change):
        self.shininess = self.__shininess.value


class ParameterEditor(VBox):
    """TODO: Add docstring here
    """
    _model_name = Unicode('ParameterEditorModel').tag(sync=True)
    _model_module = Unicode(module_name).tag(sync=True)
    _model_module_version = Unicode(module_version).tag(sync=True)
    _view_name = Unicode('ParameterEditorView').tag(sync=True)
    _view_module = Unicode(module_name).tag(sync=True)
    _view_module_version = Unicode(module_version).tag(sync=True)

    __auto_update = False
    __auto_save = False
    __tab = Tab()
    __auto_update_cbx = Checkbox(description='Auto apply')
    __auto_save_cbx = Checkbox(description='Auto save')
    __apply_btn = Button(description='Apply changes')
    __save_btn = Button(description='Save changes')

    # values = List([]).tag(sync=False)
    # widget = Instance(VBox).tag(sync=True, **widget_serialization)
    # files = {}
    # status = Output(layout={'border': '1px solid black'})
    lpy_context = {}

    def __init__(self, filename, context=None, **kwargs):

        self.__load_from_file(filename)
        super().__init__([VBox([
            HBox([
                self.__apply_btn,
                self.__auto_update_cbx,
                self.__save_btn,
                self.__auto_save_cbx
            ], layout=Layout(flex_flow='row wrap')),
            self.__tab
        ])], **kwargs)

    def __load_from_file(self, filename):

        self.__filename = filename
        self.__tab = Tab()

        with io.open(self.__filename, 'r') as file:
            obj = None
            if Path(self.__filename).suffix == '.toml':
                try:
                    obj = toml.loads(file.read(), decoder=toml.TomlPreserveCommentDecoder())
                except toml.TomlDecodeError as e:
                    print('toml decode error:', e, self.__filename)
            elif Path(self.__filename).suffix == '.json':
                try:
                    obj = json.loads(file.read())
                except json.JSONDecodeError as e:
                    print('json decode error:', e, self.__filename)
                if obj is not None and self.__validate_schema(obj):
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
                acc.set_title(0, 'scalars')
                acc.set_title(1, 'materials')
                acc.set_title(2, 'functions')
                acc.set_title(3, 'curves')
                # box = VBox((HBox(layout=Layout(
                #     width='100%',
                #     flex_flow='row wrap'
                # )), Accordion()))
            for key in obj.keys():
                self.__widgets(obj[key], acc, key, obj, path, schema)
            children.append(acc)

        return (children, titles)

    def __menu(self, section, box):
        btn_add = Button(description='Add')
        ddn_add = Dropdown()
        btn_del = Button(description='Delete')
        ddn_del = Dropdown()

        ddn_del.options = self.lpy_context[section].keys()

        def fn_del(self):
            if ddn_del.value:
                del self.lpy_context[section][ddn_del.value]
                box.children = [child for child in box.children if child.name is not ddn_del.value]
                ddn_del.options = ddn_del.options = self.lpy_context[section].keys()
                if self.__auto_save:
                    self.__save_files()

        if section == 'scalars':

            def fn_add(self):
                name = f'{ddn_add.value}_{len(box.children)}'
                while name in self.lpy_context[section]:
                    name = f'{ddn_add.value}_{len(box.children) + 1}'
                if ddn_add.value == 'Integer':
                    item = IntEditor(name, self.__validate_name, 1)
                    self.lpy_context[section][name] = {
                        'type': 'Integer',
                        'value': 5,
                        'min': 1,
                        'max': 10
                    }
                elif ddn_add.value == 'Float':
                    item = FloatEditor(name, self.__validate_name, 0.5)
                    self.lpy_context[section][name] = {
                        'type': 'Float',
                        'value': 0.5,
                        'min': 0,
                        'max': 1
                    }
                elif ddn_add.value == 'Bool':
                    item = BoolEditor(name, self.__validate_name, True)
                    self.lpy_context[section][name] = {
                        'value': True
                    }
                box.children = (*box.children, item)
                item.observe(self.__observe_lpy(name, section))
                ddn_del.options = self.lpy_context[section].keys()
                if self.__auto_save and self.__validate_schema(self.lpy_context):
                    self.__save_files()
            ddn_add.options = ['Integer', 'Float', 'Bool']

        elif section == 'materials':
            ddn_del.options = self.lpy_context[section].keys()

            def fn_add(self):
                name = f'{ddn_add.value}_{len(box.children)}'
                while name in self.lpy_context[section]:
                    name = f'{ddn_add.value}_{len(box.children) + 1}'
                if ddn_add.value == 'Color':
                    item = MaterialEditor(name, self.__validate_name, index=len(box.children))
                    self.lpy_context[section][name] = {
                        'index': len(box.children),
                        'ambient': item.ambient
                    }
                box.children = (*box.children, item)
                item.observe(self.__observe_lpy(name, section))
                ddn_del.options = self.lpy_context[section].keys()
                if self.__auto_save and self.__validate_schema(self.lpy_context):
                    self.__save_files()
            ddn_add.options = ['Color']

        elif section == 'functions':
            def fn_add(self):
                name = f'{ddn_add.value}_{len(box.children)}'
                val = [[0, 0], [0.25, 0.25], [0.75, -0.25], [1, 0]]
                while name in self.lpy_context['functions']:
                    name = f'{ddn_add.value}_{len(box.children) + 1}'
                if ddn_add.value == 'NurbsCurve2D':
                    item = CurveEditor(name, self.__validate_name, CurveType.NURBS, val, is_function=True)
                    self.lpy_context[section][name] = {
                        ddn_add.value: val
                    }
                box.children = (*box.children, item)
                item.observe(self.__observe_lpy(name, section))
                ddn_del.options = self.lpy_context[section].keys()
                if self.__auto_save and self.__validate_schema(self.lpy_context):
                    self.__save_files()
            ddn_add.options = ['NurbsCurve2D']

        elif section == 'curves':
            def fn_add(self):
                name = f'{ddn_add.value}_{len(box.children)}'
                val = [[-0.5, 0], [-0.25, 0.25], [0.25, -0.25], [0.5, 0]]
                while name in self.lpy_context['curves']:
                    name = f'{ddn_add.value}_{len(box.children) + 1}'
                if ddn_add.value == 'NurbsCurve2D':
                    item = CurveEditor(name, self.__validate_name, CurveType.NURBS, val)
                elif ddn_add.value == 'BezierCurve2D':
                    item = CurveEditor(name, self.__validate_name, CurveType.BEZIER, val)
                elif ddn_add.value == 'Polyline2D':
                    item = CurveEditor(name, self.__validate_name, CurveType.POLY_LINE, val)
                self.lpy_context[section][name] = {
                    ddn_add.value: val
                }
                box.children = (*box.children, item)
                item.observe(self.__observe_lpy(name, section))
                ddn_del.options = self.lpy_context[section].keys()
                if self.__auto_save and self.__validate_schema(self.lpy_context):
                    self.__save_files()
            ddn_add.options = ['NurbsCurve2D', 'BezierCurve2D', 'Polyline2D']

        btn_add.on_click(lambda x: fn_add(self))
        btn_del.on_click(lambda x: fn_del(self))

        return (btn_add, ddn_add, btn_del, ddn_del)

    def __validate_name(self, name):
        if not _property_name_regex.match(name):
            return False
        if name in self.lpy_context:
            return False
        for key in self.lpy_context.keys():
            if name in self.lpy_context[key]:
                return False
        return True

    def __validate_schema(self, obj):
        is_valid = False
        schema_path = os.path.join(os.path.dirname(__file__), 'schema')
        with io.open(os.path.join(schema_path, 'lpy.json'), 'r') as schema_file:
            try:
                schema = json.loads(schema_file.read())
            except json.JSONDecodeError as e:
                print(e)
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
        # _file = file
        # _toml = toml
        # _path = path
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
        if self.__validate_schema(self.lpy_context):
            with io.open(self.__filename, 'w') as file:
                file.write(json.dumps(self.lpy_context, indent=4))

    def __observe_lpy(self, name, key):
        def fn(change):
            owner = change['owner']
            name = owner.name
            prop = change['name']
            obj = self.lpy_context[key] if len(key) > 0 else self.lpy_context[name]
            if prop == 'name':
                obj[change['new']] = obj.pop(change['old'])
            else:
                new = change['new']
                if isinstance(owner, CurveEditor):
                    obj[name][owner.curve_type] = new
                else:
                    if isinstance(obj[name], dict):
                        obj[name][prop] = new
                    else:
                        obj[name] = new

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
                    layout = box.children[0].children[1]
                    for name in thing.keys():
                        ipt = None
                        val = None
                        if isinstance(thing[name]['value'], bool):
                            val = thing[name]['value']
                            ipt = BoolEditor(name, self.__validate_name, val)
                            layout.children = (*layout.children, ipt)
                        elif isinstance(thing[name]['value'], (int, float)):
                            val = thing[name]['value']
                            if thing[name]['type'] == 'Integer':
                                ipt = IntEditor(
                                    name,
                                    self.__validate_name,
                                    value=val,
                                    min=thing[name]['min'],
                                    max=thing[name]['max']
                                )
                                layout.children = (*layout.children, ipt)
                            elif thing[name]['type'] == 'Float':
                                ipt = FloatEditor(
                                    name,
                                    self.__validate_name,
                                    value=val,
                                    min=thing[name]['min'],
                                    max=thing[name]['max'],
                                    step=thing[name]['step']
                                )
                                layout.children = (*layout.children, ipt)

                        if ipt is not None:
                            ipt.observe(self.__observe_lpy(name, key), names='value')

                elif key == 'materials':
                    layout = box.children[1].children[1]
                    for name in thing.keys():
                        ipt = MaterialEditor(name, self.__validate_name, **thing[name])
                        layout.children = (*layout.children, ipt)

                        if ipt is not None:
                            ipt.observe(self.__observe_lpy(name, key))

                elif key == 'functions':
                    layout = box.children[2].children[1]
                    for name in thing.keys():
                        ipt = None
                        if 'NurbsCurve2D' in thing[name]:
                            val = thing[name]['NurbsCurve2D']
                            ipt = CurveEditor(name, self.__validate_name, CurveType.NURBS, val, is_function=True)
                            layout.children = (*layout.children, ipt)

                        if ipt is not None:
                            ipt.observe(self.__observe_lpy(name, key), names=['name', 'value'])

                elif key == 'curves':
                    layout = box.children[3].children[1]
                    for name in thing.keys():
                        ipt = None
                        val = None
                        if 'NurbsCurve2D' in thing[name]:
                            val = thing[name]['NurbsCurve2D']
                            ipt = CurveEditor(name, self.__validate_name, CurveType.NURBS, val)
                            layout.children = (*layout.children, ipt)

                        if ipt is not None:
                            ipt.observe(self.__observe_lpy(name, key), names=['name', 'value'])

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
                layout = Layout(width='auto', height='auto')
                if isinstance(value, str):
                    #  style=DescriptionStyle(description_width='width:200px')
                    ipt = Text(value, description=key, continuous_update=False, layout=layout, style={'description_width': '150px'})
                elif isinstance(value, float):
                    ipt = FloatText(value, description=key, layout=layout, style={'description_width': '150px'})
                elif isinstance(value, int):
                    ipt = IntText(value, description=key, layout=layout, style={'description_width': '150px'})
                if ipt is not None:
                    ipt.observe(self.__on_change(file, toml, key, path))
                    cmt = Text(
                        comment[comment.find('#')+1:].strip(),
                        placeholder='comment',
                        continuous_update=False,
                        layout=Layout(width='auto', height='auto')
                    )
                    cmt.observe(self.__on_change(file, toml, key, path, is_comment=True))
                    grid.children = (*grid.children, ipt, cmt)
