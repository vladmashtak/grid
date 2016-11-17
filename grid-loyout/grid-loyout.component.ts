import {
  Component,
  Input,
  Output,
  EventEmitter,
  ElementRef,
  Renderer,
  QueryList,
  ContentChildren,
  OnChanges,
  OnInit,
  AfterContentInit
} from '@angular/core';

import { GridUtilesService } from './grid-utiles.service';
import { DraggableDirective } from './draggable/draggable.directive'

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

import { LayoutItem } from './grid-item/utiles';

import { GridItemComponent } from './grid-item/grid-item.component';

interface LayoutItemRequired {
  w: number; h: number;
  x: number; y: number;
  i: string;
}

interface IGridLayoutState {
  activeDrag?: LayoutItem;
  layout: Array<LayoutItem>;
  mounted: boolean;
  oldDragItem: LayoutItem;
  oldLayout: Array<LayoutItem>;
  oldResizeItem: LayoutItem;
}

@Component({
  selector: 'grid-layout',
  templateUrl: './grid-loyout.component.html',
  styleUrls: ['./grid-loyout.component.scss']
})
export class GridLoyoutComponent implements OnChanges, OnInit, AfterContentInit {
  @ContentChildren(GridItemComponent) children:QueryList<GridItemComponent>;

  //
  // Basic props
  //
  @Input() className:string = '';
  @Input() style:Object;

  // This can be set explicitly. If it is not set, it will automatically
  // be set to the container width. Note that resizes will *not* cause this to adjust.
  // If you need that behavior, use WidthProvider.
  @Input() width:number;

  // If true, the container height swells and contracts to fit contents
  @Input() autoSize:boolean = true;
  // # of cols.
  @Input() cols:number = 12;

  // A selector that will not be draggable.
  @Input() draggableCancel:string;
  // A selector for the draggable handler
  @Input() draggableHandle:string;

  // If true, the layout will compact vertically
  @Input() verticalCompact:boolean = true;

  // layout is an array of object with the format:
  // {x: Number, y: Number, w: Number, h: Number, i: String}
  @Input() layout:Array<LayoutItemRequired> = new Array<LayoutItemRequired>();

  //
  // Grid Dimensions
  //

  // Margin between items [x, y] in px
  @Input() margin:Array<number> = [10, 10];
  // Padding inside the container [x, y] in px
  @Input() containerPadding:Array<number>;
  // Rows have a static height, but you can change this based on breakpoints if you like
  @Input() rowHeight:number = 150;
  // Default Infinity, but you can specify a max here if you like.
  // Note that this isn't fully fleshed out and won't error if you specify a layout that
  // extends beyond the row capacity. It will, however, not allow users to drag/resize
  // an item past the barrier. They can push items beyond the barrier, though.
  // Intentionally not documented for this reason.
  @Input() maxRows:number = Infinity;

  //
  // Flags
  //
  @Input() isDraggable:boolean = true;
  @Input() isResizable:boolean = true;
  // Use CSS transforms instead of top/left
  @Input() useCSSTransforms:boolean = true;

  // Callback so you can save the layout. Calls after each drag & resize stops.
  @Output() onLayoutChange:EventEmitter<any> = new EventEmitter<any>();

  // Calls when drag starts. Callback is of the signature (layout, oldItem, newItem, placeholder, e).
  // All callbacks below have the same signature. 'start' and 'stop' callbacks omit the 'placeholder'.
  @Output() onDragStart:EventEmitter<any> = new EventEmitter<any>();
  // Calls on each drag movement.
  @Output() onDrag:EventEmitter<any> = new EventEmitter<any>();
  // Calls when drag is complete.
  @Output() onDragStop:EventEmitter<any> = new EventEmitter<any>();
  //Calls when resize starts.
  @Output() onResizeStart:EventEmitter<any> = new EventEmitter<any>();
  // Calls when resize movement happens.
  @Output() onResize:EventEmitter<any> = new EventEmitter<any>();
  // Calls when resize is complete.
  @Output() onResizeStop:EventEmitter<any> = new EventEmitter<any>();

  private _gridLayoutState:IGridLayoutState;

  constructor(
    private _element:ElementRef,
    private _renderer:Renderer) {
    this._gridLayoutState = this.getInitialState()
  }

  ngOnChanges() {
    //  debugger;
    /*    const newLayout =
     synchronizeLayoutWithChildren(this.layout, this.children, this.cols, this.verticalCompact);

     const oldLayout = this._gridLayoutState.layout;
     this._gridLayoutState.layout = newLayout;
     this.onLayoutMaybeChanged(newLayout, oldLayout);*/
  }

  ngOnInit() {
    const {className, style} = this;
    const mergedClassName = `react-grid-layout ${className}`;

    Object.assign(this._element.nativeElement.style, {height: this.containerHeight()}, style);
    this._renderer.setElementClass(this._element, mergedClassName, true);

    this._gridLayoutState.mounted = true;
    // Possibly call back with layout on mount. This should be done after correcting the layout width
    // to ensure we don't rerender with the wrong width.
    this.onLayoutMaybeChanged(this._gridLayoutState.layout, this.layout);
  }

  ngAfterContentInit() {
    console.log(this.children);
    this._gridLayoutState.layout =
      synchronizeLayoutWithChildren(this.layout, this.children, this.cols, this.verticalCompact);
  }

  getInitialState() {
    return <IGridLayoutState>{
      activeDrag: null,
      mounted: false,
      layout: null,
      oldDragItem: null,
      oldLayout: null,
      oldResizeItem: null
    };
  }

  /**
   * Calculates a pixel value for the container.
   * @return {String} Container height in pixels.
   */
  containerHeight() {
    if (!this.autoSize) return;
    const nbRow = bottom(this.layout);
    const containerPaddingY = this.containerPadding ? this.containerPadding[1] : this.margin[1];
    return nbRow * this.rowHeight + (nbRow - 1) * this.margin[1] + containerPaddingY * 2 + 'px';
  }

  /**
   * When dragging starts
   * @param {String} i Id of the child
   * @param {Number} x X position of the move
   * @param {Number} y Y position of the move
   * @param {Event} e The mousedown event
   * @param {Element} node The current dragging DOM element
   */
  handleDragStart(i:string, x:number, y:number, {e, node}) {
    const {layout} = this._gridLayoutState;
    var l = getLayoutItem(layout, i);
    if (!l) return;

    this._gridLayoutState.oldDragItem = cloneLayoutItem(l);
    this._gridLayoutState.oldLayout = this._gridLayoutState.layout;

    // this.props.onDragStart(layout, l, l, null, e, node);
  }

  /**
   * Each drag movement create a new dragelement and move the element to the dragged location
   * @param {String} i Id of the child
   * @param {Number} x X position of the move
   * @param {Number} y Y position of the move
   * @param {Event} e The mousedown event
   * @param {Element} node The current dragging DOM element
   */
  handleDrag(i:string, x:number, y:number, {e, node}) {
    const {oldDragItem} = this._gridLayoutState;
    let {layout} = this._gridLayoutState;

    var l = getLayoutItem(layout, i);
    if (!l) return;

    // Create placeholder (display only)
    var placeholder = {
      w: l.w, h: l.h, x: l.x, y: l.y, placeholder: true, i: i
    };

    // Move the element to the dragged location.
    layout = moveElement(layout, l, x, y, true /* isUserAction */);

    // this.props.onDrag(layout, oldDragItem, l, placeholder, e, node);

    this._gridLayoutState.layout = compact(layout, this.verticalCompact);
    this._gridLayoutState.activeDrag = placeholder;
  }

  /**
   * When dragging stops, figure out which position the element is closest to and update its x and y.
   * @param  {String} i Index of the child.
   * @param {Number} x X position of the move
   * @param {Number} y Y position of the move
   * @param {Event} e The mousedown event
   * @param {Element} node The current dragging DOM element
   */
  handleDragStop(i:string, x:number, y:number, {e, node}) {
    const {oldDragItem} = this._gridLayoutState;
    let {layout} = this._gridLayoutState;
    const l = getLayoutItem(layout, i);
    if (!l) return;

    // Move the element here
    layout = moveElement(layout, l, x, y, true /* isUserAction */);

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

    this.onLayoutMaybeChanged(newLayout, oldLayout);
  }

  onLayoutMaybeChanged(newLayout:Array<LayoutItem>, oldLayout?:Array<LayoutItem>) {
    if (!oldLayout) oldLayout = this._gridLayoutState.layout;
    if (!Object.is(oldLayout, newLayout)) {
      // this.onLayoutChange(newLayout);
      console.log('layout changed');
    }
  }


  handleResizeStart(i:string, w:number, h:number, {e, node}) {
    const {layout} = this._gridLayoutState;
    var l = getLayoutItem(layout, i);
    if (!l) return;

    this._gridLayoutState.oldResizeItem = cloneLayoutItem(l);
    this._gridLayoutState.oldLayout = this._gridLayoutState.layout;

    // this.props.onResizeStart(layout, l, l, null, e, node);
  }

  handleResize(i:string, w:number, h:number, {e, node}) {
    const {layout, oldResizeItem} = this._gridLayoutState;
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
    this._gridLayoutState.activeDrag = placeholder;
  }

  handleResizeStop(i:string, w:number, h:number, {e, node}) {
    const {layout, oldResizeItem} = this._gridLayoutState;
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

    this.onLayoutMaybeChanged(newLayout, oldLayout);
  }

  /**
   * Create a placeholder object.
   * @return {Element} Placeholder div.
   */
  placeholder() {
    const {activeDrag} = this._gridLayoutState;
    if (!activeDrag) return null;
    const {width, cols, margin, containerPadding, rowHeight, maxRows, useCSSTransforms} = this;

    // {...this.state.activeDrag} is pretty slow, actually
    return {
      'w': activeDrag.w,
      'h': activeDrag.h,
      'x': activeDrag.x,
      'y': activeDrag.y,
      'i': activeDrag.i,
      'className': 'react-grid-placeholder',
      'containerWidth': width,
      'cols': cols,
      'margin': margin,
      'containerPadding': containerPadding || margin,
      'maxRows': maxRows,
      'rowHeight': rowHeight,
      'isDraggable': false,
      'isResizable': false,
      'useCSSTransforms': useCSSTransforms
    }
  }

  /**
   * Given a grid item, set its style attributes & surround in a <Draggable>.
   * @param  {Element} child React element.
   * @return {Element}       Element wrapped in draggable and properly placed.
   */
  processGridItem(key:string) {
    const l = getLayoutItem(this._gridLayoutState.layout, key);
    if (!l) return null;
    const {width, cols, margin, containerPadding, rowHeight,
      maxRows, isDraggable, isResizable, useCSSTransforms,
      draggableCancel, draggableHandle} = this;
    const {mounted} = this._gridLayoutState;

    // Parse 'static'. Any properties defined directly on the grid item will take precedence.
    const draggable = Boolean(!l.static && isDraggable && (l.isDraggable || l.isDraggable == null));
    const resizable = Boolean(!l.static && isResizable && (l.isResizable || l.isResizable == null));

    return {
      'containerWidth': width,
      'cols': cols,
      'margin': margin,
      'containerPadding': containerPadding || margin,
      'maxRows': maxRows,
      'rowHeight': rowHeight,
      'cancel': draggableCancel,
      'handle': draggableHandle,
      'isDraggable': draggable,
      'isResizable': resizable,
      'useCSSTransforms': useCSSTransforms && mounted,
      'usePercentages': !mounted,
      'w': l.w,
      'h': l.h,
      'x': l.x,
      'y': l.y,
      'i': l.i,
      'minH': l.minH,
      'minW': l.minW,
      'maxH': l.maxH,
      'maxW': l.maxW,
      'static': l.static,
    }
  }

}
