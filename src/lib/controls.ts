import { render, html, directive } from 'lit-html';
import { styleMap } from 'lit-html/directives/style-map'
import '@material/mwc-checkbox';
import '@material/mwc-formfield';
import '@material/mwc-fab';
import { IControlState, IControlHandlers } from './interfaces';

// TODO refactor handlers

class Controls {

    headerEl;
    controlsEl
    state: IControlState;
    rootEl;
    evtHandlers: IControlHandlers;

    constructor(state: IControlState, headerEl, controlsEl, evtHandlers: IControlHandlers) {
        this.headerEl = headerEl;
        this.controlsEl = controlsEl;
        this.evtHandlers = evtHandlers;
        const that = this;
        this.state = new Proxy(state, {
            set(obj, prop, value) {
                if (value !== obj[prop]) {
                    const res =  Reflect.set(obj, prop, value);
                    if (res) that.render();
                    return res;
                }
                return true;
            }
        });
    };

    private render() {
        render(this.renderControls(this.state, this.evtHandlers), this.controlsEl);
    };

    private renderControls = (state: IControlState, handlers: IControlHandlers) => {
        return html`<div class='pgl-jupyter-scene-widget-controls-container' style=${styleMap(state.showControls ? { 'background-color': '#00305312' } : {})}>
            <div class='pgl-jupyter-scene-widget-controls-header' style=${styleMap(state.showControls || state.showHeader ? { 'display': 'block' } : { 'display': 'none' })}>
                <mwc-fab mini icon="&#9881;" @click=${() => state.showControls = !state.showControls}></mwc-fab>
            </div>
            <div class='pgl-jupyter-scene-widget-controls-body unselectable' style=${styleMap(state.showControls ? { 'display': 'block' } : { 'display': 'none' })}'>
                <mwc-formfield label='fullscreen'>
                    <mwc-checkbox @change=${(evt) => handlers.onFullscreenToggled(evt.target.checked)} ?checked=${state.fullscreen}></mwc-checkbox>
                </mwc-formfield>
                <mwc-formfield label='auto rotate'>
                    <mwc-checkbox @change=${(evt) => handlers.onAutoRotateToggled(evt.target.checked)} ?checked=${state.autoRotate}></mwc-checkbox>
                </mwc-formfield>
                <mwc-formfield label='plane'>
                    <mwc-checkbox @change=${(evt) => handlers.onPlaneToggled(evt.target.checked)} ?checked=${state.plane}></mwc-checkbox>
                </mwc-formfield>
                <mwc-formfield label='axes helper'>
                    <mwc-checkbox @change=${(evt) => handlers.onAxesHelperToggled(evt.target.checked)} ?checked=${state.axesHelper}></mwc-checkbox>
                </mwc-formfield>
                <mwc-formfield label='light helper'>
                    <mwc-checkbox @change=${(evt) => handlers.onLightHelperToggled(evt.target.checked)} ?checked=${state.lightHelper}></mwc-checkbox>
                </mwc-formfield>
            </div>
        </div>`;
    };
}

export default Controls;
