import {
  Directive,
  Renderer,
  ElementRef,
  EventEmitter,
  Input,
  Output,
  OnChanges,
  OnDestroy
} from '@angular/core';

import { GridEventService } from '../grid-event.service';

import {
  IResizable,
  IResizeState
} from './resizable.interfaces';

import { IControlPosition } from '../grid-loyout.interfaces';

@Directive({
  selector: '[resizable]'
})

export class ResizableDirective implements OnChanges, OnDestroy {
  @Input() resizable:IResizable;

  @Output() onResize:EventEmitter<any> = new EventEmitter<any>();
  @Output() onResizeStart:EventEmitter<any> = new EventEmitter<any>();
  @Output() onResizeStop:EventEmitter<any> = new EventEmitter<any>();

  private _resizeState:IResizeState;
  private _handleElement:HTMLElement;
  private _dragEventFor: string;

  constructor(
    private _renderer: Renderer,
    private _element:ElementRef,
    private _gridEvent:GridEventService
  ) {
    this._dragEventFor = _gridEvent.dragEventFor;
  }

  ngOnChanges() {

    this.resizable = Object.assign({
      handleSize: [20, 20],
      aspectRatio: false,
      minConstraints: [20, 20],
      maxConstraints: [Infinity, Infinity]
    }, this.resizable);

    if (this.resizable.handle == null) {
      throw new Error('Resizable block must have a handler attribute!');
    }

    /* search resize handler element */
    this._handleElement = this._element.nativeElement.querySelector(this.resizable.handle);

    if (this._handleElement == null) {
      throw new Error('Resizable block must have a handler HTML Element!');
    }

    /* add event listener to resize handler */
    this._renderer.listen(this._handleElement, this._dragEventFor['start'], this.handleResizeStart.bind(this));

    this.getInitialState();

    // Set new style and merge width current style
    this.setStyle(this._resizeState.width, this._resizeState.height);
  }

  ngOnDestroy() {
    // Remove event handlers
    this._gridEvent.removeEvent(this._dragEventFor['move']);
    this._gridEvent.removeEvent(this._dragEventFor['end']);
  }

  setStyle(width: number, height: number) {
    this._element.nativeElement.style.width = width + 'px';
    this._element.nativeElement.style.height = height + 'px';
  }

  getInitialState() {
    let width:number = this.resizable.width;
    let height:number = this.resizable.height;

    this._resizeState = <IResizeState>{
      resizing: false,
      lastX: 0, lastY: 0,
      width: width, height: height,
      slackW: 0, slackH: 0
    };
  }

  runConstraints(width:number, height:number):[number, number] {
    const [min, max] = [this.resizable.minConstraints, this.resizable.maxConstraints];

    if (this.resizable.aspectRatio) {
      const ratio = this._resizeState.width / this._resizeState.height;
      height = width / ratio;
      width = height * ratio;
    }

    if (!min && !max) return [width, height];

    const [oldW, oldH] = [width, height];

    // Add slack to the values used to calculate bound position. This will ensure that if
    // we start removing slack, the element won't react to it right away until it's been
    // completely removed.
    let {slackW, slackH} = this._resizeState;
    width += slackW;
    height += slackH;

    if (min) {
      width = Math.max(min[0], width);
      height = Math.max(min[1], height);
    }
    if (max) {
      width = Math.min(max[0], width);
      height = Math.min(max[1], height);
    }

    // If the numbers changed, we must have introduced some slack. Record it for the next iteration.
    slackW += (oldW - width);
    slackH += (oldH - height);
    if (slackW !== this._resizeState.slackW || slackH !== this._resizeState.slackH) {
      this._resizeState.slackW = slackW;
      this._resizeState.slackH = slackH;
    }

    return [width, height];
  }

  handleResizeStart(e) {
    this.resizeHandler(e, 'onResizeStart');

    // Add a class to the body to disable user-select. This prevents text from
    // being selected all over the page.
    document.body.classList.add('resizable-active');

    this._gridEvent.addEvent(this._renderer, this._dragEventFor['move'], this.handleResizeMove.bind(this));
    this._gridEvent.addEvent(this._renderer, this._dragEventFor['end'], this.handleResizeEnd.bind(this));
  }

  handleResizeMove(e) {
    this.resizeHandler(e, 'onResize');
  }

  handleResizeEnd(e) {
    this.resizeHandler(e, 'onResizeStop');

    // Remove the body class used to disable user-select.
    document.body.classList.remove('resizable-active');

    this._gridEvent.removeEvent(this._dragEventFor['move']);
    this._gridEvent.removeEvent(this._dragEventFor['end']);
  }

  resizeHandler(e, handlerName:string) {
    // Get the current drag point from the event. This is used as the offset.
    const position:IControlPosition = this._gridEvent.getControlPosition(e);
    if (position == null) return; // not possible but satisfies flow

    let deltaX = position.clientX - this._resizeState.lastX, deltaY = position.clientY - this._resizeState.lastY;

    let width = this._resizeState.width + deltaX;
    let height = this._resizeState.height + deltaY;

    // Early return if no change
    const widthChanged = width !== this._resizeState.width, heightChanged = height !== this._resizeState.height;
    if (handlerName === 'onResize' && !widthChanged && !heightChanged) return;

    [width, height] = this.runConstraints(width, height);

    if (handlerName === 'onResizeStart') {
      // Initiate dragging. Set the current x and y as offsets
      // so we know how much we've moved during the drag. This allows us
      // to drag elements around even if they have been moved, without issue.
      this._resizeState.resizing = true;
      this._resizeState.lastX = position.clientX;
      this._resizeState.lastY = position.clientY;

    } else if (handlerName === 'onResizeStop') {
      this._resizeState.resizing = true;
      this._resizeState.width = width;
      this._resizeState.height = height;

    } else {
      // Early return if no change after constraints
      if (width === this._resizeState.width && height === this._resizeState.height) return;

      // Set new style and merge width current style
      this.setStyle(width, height);
    }

    this[handlerName].emit({
      node: this._element.nativeElement,
      x: position.clientX, y: position.clientY,
      deltaX: deltaX, deltaY: deltaY
    });
  }
}
