import { Injectable} from '@angular/core';
import { IPosition, ILayoutItem } from './grid-layout.interfaces';

@Injectable()
export class GridUtilesService {
    isFunction(func:Function):boolean {
        return typeof func === 'function' || Object.prototype.toString.call(func) === '[object Function]';
    }

    findInArray(array:Array<any>, callback:Function):any {
        for (let i:number = 0, length:number = array.length, element:any = null; i < length, element = array[i]; i++) {
            if (callback.apply(callback, [element, i, array])) return element;
        }
    }

    matchesSelector(el:HTMLElement, selector:string) {
        let isFunc:Function = this.isFunction;
        let method:any = this.findInArray([
            'matches',
            'webkitMatchesSelector',
            'mozMatchesSelector',
            'msMatchesSelector',
            'oMatchesSelector'
        ], function (method) {
            return isFunc(el[method]);
        });

        return el[method].call(el, selector);
    }

    /**
     * Return the bottom coordinate of the layout.
     *
     * @param  {Array} layout Layout array.
     * @return {Number}       Bottom coordinate.
     */
    bottom(layout:any):number {
        let max:number = 0, bottomY:number;

        for (let prop in layout) {
            bottomY = layout[prop].y + layout[prop].h;
            if (bottomY > max) max = bottomY;
        }

        return max;
    }

    /**
     * Given two layout items, check if they collide.
     */
    collides(l1:ILayoutItem, l2:ILayoutItem):boolean {
        if (l1 === l2) return false; // same element
        if (l1.x + l1.w <= l2.x) return false; // l1 is left of l2
        if (l1.x >= l2.x + l2.w) return false; // l1 is right of l2
        if (l1.y + l1.h <= l2.y) return false; // l1 is above l2
        if (l1.y >= l2.y + l2.h) return false; // l1 is below l2
        return true; // boxes overlap
    }

    /**
     * Given a layout, compact it. This involves going down each y coordinate and removing gaps
     * between items.
     *
     * @param  {Array} layout Layout.
     * @param  {Boolean} verticalCompact Whether or not to compact the layout
     *   vertically.
     * @return {any[]}       Compacted Layout.
     */
    compact(layout:Array<ILayoutItem>, verticalCompact:boolean):Array<any> {
        const compareWith = [];
        /** We go through the items by row and column. */
        const sorted = this.sortLayoutItemsByRowCol(layout);
        /** Holding for new items. */
        const out = Array(layout.length);

        for (let i = 0, len = sorted.length; i < len; i++) {
            let l = Object.assign({}, sorted[i]);

            l = this.compactItem(compareWith, l, verticalCompact);
            /**
             * Add to comparison array. We only collide with items before this one.
             * */
            compareWith.push(l);
            /** Add to output array to make sure they still come out in the right order. */
            out[layout.indexOf(sorted[i])] = l;

            /** Clear moved flag, if it exists. */
            l.moved = false;
        }

        return out;
    }

    /**
     * Compact an item in the layout.
     */
    compactItem(compareWith:Array<ILayoutItem>, l:ILayoutItem, verticalCompact:boolean):ILayoutItem {
        if (verticalCompact) {
            /**
             *  Bottom 'y' possible is the bottom of the layout.
             * This allows you to do nice stuff like specify {y: Infinity}
             * This is here because the layout must be sorted in order to get the correct bottom `y`.
             * */
            l.y = Math.min(this.bottom(compareWith), l.y);

            /** Move the element up as far as it can go without colliding. */
            while (l.y > 0 && !this.getFirstCollision(compareWith, l)) {
                l.y--;
            }
        }

        /** Move it down, and keep moving it down if it's colliding. */
        let collides:ILayoutItem;
        while ((collides = this.getFirstCollision(compareWith, l))) {
            l.y = collides.y + collides.h;
        }
        return l;
    }

    /**
     * Returns the first item this layout collides with.
     * It doesn't appear to matter which order we approach this from, although
     * perhaps that is the wrong thing to do.
     *
     * @param  {Array} layout Layout.
     * @param  {Object} layoutItem Layout item.
     * @return {Object|undefined}  A colliding layout item, or undefined.
     */
    getFirstCollision(layout:Array<ILayoutItem>, layoutItem:ILayoutItem):ILayoutItem {
        for (let i = 0, len = layout.length; i < len; i++) {
            if (this.collides(layout[i], layoutItem)) return layout[i];
        }
    }

    getAllCollisions(layout:Array<ILayoutItem>, layoutItem:ILayoutItem):Array<ILayoutItem> {
        return layout.filter((l) => this.collides(l, layoutItem));
    }

    /**
     * Move an element. Responsible for doing cascading movements of other elements.
     *
     * @param  {Array}      layout Full layout to modify.
     * @param  {ILayoutItem} l      element to move.
     * @param  {Number}     [x]    X position in grid units.
     * @param  {Number}     [y]    Y position in grid units.
     * @param  {Boolean}    [isUserAction] If true, designates that the item we're moving is
     *                                     being dragged/resized by the user.
     */
    moveElement(layout:Array<ILayoutItem>, l:ILayoutItem, x?:number, y?:number, isUserAction?:boolean):Array<ILayoutItem> {

        /** Short-circuit if nothing to do. */
        if (l.y === y && l.x === x) return layout;

        const movingUp = y && l.y > y;
        /** This is quite a bit faster than extending the object */
        if (typeof x === 'number') l.x = x;
        if (typeof y === 'number') l.y = y;
        l.moved = true;

        /**
         * If this collides with anything, move it.
         * When doing this comparison, we have to sort the items we compare with
         * to ensure, in the case of multiple collisions, that we're getting the
         * nearest collision.
         * */
        let sorted = this.sortLayoutItemsByRowCol(layout);
        if (movingUp) sorted = sorted.reverse();
        const collisions = this.getAllCollisions(sorted, l);

        /** Move each item that collides away from this element. */
        for (let i = 0, len = collisions.length; i < len; i++) {
            const collision = collisions[i];

            /** Short circuit so we can't infinite loop */
            if (collision.moved) continue;

            /** This makes it feel a bit more precise by waiting to swap for just a bit when moving up. */
            if (l.y > collision.y && l.y - collision.y > collision.h / 4) continue;

            layout = this.moveElementAwayFromCollision(layout, l, collision, isUserAction);
        }

        return layout;
    }

    /**
     * This is where the magic needs to happen - given a collision, move an element away from the collision.
     * We attempt to move it up if there's room, otherwise it goes below.
     *
     * @param  {Array} layout            Full layout to modify.
     * @param  {ILayoutItem} collidesWith Layout item we're colliding with.
     * @param  {ILayoutItem} itemToMove   Layout item we're moving.
     * @param  {Boolean} [isUserAction]  If true, designates that the item we're moving is being dragged/resized
     *                                   by the user.
     */
    moveElementAwayFromCollision(layout:Array<ILayoutItem>, collidesWith:ILayoutItem,
                                 itemToMove:ILayoutItem, isUserAction?:boolean):Array<ILayoutItem> {

        /**
         * If there is enough space above the collision to put this element, move it there.
         * We only do this on the main collision as this can get funky in cascades and cause
         * unwanted swapping behavior.
         * */
        if (isUserAction) {
            /** Make a mock item so we don't modify the item here, only modify in moveElement. */
            const fakeItem:ILayoutItem = {
                x: itemToMove.x,
                y: itemToMove.y,
                w: itemToMove.w,
                h: itemToMove.h,
                id: -1
            };
            fakeItem.y = Math.max(collidesWith.y - itemToMove.h, 0);
            if (!this.getFirstCollision(layout, fakeItem)) {
                return this.moveElement(layout, itemToMove, undefined, fakeItem.y);
            }
        }

        /**
         * Previously this was optimized to move below the collision directly, but this can cause problems
         * with cascading moves, as an item may actually leapfrog a collision and cause a reversal in order.
         * */
        return this.moveElement(layout, itemToMove, undefined, itemToMove.y + 1);
    }

    /**
     * Helper to convert a number to a percentage string.
     *
     * @param  {Number} num Any number
     * @return {String}     That number as a percentage.
     */
    perc(num:number):string {
        return num * 100 + '%';
    }

    setTransform({top, left, width, height}: IPosition):Object {
        /** Replace unitless items with px */
        const translate = `translate(${left}px,${top}px)`;
        return {
            transform: translate,
            WebkitTransform: translate,
            MozTransform: translate,
            msTransform: translate,
            OTransform: translate,
            width: `${width}px`,
            height: `${height}px`,
            position: 'absolute'
        };
    }

    /**
     * Get layout items sorted from top left to right and down.
     *
     * @return {Array} Array of layout objects.
     * @return {Array}        Layout, sorted static items first.
     */
    sortLayoutItemsByRowCol(layout:Array<ILayoutItem>):Array<ILayoutItem> {
        return [].concat(layout).sort(function (a, b) {
            if (a.y > b.y || (a.y === b.y && a.x > b.x)) {
                return 1;
            } else if (a.y === b.y && a.x === b.x) {
                /** Without this, we can get different sort results in IE vs. Chrome/FF */
                return 0;
            }
            return -1;
        });
    }
}
