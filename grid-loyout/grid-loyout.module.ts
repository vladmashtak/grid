import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GridEventService } from './grid-event.service';
import { GridUtilesService} from './grid-utiles.service';
import { GridLoyoutComponent } from './grid-loyout.component';
import { DraggableDirective } from './draggable/draggable.directive';
import { ResizableDirective } from './resizable/resizable.directive';
import { GridItemComponent } from './grid-item/grid-item.component';


@NgModule({
  imports: [
    CommonModule
  ],
  declarations: [
    GridLoyoutComponent,
    DraggableDirective,
    ResizableDirective,
    GridItemComponent
  ],
  exports: [
    GridLoyoutComponent,
    DraggableDirective,
    ResizableDirective,
    GridItemComponent
  ],
  providers: [
    GridEventService,
    GridUtilesService
  ]
})
export class GridLoyoutModule { }
