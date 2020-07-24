import '../../css/widget.css';
import {
    DOMWidgetView, WidgetView
} from '@jupyter-widgets/base';
import * as d3 from 'd3';
import * as nurbs from 'nurbs';
import { Debounce } from './utilities';

export class CurveEditorWidgetView extends DOMWidgetView {

    width = 250;
    height = 250;
    margin = 15;
    svg = null;

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
        this.on_control_points_changed();

    }

    on_control_points_changed() {

        const points = this.model.get('control_points').map(p => [...p]);
        const name = this.model.get('name');
        const isFunction = this.model.get('is_function');
        if (points.length < 2) return;

        const width = this.width;
        const height = this.height;
        const margin = this.margin;

        const curve = nurbs({
            points,
            degree: 3,
            boundary: 'clamped'
        });
        const x0 = curve.domain[0][0];
        const x1 = curve.domain[0][1];
        const n = 100
        const data = [];
        for (let i = 0; i < n; i++) {
            const t0 = x0 + ((x1 - x0) / (n - 1) * i);
            data.push(curve.evaluate([], t0));
        }

        const minx = d3.min(data.map(d => d[0]));
        const miny = d3.min(data.map(d => d[1]));
        const maxx = d3.max(data.map(d => d[0]));
        const maxy = d3.max(data.map(d => d[1]));
        const domain = [Math.min(minx, miny), Math.max(maxx, maxy)];

        let xScale = d3.scaleLinear()
            .domain(domain)
            .range([margin, width - margin]);
        let yScale = d3.scaleLinear()
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

        const ctrlPath = g.append('path')
            .classed('u-line', true)
            .attr('d', lineGenerator(points));

        const curvePath = g.append('path')
            .classed('u-path', true)
            .attr('d', lineGenerator(data));

        g.selectAll('.u-point')
            .data(points)
            .enter()
            .append('circle')
            .classed('u-point', true)
            .attr('r', 10)
            .attr('cx', d => xScale(d[0]))
            .attr('cy', d => yScale(d[1]))

        // @ts-ignore
        const updateModel = new Debounce((points) => {
            this.model.set('control_points', [...points]);
            this.touch();
        }, 250);

        this.svg.selectAll('circle')
            .call( // @ts-ignore
                d3.drag()
                    .on('drag', function (d, i) {

                        const tx = d3.event.x + dx;
                        const ty = d3.event.y + dy;

                        if (tx > width - margin || tx < margin || ty > height - margin || ty < margin) {
                            return;
                        }
                        const x = isFunction && (i === 0 || i === points.length - 1) ? points[i][0] : xScale.invert(d3.event.x);
                        const y = yScale.invert(d3.event.y);
                        points[i] = [x, y];
                        const curve = nurbs({
                            points,
                            degree: 3,
                            boundary: 'clamped'
                        });
                        const x0 = curve.domain[0][0];
                        const x1 = curve.domain[0][1];
                        const n = 100
                        const data = [];
                        for (let i = 0; i < n; i++) {
                            const t0 = x0 + ((x1 - x0) / (n - 1) * i);
                            data.push(curve.evaluate([], t0));
                        }

                        curvePath.attr('d', lineGenerator(data));
                        ctrlPath.attr('d', lineGenerator(points));

                        // @ts-ignore
                        d3.select(this).attr('cx', d.x = xScale(x)).attr('cy', d.y = d3.event.y);
                        updateModel(points);
                    })
            );

    }

}
