/* tslint:disable:no-unused-variable */

import { TestBed, async, inject } from '@angular/core/testing';
import { GridEventService } from './grid-event.service';

describe('Service: GridEvent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [GridEventService]
    });
  });

  it('should ...', inject([GridEventService], (service: GridEventService) => {
    expect(service).toBeTruthy();
  }));
});
