"""
TODO: Add module docstring
"""

import os
import io
import json
import re
import toml
import jsonschema
from pathlib import Path

from ipywidgets.widgets import (
    register, DOMWidget,  VBox, HBox, Tab, Layout, Accordion, Dropdown, Button,
    FloatText, IntText, Text, ColorPicker, Checkbox, IntSlider, FloatSlider, BoundedIntText,
    # BoundedFloatText
)
from traitlets import Unicode, List, Float, Bool, Int

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

# should be moved to lpy
def make_default_lpy_context():

    return DotDict({
        'schema': 'lpy',
        'version': '1.1',
        'options': {
            'compilation': {},
            'matching': {},
            'processing': {},
            'interaction': {}
        },
        'parameters': [],
        'materials': []
    })


_property_name_regex = re.compile('^[^\\d\\W]\\w*\\Z')


class DotDict(dict):

    def __init__(self, *args, **kwargs):
        super(DotDict, self).__init__(*args, **kwargs)
        self.__dict__ = self


@register
class _Editor(HBox):
    """TODO: Add docstring here
    """
    _model_name = Unicode('_EditorModel').tag(sync=True)
    _model_module = Unicode(module_name).tag(sync=True)
    _model_module_version = Unicode(module_version).tag(sync=True)
    _view_name = Unicode('_EditorView').tag(sync=True)
    _view_module = Unicode(module_name).tag(sync=True)
    _view_module_version = Unicode(module_version).tag(sync=True)

    __text = None

    name = Unicode('').tag(sync=False)

    def __init__(self, name, validator=None, no_name=False, **kwargs):
        self.name = name
        self.__validator = validator if validator is not None else lambda x: True
        self.__text = Text(name, description='name')
        self.__text.continuous_update = False
        self.__text.observe(self.__on_name_changed, names='value')
        if no_name:
            kwargs['children'] = kwargs['children']
        else:
            kwargs['children'] = (self.__text, *kwargs['children'])
        kwargs['layout'] = Layout(margin='10px 10px')
        super().__init__(**kwargs)

    def __on_name_changed(self, change):
        if self.__validator(self.__text.value):
            self.name = self.__text.value
        else:
            self.__text.unobserve(self.__on_name_changed, names='value')
            self.__text.value = change['old']
            self.__text.observe(self.__on_name_changed, names='value')


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

    name = Unicode('').tag(sync=True)
    type = Unicode('').tag(sync=True)
    points = List(trait=List(trait=Float(), minlen=2, maxlen=2), minlen=2).tag(sync=True)
    is_function = Bool(False).tag(sync=True)

    def __init__(self, type, points, is_function=False, **kwargs):
        self.name = kwargs['name'] if 'no_name' in kwargs and kwargs['no_name'] else ''
        self.type = type
        self.points = points
        self.is_function = is_function
        super().__init__(**kwargs)


@register
class CurveEditor(_Editor):
    """TODO: Add docstring here
    """
    _model_name = Unicode('CurveEditorModel').tag(sync=True)
    _view_name = Unicode('CurveEditorView').tag(sync=True)

    __curve_editor = None
    __validator = None

    value = List(trait=List(trait=Float(), minlen=2, maxlen=2), minlen=2).tag(sync=False)

    def __init__(self, **kwargs):
        self.__curve_editor = _CurveEditor(**kwargs)
        self.__curve_editor.observe(self.__on_curve_changed, names='points')
        kwargs['children'] = [
            self.__curve_editor
        ]
        super().__init__(**kwargs)

    def __on_curve_changed(self, change):
        self.value = self.__curve_editor.points

    @property
    def _curve_type(self):
        return self.__curve_editor.curve_type


@register
class FloatEditor(_Editor):
    """TODO: Add docstring here
    """
    _model_name = Unicode('FloatEditorModel').tag(sync=True)
    _view_name = Unicode('FloatEditorView').tag(sync=True)

    __slider = None
    __min_ipt = None
    __max_ipt = None
    __step_ipt = None
    __type = ''

    value = Float(0).tag(sync=False)
    min = Float(0).tag(sync=False)
    max = Float(0).tag(sync=False)
    step = Float(0).tag(sync=False)

    def __init__(self, value, type='Float', min=1, max=10, step=1, **kwargs):

        self.value = float(value)
        description = kwargs['name'] if 'no_name' in kwargs and kwargs['no_name'] else 'value'
        self.__slider = FloatSlider(value, min=min, max=max, step=step, description=description, continuous_update=False)
        # self.__min_ipt = FloatText(min, description='min')
        # self.__max_ipt = FloatText(max, description='max')
        # self.__step_ipt = BoundedFloatText(step, description='step', min=0.01, max=1, step=step)

        self.__slider.observe(self.__on_slider_changed, names='value')
        # self.__min_ipt.observe(self.__on_min_changed, names='value')
        # self.__max_ipt.observe(self.__on_max_changed, names='value')
        # self.__step_ipt.observe(self.__on_step_changed, names='value')

        kwargs['children'] = [
            self.__slider,
            # self.__min_ipt,
            # self.__max_ipt,
            # self.__step_ipt
        ]
        super().__init__(**kwargs)

    # def __on_min_changed(self, change):
    #     if self.__min_ipt.value < self.__slider.max:
    #         self.__slider.min = self.__min_ipt.value
    #     else:
    #         self.__min_ipt.value = self.__slider.max - self.__step_ipt.value
    #     self.min = self.__min_ipt.value

    # def __on_max_changed(self, change):
    #     if self.__max_ipt.value > self.__slider.min:
    #         self.__slider.max = self.__max_ipt.value
    #     else:
    #         self.__max_ipt.value = self.__slider.min + self.__step_ipt.value
    #     self.max = self.__max_ipt.value

    # def __on_step_changed(self, change):
    #     self.__slider.step = self.__step_ipt.value
    #     self.step = self.__step_ipt.value

    def __on_slider_changed(self, change):
        self.value = self.__slider.value


@register
class IntEditor(_Editor):
    """TODO: Add docstring here
    """
    _model_name = Unicode('IntEditorModel').tag(sync=True)
    _view_name = Unicode('IntEditorView').tag(sync=True)

    __slider = None
    __min_ipt = None
    __max_ipt = None
    __step_ipt = None

    value = Int(0).tag(sync=False)
    min = Int(0).tag(sync=False)
    max = Int(0).tag(sync=False)
    step = Int(0).tag(sync=False)

    def __init__(self, value, type='Float', min=1, max=10, step=1, **kwargs):

        self.value = int(value)
        description = kwargs['name'] if 'no_name' in kwargs and kwargs['no_name'] else 'value'
        self.__slider = IntSlider(value, min, max, description=description, continuous_update=False)
        # self.__min_ipt = IntText(min, description='min')
        # self.__max_ipt = IntText(max, description='max')
        # self.__step_ipt = BoundedIntText(step, description='step', min=1, step=step)

        self.__slider.observe(self.__on_slider_changed, names='value')
        # self.__min_ipt.observe(self.__on_min_changed, names='value')
        # self.__max_ipt.observe(self.__on_max_changed, names='value')
        # self.__step_ipt.observe(self.__on_step_changed, names='value')

        kwargs['children'] = [
            self.__slider,
            # self.__min_ipt,
            # self.__max_ipt,
            # self.__step_ipt
        ]
        super().__init__(**kwargs)

    # def __on_min_changed(self, change):
    #     if self.__min_ipt.value < self.__slider.max:
    #         self.__slider.min = self.__min_ipt.value
    #     else:
    #         self.__min_ipt.value = self.__slider.max - self.__step_ipt.value
    #     self.min = self.__min_ipt.value

    # def __on_max_changed(self, change):
    #     if self.__max_ipt.value > self.__slider.min:
    #         self.__slider.max = self.__max_ipt.value
    #     else:
    #         self.__max_ipt.value = self.__slider.min + self.__step_ipt.value
    #     self.max = self.__max_ipt.value

    # def __on_step_changed(self, change):
    #     self.__slider.step = self.__step_ipt.value
    #     self.step = self.__step_ipt.value

    def __on_slider_changed(self, change):
        self.value = self.__slider.value


@register
class BoolEditor(_Editor):
    """TODO: Add docstring here
    """
    _model_name = Unicode('BoolEditorModel').tag(sync=True)
    _view_name = Unicode('BoolEditorView').tag(sync=True)

    __checkbox = None

    value = Bool(False).tag(sync=False)

    def __init__(self, value, **kwargs):
        self.value = value
        description = kwargs['name'] if 'no_name' in kwargs and kwargs['no_name'] else 'value'
        self.__checkbox = Checkbox(value, description=description)
        self.__checkbox.observe(self.__on_checkbox_changed, names='value')
        kwargs['children'] = [
            self.__checkbox
        ]
        super().__init__(**kwargs)

    def __on_checkbox_changed(self, change):
        self.value = change['new']


@register
class StringEditor(_Editor):
    """TODO: Add docstring here
    """
    _model_name = Unicode('StringEditorModel').tag(sync=True)
    _view_name = Unicode('StringEditorView').tag(sync=True)

    __text = None

    value = Unicode('').tag(sync=False)

    def __init__(self, value, **kwargs):
        self.value = value
        self.__text = Text(value, description='value')
        self.__text.continuous_update = False
        self.__text.observe(self.__on_text_changed, names='value')
        kwargs['children'] = [
            self.__text
        ]
        super().__init__(**kwargs)

    def __on_text_changed(self, change):
        self.value = change['new']


@register
class MaterialEditor(_Editor):
    """TODO: Add docstring here
    """
    _model_name = Unicode('MaterialEditorModel').tag(sync=True)
    _view_name = Unicode('MaterialEditorView').tag(sync=True)

    __text = None
    __index = None
    __ambient = None
    __specular = None
    __emission = None
    __diffuse = None
    __transparency = None
    __shininess = None
    __validator = None

    index = Int().tag(sync=False)
    ambient = List().tag(sync=False)
    specular = List().tag(sync=False)
    emission = List().tag(sync=False)
    diffuse = Float().tag(sync=False)
    transparency = Float().tag(sync=False)
    shininess = Float().tag(sync=False)

    def __init__(self, index, ambient=[80, 80, 80], specular=[40, 40, 40], emission=[0, 0, 0], diffuse=1, transparency=0, shininess=0.2, **kwargs):
        self.index = index
        self.ambient = ambient
        self.specular = specular
        self.emission = emission
        self.diffuse = diffuse
        self.transparency = transparency
        self.shininess = shininess
        self.__index = BoundedIntText(value=index, description='index', min=0)
        self.__ambient = ColorPicker(value='#' + ''.join(format(v, "02x") for v in ambient), description='ambient')
        self.__specular = ColorPicker(value='#' + ''.join(format(v, "02x") for v in specular), description='specular')
        self.__emission = ColorPicker(value='#' + ''.join(format(v, "02x") for v in emission), description='emission')
        self.__diffuse = FloatSlider(value=diffuse, description='diffuse', min=0, max=3, continuous_update=False)
        self.__transparency = FloatSlider(value=transparency, description='transparency', min=0, max=1, continuous_update=False)
        self.__shininess = FloatSlider(value=shininess, description='shininess', min=0, max=1, continuous_update=False)
        self.__index.observe(self.__on_index_changed, names='value')
        self.__ambient.observe(self.__on_ambient_changed, names='value')
        self.__specular.observe(self.__on_specular_changed, names='value')
        self.__emission.observe(self.__on_emission_changed, names='value')
        self.__diffuse.observe(self.__on_diffuse_changed, names='value')
        self.__transparency.observe(self.__on_transparency_changed, names='value')
        self.__shininess.observe(self.__on_shininess_changed, names='value')

        kwargs['children'] = [
            self.__index,
            self.__ambient,
            self.__specular,
            self.__emission,
            self.__diffuse,
            self.__transparency,
            self.__shininess
        ]

        super().__init__(**kwargs)

    def __rgb_to_list(self, rgb):
        return [255, 0, 0] if len(rgb) != 7 else [int(v, 16) for v in [rgb[1:][i:i+2] for i in range(0, 6, 2)]]

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

    __auto_apply = False
    __auto_save = False
    __tab = None
    __auto_apply_cbx = None
    __auto_save_cbx = None
    __apply_btn = None
    __save_btn = None
    __add_category_btn = None
    __add_category_txt = None

    # values = List([]).tag(sync=False)
    # widget = Instance(VBox).tag(sync=True, **widget_serialization)
    # files = {}
    # status = Output(layout={'border': '1px solid black'})
    lpy_context = {}

    def __init__(self, filename, context=None, **kwargs):

        self.__tab = Tab()
        self.__auto_apply_cbx = Checkbox(description='Auto apply')
        self.__auto_save_cbx = Checkbox(description='Auto save')
        self.__apply_btn = Button(description='Apply changes')
        self.__save_btn = Button(description='Save changes')
        self.__add_category_btn = Button(description='Add category')
        self.__add_category_txt = Text(placeholder='category name')
        make_default_lpy_context()
        self.__load_from_file(filename)
        super().__init__([VBox([
            HBox([
                HBox((self.__apply_btn, self.__auto_apply_cbx)),
                HBox((self.__save_btn, self.__auto_save_cbx)),
                HBox((self.__add_category_btn, self.__add_category_txt))
            ], layout=Layout(flex_flow='row wrap')),
            self.__tab
        ])], **kwargs)

    def __load_from_file(self, filename):

        self.__filename = filename
        self.__tab = Tab()

        with io.open(self.__filename, 'r') as file:
            obj = None
            if Path(self.__filename).suffix == '.toml':
                pass
                # try:
                #     obj = toml.loads(file.read(), decoder=toml.TomlPreserveCommentDecoder())
                # except toml.TomlDecodeError as e:
                #     print('toml decode error:', e, self.__filename)
            elif Path(self.__filename).suffix == '.json':
                try:
                    obj = json.loads(file.read())
                except json.JSONDecodeError as e:
                    print('json decode error:', e, self.__filename)
                if obj is not None and ParameterEditor.validate_schema(obj):
                    self.lpy_context = obj
                    children, titles = self.__build_gui(obj)
                    self.__tab .children = children
                    for i, title in enumerate(titles):
                        self.__tab .set_title(i, title)
                    self.__auto_apply_cbx.observe(self.__on_auto_apply_cbx_change, names='value')
                    self.__auto_save_cbx.observe(self.__on_auto_save_cbx_change, names='value')
                    self.__apply_btn.on_click(lambda x: self.on_lpy_context_change(self.lpy_context))
                    self.__save_btn.on_click(lambda x: self.__save_files())
                    self.__add_category_btn.on_click(lambda x: self.__add_category(self.__add_category_txt.value.strip()))

    def __del_category(self, name):
        self_ = self

        def delete(self):
            for i, category in enumerate(self_.lpy_context['parameters']):
                if category['name'] == name:
                    no_categories = len(self_.lpy_context['parameters'])
                    self_.lpy_context['parameters'].pop(i)
                    acc = self_.__tab.children[0]
                    children = list(acc.children)
                    titles = [acc.get_title(c) for c in range(len(acc.children))]
                    titles.pop(i + len(children) - no_categories)
                    children.pop(i + len(children) - no_categories)
                    for j, title in enumerate(titles):
                        acc.set_title(j, title)
                    acc.children = children
                    if self_.__auto_save:
                        self_.__save_files()
                    break
        return delete

    def __add_category(self, name):
        if len(name) == 0 or len([c for c in self.lpy_context['parameters'] if c['name'] == name]):
            return
        item_layout = Layout(
            margin='20px',
            flex_flow='row wrap'
        )
        menu_layout = Layout(
            margin='20px',
            flex_flow='row wrap'
        )
        acc = self.__tab.children[0]
        box_scalars = HBox(layout=item_layout)
        box_curves = HBox(layout=item_layout)
        btn_delete = Button(description='Delete category')
        btn_delete.on_click(self.__del_category(name))

        acc.children = (*acc.children, VBox([
            HBox([btn_delete], layout=menu_layout),
            HBox(self.__menu('scalars', box_scalars, name), layout=menu_layout),
            box_scalars,
            HBox(self.__menu('curves', box_curves, name), layout=menu_layout),
            box_curves
        ]))
        acc.set_title(len(acc.children) - 1, name)
        self.lpy_context['parameters'].append({
            'name': name,
            'enabled': True,
            'scalars': [],
            'curves': []
        })
        if self.__auto_save:
            self.__save_files()

    def __on_auto_apply_cbx_change(self, change):
        self.__auto_apply = change['owner'].value
        self.__apply_btn.disabled = self.__auto_apply
        if self.__auto_apply:
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

            if 'schema' in obj and obj['schema'] == 'lpy':

                # box_options = HBox(layout=item_layout)
                box_materials = HBox(layout=item_layout)

                for material in obj['materials']:
                    ipt = MaterialEditor(**material, validator=self.__validate_name)
                    ipt.observe(self.__observe_lpy('materials'))
                    box_materials.children = (*box_materials.children, ipt)

                acc_items = [
                    # VBox([
                    #     HBox((), layout=menu_layout),
                    #     box_options
                    # ]),
                    VBox([
                        HBox(self.__menu('materials', box_materials), layout=menu_layout),
                        box_materials
                    ])
                ]

                for category in obj['parameters']:
                    box_scalars = HBox(layout=item_layout)
                    box_curves = HBox(layout=item_layout)
                    for scalar in category['scalars']:
                        ipt = None
                        if isinstance(scalar['value'], bool):
                            ipt = BoolEditor(**scalar, validator=self.__validate_name)
                        elif isinstance(scalar['value'], (int, float)):
                            if scalar['type'] == 'Integer':
                                ipt = IntEditor(**scalar, validator=self.__validate_name)
                            elif scalar['type'] == 'Float':
                                ipt = FloatEditor(**scalar, validator=self.__validate_name)
                        if ipt is not None:
                            box_scalars.children = (*box_scalars.children, ipt)
                            ipt.observe(self.__observe_lpy('scalars', category['name']))
                    for curve in category['curves']:
                        ipt = CurveEditor(**curve, validator=self.__validate_name)
                        box_curves.children = (*box_curves.children, ipt)
                        ipt.observe(self.__observe_lpy('curves', category['name']))

                    btn_delete = Button(description='Delete category')
                    btn_delete.on_click(self.__del_category(category['name']))
                    acc_items.append(VBox([
                        HBox([btn_delete], layout=menu_layout),
                        HBox(self.__menu('scalars', box_scalars, category['name']), layout=menu_layout),
                        box_scalars,
                        HBox(self.__menu('curves', box_curves, category['name']), layout=menu_layout),
                        box_curves
                    ]))

                acc = Accordion(acc_items)
                # acc.set_title(0, 'options')
                acc.set_title(0, 'materials')
                for i, category in enumerate(obj['parameters']):
                    acc.set_title(i + 1, category['name'])

            children.append(acc)

        return (children, titles)

    def __menu(self, parameter_type, box, category_name=None):

        btn_add = Button(description='Add')
        ddn_add = Dropdown()
        btn_del = Button(description='Delete')
        ddn_del = Dropdown(options=[item.name for item in box.children])

        def fn_del(self):

            if ddn_del.value:
                if category_name is not None:
                    for category in self.lpy_context['parameters']:
                        if category['name'] == category_name:
                            category[parameter_type].pop(ddn_del.index)
                            box.children = [child for i, child in enumerate(box.children) if i != ddn_del.index]
                            ddn_del.options = [item.name for item in box.children]
                            if self.__auto_save:
                                self.__save_files()
                            if self.__auto_apply:
                                self.on_lpy_context_change(self.lpy_context)
                            break
                else:
                    self.lpy_context[parameter_type].pop(ddn_del.index)
                    box.children = [child for i, child in enumerate(box.children) if i != ddn_del.index]
                    ddn_del.options = [item.name for item in box.children]
                    if self.__auto_save:
                        self.__save_files()
                    if self.__auto_apply:
                        self.on_lpy_context_change(self.lpy_context)

        if parameter_type == 'scalars':

            def fn_add(self):

                parameter_name = f'{ddn_add.value}_{len(box.children)}'
                item = None

                if ddn_add.value == 'Integer':
                    parameter = {
                        'name': parameter_name,
                        'type': 'Integer',
                        'value': 5,
                        'min': 1,
                        'max': 10,
                        'step': 1
                    }
                    item = IntEditor(**parameter, validator=self.__validate_name)
                elif ddn_add.value == 'Float':
                    parameter = {
                        'name': parameter_name,
                        'type': 'Float',
                        'value': 0.5,
                        'min': 0,
                        'max': 1,
                        'step': 0.1
                    }
                    item = FloatEditor(**parameter, validator=self.__validate_name)
                elif ddn_add.value == 'Bool':
                    parameter = {
                        'name': parameter_name,
                        'value': True
                    }
                    item = BoolEditor(**parameter, validator=self.__validate_name)

                if item is not None:
                    box.children = (*box.children, item)
                    for category in self.lpy_context['parameters']:
                        if category['name'] == category_name:
                            category[parameter_type].append(parameter)
                            item.observe(self.__observe_lpy(parameter_type, category_name))
                            ddn_del.options = [item.name for item in box.children]
                            if self.__auto_save and ParameterEditor.validate_schema(self.lpy_context):
                                self.__save_files()
                            if self.__auto_apply:
                                self.on_lpy_context_change(self.lpy_context)
                            break

            ddn_add.options = ['Integer', 'Float', 'Bool']

        elif parameter_type == 'materials':

            def fn_add(self):

                index = len(box.children) + 1
                material_name = f'{ddn_add.value}_{index}'

                material = {
                    'name': material_name,
                    'index': index,
                    'ambient': [80, 80, 80]
                }
                item = MaterialEditor(**material, validator=self.__validate_name)
                self.lpy_context['materials'].append(material)
                box.children = (*box.children, item)
                item.observe(self.__observe_lpy(parameter_type))
                ddn_del.options = [item.name for item in box.children]
                if self.__auto_save and ParameterEditor.validate_schema(self.lpy_context):
                    self.__save_files()
                if self.__auto_apply:
                    self.on_lpy_context_change(self.lpy_context)

            ddn_add.options = ['Color']

        elif parameter_type == 'curves':

            def fn_add(self):

                parameter_name = f'{ddn_add.value}_{len(box.children)}'
                parameter = {
                    'name': parameter_name,
                    'type': 'NurbsCurve2D' if ddn_add.value == 'Function' else ddn_add.value,
                    'points': [],
                    'is_function': ddn_add.value == 'Function'
                }
                if ddn_add.value == 'Function':
                    parameter['points'] = [[0, 0], [0.25, 0], [0.5, 0], [0.75, 0], [1, 0]]
                else:
                    parameter['points'] = [[-0.5, 0], [-0.25, 0], [0, 0], [0.25, 0], [0.5, 0]]

                item = CurveEditor(**parameter, validator=self.__validate_name)

                box.children = (*box.children, item)
                for category in self.lpy_context['parameters']:
                    if category['name'] == category_name:
                        category[parameter_type].append(parameter)
                        item.observe(self.__observe_lpy(parameter_type, category_name))
                        ddn_del.options = [item.name for item in box.children]
                        if self.__auto_save and ParameterEditor.validate_schema(self.lpy_context):
                            self.__save_files()
                        if self.__auto_apply:
                            self.on_lpy_context_change(self.lpy_context)
                        break

            ddn_add.options = ['NurbsCurve2D', 'BezierCurve2D', 'Polyline2D', 'Function']

        btn_add.on_click(lambda x: fn_add(self))
        btn_del.on_click(lambda x: fn_del(self))

        return (
            HBox((btn_add, ddn_add)),
            HBox((btn_del, ddn_del))
        )

    def __validate_name(self, name):
        if not _property_name_regex.match(name):
            return False
        if name in self.lpy_context:
            return False
        for key in self.lpy_context.keys():
            if name in self.lpy_context[key]:
                return False
        return True

    @staticmethod
    def validate_schema(obj):
        # TODO: load files only once
        is_valid = False
        schema_path = os.path.join(os.path.dirname(__file__), 'schema')
        with io.open(os.path.join(schema_path, 'lpy.json'), 'r') as schema_file:
            try:
                schema = json.loads(schema_file.read())
            except json.JSONDecodeError as e:
                print(e)
            resolver = jsonschema.RefResolver(f'file:///{schema_path}/', schema)
            try:
                jsonschema.validate(obj, schema, format_checker=jsonschema.draft7_format_checker, resolver=resolver)
                is_valid = True
            except jsonschema.exceptions.ValidationError as e:
                print('L-Py schema validation failed:', e.message)
            except jsonschema.exceptions.RefResolutionError as e:
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
        if ParameterEditor.validate_schema(self.lpy_context):
            with io.open(self.__filename, 'w') as file:
                file.write(json.dumps(self.lpy_context, indent=4))

    def __observe_lpy(self, parameter_type, category_name=None):
        def fn(change):
            owner = change['owner']
            new = change['new']
            prop = change['name']
            name = owner.name if prop != 'name' else change['old']
            obj = None

            if category_name is not None:
                for category in self.lpy_context['parameters']:
                    if category['name'] == category_name:
                        for parameter in category[parameter_type]:
                            if parameter['name'] == name:
                                obj = parameter
                                break
            else:
                for parameter in self.lpy_context[parameter_type]:
                    if parameter['name'] == name:
                        obj = parameter
                        break

            if obj is not None:
                if isinstance(owner, CurveEditor):
                    if prop == 'value':
                        obj['points'] = new
                    else:
                        obj[prop] = new
                else:
                    obj[prop] = new

            if self.__auto_apply:
                # A Material name is just a label
                if not (isinstance(owner, MaterialEditor) and prop == 'name'):
                    self.on_lpy_context_change(self.lpy_context)
            if self.__auto_save:
                self.__save_files()

        return fn

    def __widgets(self, thing, box, key='', file=None, path='', schema='', category=''):
        if isinstance(thing, (dict, list)):
            if schema == 'lpy':
                if key == 'scalars':
                    layout = box.children[0].children[1]
                    for name in thing.keys():
                        ipt = None
                        if isinstance(thing[name]['value'], bool):
                            ipt = BoolEditor(**thing[name], name=name, validator=self.__validate_name)
                        elif isinstance(thing[name]['value'], (int, float)):
                            if thing[name]['type'] == 'Integer':
                                for key_, value in thing[name].items():
                                    if isinstance(value, float):
                                        thing[name][key_] = int(value)
                                ipt = IntEditor(
                                    **thing[name],
                                    name=name,
                                    validator=self.__validate_name
                                )
                            else:
                                for key_, value in thing[name].items():
                                    if isinstance(value, int):
                                        thing[name][key_] = float(value)
                                ipt = FloatEditor(
                                    **thing[name],
                                    name=name,
                                    validator=self.__validate_name
                                )
                        if ipt is not None:
                            layout.children = (*layout.children, ipt)
                            ipt.observe(self.__observe_lpy(name, key))

                elif key == 'materials':
                    layout = box.children[1].children[1]
                    for name in thing.keys():
                        ipt = MaterialEditor(**thing[name], name=name, validator=self.__validate_name)
                        layout.children = (*layout.children, ipt)
                        ipt.observe(self.__observe_lpy(name, key))

                elif key == 'functions':
                    layout = box.children[2].children[1]
                    for name in thing.keys():
                        ipt = None
                        if 'NurbsCurve2D' in thing[name]:
                            val = thing[name]['NurbsCurve2D']
                            ipt = CurveEditor(val, 'NurbsCurve2D', is_function=True, name=name, validator=self.__validate_name)
                            layout.children = (*layout.children, ipt)

                        if ipt is not None:
                            ipt.observe(self.__observe_lpy(name, key))

                elif key == 'curves':
                    layout = box.children[3].children[1]
                    for name in thing.keys():
                        ipt = None
                        if 'NurbsCurve2D' in thing[name]:
                            val = thing[name]['NurbsCurve2D']
                            ipt = CurveEditor(val, 'NurbsCurve2D', name=name, validator=self.__validate_name)
                            layout.children = (*layout.children, ipt)
                        elif 'BezierCurve2D' in thing[name]:
                            val = thing[name]['BezierCurve2D']
                            ipt = CurveEditor(val, 'BezierCurve2D', name=name, validator=self.__validate_name)
                            layout.children = (*layout.children, ipt)
                        elif 'Polyline2D' in thing[name]:
                            val = thing[name]['Polyline2D']
                            ipt = CurveEditor(val, 'Polyline2D', name=name, validator=self.__validate_name)
                            layout.children = (*layout.children, ipt)

                        if ipt is not None:
                            ipt.observe(self.__observe_lpy(name, key))

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
