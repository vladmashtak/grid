import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { GridEventService } from './grid-event.service';
import { GridUtilesService} from './grid-utiles.service';
import { GridLayoutService} from './grid-layout.service';

import { GridLoyoutComponent } from './grid-loyout.component';
import { DraggableDirective } from './draggable/draggable.directive';
import { ResizableDirective } from './resizable/resizable.directive';
import { GridItemComponent } from './grid-item/grid-item.component';
import { GridItemDirective } from './grid-item/grid-item.directive';


@NgModule({
  imports: [
    CommonModule
  ],
  declarations: [
    GridLoyoutComponent,
    DraggableDirective,
    ResizableDirective,
    GridItemComponent,
    GridItemDirective
  ],
  exports: [
    GridLoyoutComponent,
    DraggableDirective,
    ResizableDirective,
    GridItemComponent,
    GridItemDirective
  ],
  providers: [
    GridEventService,
    GridUtilesService,
    GridLayoutService
  ]
})
export class GridLoyoutModule { }
