import { render, html, directive } from 'lit-html';
import '@material/mwc-checkbox';
import '@material/mwc-formfield';
import '@material/mwc-fab';
import { IControlState, IControlHandlers } from './interfaces';

// TODO refactor handlers

const showDirective = directive((show) => (part) => { part.setValue(show ? 'block' : 'none') });

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
        render(this.renderHeader(this.state, this.evtHandlers), this.headerEl);
        render(this.renderControls(this.state, this.evtHandlers), this.controlsEl);
    };

    private renderHeader = (state: IControlState, handlers: IControlHandlers) => {
        return html`<div class='pgl-jupyter-scene-widget-header unselectable' style='display: ${showDirective(state.showHeader || state.showControls)}'>
            <mwc-fab mini icon="&#9881;" @click=${() => state.showControls = !state.showControls}></mwc-fab>
        </div>`;
    };

    private renderControls = (state: IControlState, handlers: IControlHandlers) => {
        return html`<div class='pgl-jupyter-scene-widget-controls' style='display: ${showDirective(state.showControls)}'>
            <mwc-formfield label='auto rotate'>
                <mwc-checkbox @change=${(evt) => handlers.onAutoRotateToggled(evt.target.checked)} ?checked=${state.autoRotate}></mwc-checkbox>
            </mwc-formfield>
            <mwc-formfield label='fullscreen'>
                <mwc-checkbox @change=${(evt) => handlers.onFullscreenToggled(evt.target.checked)}></mwc-checkbox>
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
        </div>`;
    };
}

export default Controls;
