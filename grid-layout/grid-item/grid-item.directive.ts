import {
  Directive,
  Input,
  Output,
  EventEmitter,
  Renderer,
  ElementRef,
  OnChanges,
  OnDestroy,
  ContentChild,
  AfterContentInit
} from '@angular/core';

import { GridEventService } from '../grid-event.service';
import { GridUtilesService} from '../grid-utiles.service';
import { GridLayoutService } from '../grid-layout.service';

import {
  IPosition,
  ILayoutItemRequired,
  ILayoutItem,
} from '../grid-layout.interfaces';

import {
  IDragState,
  IResizeState,
  IGridItemState,
  IFrameSizeItem
} from './grid-item.interfaces';

@Directive({
  selector: '[gridItem]'
})

export class GridItemDirective implements OnChanges, OnDestroy {
  @Input() gridItem:ILayoutItem;
  @ContentChild('dragHandler') dragHandler: ElementRef;
  @ContentChild('resizeHandler') resizeHandler: ElementRef;

  @Output() dragStart:EventEmitter<any> = new EventEmitter<any>();
  @Output() dragMove:EventEmitter<any> = new EventEmitter<any>();
  @Output() dragStop:EventEmitter<any> = new EventEmitter<any>();

  @Output() resizeMove:EventEmitter<any> = new EventEmitter<any>();
  @Output() resizeStart:EventEmitter<any> = new EventEmitter<any>();
  @Output() resizeStop:EventEmitter<any> = new EventEmitter<any>();

  private _state:IGridItemState;

  private _dragEventFor:string;
  private _subscribe: any;

  constructor(private _element:ElementRef,
              private _renderer:Renderer,
              private _gridEvent:GridEventService,
              private _layout:GridLayoutService,
              private _utiles:GridUtilesService) {
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
      },
      frame: <IFrameSizeItem>{
        minConstraints: [],
        maxConstraints: []
      }
    };
    /**
     * Determinate mouse or touch event
     * */
    this._dragEventFor = _gridEvent.dragEventFor;

    /* subscription on changes grid layout*/
    this._subscribe = this._layout.getLayoutEmitter()
      .subscribe(item => {
        /**
         * Check if this.gridItem, because the life cycle:
         * constructor()
         * ngOnChanges()
         * ...
         * at the time of execution getLayoutEmitter()
         * this.gridItem does not exist
         * */
        if(this.gridItem && item.layout[this.gridItem.id])
          Object.assign(this.gridItem, item.layout[this.gridItem.id]);
      });
  }

  ngOnChanges() {
    const {id, i, x, y, w, h} = this.gridItem;
    const pos = this.calcPosition(x, y, w, h);

    /* Add single item grid config to store grid*/
    this._layout.emitLayoutElement(id, i, w, h, x, y);

    /* set initial size item state */
    Object.assign(this._state.resize, {
      width: pos.width,
      height: pos.height
    });

    /* set custom props */
    Object.assign(this.gridItem, {
      minH: 4, minW: 4,
      maxH: Infinity, maxW: Infinity,
      moved: false
    });

    /*set initial style for layout item*/
    this.createStyle(pos);
  }

  ngAfterContentInit() {
    /* check handlers element */
    if (this.dragHandler === undefined || this.resizeHandler === undefined) {
      throw new Error('Block must have a resize handler HTML Element and drag HTML Element!');
    }

    /* add event listeners*/
    this._renderer.listen(this.resizeHandler.nativeElement, this._dragEventFor['start'], this.onResizeStart.bind(this));
    this._renderer.listen(this.dragHandler.nativeElement, this._dragEventFor['start'], this.onDragStart.bind(this));
  }

  ngOnDestroy() {
    this._subscribe.unsubscribe();
    // Remove event handlers
    this._gridEvent.removeEvent(this._dragEventFor['move']);
    this._gridEvent.removeEvent(this._dragEventFor['end']);
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

  positionPlaceholder(x:number, y:number, w:number, h:number) {
    const pos = this.calcPosition(x, y, w, h);
    const style = this.createStyle(pos, false);

    this._layout.addActiveElement(style);
  }

  createStyle(pos:IPosition, asset:boolean = true) {
    const {useCSSTransforms} = this._layout.grid;

    let style;
    // CSS Transforms support (default)
    if (useCSSTransforms) {
      style = this._utiles.setTransform(pos);
    }
    // top,left (slow)
    else {
      style = this._utiles.setTopLeft(pos);
    }

    if (!asset) return style;

    Object.assign(this._element.nativeElement.style, style);
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

  calcWH(width:number, height:number):{w: number, h: number} {
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

  onDragStart(e:MouseEvent) {
    const { id, w, h, x, y } = this.gridItem;
    // Add a class to the body to disable user-select. This prevents text from
    // being selected all over the page.
    document.body.classList.add('draggable-active');
    this._element.nativeElement.classList.add('grid-item-active');

    const parentRect = this._element.nativeElement.offsetParent.getBoundingClientRect();
    const clientRect = this._element.nativeElement.getBoundingClientRect();

    Object.assign(this._state.drag, {
      dragging: true,
      offsetX: e.clientX,
      offsetY: e.clientY,
      startX: clientRect.left - parentRect.left,
      startY: clientRect.top - parentRect.top
    });

    this.positionPlaceholder(x, y, w, h);
    this._layout.onDragStart(id);
    this._gridEvent.addEvent(this._renderer, this._dragEventFor['move'], this.onDragMove.bind(this));
    this._gridEvent.addEvent(this._renderer, this._dragEventFor['end'], this.onDragEnd.bind(this));
  }

  onDragMove(e:MouseEvent) {
    const { id, i, w, h, x, y } = this.gridItem;
    const { offsetX, offsetY, startX, startY} = this._state.drag;

    this._state.drag.clientX = startX + (e.clientX - offsetX);
    this._state.drag.clientY = startY + (e.clientY - offsetY);

    const newXY = this.calcXY(this._state.drag.clientY, this._state.drag.clientX);
    /* set style for layout item after dragging */
    const pos:IPosition = this.calcPosition(newXY.x, newXY.y, w, h, this._state);
    this.createStyle(pos);

    if (x !== newXY.x || y !== newXY.y) {
      /* Add single item grid config to store grid*/
      this._layout.onDrag(id, newXY.x, newXY.y);
      // this._layout.emitLayoutElement(id, i, w, h, newXY.x, newXY.y);
      this.positionPlaceholder(newXY.x, newXY.y, w, h);
    }
  }

  onDragEnd() {
    const { w, h, x, y  } = this.gridItem;

    // Remove the body class used to disable user-select.
    document.body.classList.remove('draggable-active');
    this._element.nativeElement.classList.remove('grid-item-active');

    this._state.drag.dragging = false;

    const pos:IPosition = this.calcPosition(x, y, w, h, this._state);
    this.createStyle(pos);

    this._layout.removeActiveElement();

    this._gridEvent.removeEvent(this._dragEventFor['move']);
    this._gridEvent.removeEvent(this._dragEventFor['end']);
  }

  onResizeStart(e:MouseEvent) {
    const { cols } = this._layout.grid;
    const { w, h, x, y, minH, minW, maxH, maxW } = this.gridItem;
    const { width, height } = this._state.resize;

    // This is the max possible width - doesn't go to infinity because of the width of the window
    const maxWidth = this.calcPosition(0, 0, cols - x, 0).width;

    // Calculate min/max constraints using our min & maxes
    const mins = this.calcPosition(0, 0, minW, minH);
    const maxes = this.calcPosition(0, 0, maxW, maxH);

    this._state.frame.minConstraints = [mins.width, mins.height];
    this._state.frame.maxConstraints = [Math.min(maxes.width, maxWidth), Math.min(maxes.height, Infinity)];

    // Add a class to the body to disable user-select. This prevents text from
    // being selected all over the page.
    document.body.classList.add('resizable-active');
    this._element.nativeElement.classList.add('grid-item-active');

    Object.assign(this._state.resize, {
      resizing: true,
      offsetW: e.clientX,
      offsetH: e.clientY,
      lastX: width,
      lastY: height
    });

    this.positionPlaceholder(x, y, w, h);

    this._gridEvent.addEvent(this._renderer, this._dragEventFor['move'], this.onResizeMove.bind(this));
    this._gridEvent.addEvent(this._renderer, this._dragEventFor['end'], this.onResizeEnd.bind(this));
  }

  onResizeMove(e:MouseEvent) {
    const { cols } = this._layout.grid;
    const { id, i, w, h, x, y, minH, minW, maxH, maxW } = this.gridItem;
    const { minConstraints, maxConstraints } = this._state.frame;
    const { lastX, lastY, offsetW, offsetH } = this._state.resize;

    /* lastX + delta(e.clientX - offsetW) */
    let currentWidth = lastX + (e.clientX - offsetW);
    let currentHeight = lastY + (e.clientY - offsetH);

    /* check max item frame size  */
    currentWidth = Math.max(minConstraints[0], currentWidth);
    currentHeight = Math.max(minConstraints[1], currentHeight);
    /* check min item frame size  */
    currentWidth = Math.min(maxConstraints[0], currentWidth);
    currentHeight = Math.min(maxConstraints[1], currentHeight);

    /* save current width and height in local state*/
    Object.assign(this._state.resize, {
      resizing: true,
      width: currentWidth,
      height: currentHeight
    });

    // Get new XY
    let newWH = this.calcWH(currentWidth, currentHeight);

    /* Check point*/
    newWH.w = Math.min(newWH.w, cols - x);
    newWH.w = Math.max(newWH.w, 1);
    newWH.w = Math.max(Math.min(newWH.w, maxW), minW);
    newWH.h = Math.max(Math.min(newWH.h, maxH), minH);

    /* size for layout item after resizing */
    const pos = this.calcPosition(x, y, newWH.w, newWH.h, this._state);
    /* set style */
    this.createStyle(pos);

    if (w !== newWH.w || h !== newWH.h) {
      /* Add single item grid config to store grid*/
      this._layout.emitLayoutElement(id, i, newWH.w, newWH.h, x, y);
      this.positionPlaceholder(x, y, newWH.w, newWH.h);
    }
  }

  onResizeEnd() {
    const { w, h, x, y } = this.gridItem;

    // Remove the body class used to disable user-select.
    document.body.classList.remove('resizable-active');
    this._element.nativeElement.classList.remove('grid-item-active');

    this._state.resize.resizing = false;

    const pos:IPosition = this.calcPosition(x, y, w, h, this._state);

    Object.assign(this._state.resize, {
      width: pos.width,
      height: pos.height
    });

    this.createStyle(pos);

    this._layout.removeActiveElement();

    this._gridEvent.removeEvent(this._dragEventFor['move']);
    this._gridEvent.removeEvent(this._dragEventFor['end']);
  }
}
