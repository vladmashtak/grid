import { Injectable } from '@angular/core';
import { Observable } from 'rxjs/Observable';
import { Subject } from 'rxjs/Subject';

import {
  autoBindHandlers,
  bottom,
  childrenEqual,
  cloneLayoutItem,
  compact,
  getLayoutItem,
  moveElement,
  synchronizeLayoutWithChildren,
  validateLayout
} from './grid-item/utiles';

import { ILayoutItemRequired, ILayoutItem } from './grid-loyout.interfaces';

interface IGridLayout {
  /*
   * Basic props
   * */
  className:string;

  /*
   * This can be set explicitly. If it is not set, it will automatically
   * be set to the container width. Note that resizes will *not* cause this to adjust.
   * If you need that behavior, use WidthProvider.
   * */
  containerWidth:number;

  /* If true, the container height swells and contracts to fit contents */
  autoSize:boolean;
  /* # of cols. */
  cols:number;
  /* A selector that will not be draggable. */
  draggableCancel:string;
  /* A selector for the draggable handler */
  draggableHandle:string;

  /* If true, the layout will compact vertically */
  verticalCompact:boolean;

  handle: string;
  cancel: string;
  /*
   * layout is an array of object with the format:
   * {x: Number, y: Number, w: Number, h: Number, i: String}
   * */
  layout:Array<ILayoutItemRequired>;

  /*
   * Grid Dimensions
   * */

  /* Margin between items [x, y] in px */
  margin:Array<number>;
  /* Padding inside the container [x, y] in px */
  containerPadding:Array<number>;
  /* Rows have a static height, but you can change this based on breakpoints if you like */
  rowHeight:number;
  /*
   * Default Infinity, but you can specify a max here if you like.
   * Note that this isn't fully fleshed out and won't error if you specify a layout that
   * extends beyond the row capacity. It will, however, not allow users to drag/resize
   * an item past the barrier. They can push items beyond the barrier, though.
   * Intentionally not documented for this reason.
   * */
  maxRows:number;

  /*
   * Flags
   * */
  isDraggable:boolean;
  isResizable:boolean;
  /* Use CSS transforms instead of top/left */
  useCSSTransforms:boolean;
}

interface IGridLayoutState {
  activeDrag?: any;
  layout: Array<ILayoutItem>;
  mounted: boolean;
  oldDragItem: ILayoutItem;
  oldLayout: Array<ILayoutItem>;
  oldResizeItem: ILayoutItem;
}

@Injectable()
export class GridLayoutService {

  public grid: IGridLayout;
  public state$: Subject<IGridLayoutState>;

  private layout$:Subject<ILayoutItem[]>;
  private dataStore: {
    gridLayout: ILayoutItem[],
    gridState: IGridLayoutState
  };

  constructor() {
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

/*    this.state = <IGridLayoutState>{
      activeDrag: null,
      mounted: false,
      layout: null,
      oldDragItem: null,
      oldLayout: null,
      oldResizeItem: null
    };*/

    this.dataStore = {
      gridLayout: [],
      gridState: <IGridLayoutState>{
        activeDrag: null,
        mounted: false,
        layout: null,
        oldDragItem: null,
        oldLayout: null,
        oldResizeItem: null
      }
    };

    this.layout$ = <Subject<ILayoutItem[]>>new Subject();
    this.state$ = <Subject<IGridLayoutState>>new Subject();
  }

  removeElement(id:string) {
    for (let i = 0; i < this.dataStore.gridLayout.length; i++) {
      if (this.dataStore.gridLayout[i].i === id) {
        this.dataStore.gridLayout.splice(i, 1);
        this.layout$.next(this.dataStore.gridLayout);
        break;
      }
    }
  }

  addElement(i: string, w: number, h: number, x: number, y: number) {
    // check if list contains object
    if(this.dataStore.gridLayout[i]) {
      Object.assign(this.dataStore.gridLayout[i], {w, h, x, y});
      this.layout$.next(this.dataStore.gridLayout);
      return;
    }

    this.dataStore.gridLayout[i] = {i, w, h, x, y};
    this.layout$.next(this.dataStore.gridLayout);
  }

  getElement(i: string) {
    return this.dataStore.gridLayout[i];
  }

  addActiveElement(pos: any) {
    this.dataStore.gridState.activeDrag = pos;
    this.state$.next(this.dataStore.gridState);
  }

  removeActiveElement() {
    this.dataStore.gridState.activeDrag = null;
    this.state$.next(this.dataStore.gridState);
  }

  get gridLayout() {
    return this.layout$.asObservable();
  }

  get stateLayout() {
    return this.state$.asObservable();
  }
  /**
   * When dragging starts
   * @param {String} i Id of the child
   * @param {Number} x X position of the move
   * @param {Number} y Y position of the move
   * @param {Event} e The mousedown event
   * @param {Element} node The current dragging DOM element
   */
  handleDragStart(i:string, x:number, y:number, e:Event, node:HTMLElement) {
    console.log(arguments);
    /*    const {layout} = this._gridLayoutState;
     var l = getLayoutItem(layout, i);
     if (!l) return;

     this._gridLayoutState.oldDragItem = cloneLayoutItem(l);
     this._gridLayoutState.oldLayout = this._gridLayoutState.layout;

     // this.props.onDragStart(layout, l, l, null, e, node);*/
  }

  /**
   * Each drag movement create a new dragelement and move the element to the dragged location
   * @param {String} i Id of the child
   * @param {Number} x X position of the move
   * @param {Number} y Y position of the move
   * @param {Event} e The mousedown event
   * @param {Element} node The current dragging DOM element
   */
  handleDrag(i:string, x:number, y:number, e:Event, node:HTMLElement) {
    console.log(arguments);
    /*    const {oldDragItem} = this._gridLayoutState;
     let {layout} = this._gridLayoutState;

     var l = getLayoutItem(layout, i);
     if (!l) return;

     // Create placeholder (display only)
     var placeholder = {
     w: l.w, h: l.h, x: l.x, y: l.y, placeholder: true, i: i
     };

     // Move the element to the dragged location.
     layout = moveElement(layout, l, x, y, true /!* isUserAction *!/);

     // this.props.onDrag(layout, oldDragItem, l, placeholder, e, node);

     this._gridLayoutState.layout = compact(layout, this.verticalCompact);
     this._gridLayoutState.activeDrag = placeholder;*/
  }

  /**
   * When dragging stops, figure out which position the element is closest to and update its x and y.
   * @param  {String} i Index of the child.
   * @param {Number} x X position of the move
   * @param {Number} y Y position of the move
   * @param {Event} e The mousedown event
   * @param {Element} node The current dragging DOM element
   */
  handleDragStop(i:string, x:number, y:number, e: Event, node) {
    console.log(arguments);
    /*    const {oldDragItem} = this._gridLayoutState;
     let {layout} = this._gridLayoutState;
     const l = getLayoutItem(layout, i);
     if (!l) return;

     // Move the element here
     layout = moveElement(layout, l, x, y, true /!* isUserAction *!/);

     // this.props.onDragStop(layout, oldDragItem, l, null, e, node);

     // Set state
     const newLayout = compact(layout, this.verticalCompact);
     const {oldLayout} = this._gridLayoutState;

     this._gridLayoutState = Object.assign({
     activeDrag: null,
     layout: newLayout,
     oldDragItem: null,
     oldLayout: null,
     }, this._gridLayoutState);

     this.onLayoutMaybeChanged(newLayout, oldLayout);*/
  }

  handleResizeStart(i:string, w:number, h:number, e:Event, node:HTMLElement) {
    console.log(arguments);
    /*    const {layout} = this._gridLayoutState;
     var l = getLayoutItem(layout, i);
     if (!l) return;

     this._gridLayoutState.oldResizeItem = cloneLayoutItem(l);
     this._gridLayoutState.oldLayout = this._gridLayoutState.layout;*/

    // this.props.onResizeStart(layout, l, l, null, e, node);
  }

  handleResize(i:string, w:number, h:number, e:Event, node:HTMLElement) {
    console.log(arguments);
    /*    const {layout, oldResizeItem} = this._gridLayoutState;
     var l = getLayoutItem(layout, i);
     if (!l) return;

     // Set new width and height.
     l.w = w;
     l.h = h;

     // Create placeholder element (display only)
     var placeholder = {
     w: w, h: h, x: l.x, y: l.y, static: true, i: i
     };

     // this.props.onResize(layout, oldResizeItem, l, placeholder, e, node);

     // Re-compact the layout and set the drag placeholder.
     this._gridLayoutState.layout = compact(layout, this.verticalCompact);
     this._gridLayoutState.activeDrag = placeholder;*/
  }

  handleResizeStop(i:string, w:number, h:number, e:Event, node:HTMLElement) {
    console.log(arguments);
    /*    const {layout, oldResizeItem} = this._gridLayoutState;
     var l = getLayoutItem(layout, i);

     // this.props.onResizeStop(layout, oldResizeItem, l, null, e, node);

     // Set state
     const newLayout = compact(layout, this.verticalCompact);
     const {oldLayout} = this._gridLayoutState;

     this._gridLayoutState = Object.assign({
     activeDrag: null,
     layout: newLayout,
     oldResizeItem: null,
     oldLayout: null
     }, this._gridLayoutState);

     this.onLayoutMaybeChanged(newLayout, oldLayout);*/
  }

  onLayoutMaybeChanged(newLayout:Array<ILayoutItem>, oldLayout?:Array<ILayoutItem>) {
    if (!oldLayout) oldLayout = this.dataStore.gridState.layout;
    if (!Object.is(oldLayout, newLayout)) {
      // this.onLayoutChange(newLayout);
      console.log('layout changed');
    }
  }

  /**
   * Calculates a pixel value for the container.
   * @return {String} Container height in pixels.
   */
  containerHeight() {
    const { autoSize, layout, containerPadding, rowHeight, margin } = this.grid;
    if (!autoSize) return;
    const nbRow = bottom(layout);
    console.log(rowHeight);
    const containerPaddingY = containerPadding ? containerPadding[1] : margin[1];
    console.log(containerPaddingY);
    console.log(nbRow * rowHeight + (nbRow - 1) * margin[1] + containerPaddingY * 2);
    return nbRow * rowHeight + (nbRow - 1) * margin[1] + containerPaddingY * 2 + 'px';
  }

  /**
   * Create a placeholder object.
   * @return {Element} Placeholder div.
   */
  placeholder() {
    const {activeDrag} = this.dataStore.gridState;
    if (!activeDrag) return null;

    // {...this.state.activeDrag} is pretty slow, actually
    return {
      'w': activeDrag.w,
      'h': activeDrag.h,
      'x': activeDrag.x,
      'y': activeDrag.y,
      'i': activeDrag.i,
    }
  }

}
