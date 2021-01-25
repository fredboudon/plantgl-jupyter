from IPython.core.magic_arguments import magic_arguments, argument, parse_argstring
from IPython.core.magic import (
    Magics, magics_class, cell_magic, line_magic, needs_local_scope
)
from ipywidgets import HBox, Layout

from openalea.lpy import Lsystem
from openalea.lpy.lsysparameters import LsystemParameters, BaseScalar

import openalea.plantgl.all as pgl

from .widgets import SceneWidget, LsystemWidget
from .editors import (
    make_color_editor, make_scalar_editor, make_curve_editor
)


@magics_class
class PGLMagics(Magics):

    @cell_magic
    @needs_local_scope
    @magic_arguments()
    @argument('--size', '-s', default='400,400', type=str, help='Width and hight of the canvas')
    @argument('--world', '-w', default=1.0, type=float, help='Size of the 3d scene in meters')
    @argument('--unit', '-u', default='m', type=str, help='Unit of the model - m, dm, cm, mm')
    @argument('--params', '-p', default='', type=str, help='Name of LsystemParameters instance with a "default" category')
    @argument('--animate', '-a', type=bool, help='Animate Lsystem')
    def lpy(self, line, cell, local_ns):

        args = parse_argstring(self.lpy, line)
        sizes = [int(i.strip()) for i in args.size.split(',')]
        world = args.world
        unit = args.unit
        lp = local_ns[args.params] if args.params and args.params in local_ns and isinstance(local_ns[args.params], LsystemParameters) else None
        animate = args.animate if args.animate is not None else False
        context = local_ns

        size_display = (int(sizes[0]), int(sizes[1])) if len(sizes) > 1 else (int(sizes[0]), int(sizes[0]))

        code = ''.join([
            cell,
            lp.generate_py_code() if lp else ''
        ])

        lsw = LsystemWidget(None, code=code, size_display=size_display, size_world=world, unit=unit, animate=animate, context=context, lp=lp)
        editors = []

        def on_value_changed(param):
            def fn(change):
                if 'new' in change:
                    value = change['new']
                    if isinstance(param, BaseScalar):
                        param.value = value
                    elif isinstance(param, tuple):
                        if isinstance(param[1], (pgl.NurbsCurve2D, pgl.BezierCurve2D)):
                            param[1].ctrlPointList = pgl.Point3Array([pgl.Vector3(p[0], p[1], 1) for p in value])
                        elif isinstance(param[1], pgl.Polyline2D):
                            param[1].pointList = pgl.Point2Array([pgl.Vector2(p[0], p[1]) for p in value])

                    lsw.set_parameters(lp.dumps())
            return fn

        def on_material_changed(material):
            def fn(change):
                if 'new' in change:
                    if change['name'] == 'index':
                        lp.unset_color(change['old'])
                        lp.set_color(change['new'], material)
                    else:
                        setattr(material, change['name'], change['new'])
                    lsw.set_parameters(lp.dumps())
            return fn

        if lp:
            for scalar in lp.get_category_scalars():
                editor = make_scalar_editor(scalar, True)
                if editor:
                    editor.observe(on_value_changed(scalar), 'value')
                    editors.append(editor)

            for index, color in lp.get_colors().items():
                editor = make_color_editor(color, index, True)
                if editor:
                    editor.observe(on_material_changed(color))
                    editors.append(editor)

            for param in lp.get_category_graphicalparameters():
                editor = make_curve_editor(param, True)
                if editor:
                    editor.observe(on_value_changed(param), 'value')
                    editors.append(editor)

        w, h = lsw.size_display
        if len(editors):
            return HBox((
                HBox([lsw], layout=Layout(margin='10px', min_width=str(w)+'px', min_height=str(h)+'px')),
                HBox(editors, layout=Layout(margin='0', flex_flow='row wrap'))
            ))

        return lsw

    @line_magic
    @magic_arguments()
    @argument('file', type=str, help='L-Py file path')
    @argument('--size', '-s', default='400,400', type=str, help='Width and hight of the canvas')
    @argument('--cell', '-c', default=1., type=float, help='Size of cell for a single derivation step')
    def lpy_plot(self, line):

        from math import ceil, sqrt, floor

        try:
            ip = get_ipython()
        except NameError:
            ip = None

        args = parse_argstring(self.lpy_plot, line)
        file = args.file
        sizes = [int(i.strip()) for i in args.size.split(',')]

        cell = args.cell
        size_display = (int(sizes[0]), int(sizes[1])) if len(sizes) > 1 else (int(sizes[0]), int(sizes[0]))

        ls = Lsystem(file)
        rows = cols = ceil(sqrt(ls.derivationLength + 1))
        size = rows * cell
        start = -size/2 + cell/2
        sw = SceneWidget(size_display=size_display, size_world=size)
        sw.add(ls.sceneInterpretation(ls.axiom), position=(start, start, 0))

        def plot():
            tree = ls.axiom
            for i in range(1, ls.derivationLength):
                row = floor(i / rows)
                col = (i - row * cols)
                x = row * cell + start
                y = col * cell + start
                tree = ls.derive(tree, i, 1)
                sw.add(ls.sceneInterpretation(tree), (x, y, 0))
            ip.events.unregister('post_run_cell', plot)

        if ip:
            ip.events.register('post_run_cell', plot)

        return sw
