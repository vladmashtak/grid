import {
  Component,
  Input,
  Output,
  EventEmitter,
  ContentChildren,
  QueryList,
  OnChanges,
  AfterContentInit
} from '@angular/core';

import { GridUtilesService } from './grid-utiles.service';
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
} from '../grid-item/utiles';

import GridItem from './grid-item/grid-item.component';

@Component({
  selector: 'grid-loyout',
  templateUrl: './grid-loyout.component.html',
  styleUrls: ['./grid-loyout.component.scss']
})
export class GridLoyoutComponent {
/*  @ContentChildren(DraggableDirective) childChildren: QueryList<DraggableDirective>;

  ngAfterContentInit () {
    console.log(this.childChildren);
    this.childChildren.changes.subscribe(children => {
      console.log(children);
    });
  }*/
}
