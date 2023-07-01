import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppComponent } from './app.component';
import { MapComponent } from './components/map/map.component';
import { TimesliderComponent } from './components/timeslider/timeslider.component';

@NgModule({
  declarations: [
    AppComponent,
    MapComponent,
    TimesliderComponent
  ],
  imports: [
    BrowserModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
