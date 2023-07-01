import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';


export type Action = {
  type: string,
  payload: any
};


export type State = {};


const initialState: State = {};



@Injectable({
  providedIn: 'root'
})
export class StateService {

  readonly state$ = new BehaviorSubject<State>(initialState);

  constructor() { }

  handleAction(action: Action) {
    const currentState = this.state$.value;
    const newState = this.reduce(currentState, action);
    this.state$.next(newState);
  }

  private reduce(state: State, action: Action): State {
    
    return state;
  }

}
