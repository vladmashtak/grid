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

import {
  IPosition,
  IGridItemState,
  ILayoutItem,
  IDataGrid
} from './grid-item.interfaces';


@Component({
  selector: 'grid-item',
  templateUrl: './grid-item.component.html',
  styleUrls: ['./grid-item.component.scss']
})

export class GridItemComponent implements OnChanges {
  @Input() key:any;
  @Input() dataItem:ILayoutItem; // position item on grid layout
  @Input() dataGrid:IDataGrid;

  @Output() onDragStart:EventEmitter<any> = new EventEmitter<any>();
  @Output() onDrag:EventEmitter<any> = new EventEmitter<any>();
  @Output() onDragStop:EventEmitter<any> = new EventEmitter<any>();

  @Output() onResize:EventEmitter<any> = new EventEmitter<any>();
  @Output() onResizeStart:EventEmitter<any> = new EventEmitter<any>();
  @Output() onResizeStop:EventEmitter<any> = new EventEmitter<any>();

  /*  draggableProp = {
   'useCSSTransforms': true,
   'zIndex': 100,
   'handle': '.draggable-handle',
   'cancel': '.resizable-handle'
   };

   resizableProp = {
   'width': 200,
   'height': 200,
   'handle': '.resizable-handle'
   };*/

  public draggableProp:IDraggable;
  public resizableProp:IResizable;

  private _gridItemState:IGridItemState;

  constructor(private _element:ElementRef) {
    this._gridItemState = this.setInitialState();
  }

  ngOnChanges() {
    this.dataItem = Object.assign({
      minH: 1,
      minW: 1,
      maxH: Infinity,
      maxW: Infinity
    }, this.dataItem);

    const {x, y, w, h} = this.dataItem;
    const pos = this.calcPosition(x, y, w, h, this._gridItemState);

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
  calcColWidth():number {
    return (this.dataGrid.containerWidth - (this.dataGrid.margin[0] * (this.dataGrid.cols - 1)) - (this.dataGrid.containerPadding[0] * 2)) / this.dataGrid.cols;
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
  calcXY(top:number, left:number):{x: number, y: number} {
    const {margin, cols, rowHeight, maxRows} = this.dataGrid;
    const {w, h} = this.dataItem;

    const colWidth = this.calcColWidth();

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
  calcWH({height, width}: {height: number, width: number}):{w: number, h: number} {
    const {margin, maxRows, cols, rowHeight} = this.dataGrid;
    const {x, y} = this.dataItem;

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
  createStyle(pos:IPosition):string {
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
  mixinDraggable():IDraggable {
    return <IDraggable>{
      'useCSSTransforms': true,
      'zIndex': 100,
      'handle': this.dataGrid.handle,
      'cancel': this.dataGrid.cancel
    };
  }

  /**
   * Mix a Resizable instance into a child.
   * @param  {Element} child    Child element.
   * @param  {Object} position  Position object (pixel values)
   * @return {Element}          Child wrapped in Resizable.
   */
  mixinResizable(position:IPosition):IResizable {
    const {cols, cancel} = this.dataGrid;
    const {x, minW, minH, maxW, maxH} = this.dataItem;

    // This is the max possible width - doesn't go to infinity because of the width of the window
    const maxWidth = this.calcPosition(0, 0, cols - x, 0).width;

    // Calculate min/max constraints using our min & maxes
    const mins = this.calcPosition(0, 0, minW, minH);
    const maxes = this.calcPosition(0, 0, maxW, maxH);

    const minConstraints = [mins.width, mins.height];
    const maxConstraints = [Math.min(maxes.width, maxWidth), Math.min(maxes.height, Infinity)];
    return <IResizable>{
      'handle': cancel,
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
  onDragHandler(event, handlerName:string) {
    const {i} = this.dataItem;
    const newPosition:{top: number, left: number} = {top: 0, left: 0};

    // Get new XY
    switch (handlerName) {
      case 'onDragStart':
        // ToDo this wont work on nested parents
        const parentRect = event.node.offsetParent.getBoundingClientRect();
        const clientRect = event.node.getBoundingClientRect();
        newPosition.left = clientRect.left - parentRect.left;
        newPosition.top = clientRect.top - parentRect.top;
        this._gridItemState.dragging = newPosition;
        break;
      case 'onDrag':
        if (!this._gridItemState.dragging) throw new Error('onDrag called before onDragStart.');
        newPosition.left = this._gridItemState.dragging.left + event.deltaX;
        newPosition.top = this._gridItemState.dragging.top + event.deltaY;
        // this._gridItemState.dragging = newPosition;
        break;
      case 'onDragStop':
        if (!this._gridItemState.dragging) throw new Error('onDragEnd called before onDragStart.');
        newPosition.left = this._gridItemState.dragging.left;
        newPosition.top = this._gridItemState.dragging.top;
        this._gridItemState.dragging = null;
        break;
      default:
        throw new Error('onDragHandler called with unrecognized handlerName: ' + handlerName);
    }

    const {x, y} = this.calcXY(newPosition.top, newPosition.left);

    this[handlerName].emit({
      i: i,
      x: x,
      y: y,
      e: event.e,
      node: event.node,
      newPosition: newPosition
    });
  }

  /**
   * Wrapper around drag events to provide more useful data.
   * All drag events call the function with the given handler name,
   * with the signature (index, x, y).
   *
   * @param  {String} handlerName Handler name to wrap.
   * @return {Function}           Handler function.
   */
  onResizeHandler(event, handlerName:string) {
    // if (!this.props[handlerName]) return;
    const {cols} = this.dataGrid;
    const {x, i, maxW, minW, maxH, minH} = this.dataItem;

    // Get new XY
    let {w, h} = this.calcWH(event.size);

    // Cap w at numCols
    w = Math.min(w, cols - x);
    // Ensure w is at least 1
    w = Math.max(w, 1);

    // Min/max capping
    w = Math.max(Math.min(w, maxW), minW);
    h = Math.max(Math.min(h, maxH), minH);

    this._gridItemState.resizing = (handlerName === 'onResizeStop') ? null : event.size;

    this[handlerName].emit({
      i: i,
      w: w,
      h: h,
      e: event.e,
      node: event.node,
      size: event.size
    });
  }
}
