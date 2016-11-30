import { Injectable, EventEmitter } from '@angular/core';
import { Observable } from 'rxjs/Observable';
import { Subject } from 'rxjs/Subject';

import { GridUtilesService } from './grid-utiles.service';

import {
  IPosition,
  ILayoutItemRequired,
  ILayoutItem,
  IGridLayout,
  IGridLayoutState
} from './grid-layout.interfaces';

import { IGridItemState } from './grid-item/grid-item.interfaces';

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
    /** Calc col width */
    this.grid.colWidth = this.calcColWidth();

    this._dataStore = {
      gridState: <IGridLayoutState>{
        placeholderStyle: null,
        containerHeight: '',
        activeDrag: null,
        layout: new Array<ILayoutItem>()
      }
    };
  }

  /**
   * Add new element in grid layout or redefine if element exist
   * */
  emitLayoutElement(id:number, w:number, h:number, x:number, y:number,
                    minH:number = 4, minW:number = 4, maxH:number = Infinity, maxW:number = Infinity,
                    moved:boolean = false, stat:boolean = false) {
    /* set new element or update, if element exist */
    this._dataStore.gridState.layout[id] = {w, h, x, y, id, minH, minW, maxH, maxW, moved, stat};
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


  /**
   * Calculates a pixel value for the container.
   * @return {String} Container height in pixels.
   */
  containerHeight() {
    const nbRow = this._utiles.bottom(this._dataStore.gridState.layout);
    const containerPaddingY = this.grid.containerPadding ? this.grid.containerPadding[1] : this.grid.margin[1];
    return nbRow * this.grid.rowHeight + (nbRow - 1) * this.grid.margin[1] + containerPaddingY * 2 + 'px';
  }

  calcColWidth():number {
    let { containerWidth, margin, cols, containerPadding } = this.grid;
    return (containerWidth - (margin[0] * (cols - 1)) - (containerPadding[0] * 2)) / cols;
  }

  calcPosition(x:number, y:number, w:number, h:number):IPosition {
    const { margin, containerPadding, rowHeight, colWidth } = this.grid;
    return <IPosition>{
      left: Math.round((colWidth + margin[0]) * x + containerPadding[0]),
      top: Math.round((rowHeight + margin[1]) * y + containerPadding[1]),
      /**
       * 0 * Infinity === NaN, which causes problems with resize constraints;
       * Fix this if it occurs.
       * Note we do it here rather than later because Math.round(Infinity)
       */
      width: w === Infinity ? w : Math.round(colWidth * w + Math.max(0, w - 1) * margin[0]),
      height: h === Infinity ? h : Math.round(rowHeight * h + Math.max(0, h - 1) * margin[1])
    };
  }

  createStyle(pos:IPosition) {
    const {useCSSTransforms} = this.grid;

    let style;
    /** CSS Transforms support (default) */
    if (useCSSTransforms) {
      style = this._utiles.setTransform(pos);
    }
    /** top,left (slow) */
    else {
      style = this._utiles.setTopLeft(pos);
    }

    return style;
  }


  /**
   * Each drag movement create a new dragelement and move the element to the dragged location
   * @param {Number} id Id of the child
   * @param {Number} x X position of the move
   * @param {Number} y Y position of the move
   */
  onDrag(id:number, x:number, y:number) {
    let { layout } = this._dataStore.gridState;

    let l = layout[id];
    if (!l) return;

    /** Move the element to the dragged location. */
    layout = this._utiles.moveElement(layout, l, x, y, true /* isUserAction */);
    const newLayout = this._utiles.compact(layout, true);
    /** Set position for placeholder */
    const pos = this.calcPosition(newLayout[id].x, newLayout[id].y, l.w, l.h);

    Object.assign(this._dataStore.gridState, {
      activeDrag: id,
      placeholderStyle: this.createStyle(pos),
      layout: newLayout
    });

    /** Recalculate container */
    this._dataStore.gridState.containerHeight = this.containerHeight();

    /** Emit data*/
    this.gridLayoutChange.emit(this._dataStore.gridState);
  }

  /**
   * When dragging stops, figure out which position the element is closest to and update its x and y.
   * @param {Number} id Index of the child.
   * @param {Number} x X position of the move
   * @param {Number} y Y position of the move
   */
  onDragStop(id:number, x:number, y:number) {
    let { layout } = this._dataStore.gridState;

    const l = layout[id];
    if (!l) return;

    /** Move the element here */
    layout = this._utiles.moveElement(layout, l, x, y, true /* isUserAction */);

    Object.assign(this._dataStore.gridState, {
      placeholderStyle: null,
      containerHeight: this.containerHeight(),
      activeDrag: null,
      layout: this._utiles.compact(layout, true)
    });

    /** emit data*/
    this.gridLayoutChange.emit(this._dataStore.gridState);
  }

  onResize(id:number, w:number, h:number) {
    const { layout } = this._dataStore.gridState;

    let l = layout[id];
    if (!l) return;

    /** Set new width and height. */
    l.w = w;
    l.h = h;

    /** Re-compact the layout and set the drag placeholder. */
    const newLayout = this._utiles.compact(layout, true);
    /** Set position for placeholder */
    const pos = this.calcPosition(newLayout[id].x, newLayout[id].y, l.w, l.h);

    Object.assign(this._dataStore.gridState, {
      placeholderStyle: this.createStyle(pos),
      activeDrag: id,
      layout: newLayout
    });

    /** Recalculate container */
    this._dataStore.gridState.containerHeight = this.containerHeight();

    /** Emit data*/
    this.gridLayoutChange.emit(this._dataStore.gridState);
  }

  onResizeStop() {
    const { layout } = this._dataStore.gridState;

    Object.assign(this._dataStore.gridState, {
      placeholderStyle: null,
      containerHeight: this.containerHeight(),
      activeDrag: null,
      layout: this._utiles.compact(layout, true)
    });

    /** emit data*/
    this.gridLayoutChange.emit(this._dataStore.gridState);
  }
}
