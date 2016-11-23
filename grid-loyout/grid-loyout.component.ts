import {
  Component,
  Input,
  Output,
  EventEmitter,
  ElementRef,
  Renderer,
  OnChanges,
  OnInit
} from '@angular/core';

import { GridUtilesService } from './grid-utiles.service';
import { GridLayoutService } from './grid-layout.service';

import { DraggableDirective } from './draggable/draggable.directive'

import {
  autoBindHandlers,
  bottom,
  childrenEqual,
  cloneLayoutItem,
  compact,
  getLayoutItem,
  moveElement,
  synchronizeLayoutWithChildren,
  validateLayout
} from './grid-item/utiles';

import { ILayoutItemRequired, ILayoutItem } from './grid-loyout.interfaces';

// import { GridItemComponent } from './grid-item/grid-item.component';

interface IGridLayout {
  /*
  * Basic props
  * */
  className:string;

  /*
  * This can be set explicitly. If it is not set, it will automatically
  * be set to the container width. Note that resizes will *not* cause this to adjust.
  * If you need that behavior, use WidthProvider.
  * */
  width:number;

  /* If true, the container height swells and contracts to fit contents */
  autoSize:boolean;
  /* # of cols. */
  cols:number;
  /* A selector that will not be draggable. */
   draggableCancel:string;
  /* A selector for the draggable handler */
  draggableHandle:string;

  /* If true, the layout will compact vertically */
   verticalCompact:boolean;
  /*
  * layout is an array of object with the format:
  * {x: Number, y: Number, w: Number, h: Number, i: String}
  * */
  layout:Array<ILayoutItemRequired>;

  /*
  * Grid Dimensions
  * */

  /* Margin between items [x, y] in px */
  margin:Array<number>;
  /* Padding inside the container [x, y] in px */
  containerPadding:Array<number>;
  /* Rows have a static height, but you can change this based on breakpoints if you like */
  rowHeight:number;
  /*
  * Default Infinity, but you can specify a max here if you like.
  * Note that this isn't fully fleshed out and won't error if you specify a layout that
  * extends beyond the row capacity. It will, however, not allow users to drag/resize
  * an item past the barrier. They can push items beyond the barrier, though.
  * Intentionally not documented for this reason.
  * */
  maxRows:number;

  /*
  * Flags
  * */
  isDraggable:boolean;
  isResizable:boolean;
  /* Use CSS transforms instead of top/left */
  useCSSTransforms:boolean;
}

interface IGridLayoutState {
  activeDrag?: ILayoutItem;
  layout: Array<ILayoutItem>;
  mounted: boolean;
  oldDragItem: ILayoutItem;
  oldLayout: Array<ILayoutItem>;
  oldResizeItem: ILayoutItem;
}

@Component({
  selector: 'grid-layout',
  templateUrl: './grid-loyout.component.html',
  styleUrls: ['./grid-loyout.component.scss']
})

export class GridLoyoutComponent {
  public showPlaceholder: boolean = false;
  public placeholder: any;

  constructor(private _state: GridLayoutService) {

    this.placeholder = <any>{
      i: 'placeholder'
    };

    this._state.stateLayout.subscribe( newState => {

      if(newState.activeDrag !== null) {
        // this.showPlaceholder = true;
        console.log('active drag: ', newState.activeDrag);
        return;
      }

      // this.showPlaceholder = false;
    })
  }
}
