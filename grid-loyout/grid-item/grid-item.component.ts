import {
  Component,
  Input,
  Output,
  EventEmitter,
  ElementRef,
  OnChanges
} from '@angular/core';

// import { GridUtilesService } from '../grid-utiles.service';
import {
  perc,
  setTopLeft,
  setTransform
} from './utiles';

import { IResizable } from '../resizable/resizable.interfaces';
import { IDraggable } from '../draggable/draggable.interfaces';

import { IPosition, IGridItemState } from './grid-item.interfaces';

interface ILayoutItemRequired {
  w: number; h: number;
  x: number; y: number;
  i: string;
}

interface ILayoutItem extends ILayoutItemRequired {
  minW?: number; minH?: number;
  maxW?: number; maxH?: number;
  moved?: boolean; static?: boolean;
  isDraggable?: boolean; isResizable?: boolean;
}

interface IDataGrid {
  // General grid attributes
  cols: number;
  containerWidth: number;
  rowHeight: number;
  margin: Array<any>;
  maxRows: number;
  containerPadding: Array<any>;

  // These are all in grid units
  x: number;  y: number;
  w: number;  h: number;

  // All optional
  minW: number;  maxW: number;
  minH: number;  maxH: number;

  // ID is nice to have for callbacks
  i: string;

  // Flags
  isDraggable: boolean;
  isResizable: boolean;
  static: boolean;

  // Use CSS transforms instead of top/left
  useCSSTransforms: boolean;

  // Others
  className: string;
  // Selector for draggable handle
  handle: string
  // Selector for draggable cancel (see react-draggable)
  cancel: string;
}

@Component({
  selector: 'grid-item',
  templateUrl: './grid-item.component.html',
  styleUrls: ['./grid-item.component.scss']
})

export class GridItemComponent implements OnChanges {
  @Input() key:any;
  @Input() dataItem:ILayoutItem; // position item on grid layout
  @Input() dataGrid:IDataGrid;

  public draggableProp: IResizable;
  public resizableProp: IDraggable;

  private _gridItemState: IGridItemState;

  constructor(
    private _element: ElementRef
  ) {
    this.dataItem = Object.assign({
      minH: 1,
      minW: 1,
      maxH: Infinity,
      maxW: Infinity
    }, this.dataItem);

    this._gridItemState = this.setInitialState();

    console.log('item is here')
  }

  ngOnChanges() {
    const {x, y, w, h} = this.dataGrid;
    const pos = this.calcPosition(x, y, w, h, this.dataGrid);

    this.draggableProp = this.mixinDraggable();
    this.resizableProp = this.mixinResizable(pos);
  }

  setInitialState() {
      return <IGridItemState>{
        resizing: null,
        dragging: null,
        className: ''
      }
  }

  // Helper for generating column width
  calcColWidth(): number {
    const {
      margin,
      containerPadding,
      containerWidth,
      cols
      } = this.dataGrid;

    return (containerWidth - (margin[0] * (cols - 1)) - (containerPadding[0] * 2)) / cols;
  }
  /**
   * Return position on the page given an x, y, w, h.
   * left, top, width, height are all in pixels.
   * @param  {Number}  x             X coordinate in grid units.
   * @param  {Number}  y             Y coordinate in grid units.
   * @param  {Number}  w             W coordinate in grid units.
   * @param  {Number}  h             H coordinate in grid units.
   * @return {Object}                Object containing coords.
   */
  calcPosition(x:number, y:number, w:number, h:number, state?:IGridItemState):IPosition {
    const {margin, containerPadding, rowHeight} = this.dataGrid;
    const colWidth = this.calcColWidth();

    const out = {
      left: Math.round((colWidth + margin[0]) * x + containerPadding[0]),
      top: Math.round((rowHeight + margin[1]) * y + containerPadding[1]),
      // 0 * Infinity === NaN, which causes problems with resize constraints;
      // Fix this if it occurs.
      // Note we do it here rather than later because Math.round(Infinity) causes deopt
      width: w === Infinity ? w : Math.round(colWidth * w + Math.max(0, w - 1) * margin[0]),
      height: h === Infinity ? h : Math.round(rowHeight * h + Math.max(0, h - 1) * margin[1])
    };

    if (state && state.resizing) {
      out.width = Math.round(state.resizing.width);
      out.height = Math.round(state.resizing.height);
    }

    if (state && state.dragging) {
      out.top = Math.round(state.dragging.top);
      out.left = Math.round(state.dragging.left);
    }
    return out;
  }

  /**
   * Translate x and y coordinates from pixels to grid units.
   * @param  {Number} top  Top position (relative to parent) in pixels.
   * @param  {Number} left Left position (relative to parent) in pixels.
   * @return {Object} x and y in grid units.
   */
  calcXY(top: number, left: number): {x: number, y: number} {
    const {margin, cols, rowHeight, w, h, maxRows} = this.dataGrid;
    const colWidth = this.calcColWidth();

    // left = colWidth * x + margin * (x + 1)
    // l = cx + m(x+1)
    // l = cx + mx + m
    // l - m = cx + mx
    // l - m = x(c + m)
    // (l - m) / (c + m) = x
    // x = (left - margin) / (coldWidth + margin)
    let x = Math.round((left - margin[0]) / (colWidth + margin[0]));
    let y = Math.round((top - margin[1]) / (rowHeight + margin[1]));

    // Capping
    x = Math.max(Math.min(x, cols - w), 0);
    y = Math.max(Math.min(y, maxRows - h), 0);

    return {x, y};
  }

  /**
   * Given a height and width in pixel values, calculate grid units.
   * @param  {Number} height Height in pixels.
   * @param  {Number} width  Width in pixels.
   * @return {Object} w, h as grid units.
   */
  calcWH({height, width}: {height: number, width: number}): {w: number, h: number} {
    const {margin, maxRows, cols, rowHeight, x, y} = this.dataGrid;
    const colWidth = this.calcColWidth();

    // width = colWidth * w - (margin * (w - 1))
    // ...
    // w = (width + margin) / (colWidth + margin)
    let w = Math.round((width + margin[0]) / (colWidth + margin[0]));
    let h = Math.round((height + margin[1]) / (rowHeight + margin[1]));

    // Capping
    w = Math.max(Math.min(w, cols - x), 0);
    h = Math.max(Math.min(h, maxRows - y), 0);
    return {w, h};
  }

  /**
   * This is where we set the grid item's absolute placement. It gets a little tricky because we want to do it
   * well when server rendering, and the only way to do that properly is to use percentage width/left because
   * we don't know exactly what the browser viewport is.
   * Unfortunately, CSS Transforms, which are great for performance, break in this instance because a percentage
   * left is relative to the item itself, not its container! So we cannot use them on the server rendering pass.
   *
   * @param  {Object} pos Position object with width, height, left, top.
   * @return {Object}     Style object.
   */
  createStyle(pos: IPosition): string {
    const {useCSSTransforms} = this.dataGrid;

    let style;
    // CSS Transforms support (default)
    if (useCSSTransforms) {
      style = setTransform(pos);
    }
    // top,left (slow)
    else {
      style = setTopLeft(pos);
    }

    return style;
  }

  /**
   * Mix a Draggable instance into a child.
   * @param  {Element} child    Child element.
   * @return {Element}          Child wrapped in Draggable.
   */
  mixinDraggable():any {
    return {
      'handle': this.dataGrid.handle,
      'cancel': ".react-resizable-handle" + (this.dataGrid.cancel ? "," + this.dataGrid.cancel : "")
    };
  }

  /**
   * Mix a Resizable instance into a child.
   * @param  {Element} child    Child element.
   * @param  {Object} position  Position object (pixel values)
   * @return {Element}          Child wrapped in Resizable.
   */
  mixinResizable(position:IPosition):any {
    const {cols, x, minW, minH, maxW, maxH} = this.dataGrid;

    // This is the max possible width - doesn't go to infinity because of the width of the window
    const maxWidth = this.calcPosition(0, 0, cols - x, 0).width;

    // Calculate min/max constraints using our min & maxes
    const mins = this.calcPosition(0, 0, minW, minH);
    const maxes = this.calcPosition(0, 0, maxW, maxH);
    const minConstraints = [mins.width, mins.height];
    const maxConstraints = [Math.min(maxes.width, maxWidth), Math.min(maxes.height, Infinity)];
    return {
      'width': position.width,
      'height': position.height,
      'minConstraints': minConstraints,
      'maxConstraints': maxConstraints
    }
  }

  /**
   * Wrapper around drag events to provide more useful data.
   * All drag events call the function with the given handler name,
   * with the signature (index, x, y).
   *
   * @param  {String} handlerName Handler name to wrap.
   * @return {Function}           Handler function.
   */
  onDragHandler(handlerName:string) {
      console.log(arguments);
      if (!this[handlerName]) return;

      const newPosition: {top: number, left: number} = {top: 0, left: 0};

      // Get new XY
      switch (handlerName) {
        case 'onDragStart':
          console.log('onDragStart: ', this._element)
          // ToDo this wont work on nested parents
/*          const parentRect = node.offsetParent.getBoundingClientRect();
          const clientRect = node.getBoundingClientRect();
          newPosition.left = clientRect.left - parentRect.left;
          newPosition.top = clientRect.top - parentRect.top;
          this.setState({dragging: newPosition});*/
          break;
        case 'onDrag':
          console.log('onDrag: ', this._element)
/*          if (!this.state.dragging) throw new Error('onDrag called before onDragStart.');
          newPosition.left = this.state.dragging.left + deltaX;
          newPosition.top = this.state.dragging.top + deltaY;
          this.setState({dragging: newPosition});*/
          break;
        case 'onDragStop':
          console.log('onDragStop: ', this._element)
/*          if (!this.state.dragging) throw new Error('onDragEnd called before onDragStart.');
          newPosition.left = this.state.dragging.left;
          newPosition.top = this.state.dragging.top;
          this.setState({dragging: null});*/
          break;
        default:
          throw new Error('onDragHandler called with unrecognized handlerName: ' + handlerName);
      }

      const {x, y} = this.calcXY(newPosition.top, newPosition.left);

      // this[handlerName](this.dataGrid.i, x, y, {e, this._element, newPosition});
  }

  onResizeHandler(handlerName: string) {
    console.log(arguments);
/*      if (!this[handlerName]) return;
      const {cols, x, i, maxW, minW, maxH, minH} = this.dataGrid;

      // Get new XY
      let {w, h} = this.calcWH(size);

      // Cap w at numCols
      w = Math.min(w, cols - x);
      // Ensure w is at least 1
      w = Math.max(w, 1);

      // Min/max capping
      w = Math.max(Math.min(w, maxW), minW);
      h = Math.max(Math.min(h, maxH), minH);

      this._gridItemState.resizing = (handlerName === 'onResizeStop') ? null : size;

      // this[handlerName](i, w, h, {e, node, size});*/
  }
}
