export interface IControlPosition {
  clientX: number;
  clientY: number;
}

export interface IPosition {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface ILayoutItemRequired {
  w: number; h: number;
  x: number; y: number;
  id: number;
}

export interface ILayoutItem extends ILayoutItemRequired {
  minW?: number; minH?: number;
  maxW?: number; maxH?: number;
  moved?: boolean; stat?: boolean;
}

export interface IGridLayout {
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
  colWidth: number;
}

export interface IGridLayoutState {
  placeholderStyle: any;
  containerHeight: string;
  activeDrag?: number;
  layout: Array<ILayoutItem>;
}
