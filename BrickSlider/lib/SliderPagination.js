const sliderWeakRefs = new WeakMap();
const pSlider = Symbol('SliderPagination.slider');

export const SliderPagination = {
    get [pSlider]() {
        return sliderWeakRefs.get(this);
    },

    set [pSlider](value) {
        return sliderWeakRefs.set(this, value);
    },

    get pageSizes() {
        const visibleSlides = this[pSlider]._visibleSlides;
        const totalSlides = this[pSlider]._slides.length;

        const fullPages = Math.floor(totalSlides / visibleSlides);
        const lastPage = totalSlides % visibleSlides;
        const sizes = new Array(fullPages);

        for (let i = 0; i < sizes.length; i++) {
            sizes[i] = visibleSlides;
        }

        sizes.push(lastPage);

        return sizes;
    },

    get nextPage() {
        const pageSizes = this.pageSizes;
        let nextPage = this.currentPage + 1;
        let index = 0;

        if (nextPage >= pageSizes.length) {
            nextPage = 0;
        }

        for (let i = 0; i < nextPage; i++) {
            const pageSize = pageSizes[i];
            const nextPageSize = pageSizes[i+1];
            const diff = pageSize - nextPageSize;

            index += pageSize - diff;
        }

        return index;
    },

    get prevPage() {
        const pageSizes = this.pageSizes;
        let prevPage = this.currentPage - 1;
        let index = 0;

        if (prevPage < 0) {

            // subtract one because we need an index not length
            prevPage = pageSizes.length - 1;
        }

        for (let i = 0; i < prevPage; i++) {
            const pageSize = pageSizes[i];
            const nextPageSize = pageSizes[i+1];
            const diff = pageSize - nextPageSize;

            index += pageSize - diff;
        }

        if (this[pSlider].selectedIndex === 0) {

            // subtract one because we need an index not length
            return pageSizes.reduce((sum, i) => sum + i) - 1 - index;
        }

        return this[pSlider].selectedIndex - index;
    },

    get currentPage() {
        return Math.ceil(this[pSlider].selectedIndex / this[pSlider]._visibleSlides);
    },

    from(brickSlider) {
        return { [pSlider]: brickSlider, __proto__: this };
    }
};

export default SliderPagination;
