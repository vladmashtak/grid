import {
    Component,
    Input,
    OnInit,
    OnDestroy,
    Renderer,
    ElementRef,
    ViewEncapsulation
} from '@angular/core';

import { GridUtilesService } from './grid-utiles.service';
import { GridLayoutService } from './grid-layout.service';
import { GridEventService } from './grid-event.service';

import {
    ILayoutItemRequired,
    ILayoutItem,
    IGridLayout,
    IGridLayoutState
} from './grid-layout.interfaces';

@Component({
    selector: 'grid-layout',
    templateUrl: './grid-layout.component.html',
    styleUrls: ['./grid-layout.component.scss'],
    encapsulation: ViewEncapsulation.None,
    host: {
        '[style.height]': 'newHeight'
    }
})

export class GridLayoutComponent implements OnInit, OnDestroy {
    public showPlaceholder:boolean = false;
    public placeholder:any;
    public newHeight:string;

    private _subscribe:any;

    constructor(private _layout:GridLayoutService,
                private _renderer:Renderer,
                private _gridEvent:GridEventService,
                private _element:ElementRef) {
        /** Minus scrollbar width if desktop*/
        let screenWidth = this._gridEvent.touch === true ? screen.width : screen.width - 17;

        /** Set container width */
        this._layout.grid.containerWidth = screenWidth;
        this._renderer.setElementStyle(this._element.nativeElement, 'width', screenWidth + 'px');

        /** Calc col width and height */
        const tileSize:number = this._layout.calcColWidth();

        Object.assign(this._layout.grid, {
            colWidth: tileSize,
            rowHeight: tileSize
        });
    }

    ngOnInit() {
        this._subscribe = this._layout.getLayoutEmitter()
            .subscribe(newState => {

                /* apply new container height */
                if (newState.containerHeight) this.newHeight = newState.containerHeight;

                if (newState.placeholderStyle !== null) {
                    this.showPlaceholder = true;
                    this.placeholder = newState.placeholderStyle;
                    return;
                }

                this.showPlaceholder = false;
            });
    }

    ngOnDestroy() {
        this._subscribe.unsubscribe();
        localStorage.setItem('layout', JSON.stringify(this._layout.grid.layout));
    }
}
