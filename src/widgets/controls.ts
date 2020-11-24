import { render, html } from 'lit-html';
import { styleMap } from 'lit-html/directives/style-map'
import '@material/mwc-switch';
import '@material/mwc-formfield';
import '@material/mwc-icon-button-toggle';
import '@material/mwc-icon-button';
import '@material/mwc-linear-progress';
import '@material/mwc-circular-progress';
import {
    IPGLControlsState,
    IPGLControlsHandlers,
    ILsystemControlsState,
    ILsystemControlsHandlers, IPGLProgressState
} from './interfaces';

// TODO refactor handlers

export class PGLControls {

    evtHandlers: IPGLControlsHandlers;
    state: IPGLControlsState;
    controlsEl: HTMLElement;

    constructor(state: IPGLControlsState, evtHandlers: IPGLControlsHandlers, controlsEl: HTMLElement) {
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

    private renderControls = (state: IPGLControlsState, handlers: IPGLControlsHandlers) => {
        return html`<div class='pgl-jupyter-pgl-widget-controls-container' style=${styleMap(state.showControls ? { 'background-color': 'rgba(160, 160, 160, 0.1)' } : {})}>
            <div class='pgl-jupyter-pgl-widget-controls-header' style=${styleMap(state.showControls || state.showHeader ? { 'display': 'block' } : { 'display': 'none' })}>
                <mwc-icon-button icon="&#9881;" @click=${() => state.showControls = !state.showControls}></mwc-icon-button>
            </div>
            <div class='pgl-jupyter-pgl-widget-controls-body unselectable' style=${styleMap(state.showControls ? { 'display': 'block' } : { 'display': 'none' })}'>
                <mwc-formfield label='fullscreen'>
                    <mwc-switch @change=${(evt) => handlers.onFullscreenToggled(evt.target.checked)} ?checked=${state.fullscreen}></mwc-switch>
                </mwc-formfield>
                <mwc-formfield label='auto rotate'>
                    <mwc-switch @change=${(evt) => handlers.onAutoRotateToggled(evt.target.checked)} ?checked=${state.autoRotate}></mwc-switch>
                </mwc-formfield>
                <mwc-formfield label='plane'>
                    <mwc-switch @change=${(evt) => handlers.onPlaneToggled(evt.target.checked)} ?checked=${state.plane}></mwc-switch>
                </mwc-formfield>
                <mwc-formfield label='flat shading'>
                    <mwc-switch
                        @change=${(evt) => handlers.onFlatShadingToggled(evt.target.checked)} ?checked=${state.flatShading}>
                    </mwc-switch>
                </mwc-formfield>
                <mwc-formfield label='wireframe'>
                    <mwc-switch
                        @change=${(evt) => handlers.onWireframeToggled(evt.target.checked)} ?checked=${state.wireframe}>
                    </mwc-switch>
                </mwc-formfield>
                </div>
                </div>`;
                // <mwc-formfield label='axes helper'>
                //     <mwc-switch @change=${(evt) => handlers.onAxesHelperToggled(evt.target.checked)} ?checked=${state.axesHelper}></mwc-switch>
                // </mwc-formfield>
                // <mwc-formfield label='light helper'>
                //     <mwc-switch
                //         @change=${(evt) => handlers.onLightHelperToggled(evt.target.checked)} ?checked=${state.lightHelper}>
                //     </mwc-switch>
                // </mwc-formfield>
            };
}

export class PGLProgress {

    state: IPGLProgressState;
    el: HTMLElement;

    constructor(state: IPGLProgressState, el: HTMLElement) {
        this.el = el;
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
        this.render();
    };

    private render() {
        render(this.renderProgress(this.state), this.el);
    };

    private renderProgress = (state: IPGLProgressState) => {
        return html`<mwc-circular-progress
                ?closed=${!state.busy}
                progress=${state.busy}
                density='-6'
            ></mwc-circular-progress>`;
    };
}


export class LsystemControls {

    state: ILsystemControlsState;
    evtHandlers: ILsystemControlsHandlers;
    controlsEl: HTMLElement;

    constructor(state: ILsystemControlsState, evtHandlers: ILsystemControlsHandlers, controlsEl: HTMLElement) {
        this.controlsEl = controlsEl;
        this.evtHandlers = evtHandlers;
        const that = this;
        this.state = new Proxy(state, {
            set(obj, prop, value) {
                if (value !== obj[prop]) {
                    const res = Reflect.set(obj, prop, value);
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

    private renderControls = (state: ILsystemControlsState, handlers: ILsystemControlsHandlers) => {
        return html`<div class='pgl-jupyter-lsystem-widget-controls-container unselectable' ?hidden=${!this.state.comm_live}>
            <div style=${styleMap(state.showControls ? { 'display': 'block' } : { 'visibility': 'hidden' })}>
                <mwc-icon-button icon="&#8676"
                    ?disabled=${state.animate || state.derivationStep === 0 || state.busy}
                    @click=${(evt) => evt.target.disabled || handlers.onDeriveClicked(0)}>
                </mwc-icon-button>
                <mwc-icon-button icon="&#8612"
                    ?disabled=${state.animate || state.derivationStep === 0 || state.busy}
                    @click=${(evt) => evt.target.disabled || handlers.onDeriveClicked(Math.max(0, state.derivationStep - 1))}>
                </mwc-icon-button>
                <mwc-icon-button icon="&#8614"
                    ?disabled=${state.animate || state.derivationStep === state.derivationLength - 1 || state.busy}
                    @click=${(evt) => evt.target.disabled || handlers.onDeriveClicked(Math.min(state.derivationLength - 1, state.derivationStep + 1))}>
                </mwc-icon-button>
                <mwc-icon-button icon="&#8677"
                    ?disabled=${state.animate || state.derivationStep === state.derivationLength - 1 || state.busy}
                    @click=${(evt) => evt.target.disabled || handlers.onDeriveClicked(state.derivationLength - 1)}>
                </mwc-icon-button>
                <mwc-icon-button-toggle
                    ?disabled=${!state.animate && state.busy}
                    ?on=${state.animate}
                    ?off=${!state.animate}
                    onIcon="&#8603"
                    offIcon="&#8620"
                    @click=${(evt) => evt.target.disabled || handlers.onAnimateToggled(!state.animate)}>
                </mwc-icon-button-toggle>
                <mwc-icon-button icon="&#8634"
                    ?disabled=${state.animate || state.busy || state.isMagic}
                    @click=${(evt) => evt.target.disabled || handlers.onRewindClicked()}>
                </mwc-icon-button>
            </div>
            <div style=${styleMap((state.derivationStep < state.derivationLength - 1 && (state.showControls || state.animate || state.busy)) ? { 'display': 'block' } : { 'visibility': 'hidden' })}>
                <mwc-linear-progress
                    progress=${state.derivationStep / (state.derivationLength - 1)}
                    buffer=${state.pyFeed ? (state.derivationLength - state.pyFeed) / state.derivationLength : 1}>
                </mwc-linear-progress>
            </div>
        </div>`;
    };
}
