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
