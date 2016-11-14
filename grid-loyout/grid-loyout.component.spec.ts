/* tslint:disable:no-unused-variable */
import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { DebugElement } from '@angular/core';

import { GridLoyoutComponent } from './grid-loyout.component';

describe('GridLoyoutComponent', () => {
  let component: GridLoyoutComponent;
  let fixture: ComponentFixture<GridLoyoutComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ GridLoyoutComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(GridLoyoutComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
