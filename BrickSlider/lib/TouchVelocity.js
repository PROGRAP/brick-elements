export const TouchVelocity = {

    _position: null,
    _timestamp: null,
    value: 0,

    /**
     * @param  {Touch} touch
     *
     * @return {TouchVelocity}
     */
    new(touch) {
        const _position = { x: touch.screenX, y: touch.screenY };
        const _timestamp = window.performance.now();

        return { _position, _timestamp, __proto__: this };
    },

    /**
     * @param  {Touch} touch
     *
     * @return {undefined}
     */
    update(touch) {
        const newPosition = { x: touch.screenX, y: touch.screenY };
        const newTimestamp = window.performance.now();
        const delta = Math.sqrt((newPosition.x - this._position.x) ** 2 + (newPosition.y - this._position.y) ** 2);
        const duration = newTimestamp - this._timestamp;

        this.value = delta / duration;
        this._position = newPosition;
        this._timestamp;
    }
};

export default TouchVelocity;
