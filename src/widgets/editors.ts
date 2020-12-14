import '../../css/widget.css';
import {
    DOMWidgetView, WidgetView
} from '@jupyter-widgets/base';
import { VBoxView } from '@jupyter-widgets/controls';
import * as d3 from 'd3';
import * as nurbs from 'nurbs';
import { debounce } from './utilities';
import { CurveType } from './consts';

export class ParameterEditorView extends VBoxView {
    initialize(parameters) {
        super.initialize(parameters);
        this.pWidget.addClass('pgl-parameter-editor');
    }
}

export class _EditorView extends VBoxView {
    initialize(parameters) {
        super.initialize(parameters);
        this.pWidget.addClass('pgl-editor');
    }
}

export class BoolEditorView extends _EditorView {
    initialize(parameters) {
        super.initialize(parameters);
        this.pWidget.addClass('pgl-bool-editor');
    }
}

export class IntEditorView extends _EditorView {
    initialize(parameters) {
        super.initialize(parameters);
        this.pWidget.addClass('pgl-int-editor');
    }
}

export class FloatEditorView extends _EditorView {
    initialize(parameters) {
        super.initialize(parameters);
        this.pWidget.addClass('pgl-float-editor');
    }
}

export class StringEditorView extends _EditorView {
    initialize(parameters) {
        super.initialize(parameters);
        this.pWidget.addClass('pgl-string-editor');
    }
}

export class MaterialEditorView extends _EditorView {
    initialize(parameters) {
        super.initialize(parameters);
        this.pWidget.addClass('pgl-material-editor');
    }
}

export class CurveEditorView extends _EditorView {
    initialize(parameters) {
        super.initialize(parameters);
        this.pWidget.addClass('pgl-curve-editor');
    }
}

export class _CurveEditorView extends DOMWidgetView {

    width = 250;
    height = 250;
    margin = 15;
    name = '';
    showName = false;
    isFunction = false;
    curveType: CurveType;
    controlPoints: number[][] = [];

    initialize(parameters: WidgetView.InitializeParameters) {
        super.initialize(parameters);
    }

    render() {

        super.render();
        this.pWidget.addClass('pgl-_curve-editor');
        const svg = d3.select(this.el)
            .append('svg')
            .classed('pgl-curve-editor-svg', true)
            .style('width', this.width)
            .style('height', this.height);
        this.name = this.model.get('name');
        this.showName = this.model.get('show_name');
        this.isFunction = this.model.get('is_function');
        this.controlPoints = this.model.get('points').slice();
        this.curveType = this.model.get('type');

        const [minx, miny, maxx, maxy] = this.controlPoints.reduce((m, p) => {
            m[0] = p[0] < m[0] ? p[0] : m[0];
            m[1] = p[1] < m[1] ? p[1] : m[1];
            m[2] = p[0] > m[2] ? p[0] : m[2];
            m[3] = p[1] > m[3] ? p[1] : m[3];
            return m;
        }, [Infinity, Infinity, -Infinity, -Infinity]);

        const domain = [Math.min(minx, miny), Math.max(maxx, maxy)];

        const xScale = d3.scaleLinear()
            .domain(domain)
            .range([this.margin, this.width - this.margin]);
        const yScale = d3.scaleLinear()
            .domain(domain)
            .range([this.height - this.margin, this.margin]);

        const lineGenerator = d3.line()
            .x(d => xScale(d[0]))
            .y(d => yScale(d[1]))
            .curve(d3.curveLinear);

        const dx = ((this.width / 2) - (xScale(maxx) + xScale(minx)) / 2);
        const dy = ((this.height / 2) - (yScale(maxy) + yScale(miny)) / 2);

        if (this.showName) {
            svg.append('text')
                .text(this.name)
                .attr('x', this.width / 2)
                .attr('y', 20)
                .attr('text-anchor', 'middle');
        }

        const g = svg.append('g')
            .attr('transform', `translate(${dx},${dy})`);

        g.append('path')
            .classed('grid', true)
            .attr('d', lineGenerator([[0, Math.min(minx, miny)], [0, Math.max(maxx, maxy)]]));

        g.append('path')
            .classed('grid', true)
            .attr('d', lineGenerator([[Math.min(minx, miny), 0], [Math.max(maxx, maxy), 0]]));

        const ctrlPath = g.append('path').classed('line', true);
        const curvePath = g.append('path').classed('curve', true);

        const circles = g.selectAll('.point')
            .data(this.controlPoints)
            .enter()
            .append('circle')
            .classed('point', true)
            .attr('r', 10)
            .attr('cx', d => xScale(d[0]))
            .attr('cy', d => yScale(d[1]));

        this.onControlPointsChanged(svg, g, dx, dy, xScale, yScale, ctrlPath, curvePath, circles, lineGenerator);
        this.listenTo(this.model, 'change:points', () => {
            const controlPoints = this.model.get('points');
            if (controlPoints && (controlPoints.length !== this.controlPoints.length ||
                this.controlPoints.some((p, i) => p[0] !== controlPoints[i][0] || p[1] !== controlPoints[i][1]))) {
                this.controlPoints = controlPoints.slice();
                this.onControlPointsChanged(svg, g, dx, dy, xScale, yScale, ctrlPath, curvePath, circles, lineGenerator);
            }
        });

    }

    onControlPointsChanged(svg, g, dx, dy, xScale, yScale, ctrlPath, curvePath, circles, lineGenerator) {

        const isFunction = this.isFunction;
        const width = this.width;
        const height = this.height;
        const margin = this.margin;

        const draw = () => {
            switch (this.curveType) {
                case CurveType.NURBS:
                case CurveType.BEZIER:
                    ctrlPath.attr('d', lineGenerator(this.controlPoints));
                    const curve = nurbs({
                        points: this.controlPoints,
                        degree: this.curveType === CurveType.NURBS ? 3 : this.controlPoints.length - 1,
                        boundary: 'clamped'
                    });
                    const x0 = curve.domain[0][0];
                    const x1 = curve.domain[0][1];
                    const n = (width + height) / 4;
                    const curveSamples = [];
                    for (let i = 0; i < n; i++) {
                        const t0 = x0 + ((x1 - x0) / (n - 1) * i);
                        curveSamples.push(curve.evaluate([], t0));
                    }
                    curvePath.attr('d', lineGenerator(curveSamples));
                    break;
                case CurveType.POLY_LINE:
                    curvePath.attr('d', lineGenerator(this.controlPoints));
                    break;
                default:
                    break;
            }

            circles.data(this.controlPoints)
                .attr('cx', d => xScale(d[0]))
                .attr('cy', d => yScale(d[1]));
        }

        draw();

        const updateModel = debounce(points => {
            this.model.set('points', points);
            this.touch();
        }, 200);


        const drag = () => {
            circles.on('.drag', null);
            circles.call( // @ts-ignore
                d3.drag().on('drag', (d, i) => {
                    const tx = d3.event.x + dx;
                    const ty = d3.event.y + dy;

                    if (tx > width - margin || tx < margin || ty > height - margin || ty < margin) {
                        return;
                    }
                    const x = isFunction && (i === 0 || i === this.controlPoints.length - 1) ? this.controlPoints[i][0] : xScale.invert(d3.event.x);
                    const y = yScale.invert(d3.event.y);
                    this.controlPoints[i] = [x, y];

                    draw();
                    updateModel(this.controlPoints = this.controlPoints.slice());
                })
            );
        };

        drag();

        const click = () => {
            circles.on('.dblclick', null);
            circles.on('dblclick', (d, i) => {
                d3.event.stopPropagation();
                d3.event.preventDefault();
                if (isFunction && (i === 0 || i === this.controlPoints.length - 1)) {
                    return;
                }
                if (this.controlPoints.length > (this.curveType === CurveType.POLY_LINE ? 2 : 4)) {
                    this.controlPoints.splice(i, 1);
                    circles.data(this.controlPoints).exit().remove();
                    draw();
                    drag();
                    this.model.unset('points');
                    this.model.set('points', this.controlPoints = this.controlPoints.slice());
                    this.touch();
                }
            });
        };

        click();

        svg.on('dblclick', () => {
            d3.event.stopPropagation();
            d3.event.preventDefault();
            const add = (i, p) => {
                this.controlPoints.splice(i, 0, p);
                circles.remove();
                circles = g.selectAll('.point')
                    .data(this.controlPoints)
                    .enter()
                    .append('circle')
                    .classed('point', true)
                    .attr('r', 10)
                    .attr('cx', d => xScale(d[0]))
                    .attr('cy', d => yScale(d[1]));
                draw();
                drag();
                click();
                this.model.unset('points');
                this.model.set('points', this.controlPoints = this.controlPoints.slice());
                this.touch();
            };
            let x = xScale.invert(d3.event.offsetX - dx);
            const y = yScale.invert(d3.event.offsetY - dy);
            let pi = 0;
            for (let i = this.controlPoints.length - 1; i >= 0; i--) {
                if (this.controlPoints[i][0] < x) {
                    pi = i + 1;
                    break;
                }
            }
            if (this.isFunction) {
                if (pi === 0) {
                    pi = 1;
                    x = this.controlPoints[1][0] / 2;
                } else if (pi === this.controlPoints.length) {
                    pi = pi - 1;
                    x = (this.controlPoints[this.controlPoints.length - 2][0] + 1) / 2;
                }
            }
            add(pi, [x, y]);
        });

    }

}
