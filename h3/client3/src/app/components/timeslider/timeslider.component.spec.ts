import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TimesliderComponent } from './timeslider.component';

describe('TimesliderComponent', () => {
  let component: TimesliderComponent;
  let fixture: ComponentFixture<TimesliderComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [TimesliderComponent]
    });
    fixture = TestBed.createComponent(TimesliderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
