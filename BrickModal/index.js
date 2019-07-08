import '@webcomponents/webcomponentsjs/bundles/webcomponents-sd-ce-pf';
import 'classlist-polyfill';

import { HTMLElement, prepareConstructor } from 'application-frame/core/nativePrototype';
import NetworkRequest from 'application-frame/core/NetworkRequest';
import { RenderEngine } from 'application-frame/rendering';
import { DataBinding } from '@af-modules/databinding';
import template from './template';

const { create } = Object;

const forceShowTask = Symbol('forceShowRenderTask');
const startExitAnimationTask = Symbol('startExitAnimationRenderTask');
const startEnterAnimationTask = Symbol('startEnterAnimationRenderTask');
const forceHideTask = Symbol('forceHideRenderTask');

export const BrickModalMeta = {
    name: 'brick-modal',

    register() {
        if (window.ShadyCSS) {
            window.ShadyCSS.prepareTemplate(template, BrickModalMeta.name);
        }

        window.customElements.define(this.name, BrickModal.constructor);
    }
};

export const BrickModal = {

    /** @type {ScopePrototype} */
    _scope: null,

    get source() {
        return this.getAttribute('source');
    },

    set source(value) {
        if (value) {
            this.setAttribute('source', value);
            this._onSourceChanged();
        } else {
            this.removeAttribute('source');
        }
    },

    get open() {
        return this.hasAttribute('open');
    },

    set open(value) {
        (value) ? this.setAttribute('open', '') : this.removeAttribute('open');
    },

    constructor: function() {
        const instance = HTMLElement.constructor.apply(this);

        instance._create();

        return instance;
    },

    _create() {
        const { node, scope } = DataBinding.createTemplateInstance({ scope: this, template });

        this.attachShadow({ mode: 'open' });
        this.shadowRoot.appendChild(node);
        this._scope = scope;

        DataBinding.attachBindings(this._scope, this, [
            { selector: 'root', name: 'bind-event', parameter: 'click', value: 'view._closeModal' }
        ]);
    },

    connectedCallback() {
        if (window.ShadyCSS && window.ShadyCSS.styleElement) {
            window.ShadyCSS.styleElement(this);
        }

        this.setAttribute('resolved', '');
    },

    _onSourceChanged() {
        const request = create(NetworkRequest).constructor(this.source, { method: 'GET', type: null });

        request.send()
            .then(content => {
                const template = document.createElement('template');

                template.innerHTML = content;

                while (this.childNodes.length) {
                    this.removeChild(this.childNodes[0]);
                }

                this.appendChild(document.importNode(template.content, true));
            });
    },

    _closeModal(event) {
        event.stopPropagation();

        this.open = false;
        this._scope.update();
    },

    _onDialogClicked(event) {
        event.stopPropagation();

        if (event.target.hasAttribute('close-trigger')) {
            if (event.target.form && !event.target.form.checkValidity()) {
                return;
            }

            return this._closeModal(event);
        }
    },

    attributeChangedCallback(name) {
        if (name === 'open') {
            this.open ? this._onOpenModal() : this._onCloseModal();
        }
    },

    _onOpenModal() {
        document.body.parentNode.style.overflow = 'hidden';

        const content = Array.from(this.children).filter(child => child.matches(':not([slot])'));

        if (content.length === 1 && content[0].matches('template')) {
            this.appendChild(document.importNode(content[0].content, true));
            this.removeChild(content[0]);
        }

        RenderEngine.scheduleRenderTask(this[forceHideTask].bind(this));
    },

    _onCloseModal() {
        document.body.parentNode.style.overflow = '';

        RenderEngine.scheduleRenderTask(this[forceShowTask].bind(this));
    },

    [forceShowTask]() {
        this.classList.add('force-show');

        RenderEngine.scheduleRenderTask(this[startExitAnimationTask].bind(this));
    },

    [forceHideTask]() {
        this.classList.add('force-hide');

        RenderEngine.scheduleRenderTask(this[startEnterAnimationTask].bind(this));
    },

    [startExitAnimationTask]() {
        const waitForEnd = () => {
            this.classList.remove('transition', 'force-show');

            this.removeEventListener('transitionend', waitForEnd);
        };

        const fallbackTimeout = setTimeout(waitForEnd.bind(null, 'timeout-exit'), 400);

        const waitForStart = () => {

            clearTimeout(fallbackTimeout);
            this.removeEventListener('transitionstart', waitForStart);
        };

        this.addEventListener('transitionend', waitForEnd);
        this.addEventListener('transitionstart', waitForStart);
        this.classList.add('transition');
    },

    [startEnterAnimationTask]() {
        const waitForEnd = () => {
            this.classList.remove('transition', 'force-hide');

            this.removeEventListener('transitionend', waitForEnd);
            this.removeEventListener('transitionstart', waitForStart);
        };

        const fallbackTimeout = setTimeout(waitForEnd.bind(null, 'timeout-enter'), 400);

        const waitForStart = () => {
            clearTimeout(fallbackTimeout);
            this.removeEventListener('transitionstart', waitForStart);
        };

        this.addEventListener('transitionend', waitForEnd);
        this.addEventListener('transitionstart', waitForStart);
        this.classList.add('transition');
    },

    __proto__: HTMLElement,
};

export { template };

prepareConstructor(BrickModal);

BrickModal.constructor.observedAttributes = ['open'];
