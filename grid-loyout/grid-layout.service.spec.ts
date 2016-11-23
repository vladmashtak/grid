/* tslint:disable:no-unused-variable */

import { TestBed, async, inject } from '@angular/core/testing';
import { GridLayoutService } from './grid-layout.service';

describe('Service: GridLayout', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [GridLayoutService]
    });
  });

  it('should ...', inject([GridLayoutService], (service: GridLayoutService) => {
    expect(service).toBeTruthy();
  }));
});
