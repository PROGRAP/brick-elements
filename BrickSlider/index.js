import '@webcomponents/webcomponentsjs/bundles/webcomponents-sd-ce-pf';

import { HTMLElement, prepareConstructor } from 'application-frame/core/nativePrototype';
import { DataBinding } from '@af-modules/databinding';
import { RenderEngine } from 'application-frame/rendering';
import { TouchVelocity } from '../../lib/TouchVelocity';
import template from './template';

import './bindings/StylingBinding';

const ScrollLock = {
    Vertical: Symbol('ScrollLock.Vertical'),
    Horizontal: Symbol('ScrollLock.Horizontal'),
};

const BrickSliderMeta = {
    name: 'brick-banner-slider',
    attributes: ['selected-index'],

    get object() {
        return BrickSlider;
    }
};

const meta = BrickSliderMeta;

const BrickSlider = {

    _selectedIndex: null,

    _slides: null,

    _cloneCount: 0,

    _autoSlideInterval: null,

    modes: {
        SINGLE_ITEM: 1,
        LESS_THAN_FOUR: 4,
        LESS_THAN_FIVE: 5,
    },

    _currentMode: null,

    _manualOffset: 0,
    __currentSlideSize: 0,
    _canvasSize: 0,

    __sl: null,

    get selectedItem() {
        return this._slides && this._slides[this._selectedIndex];
    },

    get selectedSlide() {
        return this.selectedItem && this.selectedItem.node;
    },

    get length() {
        return this._slides.length;
    },

    get selectedIndex() { return this._selectedIndex; },

    get autoSlide() { return this.getAttribute('auto-slide'); },

    get initialOffset() {
        const offset = parseInt(this.getAttribute('initial-offset'), 10);

        return isNaN(offset) ? 50 : offset;
    },

    get threshold() {
        return parseInt(this.getAttribute('threshold'), 10) || 2;
    },

    get noCarousel() {
        return this.hasAttribute('no-carousel');
    },

    get noSlide() {
        return this.hasAttribute('no-slide');
    },

    set selectedIndex(value) {
        if (!this._slides) {
            return;
        }

        let length = this._slides.length;

        if (this.noCarousel) {
            length = this._slides.length - this._visibleSlides + 1;

            if (length < 1) {
                length = 1;
            }
        }

        if (value < 0) {
            value = this._slides.length + value;
        }

        if (value >= length) {
            value = value % length;
        }

        if (this._slides[this._selectedIndex]) {
            this._slides[this._selectedIndex].selected = false;
        }

        this._slides[value].selected = true;
        this._selectedIndex = value;
        this.style.willChange = 'transform';
        this.dispatchEvent(new Event('change'));
    },

    get _slidesCanvas() {
        return this.shadowRoot.querySelector('.slides');
    },

    get _currentSlideSize() {
        if (this.__currentSlideSize === 0) {
            this._updateCurrentSlideSize();
        }

        return this.__currentSlideSize;
    },

    get _scrollLock() {
        return this.__sl;
    },

    set _scrollLock(value) {
        if (value !== ScrollLock.Horizontal && value !== ScrollLock.Vertical && value !== null) {
            throw new TypeError('value of _scrollLock must be one of ScrollLock');
        }

        this.__sl = value;

        if (value === ScrollLock.Vertical) {
            document.body.parentElement.style.overflowY = 'hidden';
            document.body.style.overflowY = 'hidden';
        } else {
            document.body.parentElement.style.overflowY = '';
            document.body.style.overflowY = '';
        }
    },

    get clickSelect() {
        return this.hasAttribute('click-select');
    },

    get _visibleSlides() {
        const slideSize = this._currentSlideSize;
        const canvas = this._canvasSize;
        const visibleSlides = Math.floor(canvas / slideSize);

        return visibleSlides;
    },

    constructor: function() {
        const instance = HTMLElement.constructor.apply(this);
        const { node, scope } = DataBinding.createTemplateInstance({ scope: instance, template });

        instance.attachShadow({ mode: 'open' });
        instance.shadowRoot.appendChild(node);
        instance._scope = scope;

        return instance;
    },

    _updateCurrentSlideSize() {
        if (!this.selectedItem) {
            return 0;
        }

        this.__currentSlideSize = this.selectedItem.node.getBoundingClientRect().width;
        this._canvasSize = this._slidesCanvas.parentNode.offsetWidth;
    },

    _createClone(node) {
        const clone = node.cloneNode(true);

        clone.removeAttribute('selected');
        clone.setAttribute('shadow', '');

        return clone;
    },

    /**
     * Sets up the banner slider. If the banner contains too less items,
     * shadow items are created until the slider is full. Otherwise only on set
     * of shadow items is created in order to infinitely slide in any direction.
     *
     * @return {undefined}
     */
    connectedCallback() {
        if (window.ShadyCSS && window.ShadyCSS.styleElement) {
            window.ShadyCSS.styleElement(this);
        }

        if (this._currentMode !== null) {
            return;
        }

        this._slidesCanvas.classList.add('lock');
        this.querySelector('[slot="previous"]')
            .addEventListener('click', this.prevClicked.bind(this));

        this.querySelector('[slot="next"]')
            .addEventListener('click', this.nextClicked.bind(this));

        this.addEventListener('mouseenter', this.onStopInterval.bind(this), { passive: true });
        this.addEventListener('mouseleave', this.onStartInterval.bind(this), { passive: true });
        window.addEventListener('resize', this._onViewportChange.bind(this));

        DataBinding.attachBindings(this._scope, this, [
            { selector: 'root', name: 'bind-attr', parameter: 'no-prev', value: 'view._hasNoPrev' },
            { selector: 'root', name: 'bind-attr', parameter: 'no-next', value: 'view._hasNoNext' },
        ]);

        const currentSlideNodes = this.getDomSlides();
        const shadowContainer = this._getShadowSlidesContainer();
        const minSlideCount = this.threshold * 2 + 1;

        this._currentMode = currentSlideNodes.length;

        if (this._currentMode < 1) {
            return;
        }

        currentSlideNodes.reverse();

        // create shadow slides if carousel mode is not disabled
        if (!this.noCarousel) {

            // clone slider items until slider is full.
            if (this._currentMode < minSlideCount) {
                for (let i = 0; i < Math.floor(minSlideCount / this._currentMode); i++) {
                    currentSlideNodes.forEach(slideNode =>
                        shadowContainer.insertBefore(this._createClone(slideNode), shadowContainer.firstChild));
                }
            } else {

                // create one set of copies because slider is already full.
                currentSlideNodes.forEach(slideNode =>
                    shadowContainer.insertBefore(this._createClone(slideNode), shadowContainer.firstChild));
            }
        }

        // register original slides as well as shadow slides
        this._slides = this.getDomSlides().map(this.onProcessSlideNode.bind(this, false));
        this._slides.push(...this.getShadowDomSlides().map(this.onProcessSlideNode.bind(this, true)));

        if (this.selectedIndex === null) {
            const selectedIndex = parseInt(this.getAttribute('selected-index'), 10);

            this.selectedIndex = selectedIndex || 0;
        }

        // if the slider wasn't full we have to shuffle one set of shadow slides
        // to the right.
        if (!this.noCarousel && this._currentMode < minSlideCount) {
            this._sortSlides();
        }

        this.onStartInterval();

        this.setAttribute('resolved', '');
        RenderEngine.skipFrame().scheduleRenderTask(() => this._slidesCanvas.classList.remove('lock'));
    },

    _getShadowSlidesContainer() {
        return this;
    },

    onStartInterval() {
        if (!this.autoSlide || this._currentMode < 1) {
            return;
        }

        this._autoSlideInterval = setInterval(this.nextClicked.bind(this), parseInt(this.autoSlide, 10));
    },

    onStopInterval() {
        clearInterval(this._autoSlideInterval);
    },

    onProcessSlideNode(isShadow, node, index) {
        const item = {
            get selected() { return this.node.hasAttribute('selected'); },
            set selected(value) {
                value ? this.node.setAttribute('selected', '') : this.node.removeAttribute('selected');
            },
            node,
            isShadow,
        };

        if (item.selected && this._selectedIndex === null) {
            this._selectedIndex = index;
        } else {
            item.selected = false;
        }

        return item;
    },

    onSliderMoved(event) {
        if (!event.target.classList.contains('slides') || event.propertyName !== 'transform' || this.noCarousel) {
            this._lockNavigation = false;

            return;
        }

        const slidesCanvas = this.shadowRoot.querySelector('.slides');

        // lock sliding or the user will see our shuffling
        slidesCanvas.classList.add('lock');

        // wait for the browser to apply the lock
        RenderEngine.scheduleRenderTask(() => {

            // release lock once everything is done
            RenderEngine.skipFrame().scheduleRenderTask(() => {
                slidesCanvas.classList.remove('lock');
                this._lockNavigation = false;
            });

            this._sortSlides();
            this._scope.update();
        }, this);
    },

    _sortSlides() {
        const slidesCanvas = this.shadowRoot.querySelector('.slides');
        const container = this._getShadowSlidesContainer();

        if (this._currentMode <= (this.threshold * 2)) {
            const currentDomSlideOrder = this._getAllDomSlides();
            const currentDomIndex = currentDomSlideOrder.indexOf(this.selectedItem.node);

            if (currentDomIndex >= currentDomSlideOrder.length - this.threshold) {
                const toShuffle = this.threshold - (currentDomSlideOrder.length - 1 - currentDomIndex);

                for (let i = 0; i < toShuffle; i++) {
                    container.appendChild(currentDomSlideOrder[i]);
                }
            } else if (currentDomIndex <= this.threshold - 1) {
                const toShuffle = this.threshold - (currentDomIndex - 1);

                for (let i = 0; i < toShuffle; i++) {
                    const index = currentDomSlideOrder.length - (i + 1);

                    container.insertBefore(currentDomSlideOrder[index], container.firstChild);
                }
            }

            slidesCanvas.setAttribute('style', this.currentTransform());

            return this._scope.update();
        }

        if (this._isSecondLightSlide(this.selectedItem) || this._isSecondLastShadowSlide(this.selectedItem)) {
            container.appendChild(this._getSlidesSlot());
        } else if (this._isSecondLastLightSlide(this.selectedItem) || this._isSecondShadowSlide(this.selectedItem)) {
            container.insertBefore(this._getSlidesSlot(), container.firstChild);
        }

        slidesCanvas.setAttribute('style', this.currentTransform());
    },

    _getSlidesSlot() {
        const fragment = document.createDocumentFragment();

        this.getDomSlides().forEach(node => fragment.appendChild(node));

        return fragment;
    },

    _isSecondLightSlide(slide) {
        const index = this._slides.indexOf(slide);

        return index === this.threshold;
    },

    _isSecondLastLightSlide(slide) {
        const index = this._slides.indexOf(slide);

        return !slide.isShadow &&
            this._slides[index + (this.threshold - 1)] && !this._slides[index + (this.threshold - 1)].isShadow &&
            this._slides[index + this.threshold] && this._slides[index + this.threshold].isShadow;
    },

    _isSecondLastShadowSlide(slide) {
        const index = this._slides.indexOf(slide);

        return index === this._slides.length - this.threshold;
    },

    _isSecondShadowSlide(slide) {
        const index = this._slides.indexOf(slide);

        return slide.isShadow &&
            this._slides[index - (this.threshold - 1)] && this._slides[index - (this.threshold - 1)].isShadow &&
            this._slides[index - this.threshold] && !this._slides[index - this.threshold].isShadow;
    },

    getDomSlides() {
        return Array.prototype
            .filter.apply(this.children, [(node) => !node.hasAttribute('slot') && !node.hasAttribute('shadow')]);
    },

    getShadowDomSlides() {
        return Array.prototype
            .filter.apply(this.children, [(node) => !node.hasAttribute('slot') && node.hasAttribute('shadow')]);
    },

    _getAllDomSlides() {
        return Array.prototype
            .filter.apply(this.children, [(node) => !node.hasAttribute('slot')]);
    },

    currentTransform() {
        if (!this.selectedItem || this.noSlide) {
            return 'transform: translate3d(0, 0, 0);';
        }

        if (window.ShadyDOM) {
            window.ShadyDOM.flush();
        }

        const currentDomSlideOrder = this._getAllDomSlides();
        const currentDomIndex = currentDomSlideOrder.indexOf(this.selectedItem.node);
        const slideSize = this._currentSlideSize;
        const initialOffset = slideSize * (this.initialOffset / 100);
        const manualOffset = this._manualOffset;

        return `transform: translate3d(${initialOffset - (slideSize * currentDomIndex) + manualOffset}px, 0, 0);`;
    },

    prevClicked() {
        if (this._lockNavigation) {
            return;
        }

        if(!this.noSlide){
            this._lockNavigation = true;
        }

        this.selectedIndex -= 1;
        this._scope.update();
    },

    nextClicked() {
        if (this._lockNavigation) {
            return;
        }

        if(!this.noSlide){
            this._lockNavigation = true;
        }

        this.selectedIndex += 1;
        this._scope.update();
    },

    _onDragSlides(event) {
        const startPos = { x: event.changedTouches[0].clientX, y: event.changedTouches[0].clientY };
        const velocity = TouchVelocity.new(event.changedTouches[0]);
        const self = this;

        const moveEventListener = function(event) {
            return self._onMoveSlides(startPos, velocity, moveEventListener, releaseEventListener, scrollLocker, event);
        };

        const releaseEventListener = function() {
            return self._onReleaseSlides(velocity, moveEventListener, releaseEventListener, scrollLocker);
        };

        const scrollLocker = function(event) {
            event.preventDefault();
        };

        this._slidesCanvas.classList.add('lock');
        this.onStopInterval();

        window.addEventListener('touchmove', moveEventListener);
        window.addEventListener('touchend', releaseEventListener);
        window.addEventListener('scroll', scrollLocker, { passive: false });
    },

    _onMoveSlides(startPos, velocity, moveEventListener, releaseEventListener, scrollLocker, event) {
        const deltaX = event.changedTouches[0].clientX - startPos.x;
        const deltaY = event.changedTouches[0].clientY - startPos.y;
        const slideSize = this._currentSlideSize;
        const deltaCap = deltaX > 0 ? slideSize : -slideSize;

        if (!this._scrollLock) {
            this._scrollLock = Math.abs(deltaX) > Math.abs(deltaY) ? ScrollLock.Vertical : ScrollLock.Horizontal;

            if (this._scrollLock === ScrollLock.Horizontal) {
                window.removeEventListener('touchmove', moveEventListener);
                window.removeEventListener('scroll', scrollLocker, { passive: false });

                return;
            }
        }

        velocity.update(event.changedTouches[0]);
        event.preventDefault();

        this._manualOffset = (Math.abs(deltaX) < slideSize) ? deltaX : deltaCap;
        this._scope.update();
    },

    _onReleaseSlides(velocity, moveEventListener, releaseEventListener, scrollLocker) {
        if (event.touches.length > 0) {
            return;
        }

        const delta = this._manualOffset;

        this._manualOffset = 0;
        this._slidesCanvas.classList.remove('lock');

        console.log('touch velocity (end):', velocity.value, this._scrollLock);

        if (this._scrollLock !== ScrollLock.Horizontal) {
            const slideSize = this._currentSlideSize;
            const threshold = Math.abs(delta) >= (slideSize * 0.4);
            const flick = velocity.value > 0.01;

            if (delta < 0 && (flick || threshold)) {
                this.nextClicked();
            }

            if (flick || threshold) {
                this.prevClicked();
            }
        }

        window.removeEventListener('touchmove', moveEventListener);
        window.removeEventListener('touchend', releaseEventListener);
        window.removeEventListener('scroll', scrollLocker, { passive: false });

        this._scrollLock = null;
        this._scope.update();
        this.onStartInterval();
    },

    _onViewportChange() {
        this._slidesCanvas.classList.add('lock');
        this._scope.update();

        RenderEngine.skipFrame().scheduleRenderTask(() => this._slidesCanvas.classList.remove('lock'), this);
        RenderEngine.schedulePostRenderTask(() => {
            this._updateCurrentSlideSize();
        }, 'brick-banner-slider-size');
    },

    _onSlideClicked(event) {
        if (!this.clickSelect) {
            return;
        }

        const index = this._slides.findIndex(slide => slide.node.contains(event.target));

        this.selectedIndex = index;
    },

    get _hasNoNext() {
        if (!this.noCarousel) {
            return false;
        }

        return this.selectedIndex + this._visibleSlides >= this._slides.length;
    },

    get _hasNoPrev() {
        if (!this.noCarousel) {
            return false;
        }

        return this.selectedIndex === 0;
    },

    attributeChangedCallback(name, oldValue, newValue) {
        if (name === 'selected-index') {
            this.selectedIndex = parseInt(newValue, 10);
        }
    },

    __proto__: HTMLElement,
};

prepareConstructor(meta.object);

meta.object.constructor.observedAttributes = meta.attributes;

if (window.ShadyCSS) {
    window.ShadyCSS.prepareTemplate(template, meta.name);
}

if (window.customElements) {
    window.customElements.define(meta.name, meta.object.constructor);
}
