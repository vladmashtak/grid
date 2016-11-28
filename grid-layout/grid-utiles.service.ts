import { Injectable} from '@angular/core';
import { IPosition, ILayoutItem } from './grid-layout.interfaces';

@Injectable()
export class GridUtilesService {
  isFunction(func) {
    return typeof func === 'function' || Object.prototype.toString.call(func) === '[object Function]';
  }

  findInArray(array, callback) {
    for (let i = 0, length = array.length, element = null; i < length, element = array[i]; i++) {
      if (callback.apply(callback, [element, i, array])) return element;
    }
  }

  matchesSelector(el, selector) {
    let isFunc:Function = this.isFunction;
    let method = this.findInArray([
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
    let max = 0, bottomY;

    for (var prop in layout) {
      bottomY = layout[prop].y + layout[prop].h;
      if (bottomY > max) max = bottomY;
    }

    return max;
  }

/*  cloneLayout(layout:Array<ILayoutItem>):Array<any> {
    const newLayout = Array(layout.length);
    for (let i = 0, len = layout.length; i < len; i++) {
      newLayout[i] = this.cloneLayoutItem(layout[i]);
    }
    return newLayout;
  }

// Fast path to cloning, since this is monomorphic
  cloneLayoutItem(layoutItem:ILayoutItem):ILayoutItem {
    return {
      w: layoutItem.w, h: layoutItem.h, x: layoutItem.x, y: layoutItem.y, i: layoutItem.i,
      minW: layoutItem.minW, maxW: layoutItem.maxW, minH: layoutItem.minH, maxH: layoutItem.maxH,
      moved: Boolean(layoutItem.moved), static: Boolean(layoutItem.static),
      // These can be null
      isDraggable: layoutItem.isDraggable, isResizable: layoutItem.isResizable
    };
  }*/
/*

  /!**
   * Comparing `children` is a bit difficult. This is a good way to compare them.
   * This will catch differences in keys, order, and length.
   *!/
  childrenEqual(a:any, b:any):boolean {
    return Object.is(a.map(c => c.key), b.map(c => c.key));
  }
*/

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
    // We go through the items by row and column.
    const sorted = this.sortLayoutItemsByRowCol(layout);
    // Holding for new items.
    const out = Array(layout.length);

    for (let i = 0, len = sorted.length; i < len; i++) {
      let l = Object.assign({}, sorted[i]);

      // Add to output array to make sure they still come out in the right order.
      out[layout.indexOf(sorted[i])] = l;

      // Clear moved flag, if it exists.
      l.moved = false;
    }

    return out;
  }

/*
  /!**
   * Compact an item in the layout.
   *!/
  compactItem(compareWith:Array<ILayoutItem>, l:ILayoutItem, verticalCompact:boolean):ILayoutItem {
    if (verticalCompact) {
      // Bottom 'y' possible is the bottom of the layout.
      // This allows you to do nice stuff like specify {y: Infinity}
      // This is here because the layout must be sorted in order to get the correct bottom `y`.
      l.y = Math.min(this.bottom(compareWith), l.y);

      // Move the element up as far as it can go without colliding.
      while (l.y > 0 && !this.getFirstCollision(compareWith, l)) {
        l.y--;
      }
    }

    // Move it down, and keep moving it down if it's colliding.
    let collides;
    while ((collides = this.getFirstCollision(compareWith, l))) {
      l.y = collides.y + collides.h;
    }
    return l;
  }
*/

/*  /!**
   * Given a layout, make sure all elements fit within its bounds.
   *
   * @param  {Array} layout Layout array.
   * @param  {Number} bounds Number of columns.
   *!/
  correctBounds(layout:Array<ILayoutItem>, bounds:{cols: number}):Array<ILayoutItem> {

    for (let i = 0, len = layout.length; i < len; i++) {
      const l = layout[i];
      // Overflows right
      if (l.x + l.w > bounds.cols) l.x = bounds.cols - l.w;
      // Overflows left
      if (l.x < 0) {
        l.x = 0;
        l.w = bounds.cols;
      }
    }
    return layout;
  }*/

/*
  /!**
   * Get a layout item by ID. Used so we can override later on if necessary.
   *
   * @param  {Array}  layout Layout array.
   * @param  {String} id     ID
   * @return {LayoutItem}    Item at ID.
   *!/
  getLayoutItem(layout:Array<ILayoutItem>, id:string):ILayoutItem {
    for (let i = 0, len = layout.length; i < len; i++) {
      if (layout[i].i === id) return layout[i];
    }
  }
*/

  /**
   * Returns the first item this layout collides with.
   * It doesn't appear to matter which order we approach this from, although
   * perhaps that is the wrong thing to do.
   *
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
   * @param  {LayoutItem} l      element to move.
   * @param  {Number}     [x]    X position in grid units.
   * @param  {Number}     [y]    Y position in grid units.
   * @param  {Boolean}    [isUserAction] If true, designates that the item we're moving is
   *                                     being dragged/resized by the user.
   */
  moveElement(layout:Array<ILayoutItem>, l:ILayoutItem, x?:number, y?:number, isUserAction?:boolean):Array<ILayoutItem> {
    // Short-circuit if nothing to do.
    if (l.y === y && l.x === x) return layout;

    const movingUp = y && l.y > y;
    // This is quite a bit faster than extending the object
    if (typeof x === 'number') l.x = x;
    if (typeof y === 'number') l.y = y;
    l.moved = true;

    // If this collides with anything, move it.
    // When doing this comparison, we have to sort the items we compare with
    // to ensure, in the case of multiple collisions, that we're getting the
    // nearest collision.
    let sorted = this.sortLayoutItemsByRowCol(layout);
    if (movingUp) sorted = sorted.reverse();
    const collisions = this.getAllCollisions(sorted, l);

    // Move each item that collides away from this element.
    for (let i = 0, len = collisions.length; i < len; i++) {
      const collision = collisions[i];
      // console.log('resolving collision between', l.i, 'at', l.y, 'and', collision.i, 'at', collision.y);

      // Short circuit so we can't infinite loop
      if (collision.moved) continue;

      // This makes it feel a bit more precise by waiting to swap for just a bit when moving up.
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
   * @param  {LayoutItem} collidesWith Layout item we're colliding with.
   * @param  {LayoutItem} itemToMove   Layout item we're moving.
   * @param  {Boolean} [isUserAction]  If true, designates that the item we're moving is being dragged/resized
   *                                   by the user.
   */
  moveElementAwayFromCollision(layout:Array<ILayoutItem>, collidesWith:ILayoutItem,
                               itemToMove:ILayoutItem, isUserAction?:boolean):Array<ILayoutItem> {

    // If there is enough space above the collision to put this element, move it there.
    // We only do this on the main collision as this can get funky in cascades and cause
    // unwanted swapping behavior.
    if (isUserAction) {
      // Make a mock item so we don't modify the item here, only modify in moveElement.
      const fakeItem:ILayoutItem = {
        x: itemToMove.x,
        y: itemToMove.y,
        w: itemToMove.w,
        h: itemToMove.h,
        i: '-1',
        id: itemToMove.id
      };
      fakeItem.y = Math.max(collidesWith.y - itemToMove.h, 0);
      console.log('getFirstCollision: ', this.getFirstCollision(layout, fakeItem));
      if (!this.getFirstCollision(layout, fakeItem)) {
        return this.moveElement(layout, itemToMove, undefined, fakeItem.y);
      }
    }

    // Previously this was optimized to move below the collision directly, but this can cause problems
    // with cascading moves, as an item may actually leapfrog a collision and cause a reversal in order.
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
    // Replace unitless items with px
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

  setTopLeft({top, left, width, height}: IPosition):Object {
    return {
      top: `${top}px`,
      left: `${left}px`,
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
        // Without this, we can get different sort results in IE vs. Chrome/FF
        return 0;
      }
      return -1;
    });
  }

}