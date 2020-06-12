import '@webcomponents/webcomponentsjs/bundles/webcomponents-sd-ce-pf';
import '../../lib/element-closest-polyfill';

import { HTMLElement, prepareConstructor } from 'application-frame/core/nativePrototype';
import { DataBinding } from '@af-modules/databinding';
import template from './template';
import async from 'application-frame/core/async';

const getObserverTarget = function(originalTarget) {

    // we have an Element node and by our best guess that's what we want
    if (originalTarget.hasAttribute) {
        return originalTarget;
    }

    // we got a text node but we actually want the brick-select Element node
    const target = originalTarget.parentNode.closest('brick-select');

    return target;
};

const childObserver = new MutationObserver((recordList) => {
    recordList.forEach((record) => {
        if (record.type !== 'childList' && record.type !== 'characterData') {
            return;
        }

        const target = getObserverTarget(record.target);

        // the polyfill might return a node which is actually in the shadow dom
        if (!target || !target.hasAttribute('resolved')) {
            return;
        }

        if (Array.from(record.addedNodes).filter(node => node.localName === 'option').length === 0) {
            return target._scope.update();
        }

        target._processOptions();
        target._scope.update();
    });
});

const BrickSelect = {

    _touched: false,

    _scope: null,

    _options: null,

    _nativeSelect: null,

    get selectedIndex() { return this._nativeSelect.selectedIndex; },

    get selectedItem() { return this._options && this._options[this.selectedIndex]; },

    get name() { return this.getAttribute('name'); },

    get autoSubmit() { return this.hasAttribute('auto-submit'); },

    get form() { return this._nativeSelect.form; },

    get validity() { return this._nativeSelect && this._nativeSelect.validity || {}; },

    get value() { return this.selectedItem && this.selectedItem.value; },

    set value(value) {
        const optionIndex = this._options.findIndex(option => option.value === value);

        if (this._options[optionIndex]) {
            this._selectItem(optionIndex);
        }
    },

    get disabled() { return this.hasAttribute('disabled'); },

    set disabled(value) { value ? this.setAttribute('disabled', '') : this.removeAttribute('disabled'); this._scope.update(); },

    get _markValid() {
        return this.disabled ||
            (!this._touched && (this._nativeSelect && this._nativeSelect.value.length < 1)) ||
            this.validity.valid;
    },

    get _isPlaceholder() { return this.selectedItem && this.selectedItem.value === ''; },
    get _errorMessage() { return this._nativeSelect.validationMessage; },

    constructor: function() {
        const instance = HTMLElement.constructor.apply(this);
        const { node, scope } = DataBinding.createTemplateInstance({ scope: instance, template });

        instance.attachShadow({ mode: 'open' });
        instance.shadowRoot.appendChild(node);
        instance._scope = scope;
        instance._options = [];

        childObserver.observe(instance, { childList: true, subtree: true, characterData: true });

        return instance;
    },

    connectedCallback() {
        if (window.ShadyCSS && window.ShadyCSS.styleElement) {
            window.ShadyCSS.styleElement(this);
        }

        if (this._nativeSelect) {
            return;
        }

        this.setAttribute('resolved', '');

        this._processOptions();
        this._nativeSelect.required = this.hasAttribute('required');

        this.addEventListener('click', this._onSelectOpened.bind(this));
        this.addEventListener('change', this._onSelectionChanged.bind(this));

        DataBinding.attachBindings(this._scope, this, [
            { selector: 'root', name: 'bind-class', value: '{ invalid: view._not(view._markValid), untouched: view._not(view._touched) }' },
            { selector: 'select', name: 'bind-event', parameter: 'invalid', value: 'view._onInvalid' },
            { selector: 'select', name: 'bind-event', parameter: 'change', value: 'view._onNativeChanged' },
            { selector: 'select', name: 'bind-attr', parameter: 'disabled', value: 'view.disabled' },
        ]);

        this._scope.update();
    },

    _processOptions() {
        let optionList = null;

        if (this.children.length === 1 && this.firstElementChild.localName === 'select') {
            this._nativeSelect = this.firstElementChild;
            optionList = this._nativeSelect.children;

        } else if (!this._nativeSelect){
            this._nativeSelect = document.createElement('select');
        }

        optionList = this.querySelectorAll('option');

        this._nativeSelect.name = this.name;
        this._options = [];

        Array.from(optionList).forEach(option => {
            if (option.localName !== 'option') {
                return;
            }

            this._nativeSelect.appendChild(option);

            this._options.push({
                get title() { return this.node.textContent; },
                get value() { return this.node.value; },
                get selected() { return this.node.selected; },
                node: option,
            });
        });

        this.appendChild(this._nativeSelect);
    },

    _onSelectOpened(event, scope) {
        if (event.target !== this) {
            return;
        }

        this._isOpen = true;
        this._scope.update();
    },

    _onClose(event) {
        this._isOpen = false;

        event.stopPropagation();
    },

    _selectItem(index) {
        this._nativeSelect.selectedIndex = index;
    },

    _onSelectionChanged() {
        if (!this.autoSubmit || !this.form) {
            return;
        }

        const submit = document.createElement('input');

        submit.type = 'submit';
        submit.style.display = 'none';

        this.form.appendChild(submit);
        submit.click();
        this.form.removeChild(submit);
        this._scope.update();
    },

    _optionSelected(event, scope) {
        event.stopPropagation();

        this._selectItem(scope.$index);
        this._isOpen = false;
        this._touched = true;

        async(() => {
            this.dispatchEvent(new Event('change', { bubbles: true }));
        });

        event.preventRecycle();
        this._scope.update();
    },

    _onNativeChanged() {
        this._scope.update();
        this.dispatchEvent(new Event('change', { bubbles: true }));
    },

    _not(value) {
        return !value;
    },

    _onInvalid() {
        this._touched = true;

        event.preventDefault();

        if (event.target.form.querySelector(':invalid') !== event.target) {
            return;
        }

        event.target.parentElement.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'smooth' });
    },

    __proto__: HTMLElement,
};

prepareConstructor(BrickSelect);

if (window.ShadyCSS) {
    window.ShadyCSS.prepareTemplate(template, 'brick-select');
}

window.customElements.define('brick-select', BrickSelect.constructor);

export { BrickSelect, childObserver };
