import { Component } from '@angular/core';
import { Observable, map } from 'rxjs';
import { AvailableTimes, State, StateService } from 'src/app/services/state.service';

@Component({
  selector: 'app-timeslider',
  templateUrl: './timeslider.component.html',
  styleUrls: ['./timeslider.component.css']
})
export class TimesliderComponent {

  // public availableTimes$: Observable<AvailableTimes[]>;
  // public currentTime$: Observable<AvailableTimes>;
  public state$: Observable<State>;

  constructor(private stateSvc: StateService) {
    // this.availableTimes$ = this.stateSvc.state().pipe(map(s => s.availableTimes));
    // this.currentTime$ = this.stateSvc.state().pipe(map(s => s.currentTime));
    this.state$ = this.stateSvc.state();
  }
}
