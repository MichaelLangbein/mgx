import { Component } from '@angular/core';
import { Observable, map } from 'rxjs';
import { AvailableTimes, State, StateService } from 'src/app/services/state.service';

@Component({
  selector: 'app-timeslider',
  templateUrl: './timeslider.component.html',
  styleUrls: ['./timeslider.component.css']
})
export class TimesliderComponent {

  public state$ = this.stateSvc.state().pipe(map(s => {
    return {
      ...s,
      next: undefined,
      previous: undefined,
    }
  }));

  constructor(private stateSvc: StateService) {}

  stepClicked(time: AvailableTimes) {
    this.stateSvc.handleAction({ type: 'time picked', payload: { time } });
  }
}
