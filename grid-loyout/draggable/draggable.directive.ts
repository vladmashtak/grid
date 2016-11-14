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

import {
  IDraggable,
  IDragState,
  IDraggableData
} from './draggable.interfaces';

import { IControlPosition } from '../grid-loyout.interfaces';

@Directive({
  selector: '[draggable]',
  host: {
    '(mousedown)': 'handleDragStart($event)',
    '(touchstart)': 'handleTouchStart($event)',
    '(mouseup)': 'handleDragEnd($event)',
    '(touchend)': 'handleDragEnd($event)'
  }
})
export class DraggableDirective implements OnInit, OnChanges, OnDestroy {
  @Input() draggable:IDraggable;
  /**
   * Called when dragging starts.
   *
   * Example:
   *       (onStart)="eventHandle(dragItem)"
   */
  @Output() onStart:EventEmitter<IDragState> = new EventEmitter<IDragState>();
  /**
   * Called while dragging.
   *
   * Example:
   *      (onDrag)="eventHandle(dragItem)">
   */
  @Output() onDrag:EventEmitter<IDragState> = new EventEmitter<IDragState>();
  /**
   * Called when dragging stops.
   *
   * Example:
   *     (onStop)="eventHandle(dragItem)"
   */
  @Output() onStop:EventEmitter<IDragState> = new EventEmitter<IDragState>();

  private _dragEventFor:string;
  private _dragState:IDragState;
  // private _dragPointControl: IControlPosition;

  constructor(
    private _element:ElementRef,
    private _renderer:Renderer,
    private _gridEvent:GridEventService,
    private _utiles:GridUtilesService
  ) {
    this._dragEventFor = _gridEvent.dragEventFor;
  }

  ngOnInit() {
    this._element.nativeElement.classList.add('draggable' + (this._dragState.dragging ? ' draggable-dragging' : ''));
  }

  ngOnChanges() {

    this.draggable = Object.assign({
      allowAnyClick: false,
      disabled: false,
      start: {x: 0, y: 0},
      axis: 'both',
      handle: null,
      cancel: null,
      grid: null,
      moveOnStartChange: false,
      useCSSTransforms: false,
      zIndex: NaN,
    }, this.draggable);

    this.setInitialState();
    this.setStyle();
  }

  ngOnDestroy() {
    // Remove event handlers
    this._gridEvent.removeEvent(this._dragEventFor['move']);
    this._gridEvent.removeEvent(this._dragEventFor['end']);
  }

  setStyle():void {
    let inlineStyles:string;
    let style:any = {
      // Set top if vertical drag is enabled
      top: this.canDragY(this)
        ? this._dragState.clientY
        : this._dragState.startY,

      // Set left if horizontal drag is enabled
      left: this.canDragX(this)
        ? this._dragState.clientX
        : this._dragState.startX
    };

    // inlineStyles = `top: ${style.top}px; left: ${style.left}px;`;

    if (this.draggable.useCSSTransforms) {
      style = this._utiles.positionToCSSTransform(style);
    }

    // Set zIndex if currently dragging and prop has been provided
    if (this._dragState.dragging && !isNaN(this.draggable.zIndex)) {
      style.zIndex = this.draggable.zIndex;
    }

    Object.assign(this._element.nativeElement.style, style);
  }

  setInitialState() {
    let startX:number = this.draggable.start.x;
    let startY:number = this.draggable.start.y;

    this._dragState = <IDragState>{
      // Whether or not currently dragging
      dragging: false,

      // Start top/left
      startX: 0, startY: 0,

      // Offset between start top/left and mouse top/left
      offsetX: 0, offsetY: 0,

      // Current top/left of
      clientX: startX, clientY: startY
    };

  }

  handleDragStart(e) {

    if (!this.draggable.allowAnyClick && typeof e.button === 'number' && e.button !== 0) return false;

    // Short circuit if handle or cancel prop was provided and selector doesn't match
    if (this.draggable.disabled ||
      (this.draggable.handle && !this._utiles.matchesSelector(e.target, this.draggable.handle)) ||
      (this.draggable.cancel && this._utiles.matchesSelector(e.target, this.draggable.cancel))) return;

    let dragPoint:IControlPosition = this._gridEvent.getControlPosition(e);

    // Initiate dragging
    this._dragState.dragging = true;
    this._dragState.offsetX = dragPoint.clientX;
    this._dragState.offsetY = dragPoint.clientY;
    this._dragState.startX = this._dragState.clientX || 0;
    this._dragState.startY = this._dragState.clientY || 0;

    // Add a class to the body to disable user-select. This prevents text from
    // being selected all over the page.
    document.body.classList.add('draggable-active');

    // Call event handler
    this.onStart.emit(this._dragState);

    // Add event handlers
    this._gridEvent.addEvent(this._renderer, this._dragEventFor['move'], this.handleDrag.bind(this));
    this._gridEvent.addEvent(this._renderer, this._dragEventFor['end'], this.handleDragEnd.bind(this));
  }

  handleTouchStart(e) {
    e.preventDefault(); // prevent for scroll
    this.handleDragStart.apply(this, arguments);
  }

  handleDragEnd():void {
    // Short circuit if not currently dragging
    if (!this._dragState.dragging) return;
    // Turn off dragging
    this._dragState.dragging = false;

    // Remove the body class used to disable user-select.
    document.body.classList.remove('draggable-active');

    // Call event handler
    this.onStop.emit(this._dragState);

    // Remove event handlers
    this._gridEvent.removeEvent(this._dragEventFor['move']);
    this._gridEvent.removeEvent(this._dragEventFor['end']);
  }

  handleDrag(e):void {
    let dragPoint:IControlPosition = this._gridEvent.getControlPosition(e);

    // Calculate top and left
    let deltaX = dragPoint.clientX - this._dragState.offsetX;
    let deltaY = dragPoint.clientY - this._dragState.offsetY;

    let clientX = this._dragState.startX + deltaX;
    let clientY = this._dragState.startY + deltaY;

    // Snap to grid if prop has been provided
    if (Array.isArray(this.draggable.grid)) {
      let directionX = clientX < this._dragState.clientX ? -1 : 1;
      let directionY = clientY < this._dragState.clientY ? -1 : 1;

      clientX = Math.abs(clientX - this._dragState.clientX) >= this.draggable.grid[0]
        ? (this._dragState.clientX + (this.draggable.grid[0] * directionX))
        : this._dragState.clientX;

      clientY = Math.abs(clientY - this._dragState.clientY) >= this.draggable.grid[1]
        ? (this._dragState.clientY + (this.draggable.grid[1] * directionY))
        : this._dragState.clientY;
    }

    // Update top and left
    this._dragState.clientX = clientX;
    this._dragState.clientY = clientY;

    // Call event handler
    this.onDrag.emit(this._dragState);

    this.setStyle()
  }

  canDragY(draggable:DraggableDirective):boolean {
    return draggable.draggable.axis === 'both' ||
      draggable.draggable.axis === 'y';
  }

  canDragX(draggable:DraggableDirective):boolean {
    return draggable.draggable.axis === 'both' ||
      draggable.draggable.axis === 'x';
  }

}
