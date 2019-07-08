import BindingAPI from '@af-modules/databinding/lib/BindingApi';

export const StylingBinding = {

    /** @type {Node} */
    node: null,

    expression: '',

    name: 'bind-styling',

    constructor({ node, text }) {
        this.node = node;
        this.expression = text;

        BindingAPI(this).attachBinding(this);
    },

    update(scope) {
        const { parseExpression } = BindingAPI(this).parser;
        const newValue = parseExpression(this.expression, scope);

        if (this.node.getAttribute('style') === newValue) {
            return;
        }

        this.node.setAttribute('style', newValue);
    },

    _make(...args) {
        this.constructor(...args);
    },

    __proto__: BindingAPI().Binding,
};

BindingAPI().registerBinding(StylingBinding);

export default StylingBinding;
