import { Injectable, EventEmitter } from '@angular/core';
import { Observable } from 'rxjs/Observable';
import { Subject } from 'rxjs/Subject';

import { GridUtilesService } from './grid-utiles.service';

import {
  ILayoutItemRequired,
  ILayoutItem,
  IGridLayout,
  IGridLayoutState
} from './grid-layout.interfaces';

@Injectable()
export class GridLayoutService {
  public gridLayoutChange:EventEmitter<any> = new EventEmitter();

  public grid:IGridLayout;
  private _dataStore:{
    gridState: IGridLayoutState
  };

  constructor(private _utiles:GridUtilesService) {
    this.grid = <IGridLayout>{
      autoSize: true,
      cols: 12,
      className: '',
      containerWidth: 1400,
      rowHeight: 64,
      maxRows: Infinity, // infinite vertical growth
      layout: [],
      margin: [10, 10],
      containerPadding: [10, 10],
      isDraggable: true,
      isResizable: true,
      useCSSTransforms: true,
      verticalCompact: true
    };

    this._dataStore = {
      gridState: <IGridLayoutState>{
        placeholderStyle: null,
        containerHeight: '',
        activeDrag: null,
        mounted: false,
        layout: new Array<ILayoutItem>(),
        oldDragItem: null,
        oldLayout: null,
        oldResizeItem: null
      }
    };
  }

  /**
   * Add new element in grid layout or redefine if element exist
   * */
  emitLayoutElement(id:number, i:string, w:number, h:number, x:number, y:number) {
    /* set new element or update, if element exist */
    this._dataStore.gridState.layout[id] = {id, i, w, h, x, y};
    /* recalculate container height */
    this._dataStore.gridState.containerHeight = this.containerHeight();
    /* emit data*/
    this.gridLayoutChange.emit(this._dataStore.gridState);
  }

  /**
   * @return {EventEmitter} method for emit changes;
   */
  getLayoutEmitter() {
    return this.gridLayoutChange;
  }

  addActiveElement(style:any) {
    this._dataStore.gridState.placeholderStyle = style;
    this.gridLayoutChange.emit(this._dataStore.gridState);
  }

  removeActiveElement() {
    this._dataStore.gridState.placeholderStyle = null;
    this.gridLayoutChange.emit(this._dataStore.gridState);
  }

  /**
   * Calculates a pixel value for the container.
   * @return {String} Container height in pixels.
   */
  containerHeight() {
    const nbRow = this._utiles.bottom(this._dataStore.gridState.layout);
    const containerPaddingY = this.grid.containerPadding ? this.grid.containerPadding[1] : this.grid.margin[1];
    return nbRow * this.grid.rowHeight + (nbRow - 1) * this.grid.margin[1] + containerPaddingY * 2 + 'px';
  }

  /**
   * When dragging starts
   * @param {String} i Id of the child
   * @param {Number} x X position of the move
   * @param {Number} y Y position of the move
   */
  onDragStart(id:number) {
    const { layout } = this._dataStore.gridState;

    let cloneLayoutItem = Object.assign({}, layout[id]);
    let cloneLayout = Object.assign({}, layout);

    this._dataStore.gridState.oldDragItem = cloneLayoutItem;
    this._dataStore.gridState.oldLayout = cloneLayout;

    console.log('onDragStart: ', this._dataStore.gridState);
  }

  /**
   * Each drag movement create a new dragelement and move the element to the dragged location
   * @param {String} i Id of the child
   * @param {Number} x X position of the move
   * @param {Number} y Y position of the move
   */
  onDrag(id:number, x:number, y:number) {
    let { layout } = this._dataStore.gridState;

    let l = layout[id];
    if (!l) return;

    // Move the element to the dragged location.
    layout = this._utiles.moveElement(layout, l, x, y, true /* isUserAction */);

    console.log('layout: ', layout);

    this._dataStore.gridState.layout = this._utiles.compact(layout, true);

    this._dataStore.gridState.activeDrag = {
      w: l.w, h: l.h, x: x, y: y, i: l.i, id: id
    };

    this.emitLayoutElement(id, l.i, l.w, l.h, x, y);
    console.log('onDrag: ', this._dataStore.gridState);
  }

  /**
   * When dragging stops, figure out which position the element is closest to and update its x and y.
   * @param  {String} i Index of the child.
   * @param {Number} x X position of the move
   * @param {Number} y Y position of the move
   */
  onDragStop(id:number, x:number, y:number) {
    let { layout } = this._dataStore.gridState;

    const l = layout[id];
    if (!l) return;

    // Move the element here
    layout = this._utiles.moveElement(layout, l, x, y, true /* isUserAction */);

    // Set state
    const newLayout = this._utiles.compact(layout, true);

    Object.assign(this._dataStore.gridState, {
      activeDrag: null,
      layout: newLayout,
      oldDragItem: null,
      oldLayout: null,
    });

    console.log('onDragStop: ', this._dataStore.gridState);
  }

  onResizeStart(id:number) {
    const { layout } = this._dataStore.gridState;

    let l = layout[id];
    if (!l) return;

    let cloneLayoutItem:ILayoutItem = Object.assign({}, l);

    Object.assign(this._dataStore.gridState, {
      oldResizeItem: cloneLayoutItem,
      oldLayout: layout
    });

    console.log('onResizeStart: ', this._dataStore.gridState);
  }

  onResize(id:number, w:number, h:number) {
    const { layout } = this._dataStore.gridState;

    let l = layout[id];
    if (!l) return;

    // Set new width and height.
    l.w = w;
    l.h = h;

    // Re-compact the layout and set the drag placeholder.
    this._dataStore.gridState.layout = this._utiles.compact(layout, true);
    this._dataStore.gridState.activeDrag = {
      w: w, h: h, x: l.x, y: l.y, i: l.i, id: id
    };

    console.log('onResize: ', this._dataStore.gridState);
  }

  onResizeStop() {
    const { layout } = this._dataStore.gridState;
    const newLayout = this._utiles.compact(layout, true);

    Object.assign(this._dataStore.gridState, {
      activeDrag: null,
      layout: newLayout,
      oldDragItem: null,
      oldLayout: null,
    });

    console.log('onResizeStop: ', this._dataStore.gridState);
  }
}
