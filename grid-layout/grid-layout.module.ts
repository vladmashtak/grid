import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { GridEventService } from './grid-event.service';
import { GridUtilesService} from './grid-utiles.service';
import { GridLayoutService} from './grid-layout.service';

import { GridLayoutComponent } from './grid-layout.component';
import { DraggableDirective } from './draggable/draggable.directive';
import { ResizableDirective } from './resizable/resizable.directive';
import { GridItemDirective } from './grid-item/grid-item.directive';


@NgModule({
  imports: [
    CommonModule
  ],
  declarations: [
    GridLayoutComponent,
    DraggableDirective,
    ResizableDirective,
    GridItemDirective
  ],
  exports: [
    GridLayoutComponent,
    DraggableDirective,
    ResizableDirective,
    GridItemDirective
  ],
  providers: [
    GridEventService,
    GridUtilesService,
    GridLayoutService
  ]
})
export class GridLayoutModule { }
