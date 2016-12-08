import {
    Injectable,
    Renderer
} from '@angular/core';

import { IControlPosition } from './grid-layout.interfaces';

@Injectable()
export class GridEventService {
    public dragEventFor:string;
    public touch:boolean;

    constructor() {
        let isTouchDevice:boolean = false;

        if (typeof window !== 'undefined') {
            // Do Browser Stuff
            isTouchDevice = 'ontouchstart' in window || // works on most browsers
                'onmsgesturechange' in window; // works on ie10 on ms surface
        }

        this.touch = isTouchDevice;

        this.dragEventFor = (function () {
            let eventsFor = {
                touch: {
                    start: 'touchstart',
                    move: 'touchmove',
                    end: 'touchend'
                },
                mouse: {
                    start: 'mousedown',
                    move: 'mousemove',
                    end: 'mouseup'
                }
            };
            return eventsFor[isTouchDevice ? 'touch' : 'mouse'];
        })();
    }

    addEvent(render:Renderer, event:string, handler:Function):void {
        /*add event listeners for _mousemove or _mouseup*/
        this[event] = render.listenGlobal('document', event, handler);
    }

    removeEvent(event:string):void {
        /*remove event listeners _mousemove or _mouseup*/
        if (this[event]) this[event]();
    }

}
