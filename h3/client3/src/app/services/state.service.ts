import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';


export type Action = {
  type: string,
  payload: any
};


const availableTimes: AvailableTimes[] = ["2020-11-17", "2020-12-03", "2020-12-19", "2021-01-04", "2021-01-20", "2021-02-05", "2021-02-21", "2021-11-20", "2021-12-14", "2021-12-21", "2021-12-22", "2022-01-07", "2022-01-15", "2022-01-23", "2022-02-24", "2022-08-03", "2022-10-06", "2022-08-03"];
export type AvailableTimes = "2020-11-17" | "2020-12-03" | "2020-12-19" | "2021-01-04" | "2021-01-20" | "2021-02-05" | "2021-02-21" | "2021-11-20" | "2021-12-14" | "2021-12-21" | "2021-12-22" | "2022-01-07" | "2022-01-15" | "2022-01-23" | "2022-02-24" | "2022-08-03" | "2022-10-06" | "2022-08-03";
export interface State {
  availableTimes: AvailableTimes[]
  currentTime: AvailableTimes
};


const initialState: State = {
  availableTimes: availableTimes,
  currentTime: availableTimes[0]
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
    
    return state;
  }

}
