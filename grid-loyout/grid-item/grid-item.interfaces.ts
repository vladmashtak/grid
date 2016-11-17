export interface IPosition {
  left: number; top: number;
  width: number; height: number;
}

interface IGridResizing {
  width: number; height: number;
}

interface IGridDragging {
  top: number; left: number;
}

export interface IGridItemState {
  resizing?:IGridResizing;
  dragging?:IGridDragging;
  className: string;
}

interface ILayoutItemRequired {
  w: number; h: number;
  x: number; y: number;
  i: string;
}

export interface ILayoutItem extends ILayoutItemRequired {
  minW?: number; minH?: number;
  maxW?: number; maxH?: number;
  moved?: boolean; static?: boolean;
  isDraggable?: boolean; isResizable?: boolean;
}

export interface IDataGrid {
  // General grid attributes
  cols: number; // isRequired
  containerWidth: number; // isRequired
  rowHeight: number; // isRequired
  margin: Array<any>; // isRequired
  maxRows: number; // isRequired
  containerPadding: Array<any>; // isRequired

  // These are all in grid units
  x: number; // isRequired
  y: number; // isRequired
  w: number; // isRequired
  h: number; // isRequired

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
