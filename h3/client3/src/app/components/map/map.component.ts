import { Map, Overlay, View } from 'ol';
import { FeatureLike } from 'ol/Feature';
import GeoJSON from 'ol/format/GeoJSON';
import TileLayer from 'ol/layer/Tile';
import VectorLayer from 'ol/layer/Vector';
import { fromLonLat } from 'ol/proj';
import OSM from 'ol/source/OSM';
import TileWMS from 'ol/source/TileWMS';
import VectorSource from 'ol/source/Vector';
import Fill from 'ol/style/Fill';
import Style from 'ol/style/Style';
import { colorScale } from 'src/app/helpers/graph';
import { AvailableTimes, StateService, availableTimes } from 'src/app/services/state.service';

import {
    AfterViewInit, ChangeDetectorRef, Component, ElementRef, NgZone, ViewChild, ViewContainerRef
} from '@angular/core';

import * as data from '../../data/buildings_analyzed.geo.json';
import { createBarchart } from 'src/app/helpers/barchart';


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
  private mapProjection = 'EPSG:3857';
  private overlay = new Overlay({});
  private layers = {
    osm: new TileLayer({ 
      source: new OSM()
    }),
    vector: new VectorLayer({
      source: new VectorSource({
        features: new GeoJSON({ dataProjection: 'EPSG:4326', featureProjection: this.mapProjection }).readFeatures(data)
      }),
      style: createVectorStyle(availableTimes[0])
    }),
    raster: new TileLayer({
      source: createTileSource(availableTimes[0])
    })
  };


  constructor(
    private stateSvc: StateService,
    private changeDetector: ChangeDetectorRef,
    private zone: NgZone,
  ) {

      // no need to run this outside of zone
      this.map = new Map({
        layers: [this.layers.osm, this.layers.raster, this.layers.vector],
        view: new View({
          projection: this.mapProjection,
          center: fromLonLat([11.3, 48.08], this.mapProjection),
          zoom: 13
        }),
        controls: [],
        overlays: [this.overlay]    
      });

      this.map.on('click', (evt) => {

        const coordinate = evt.coordinate;
        const pixel = this.map.getPixelFromCoordinate(coordinate);

        let feature = undefined;
        this.map.forEachFeatureAtPixel(pixel, (f) => {
          feature = f;
          return true;
        });

        if (feature) {
          const timeSeries = getTimeSeries(feature);
          this.popup.nativeElement.innerHTML = "";
          createBarchart(this.popup.nativeElement, timeSeries, 'date', 'temperature', 400, 300);
          this.overlay.setPosition(coordinate);
        }
        else {
          this.overlay.setPosition(undefined);
        }

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


    this.stateSvc.state().subscribe(s => {
      this.layers["vector"].setStyle(createVectorStyle(s.currentTime));
      this.layers["raster"].setSource(createTileSource(s.currentTime));
      this.layers["vector"].setVisible(s.vectorVisible);
      this.layers["raster"].setVisible(s.rasterVisible);
    });

  }
}


function createTileSource(time: AvailableTimes) {
  return new TileWMS({
    url: "http://localhost:8080/geoserver/ls8/wms",
    params: {
      "LAYERS": `ls8:lst-${time}`,
      "STYLES": "thermal"
    },
    serverType: 'geoserver'
  });
}


function createVectorStyle(time: AvailableTimes) {
  return (feature: FeatureLike) => {
    const timeSeries = getTimeSeries(feature);
    const currentValue = timeSeries.find(d => d.date === time);

    let color = `rgb(125, 125, 125)`;
    if (currentValue) {
      const {r, g, b} = colorScale(currentValue!.value);
      color = `rgb(${r}, ${g}, ${b})`;
    }

    return new Style({
      fill: new Fill({
        color
      })
    })
  }
}



function getTimeSeries(feature: FeatureLike) {

  const props = feature.getProperties();
  const timeSeriesData = props["timeseries"];
  if (!timeSeriesData) return [];
  
  const timeSeries: {date: string, value: number}[] = [];
  for (const [key, value] of Object.entries(timeSeriesData)) {
    if (value !== -9999) {
      timeSeries.push({
        date: `${key.slice(0, 4)}-${key.slice(4, 6)}-${key.slice(6, 8)}`,
        value: +(value as string)
      })
    }
  }
  
  return timeSeries;
}