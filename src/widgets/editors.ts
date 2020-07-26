import '../../css/widget.css';
import {
    DOMWidgetView, WidgetView
} from '@jupyter-widgets/base';
import * as d3 from 'd3';
import * as nurbs from 'nurbs';
import { debounce } from './utilities';

export class CurveEditorWidgetView extends DOMWidgetView {

    width = 250;
    height = 250;
    margin = 15;
    svg = null;
    name = '';
    isFunction = false;
    controlPoints = [];

    initialize(parameters: WidgetView.InitializeParameters) {
        super.initialize(parameters);
    }

    render() {

        super.render();
        this.pWidget.addClass('pgl-curve-editor');
        this.svg = d3.select(this.el)
            .append('svg')
            .classed('pgl-curve-editor-svg', true)
            .style('width', this.width)
            .style('height', this.height);
        this.name = this.model.get('name');
        this.isFunction = this.model.get('is_function');
        this.controlPoints = this.model.get('control_points').map(p => [...p]);
        this.onControlPointsChanged();
        this.listenTo(this.model, 'change:control_points', () => {
            const p1 = this.model.get('control_points').map(p => [...p]);
            const p0 = this.controlPoints;
            // test if point data has changed
            if (p1.length !== p0.length || p1.some((p, i) => p[0] !== p0[i][0] || p[1] !== p0[i][1])) {
                this.controlPoints = p1;
                this.onControlPointsChanged();
            }
        });

    }

    onControlPointsChanged() {

        this.svg.selectAll('g').remove();

        const controlPoints = this.controlPoints;
        const isFunction = this.isFunction;
        if (controlPoints.length < 2) return;

        const width = this.width;
        const height = this.height;
        const margin = this.margin;

        const evaluate = (points) => {
            const curve = nurbs({
                points,
                degree: 3,
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
            return curveSamples
        };

        const curveSamples = evaluate(controlPoints);


        const [minx, miny, maxx, maxy] = [...controlPoints, ...curveSamples].reduce((m, p) => {
            m[0] = p[0] < m[0] ? p[0] : m[0];
            m[1] = p[1] < m[1] ? p[1] : m[1];
            m[2] = p[0] > m[2] ? p[0] : m[2];
            m[3] = p[1] > m[3] ? p[1] : m[3];
            return m;
        }, [Infinity, Infinity, -Infinity, -Infinity]);

        const domain = [Math.min(minx, miny), Math.max(maxx, maxy)];

        const xScale = d3.scaleLinear()
            .domain(domain)
            .range([margin, width - margin]);
        const yScale = d3.scaleLinear()
            .domain(domain)
            .range([height - margin, margin]);

        const lineGenerator = d3.line()
            .x(d => xScale(d[0]))
            .y(d => yScale(d[1]))
            .curve(d3.curveLinear);

        const dx = ((width / 2) - (xScale(maxx) + xScale(minx)) / 2);
        const dy = ((height / 2) - (yScale(maxy) + yScale(miny)) / 2);

        const g = this.svg.append('g')
            .attr('transform', `translate(${dx},${dy})`);

        d3.zoom()(g);

        g.append('path')
            .classed('grid', true)
            .attr('d', lineGenerator([[0, maxy], [0, miny]]));

        g.append('path')
            .classed('grid', true)
            .attr('d', lineGenerator([[minx, 0], [maxx, 0]]));

        const ctrlPath = g.append('path')
            .classed('line', true)
            .attr('d', lineGenerator(controlPoints));

        const curvePath = g.append('path')
            .classed('curve', true)
            .attr('d', lineGenerator(curveSamples));

        g.selectAll('.point')
            .data(controlPoints)
            .enter()
            .append('circle')
            .classed('point', true)
            .attr('r', 10)
            .attr('cx', d => xScale(d[0]))
            .attr('cy', d => yScale(d[1]))

        const updateModel = debounce((points) => {
            this.model.set('control_points', points, { silent: false });
            this.touch();
        }, 200);

        this.svg.selectAll('circle')
            .call( // @ts-ignore
                d3.drag()
                    .on('drag', function (d, i) {

                        const tx = d3.event.x + dx;
                        const ty = d3.event.y + dy;

                        if (tx > width - margin || tx < margin || ty > height - margin || ty < margin) {
                            return;
                        }
                        const x = isFunction && (i === 0 || i === controlPoints.length - 1) ? controlPoints[i][0] : xScale.invert(d3.event.x);
                        const y = yScale.invert(d3.event.y);
                        controlPoints[i] = [x, y];

                        curvePath.attr('d', lineGenerator(evaluate(controlPoints)));
                        ctrlPath.attr('d', lineGenerator(controlPoints));

                        // @ts-ignore
                        d3.select(this).attr('cx', d.x = xScale(x)).attr('cy', d.y = d3.event.y);
                        updateModel(controlPoints.map(p => [...p]));
                    })
            );

    }

}
