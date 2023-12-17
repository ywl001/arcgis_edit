import { Component, ViewChild } from '@angular/core';
import Map from "@arcgis/core/Map.js";
import Basemap from "@arcgis/core/Basemap.js";
import TileLayer from "@arcgis/core/layers/TileLayer.js";
import MapView from "@arcgis/core/views/MapView.js";
import FeatureLayer from "@arcgis/core/layers/FeatureLayer.js";
// import * as reactiveUtils from '@arcgis/core/core/reactiveUtils';
import SketchViewModel from "@arcgis/core/widgets/Sketch/SketchViewModel.js";
import Graphic from "@arcgis/core/Graphic.js";
import GraphicsLayer from "@arcgis/core/layers/GraphicsLayer.js";
import FeatureLayerView from "@arcgis/core/views/layers/FeatureLayerView.js";


@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  title = 'arcgis_edit';

  tileMapUrl = 'http://114.115.201.238:6080/arcgis/rest/services/mengjin/MapServer'
  featureUrl = 'http://114.115.201.238:6080/arcgis/rest/services/mj/FeatureServer/7'

  @ViewChild('mapView', { static: true }) mapDiv: any;

  mapView!:MapView

  private featureLayer:FeatureLayer
  private sketchVM:SketchViewModel
  private glayer:GraphicsLayer
  private currentGraphic: Graphic;
  private highLightFeature: __esri.Handle;

  ngAfterViewInit() {
    this.initializeMap().then(() => {
      console.log('The map is ready.');
    });
  }

  initializeMap(): Promise<any> {
    const container = this.mapDiv.nativeElement;
    const tileLayer = new TileLayer({
      url: this.tileMapUrl
    });

    const basemap = new Basemap({
      baseLayers: [
        tileLayer,
        // this.roadLayer
      ],
      title: "basemap",
      id: "basemap"
    });

    this.featureLayer = new FeatureLayer({url:this.featureUrl})

    const map = new Map({
      basemap: basemap
    })

    this.glayer = new GraphicsLayer();

    map.add(this.glayer)

    map.add(this.featureLayer)

    const view = new MapView({
      map: map,
      container: container,
      constraints: {
        rotationEnabled: false
      }
    });

    view.on("click", e => { this.mapClick(e) });

    this.mapView = view;

    const polygonSymbol = {
      type: "simple-fill", // autocasts as new SimpleFillSymbol()
      color: "#F2BC94",
      outline: {
        // autocasts as new SimpleLineSymbol()
        color: "#722620",
        width: 3
      }
    };
     this.sketchVM = new SketchViewModel({
      view: this.mapView,
      layer: this.glayer,
      // polygonSymbol: polygonSymbol,
    });
    return this.mapView.when();
  }

  onAddFeature(){
   this.sketchVM.create('polygon');
   this.sketchVM.on('create',e=>{this.onCreate(e)})
  }

  onCreate(e){
    if(e.state =='complete'){
      const g = e.graphic;
      // g.attributes = {}
      this.featureLayer.applyEdits({addFeatures:[g]})
    }
  }

  async mapClick(e: __esri.ViewClickEvent) {
    var screenPoint = {x: e.x,y: e.y};

    const g = await this.identityMap(screenPoint);
    console.log(g)

    if (g) {
      // if (event.button == 0) {
      //   this.onClickGraphic(g);
      // } else if (event.button == 2) {
      //   console.log('right click');
      //   this.showMenu(g)
      // }
      this.currentGraphic = g;
    } else {
      console.log('点到了地图空白处');

    }
  }

  private async identityMap(p) {
    return this.mapView.hitTest(p).then(
      res => {
        if (res.results.length == 0) {
          return null;
        }
        else {
          const g = this.viewHitToGraphic(res.results[0]);
          this.mapView.whenLayerView(g.layer).then(
            (layerView: FeatureLayerView) => {
              if (this.highLightFeature)
                this.highLightFeature.remove();
              this.highLightFeature = layerView.highlight(g)
            }
          )
          // this.store.dispatch(action_currentGraphic({ data: g }))
          // this.hightLightGraphic(g)
          return g;
        }
      }
    )
  }

  private viewHitToGraphic(viewHit: __esri.ViewHit) {
    if (viewHit.type === 'graphic')
      return viewHit.graphic
    return null
  }

  onDelFeature(){
    if(this.currentGraphic){
      this.featureLayer.applyEdits({deleteFeatures:[this.currentGraphic]})
    }
  }

  onTransformFeature(){
    if(this.currentGraphic){
      this.glayer.removeAll()
      this.glayer.add(this.currentGraphic);
      this.sketchVM.on('update',e=>{this.onUpdateFeature(e)})
      this.sketchVM.update(this.currentGraphic,{tool:'transform'})
    }
  }

  onReshapeFeature(){
    if(this.currentGraphic){
      this.glayer.removeAll()
      this.glayer.add(this.currentGraphic);
      this.sketchVM.on('update',e=>{this.onUpdateFeature(e)})
      this.sketchVM.update(this.currentGraphic,{tool:'reshape'})
    }
  }

  onUpdateFeature(e){
    if(e.state=='complete')
      console.log(e)
      this.featureLayer.applyEdits({updateFeatures:[this.currentGraphic]})
  }

}
