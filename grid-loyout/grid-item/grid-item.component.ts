import {
  Component,
  Input,
  Output,
  EventEmitter,
  ElementRef,
  OnChanges
} from '@angular/core';

// import { GridUtilesService } from '../grid-utiles.service';
import {perc, setTopLeft, setTransform} from './utiles';

import { IResizable } from '../resizable/resizable.interfaces';
import { IDraggable } from '../draggable/draggable.interfaces';

import { IPosition, IGridItemState } from './grid-item.interfaces';

@Component({
  selector: 'grid-item',
  templateUrl: './grid-item.component.html',
  styleUrls: ['./grid-item.component.scss'],
  host: {
    '(onResizeStop)':   'onResizeHandler("onResizeStop")',
    '(onResizeStart)':  'onResizeHandler("onResizeStart")',
    '(onResize)':       'onResizeHandler("onResize")',
    '(onStart)':        'onDragHandler("onDragStart")',
    '(onDrag)':         'onDragHandler("onDrag")',
    '(onStop)':         'onDragHandler("onDragStop")'
  }
})
export class GridItemComponent implements OnChanges {

  @Input() draggable:IDraggable;
  @Input() resizable:IResizable;

  // General grid attributes
  @Input() cols:number;
  @Input() containerWidth:number;
  @Input() rowHeight:number;
  @Input() margin:Array<number>;
  @Input() maxRows:number;
  @Input() containerPadding:Array<number>

  // These are all in grid units
  @Input() x:number;
  @Input() y:number;
  @Input() w:number;
  @Input() h:number;

  // All optional
  @Input() minW:number = 1;
  @Input() maxW:number = Infinity;

  @Input() minH:number = 1;
  @Input() maxH:number = Infinity;

  // ID is nice to have for callbacks
  @Input() i:string;

  // Functions
  @Output() onDragStop:EventEmitter<any> = new EventEmitter<any>();
  @Output() onDragStart:EventEmitter<any> = new EventEmitter<any>();
  @Output() onDrag:EventEmitter<any> = new EventEmitter<any>();
  @Output() onResizeStop:EventEmitter<any> = new EventEmitter<any>();
  @Output() onResizeStart:EventEmitter<any> = new EventEmitter<any>();
  @Output() onResize:EventEmitter<any> = new EventEmitter<any>();

  // Flags
  @Input() isDraggable:boolean;
  @Input() isResizable:boolean;
  @Input() static:boolean;

  // Use CSS transforms instead of top/left
  @Input() useCSSTransforms:boolean;

  // Others
  @Input() className:string = '';
  // Selector for draggable handle
  @Input() handle:string = '';
  // Selector for draggable cancel (see react-draggable)
  @Input() cancel:string = '';

  private _gridItemState:IGridItemState;

  constructor(
    private _element:ElementRef
  ) {
    this._gridItemState = this.getInitialState();
  }

  ngOnChanges() {
    const {x, y, w, h, useCSSTransforms} = this;

    const pos = this.calcPosition(x, y, w, h, this._gridItemState);

    this._element.nativeElement.classList.add(<any>[
      'react-grid-item',
      this.className,
      this.static ? 'static' : '',
      this._gridItemState.resizing ? 'resizing' : '',
      this._gridItemState.dragging ? 'react-draggable-dragging' : '',
      useCSSTransforms ? 'cssTransforms' : ''
    ]);

    // Resizable support. This is usually on but the user can toggle it off.
    this.resizable = this.mixinResizable(pos);

    // Draggable support. This is always on, except for with placeholders.
    this.draggable = this.mixinDraggable();
  }

  getInitialState():IGridItemState {
    return <IGridItemState>{
      resizing: null,
      dragging: null,
      className: ''
    }
  }

  // Helper for generating column width
  calcColWidth():number {
    const {margin, containerPadding, containerWidth, cols} = this;
    return (containerWidth - (margin[0] * (cols - 1)) - (containerPadding[0] * 2)) / cols;
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
  calcPosition(x:number, y:number, w:number, h:number, state?:Object):IPosition {
    const {margin, containerPadding, rowHeight} = this;
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

    if (this._gridItemState && this._gridItemState.resizing) {
      out.width = Math.round(this._gridItemState.resizing.width);
      out.height = Math.round(this._gridItemState.resizing.height);
    }

    if (this._gridItemState && this._gridItemState.dragging) {
      out.top = Math.round(this._gridItemState.dragging.top);
      out.left = Math.round(this._gridItemState.dragging.left);
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
    const {margin, cols, rowHeight, w, h, maxRows} = this;
    const colWidth = this.calcColWidth();

    // left = colWidth * x + margin * (x + 1)
    // l = cx + m(x+1)
    // l = cx + mx + m
    // l - m = cx + mx
    // l - m = x(c + m)
    // (l - m) / (c + m) = x
    // x = (left - margin) / (coldWidth + margin)
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
    const {margin, maxRows, cols, rowHeight, x, y} = this;
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
  createStyle(pos:IPosition):Object {
    const {useCSSTransforms} = this;

    // CSS Transforms support (default)
    if (useCSSTransforms) {
      return setTransform(pos);
    }
    // top,left (slow)
    else {
      return setTopLeft(pos);

    }
  }

  /**
   * Mix a Resizable instance into a child.
   * @param  {Element} child    Child element.
   * @param  {Object} position  Position object (pixel values)
   * @return {Element}          Child wrapped in Resizable.
   */
  mixinResizable(position:IPosition):IResizable {
    const {cols, x, minW, minH, maxW, maxH} = this;

    // This is the max possible width - doesn't go to infinity because of the width of the window
    const maxWidth = this.calcPosition(0, 0, cols - x, 0).width;

    // Calculate min/max constraints using our min & maxes
    const mins = this.calcPosition(0, 0, minW, minH);
    const maxes = this.calcPosition(0, 0, maxW, maxH);
    const minConstraints = [mins.width, mins.height];
    const maxConstraints = [Math.min(maxes.width, maxWidth), Math.min(maxes.height, Infinity)];
    return <IResizable>{
      'width': position.width,
      'height': position.height,
      'minConstraints': minConstraints,
      'maxConstraints': maxConstraints
    };
  }

  /**
   * Mix a Draggable instance into a child.
   * @param  {Element} child    Child element.
   * @return {Element}          Child wrapped in Draggable.
   */
  mixinDraggable():IDraggable {
    return <IDraggable>{
      'handle': this.handle,
      'cancel': ".react-resizable-handle" + (this.cancel ? "," + this.cancel : "")
    };
  }


  /**
   * Wrapper around drag events to provide more useful data.
   * All drag events call the function with the given handler name,
   * with the signature (index, x, y).
   *
   * @param  {String} handlerName Handler name to wrap.
   * @return {Function}           Handler function.
   */
  onDragHandler(event:MouseEvent, handlerName:string) {
    console.log(arguments);
/*    return (e:Event, {node, deltaX, deltaY}: DragCallbackData) => {
      if (!this.props[handlerName]) return;

      const newPosition: {top: number, left: number} = {top: 0, left: 0};

      // Get new XY
      switch (handlerName) {
        case 'onDragStart':
          // ToDo this wont work on nested parents
          const parentRect = node.offsetParent.getBoundingClientRect();
          const clientRect = node.getBoundingClientRect();
          newPosition.left = clientRect.left - parentRect.left;
          newPosition.top = clientRect.top - parentRect.top;
          this.setState({dragging: newPosition});
          break;
        case 'onDrag':
          if (!this.state.dragging) throw new Error('onDrag called before onDragStart.');
          newPosition.left = this.state.dragging.left + deltaX;
          newPosition.top = this.state.dragging.top + deltaY;
          this.setState({dragging: newPosition});
          break;
        case 'onDragStop':
          if (!this.state.dragging) throw new Error('onDragEnd called before onDragStart.');
          newPosition.left = this.state.dragging.left;
          newPosition.top = this.state.dragging.top;
          this.setState({dragging: null});
          break;
        default:
          throw new Error('onDragHandler called with unrecognized handlerName: ' + handlerName);
      }

      const {x, y} = this.calcXY(newPosition.top, newPosition.left);

      this.props[handlerName](this.props.i, x, y, {e, node, newPosition});
    };*/
  }

  /**
   * Wrapper around drag events to provide more useful data.
   * All drag events call the function with the given handler name,
   * with the signature (index, x, y).
   *
   * @param  {String} handlerName Handler name to wrap.
   * @return {Function}           Handler function.
   */
  onResizeHandler(event:MouseEvent, handlerName: string) {
    console.log(arguments);
/*    return (e:Event, {node, size}: {node: HTMLElement, size: Position}) => {
      if (!this.props[handlerName]) return;
      const {cols, x, i, maxW, minW, maxH, minH} = this.props;

      // Get new XY
      let {w, h} = this.calcWH(size);

      // Cap w at numCols
      w = Math.min(w, cols - x);
      // Ensure w is at least 1
      w = Math.max(w, 1);

      // Min/max capping
      w = Math.max(Math.min(w, maxW), minW);
      h = Math.max(Math.min(h, maxH), minH);

      this.setState({resizing: handlerName === 'onResizeStop' ? null : size});

      this.props[handlerName](i, w, h, {e, node, size});
    };*/
  }

}
