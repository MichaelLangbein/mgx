import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';


export type TimePickedAction = {
  type: 'time picked',
  payload: { time: AvailableTimes }
}

export type LayerVisibilitySet = {
  type: 'layer visibility',
  payload: { layer: 'raster' | 'vector', visible: boolean }
}

export type Action = TimePickedAction | LayerVisibilitySet;


export const availableTimes: AvailableTimes[] = ["2020-11-17", "2020-12-03", "2020-12-19", "2021-01-04", "2021-01-20", "2021-02-05", "2021-02-21", "2021-11-20", "2021-12-14", "2021-12-21", "2021-12-22", "2022-01-07", "2022-01-15", "2022-01-23", "2022-02-24", "2022-08-03", "2022-10-06", "2022-08-03"];
export type AvailableTimes = "2020-11-17" | "2020-12-03" | "2020-12-19" | "2021-01-04" | "2021-01-20" | "2021-02-05" | "2021-02-21" | "2021-11-20" | "2021-12-14" | "2021-12-21" | "2021-12-22" | "2022-01-07" | "2022-01-15" | "2022-01-23" | "2022-02-24" | "2022-08-03" | "2022-10-06" | "2022-08-03";

export interface State {
  availableTimes: AvailableTimes[],
  currentTime: AvailableTimes,
  vectorVisible: boolean,
  rasterVisible: boolean
};


const initialState: State = {
  availableTimes: availableTimes,
  currentTime: availableTimes[0],
  vectorVisible: true,
  rasterVisible: false
};



@Injectable({
  providedIn: 'root'
})
export class StateService {

  private state$ = new BehaviorSubject<State>(initialState);

  constructor() { }

  handleAction(action: Action) {
    const currentState = this.state$.value;
    const newState = this.reduce(currentState, action);
    this.state$.next(newState);
  }

  state(): Observable<State> {
    return this.state$;
  }

  private reduce(state: State, action: Action): State {

    if (action.type === "time picked") {
      state.currentTime = action.payload.time;
    }

    else if (action.type === "layer visibility") {
      if (action.payload.layer === "raster") state.rasterVisible = action.payload.visible;
      if (action.payload.layer === "vector") state.vectorVisible = action.payload.visible;
    }

    return state;
  }

}
