export interface IControlPosition {
  clientX: number;
  clientY: number;
}

export interface ILayoutItemRequired {
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
