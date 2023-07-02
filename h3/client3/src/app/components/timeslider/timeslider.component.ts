import { Component } from '@angular/core';
import { Observable, map } from 'rxjs';
import { AvailableTimes, State, StateService, availableTimes } from 'src/app/services/state.service';

@Component({
  selector: 'app-timeslider',
  templateUrl: './timeslider.component.html',
  styleUrls: ['./timeslider.component.css']
})
export class TimesliderComponent {

  public state$ = this.stateSvc.state().pipe(map(s => {
    let previousTime = undefined;
    let nextTime = undefined;
    const indexCurrentTime = availableTimes.indexOf(s.currentTime);
    if (indexCurrentTime > 0) {
      previousTime = availableTimes[indexCurrentTime - 1];
    }
    if (indexCurrentTime < availableTimes.length - 1) {
      nextTime = availableTimes[indexCurrentTime + 1];
    }
    return {
      ...s,
      previous: previousTime,
      next: nextTime,
    }
  }));

  constructor(private stateSvc: StateService) {}

  stepClicked(time: AvailableTimes | undefined) {
    if (time === undefined) return;
    this.stateSvc.handleAction({ type: 'time picked', payload: { time } });
  }

  layerClicked(type: 'raster' | 'vector', visibility: boolean) {
    this.stateSvc.handleAction({ type: 'layer visibility', payload: { layer: type, visible: visibility } });
  }
}
