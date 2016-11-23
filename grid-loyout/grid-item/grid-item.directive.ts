import {
  Directive,
  Input,
  Output,
  EventEmitter,
  Renderer,
  ElementRef,
  OnInit,
  OnChanges,
  OnDestroy
} from '@angular/core';

import { GridEventService } from '../grid-event.service';
import { GridUtilesService} from '../grid-utiles.service';
import { GridLayoutService } from '../grid-layout.service';

import {
  perc,
  setTopLeft,
  setTransform
} from './utiles';

export interface IPosition {
  left: number; top: number;
  width: number; height: number;
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

interface IDragState {
  // Whether or not currently dragging
  dragging:boolean;
  // Start top/left
  startX:number; startY:number;
  // Offset between start top/left and mouse top/left
  offsetX:number; offsetY:number,
  // Current top/left
  clientX:number; clientY:number;
}

interface IResizeState {
  // Whether or not currently resizing
  resizing: boolean;
  lastX: number; lastY: number;
  width: number; height: number;
  offsetW: number; offsetH: number;
}

interface IGridItemState {
  resize?: IResizeState;
  drag?: IDragState;
}

@Directive({
  selector: '[gridItem]'
})

export class GridItemDirective implements OnInit, OnChanges, OnDestroy {
  @Input() gridItem:ILayoutItem;

  @Output() dragStart:EventEmitter<any> = new EventEmitter<any>();
  @Output() dragMove:EventEmitter<any> = new EventEmitter<any>();
  @Output() dragStop:EventEmitter<any> = new EventEmitter<any>();

  @Output() resizeMove:EventEmitter<any> = new EventEmitter<any>();
  @Output() resizeStart:EventEmitter<any> = new EventEmitter<any>();
  @Output() resizeStop:EventEmitter<any> = new EventEmitter<any>();

  private _state:IGridItemState;

  private _dragEventFor:string;
  private _handleDragElement:HTMLElement;
  private _handleResizeElement:HTMLElement;
  private _currentLayout:any;

  constructor(private _element:ElementRef,
              private _renderer:Renderer,
              private _gridEvent:GridEventService,
              private _layout:GridLayoutService) {
    this._state = <IGridItemState>{
      drag: <IDragState>{
        dragging: false,
        startX: 0, startY: 0,
        offsetX: 0, offsetY: 0,
        clientX: 0, clientY: 0
      },
      resize: <IResizeState>{
        resizing: false,
        lastX: null, lastY: null,
        width: null, height: null,
        offsetW: 0, offsetH: 0
      }
    };

    this._dragEventFor = _gridEvent.dragEventFor;

    /*subscribe*/
    this._layout.gridLayout.subscribe(newLayout => {
      if(this.gridItem) {
/*        const { x, y, w, h } = newLayout[this.gridItem.i];
        const pos = this.calcPosition(x, y, w, h);

        Object.assign(this._state.resize, {
          width: pos.width,
          height: pos.height
        });

        /!*set initial style for layout item*!/
        this.createStyle(pos);
        this.currentLayout = newLayout;*/
      }
      this._currentLayout = newLayout;

    });
  }
  ngOnChanges() {
    const {i, x, y, w, h} = this.gridItem;
    const pos = this.calcPosition(x, y, w, h);
    /* Add single item grid config to store grid*/
    this._layout.addElement(i, w, h, x, y);
    /* set initial size item state */
    Object.assign(this._state.resize, {
      width: pos.width,
      height: pos.height
    });
    /* set custom props */
    Object.assign(this.gridItem, {
      minH: 2, minW: 2,
      maxH: Infinity, maxW: Infinity
    });
    /*set initial style for layout item*/
    this.createStyle(pos);
  }

  ngOnInit() {
    if(this.gridItem.isDraggable) this.setDragHandler();
    if(this.gridItem.isResizable) this.setResizeHandler();
  }

  ngOnDestroy() {
    // Remove event handlers
    this._gridEvent.removeEvent(this._dragEventFor['move']);
    this._gridEvent.removeEvent(this._dragEventFor['end']);
  }

  setResizeHandler() {
    /* search resize handler element */
    this._handleResizeElement = this._element.nativeElement.querySelector('.resizable-handle');

    if (this._handleResizeElement === null) {
      throw new Error('Block must have a resize handler HTML Element!');
    }

    /* add event listeners*/
    this._renderer.listen(this._handleResizeElement, this._dragEventFor['start'], this.onResizeStart.bind(this));
  }

  setDragHandler() {
    /* search resize handler element */
    this._handleDragElement = this._element.nativeElement.querySelector('.draggable-handle');

    if (this._handleDragElement === null) {
      throw new Error('Block must have a drag HTML Element!');
    }

    /* add event listeners*/
    this._renderer.listen(this._handleDragElement, this._dragEventFor['start'], this.onDragStart.bind(this));
  }

  calcColWidth():number {
    return (this._layout.grid.containerWidth - (this._layout.grid.margin[0] * (this._layout.grid.cols - 1)) - (this._layout.grid.containerPadding[0] * 2)) / this._layout.grid.cols;
  }

  calcPosition(x:number, y:number, w:number, h:number, state?:IGridItemState):IPosition {
    const {margin, containerPadding, rowHeight} = this._layout.grid;
    const colWidth = this.calcColWidth();

    const out:IPosition = <IPosition>{
      left: Math.round((colWidth + margin[0]) * x + containerPadding[0]),
      top: Math.round((rowHeight + margin[1]) * y + containerPadding[1]),
      // 0 * Infinity === NaN, which causes problems with resize constraints;
      // Fix this if it occurs.
      // Note we do it here rather than later because Math.round(Infinity) causes deopt
      width: w === Infinity ? w : Math.round(colWidth * w + Math.max(0, w - 1) * margin[0]),
      height: h === Infinity ? h : Math.round(rowHeight * h + Math.max(0, h - 1) * margin[1])
    };

    if (state && state.resize.resizing) {
      out.width = Math.round(state.resize.width);
      out.height = Math.round(state.resize.height);
      return out;
    }

    if (state && state.drag.dragging) {
      out.top = Math.round(state.drag.clientY);
      out.left = Math.round(state.drag.clientX);
      return out;
    }

    return out;
  }

  calcXY(top:number, left:number):{x: number, y: number} {
    const {margin, cols, rowHeight, maxRows} = this._layout.grid;
    const {w, h} = this.gridItem;

    const colWidth = this.calcColWidth();

    let x = Math.round((left - margin[0]) / (colWidth + margin[0]));
    let y = Math.round((top - margin[1]) / (rowHeight + margin[1]));

    // Capping
    x = Math.max(Math.min(x, cols - w), 0);
    y = Math.max(Math.min(y, maxRows - h), 0);

    return {x, y};
  }

  calcWH(width: number, height: number):{w: number, h: number} {
    const {margin, maxRows, cols, rowHeight} = this._layout.grid;
    const {x, y} = this.gridItem;

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

  createStyle(pos:IPosition) {
    const {useCSSTransforms} = this._layout.grid;

    let style;
    // CSS Transforms support (default)
    if (useCSSTransforms) {
      style = setTransform(pos);
    }
    // top,left (slow)
    else {
      style = setTopLeft(pos);
    }

    Object.assign(this._element.nativeElement.style, style);
  }

  onDragStart(e:MouseEvent) {
    const { i } = this.gridItem;
    // Add a class to the body to disable user-select. This prevents text from
    // being selected all over the page.
    document.body.classList.add('draggable-active');

    const parentRect = this._element.nativeElement.offsetParent.getBoundingClientRect();
    const clientRect = this._element.nativeElement.getBoundingClientRect();

    Object.assign(this._state.drag, {
      dragging: true,
      offsetX: e.clientX,
      offsetY: e.clientY,
      startX: clientRect.left - parentRect.left,
      startY: clientRect.top - parentRect.top
    });

    // this._layout.addActiveElement(pos);

    this._gridEvent.addEvent(this._renderer, this._dragEventFor['move'], this.onDragMove.bind(this));
    this._gridEvent.addEvent(this._renderer, this._dragEventFor['end'], this.onDragEnd.bind(this));
  }

  onDragMove(e:MouseEvent) {
    const { i } = this.gridItem;
    const { w, h, x, y } = this._layout.getElement(i);
    const { offsetX, offsetY, startX, startY} = this._state.drag;

    this._state.drag.clientX = startX + (e.clientX - offsetX);
    this._state.drag.clientY = startY + (e.clientY - offsetY);

    const newXY = this.calcXY(this._state.drag.clientY, this._state.drag.clientX);
    /* set style for layout item after dragging */
    const pos:IPosition = this.calcPosition(newXY.x, newXY.y, w, h, this._state);
    this.createStyle(pos);

    if(x !== newXY.x || y !== newXY.y) {
      /* Add single item grid config to store grid*/
      this._layout.addElement(i, w, h, newXY.x, newXY.y);
      this._layout.addActiveElement(pos);
      // console.log('change drag layout: ', this._currentLayout[i]);
    }
  }

  onDragEnd() {
    const { i } = this.gridItem;
    const { w, h, x, y } = this._layout.getElement(i);

    // Remove the body class used to disable user-select.
    document.body.classList.remove('draggable-active');
    this._state.drag.dragging = false;

    const pos:IPosition = this.calcPosition(x, y, w, h, this._state);
    this.createStyle(pos);

    this._layout.removeActiveElement();

    this._gridEvent.removeEvent(this._dragEventFor['move']);
    this._gridEvent.removeEvent(this._dragEventFor['end']);
  }

  onResizeStart(e:MouseEvent) {
    const { width, height } = this._state.resize;

    // Add a class to the body to disable user-select. This prevents text from
    // being selected all over the page.
    document.body.classList.add('resizable-active');

    Object.assign(this._state.resize, {
      resizing: true,
      offsetW: e.clientX,
      offsetH: e.clientY,
      lastX: width,
      lastY: height
    });
    this._gridEvent.addEvent(this._renderer, this._dragEventFor['move'], this.onResizeMove.bind(this));
    this._gridEvent.addEvent(this._renderer, this._dragEventFor['end'], this.onResizeEnd.bind(this));
  }

  onResizeMove(e:MouseEvent) {
    const { cols } = this._layout.grid;
    const { i, minH, minW, maxH, maxW } = this.gridItem;
    const { w, h, x, y, } = this._layout.getElement(i);
    const {lastX, lastY, offsetW, offsetH } = this._state.resize;

    let deltaX = e.clientX - offsetW;
    let deltaY = e.clientY - offsetH;

    Object.assign(this._state.resize, {
      resizing: true,
      width: lastX + deltaX,
      height: lastY + deltaY
    });

    // Get new XY
    let newWH = this.calcWH(this._state.resize.width, this._state.resize.height);

    newWH.w = Math.min(newWH.w, cols - x);
    newWH.w = Math.max(newWH.w, 1);
    newWH.w = Math.max(Math.min(newWH.w, maxW), minW);
    newWH.h = Math.max(Math.min(newWH.h, maxH), minH);

    /* set style for layout item after resizing */
    const pos = this.calcPosition(x, y, newWH.w, newWH.h, this._state);
    this.createStyle(pos);

    if(w !== newWH.w || h !== newWH.h) {
      /* Add single item grid config to store grid*/
      this._layout.addElement(i, newWH.w, newWH.h, x, y);
      this._layout.addActiveElement(i);
      // console.log('change resize layout: ', this._currentLayout[i]);
    }
  }

  onResizeEnd() {
    // Remove the body class used to disable user-select.
    document.body.classList.remove('resizable-active');

    const { i } = this.gridItem;
    const { w, h, x, y } = this._layout.getElement(i);

    this._state.resize.resizing = false;

    const pos:IPosition = this.calcPosition(x, y, w, h, this._state);
    this.createStyle(pos);

    Object.assign(this._state.resize, {
      width: pos.width,
      height: pos.height
    });

    this._layout.removeActiveElement();

    this._gridEvent.removeEvent(this._dragEventFor['move']);
    this._gridEvent.removeEvent(this._dragEventFor['end']);
  }
}
