import { AfterViewInit, ChangeDetectorRef, Component, ElementRef, NgZone, ViewChild, ViewContainerRef } from '@angular/core';
import { Map, Overlay, View } from 'ol';
import TileLayer from 'ol/layer/Tile';
import { fromLonLat } from 'ol/proj';
import OSM from 'ol/source/OSM';
import { StateService } from 'src/app/services/state.service';

@Component({
  selector: 'app-map',
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.css']
})
export class MapComponent implements AfterViewInit {

  @ViewChild('mapContainer')                                        mapContainer!: ElementRef<HTMLDivElement>;
  @ViewChild('popup')                                               popup!: ElementRef<HTMLDivElement>;
  @ViewChild('popupBody', { read: ViewContainerRef, static: true }) popupContainer!: ViewContainerRef;

  private map: Map;
  private overlay = new Overlay({});
  private baseLayers = [new TileLayer({ source: new OSM() })];


  constructor(
    private stateSvc: StateService,
    private changeDetector: ChangeDetectorRef,
    private zone: NgZone,
  ) {

      // no need to run this outside of zone
      this.map = new Map({
        layers: this.baseLayers,
        view: new View({
          projection: 'EPSG:3857',
          center: fromLonLat([11.3, 48.08], 'EPSG:3857'),
          zoom: 13
        }),
        controls: [],
        overlays: []    
      });
  }

  ngAfterViewInit(): void {
    if (this.mapContainer && this.popupContainer) {
  
      // needs to be outside of zone: only place where ol attaches to event-handlers
      this.zone.runOutsideAngular(() => {
        this.map.setTarget(this.mapContainer.nativeElement);
      });
      this.overlay.setElement(this.popup.nativeElement);

    }
  }
}
