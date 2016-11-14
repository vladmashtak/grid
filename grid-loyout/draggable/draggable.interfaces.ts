export interface IDraggable {
  /**
   * `allowAnyClick` allows dragging using any mouse button.
   * By default, we only accept the left button.
   *
   * Defaults to `false`.
   */
  allowAnyClick:boolean;
  /**
   * `disabled`, if true, stops the <Draggable> from dragging. All handlers,
   * with the exception of `onMouseDown`, will not fire.
   */
  disabled:boolean;
  /**
   * `start` specifies the x and y that the dragged item should start at
   *    start={x: 25, y: 25}
   */
  start:IStartPosition;
  /**
   * `axis` determines which axis the draggable can move.
   *
   * 'both' allows movement horizontally and vertically.
   * 'x' limits movement to horizontal axis.
   * 'y' limits movement to vertical axis.
   *
   * Defaults to 'both'.
   */
  axis:string;
  /**
   * `handle` specifies a selector to be used as the handle that initiates drag.
   *
   *  handle=".handle">
   */
  handle:string;
  /**
   * `cancel` specifies a selector to be used to prevent drag initialization.
   *
   *   cancel=".cancel">
   */
  cancel:string;
  /**
   * `grid` specifies the x and y that dragging should snap to.
   *
   *    grid="[25, 25]"
   */
  grid:Array<number>;
  /**
   * `moveOnStartChange` tells the Draggable element to reset its position
   * if the `start` parameters are changed. By default, if the `start`
   * parameters change, the Draggable element still remains where it started
   * or was dragged to.
   *
   *    var start = {x: 25, y: 25}
   */
  moveOnStartChange:boolean;
  /**
   * `useCSSTransforms` if true will place the element using translate(x, y)
   * rather than CSS top/left.
   *
   * This generally gives better performance, and is useful in combination with
   * other layout systems that use translate()
   */
  useCSSTransforms:boolean;
  /**
   * `zIndex` specifies the zIndex to use while dragging.
   *
   *    zIndex="100">
   */
  zIndex:number;
}

export interface IStartPosition {
  x:number;
  y:number;
}

export interface IDragState {
  // Whether or not currently dragging
  dragging:boolean;

  // Start top/left
  startX:number; startY:number;

  // Offset between start top/left and mouse top/left
  offsetX:number; offsetY:number,

  // Current top/left
  clientX:number; clientY:number;

  // delta
  deltaX:number; deltaY:number;
}

export interface IDraggableData {
  node: HTMLElement;
  x: number; y: number;
  deltaX: number; deltaY: number;
  lastX: number; lastY: number;
}
