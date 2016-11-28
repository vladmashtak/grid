import {
  Component,
  Input,
  Output,
  EventEmitter,
  ElementRef,
  Renderer,
  OnInit,
  OnDestroy,
  ViewEncapsulation
} from '@angular/core';

import { GridUtilesService } from './grid-utiles.service';
import { GridLayoutService } from './grid-layout.service';

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
    '[style.height]': 'newHeight',
    '[style.width]': '"1400px"'
  }
})

export class GridLayoutComponent implements OnInit, OnDestroy {
  public showPlaceholder: boolean = false;
  public placeholder: any;
  public newHeight: string;

  private _subscribe: any;

  constructor(
    private _layout: GridLayoutService) {}

  ngOnInit() {
    this._subscribe = this._layout.getLayoutEmitter()
      .subscribe(newState => {

        /* apply new container height */
        if(newState.containerHeight) this.newHeight = newState.containerHeight;

        if(newState.placeholderStyle !== null) {
          this.showPlaceholder = true;
          this.placeholder = newState.placeholderStyle;
          return;
        }

        this.showPlaceholder = false;
      });
  }

  ngOnDestroy() {
    this._subscribe.unsubscribe();
  }
}
