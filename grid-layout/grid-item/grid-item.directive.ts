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
    @ContentChild('dragHandler') dragHandler:ElementRef;
    @ContentChild('resizeHandler') resizeHandler:ElementRef;

    @Output() resizeStop:EventEmitter<any> = new EventEmitter<any>();
    @Output() initializationItem:EventEmitter<any> = new EventEmitter<any>();

    private _state:IGridItemState;
    private _dragEventFor:string;
    private _subscribe:any;

    constructor(private _element:ElementRef,
                private _renderer:Renderer,
                private _gridEvent:GridEventService,
                private _layout:GridLayoutService) {
        this._state = <IGridItemState>{
            drag: <IDragState>{
                startX: 0, startY: 0,
                offsetX: 0, offsetY: 0,
                clientX: 0, clientY: 0
            },
            resize: <IResizeState>{
                lastX: null, lastY: null,
                width: null, height: null,
                offsetW: 0, offsetH: 0
            },
            frame: <IFrameSizeItem>{
                minConstraints: [],
                maxConstraints: []
            },
            isExpanded: false
        };
        /** Determinate mouse or touch event */
        this._dragEventFor = _gridEvent.dragEventFor;

        /** Subscription on changes grid layout*/
        this._subscribe = _layout.getLayoutEmitter()
            .subscribe(item => {
                /**
                 * Check if this.gridItem, because the life cycle:
                 * constructor()
                 * ngOnChanges()
                 * ...
                 * at the time of execution getLayoutEmitter()
                 * this.gridItem does not exist
                 * */
                if (this.gridItem && item.layout[this.gridItem.id]) {
                    Object.assign(this.gridItem, item.layout[this.gridItem.id]);

                    const { id, w, h, x, y } = this.gridItem;
                    if (item.activeDrag !== null && id !== item.activeDrag) {
                        const pos:IPosition = this._layout.calcPosition(x, y, w, h);
                        /** Set initial style for layout item */
                        let style:any = this._layout.createStyle(pos);
                        /* TODO проверить может есть какой то метод лучше для приминения стиля к директиве*/
                        Object.assign(this._element.nativeElement.style, style);
                    }
                }
            });
    }

    ngOnChanges() {
        const {id, x, y, w, h} = this.gridItem;
        const pos:IPosition = this._layout.calcPosition(x, y, w, h);

        /** Add single item grid config to store grid*/
        this._layout.emitLayoutElement(id, w, h, x, y);

        /** Set initial size item state */
        Object.assign(this._state.resize, {
            width: pos.width,
            height: pos.height
        });

        /** Emit initial size */
        this.initializationItem.emit({width: pos.width, height: pos.height});

        /** Set initial style for layout item */
        let style:any = this._layout.createStyle(pos);
        /* TODO проверить может есть какой то метод лучше для приминения стиля к директиве*/
        Object.assign(this._element.nativeElement.style, style);
    }

    ngAfterContentInit() {
        /** Check handlers element */
        if (this.dragHandler === undefined || this.resizeHandler === undefined) {
            throw new Error('Block must have a resize handler HTML Element and drag HTML Element!');
        }

        /** Add event listeners*/
        this._renderer.listen(this.resizeHandler.nativeElement, this._dragEventFor['start'], this.onResizeStart.bind(this));
        this._renderer.listen(this.dragHandler.nativeElement, this._dragEventFor['start'], this.onDragStart.bind(this));
    }

    ngOnDestroy() {
        this._subscribe.unsubscribe();
        /** Remove event handlers */
        this._gridEvent.removeEvent(this._dragEventFor['move']);
        this._gridEvent.removeEvent(this._dragEventFor['end']);
    }

    calcXY(top:number, left:number):{x: number, y: number} {
        const {margin, cols, rowHeight, maxRows, colWidth} = this._layout.grid;
        const {w, h} = this.gridItem;

        let x = Math.round((left - margin[0]) / (colWidth + margin[0]));
        let y = Math.round((top - margin[1]) / (rowHeight + margin[1]));

        /** Capping */
        x = Math.max(Math.min(x, cols - w), 0);
        y = Math.max(Math.min(y, maxRows - h), 0);

        return {x, y};
    }

    calcWH(width:number, height:number):{w: number, h: number} {
        const {margin, maxRows, cols, rowHeight, colWidth} = this._layout.grid;
        const {x, y} = this.gridItem;

        /**
         *  width = colWidth * w - (margin * (w - 1))
         * ...
         * w = (width + margin) / (colWidth + margin)
         */
        let w = Math.round((width + margin[0]) / (colWidth + margin[0]));
        let h = Math.round((height + margin[1]) / (rowHeight + margin[1]));

        /** Capping */
        w = Math.max(Math.min(w, cols - x), 0);
        h = Math.max(Math.min(h, maxRows - y), 0);
        return {w, h};
    }

    onDragStart(event:any) {
        /** Check Touch Screen*/
        const e = (this._gridEvent.touch === true) ? event.targetTouches[0] : event;

        /** fast return if click not left button */
        if (this._gridEvent.touch === false && e.button !== 0) return;

        /**
         * Add a class to the body to disable user-select. This prevents text from
         * being selected all over the page.
         */
        document.body.classList.add('draggable-active');
        this._element.nativeElement.classList.add('grid-item-active');

        const parentRect = this._element.nativeElement.offsetParent.getBoundingClientRect();
        const clientRect = this._element.nativeElement.getBoundingClientRect();

        Object.assign(this._state.drag, {
            offsetX: e.clientX,
            offsetY: e.clientY,
            startX: clientRect.left - parentRect.left,
            startY: clientRect.top - parentRect.top
        });

        /** Attach event on 'document' html element */
        this._gridEvent.addEvent(this._renderer, this._dragEventFor['move'], this.onDragMove.bind(this));
        this._gridEvent.addEvent(this._renderer, this._dragEventFor['end'], this.onDragEnd.bind(this));
    }

    onDragMove(event:any) {
        /** Check Touch Screen*/
        const e = (this._gridEvent.touch === true) ? event.targetTouches[0] : event;

        const { id, x, y } = this.gridItem;
        const { offsetX, offsetY, startX, startY} = this._state.drag;
        const { width, height } = this._state.resize;

        this._state.drag.clientX = startX + (e.clientX - offsetX);
        this._state.drag.clientY = startY + (e.clientY - offsetY);

        /** Set style for layout item after dragging */
        let style:any = this._layout.createStyle(<IPosition>{
            left: Math.round(this._state.drag.clientX),
            top: Math.round(this._state.drag.clientY),
            width: width,
            height: height
        });

        if (!this._state.isExpanded) {
            style.height = '50px';
        }

        /* TODO проверить может есть какой то метод лучше для приминения стиля к директиве*/
        Object.assign(this._element.nativeElement.style, style);

        const newXY = this.calcXY(this._state.drag.clientY, this._state.drag.clientX);

        if (x !== newXY.x || y !== newXY.y) {
            /** Recalculate grid layour when x/h unit point changed*/
            this._layout.onDrag(id, newXY.x, newXY.y);
        }

        event.preventDefault();
    }

    onDragEnd() {
        const { id, w, h, x, y  } = this.gridItem;

        /** Remove the body class used to disable user-select. */
        document.body.classList.remove('draggable-active');
        this._element.nativeElement.classList.remove('grid-item-active');

        /** get current item position and set style */
        const pos:IPosition = this._layout.calcPosition(x, y, w, h);
        let style:any = this._layout.createStyle(pos);

        if (!this._state.isExpanded) {
            style.height = '50px';
        }

        /* TODO проверить может есть какой то метод лучше для приминения стиля к директиве*/
        Object.assign(this._element.nativeElement.style, style);

        /** Recalculate and save grid state in grid stare after dragging*/
        this._layout.onDragStop(id, x, y);

        /** Remove event from 'document' html element */
        this._gridEvent.removeEvent(this._dragEventFor['move']);
        this._gridEvent.removeEvent(this._dragEventFor['end']);
    }

    onResizeStart(event:any) {
        /** Check Touch Screen*/
        const e = (this._gridEvent.touch === true) ? event.targetTouches[0] : event;

        /** fast return if click not left button */
        if (this._gridEvent.touch === false && e.button !== 0) return;

        const { cols } = this._layout.grid;
        const { x, minH, minW, maxH, maxW } = this.gridItem;
        const { width, height } = this._state.resize;

        /** This is the max possible width - doesn't go to infinity because of the width of the window */
        const maxWidth = this._layout.calcPosition(0, 0, cols - x, 0).width;

        /** Calculate min/max constraints using our min & maxes */
        const mins = this._layout.calcPosition(0, 0, minW, minH);
        const maxes = this._layout.calcPosition(0, 0, maxW, maxH);

        this._state.frame.minConstraints = [mins.width, mins.height];
        this._state.frame.maxConstraints = [Math.min(maxes.width, maxWidth), Math.min(maxes.height, Infinity)];

        /**
         * Add a class to the body to disable user-select. This prevents text from
         * being selected all over the page.
         */
        document.body.classList.add('resizable-active');
        this._element.nativeElement.classList.add('grid-item-active');

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

    onResizeMove(event:any) {
        /** Check Touch Screen*/
        const e = (this._gridEvent.touch === true) ? event.targetTouches[0] : event;

        const { cols, colWidth, rowHeight, margin, containerPadding } = this._layout.grid;
        const { id, w, h, x, y, minH, minW, maxH, maxW } = this.gridItem;
        const { minConstraints, maxConstraints } = this._state.frame;
        const { lastX, lastY, offsetW, offsetH } = this._state.resize;

        /** lastX + delta(e.clientX - offsetW) */
        let currentWidth = lastX + (e.clientX - offsetW);
        let currentHeight = lastY + (e.clientY - offsetH);

        /** check max item frame size  */
        currentWidth = Math.max(minConstraints[0], currentWidth);
        currentHeight = Math.max(minConstraints[1], currentHeight);
        /** check min item frame size  */
        currentWidth = Math.min(maxConstraints[0], currentWidth);
        currentHeight = Math.min(maxConstraints[1], currentHeight);

        /** save current width and height in local state*/
        Object.assign(this._state.resize, {
            width: currentWidth,
            height: currentHeight
        });

        /** set style */
        let style:any = this._layout.createStyle(<IPosition>{
            left: Math.round((colWidth + margin[0]) * x + containerPadding[0]),
            top: Math.round((rowHeight + margin[1]) * y + containerPadding[1]),
            width: Math.round(this._state.resize.width),
            height: Math.round(this._state.resize.height)
        });

        /* TODO проверить может есть какой то метод лучше для приминения стиля к директиве*/
        Object.assign(this._element.nativeElement.style, style);

        /** Get new XY */
        let newWH = this.calcWH(currentWidth, currentHeight);

        if (w !== newWH.w || h !== newWH.h) {
            /** Check current position in grid units*/
            newWH.w = Math.min(newWH.w, cols - x);
            newWH.w = Math.max(newWH.w, 1);
            newWH.w = Math.max(Math.min(newWH.w, maxW), minW);
            newWH.h = Math.max(Math.min(newWH.h, maxH), minH);
            /** Recalculate grid layout, when w/h unit size changed */
            this._layout.onResize(id, newWH.w, newWH.h);
        }

        event.preventDefault();
    }

    onResizeEnd() {
        const { w, h, x, y } = this.gridItem;

        /** Remove the body class used to disable user-select. */
        document.body.classList.remove('resizable-active');
        this._element.nativeElement.classList.remove('grid-item-active');

        const pos:IPosition = this._layout.calcPosition(x, y, w, h);
        /** save width and height after size change */
        Object.assign(this._state.resize, {
            width: pos.width,
            height: pos.height
        });
        /** set style */
        let style:any = this._layout.createStyle(pos);
        /* TODO проверить может есть какой то метод лучше для приминения стиля к директиве*/
        Object.assign(this._element.nativeElement.style, style);

        /** recalculate layout after stop resize */
        this._layout.onResizeStop();
        /** Emit event */
        this.resizeStop.emit({width: pos.width, height: pos.height});
        /** Remove event from 'document' html element */
        this._gridEvent.removeEvent(this._dragEventFor['move']);
        this._gridEvent.removeEvent(this._dragEventFor['end']);
    }

    onExpand() {

    }
}
