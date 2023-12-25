import { Component, OnInit, AfterViewChecked } from '@angular/core';
import { Inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import * as geolib from 'geolib';
import { HttpClient } from '@angular/common/http';

declare const google: any;

@Component({
  selector: 'app-gmap',
  templateUrl: './gmap.component.html',
  styleUrls: ['./gmap.component.scss'],
})
export class GmapComponent implements OnInit, AfterViewChecked {
  ngAfterViewChecked(): void {
    this.allowOnlyCircleAndPolygon();
  }
  geocodeURL = 'https://maps.googleapis.com/maps/api/geocode/json';
  drawingManager: any;
  selectedShape: any;
  colors = ['#1E90FF', '#FF1493', '#32CD32', '#FF8C00', '#4B0082'];
  selectedColor: any;
  colorButtons: any = {};
  document: any;
  map: any;
  name: any;
  zoneObject: any = {};
  currentShapeLatLng: any = {}; // to store teh current shape object;
  delCharge: any = 0;
  checkDeliveryCharge: any = 0;
  checkLat: any = 0;
  checkLng: any = 0;

  listOfZoneShapes: any[] = [];

  isbeingDragged: boolean = false;
  currentShape: any;

  currentShapes: any = {
    // to store the created shapes coordinates
    marker: [],
    polyline: [],
    rectangle: [],
    circle: [],
    polygon: [],
  };

  pathBeforeChange: any;
  zoneObjectArray: any = [];

  clickLat: any = 0;
  clickLng: any = 0;
  address: any;
  addressMarker: any;
  addressRestMarker: any;

  // types of shapes constructed
  // marker
  // polyline
  // rectangle
  // circle
  // polygon

  constructor(@Inject(DOCUMENT) document: any, public http: HttpClient) {
    this.document = document;
  }

  allowOnlyCircleAndPolygon() {
    let drawingNode: any = null;
    let mapArr = document.getElementsByClassName('gmnoprint');
    for (let i = 0; i < mapArr.length; i++) {
      if (mapArr[i].childElementCount == 6) {
        drawingNode = mapArr[i].children;
      }
    }
    if (drawingNode) {
      [1, 2, 3].forEach((index) => {
        if (drawingNode[index]) {
          drawingNode[index].style.display = 'none';
        }
      });
    }
  }

  updateShapesCoords(newShape: any) {
    let newpath = this.getPaths(newShape);
    if (newShape.type == 'polygon') {
      this.currentShapes.polygon.forEach((element: any, i: any) => {
        if (JSON.stringify(this.pathBeforeChange) === JSON.stringify(element)) {
          this.currentShapes.polygon[i] = newpath;
        }
      });
    } else if (newShape.type == 'circle') {
      this.currentShapes.circle.forEach((element: any, i: any) => {
        if (JSON.stringify(this.pathBeforeChange) === JSON.stringify(element)) {
          this.currentShapes.circle[i] = newpath;
        }
      });
    }
  }

  clearSelection() {
    if (this.selectedShape) {
      if (this.selectedShape.type !== 'marker') {
        this.selectedShape.setEditable(false);
      }

      this.selectedShape = null;
    }
  }

  setSelection(shape: any) {
    if (shape.type !== 'marker') {
      this.clearSelection();
      this.selectColor(shape.get('fillColor') || shape.get('strokeColor'));
    }
    this.selectedShape = shape;
    this.pathBeforeChange = this.getPaths(shape);
  }

  deleteSelectedShape() {
    this.currentShapes.polygon.forEach((element: any, i: any) => {
      if (
        JSON.stringify(this.getPaths(this.selectedShape)) ===
        JSON.stringify(element)
      ) {
        this.currentShapes.polygon.splice(i, 1);
      }
    });
    this.selectedShape.setMap(null);
    this.showDrawingTools();
  }

  selectColor(color: any) {
    this.selectedColor = color;
    for (var i = 0; i < this.colors.length; ++i) {
      var currColor = this.colors[i];
      this.colorButtons[currColor].style.border =
        currColor == color ? '2px solid black' : '2px solid #fff';
      this.colorButtons[currColor].style.width =
        currColor == color ? '30px' : '25px';
      this.colorButtons[currColor].style.height =
        currColor == color ? '30px' : '20px';
    }
    // Retrieves the current options from the drawing manager and replaces the
    // stroke or fill color as appropriate.
    // var polylineOptions = this.drawingManager.get("polylineOptions");
    // polylineOptions.strokeColor = color;
    // this.drawingManager.set("polylineOptions", polylineOptions);
    // var rectangleOptions = this.drawingManager.get("rectangleOptions");
    // rectangleOptions.fillColor = color;
    // this.drawingManager.set("rectangleOptions", rectangleOptions);
    var circleOptions = this.drawingManager.get('circleOptions');
    circleOptions.fillColor = color;
    this.drawingManager.set('circleOptions', circleOptions);
    var polygonOptions = this.drawingManager.get('polygonOptions');
    polygonOptions.fillColor = color;
    this.drawingManager.set('polygonOptions', polygonOptions);
  }

  setSelectedShapeColor(color: any) {
    if (this.selectedShape) {
      if (this.selectedShape.type == google.maps.drawing.OverlayType.POLYLINE) {
        this.selectedShape.set('strokeColor', color);
      } else {
        this.selectedShape.set('fillColor', color);
      }
    }
  }

  makeColorButton(color: any) {
    var button = this.document.createElement('span');
    button.className = 'color_button';
    button.style.backgroundColor = color;
    button.style.width = '25px';
    button.style.height = '20px';
    button.style.margin = '2px';
    button.style.float = 'left';
    button.style.cursor = 'pointer';
    google.maps.event.addDomListener(button, 'click', () => {
      this.selectColor(color);
      this.setSelectedShapeColor(color);
    });
    return button;
  }

  buildColorPalette() {
    var colorPalette = this.document.getElementById('color-palette');
    for (var i = 0; i < this.colors.length; ++i) {
      var currColor = this.colors[i];
      var colorButton = this.makeColorButton(currColor);
      colorPalette.appendChild(colorButton);
      this.colorButtons[currColor] = colorButton;
    }
    this.selectColor(this.colors[0]);
  }

  getPaths(newshape: any) {
    if (newshape.type == 'polygon') {
      let paths: any = [];
      if (newshape) {
        const vertices = newshape.getPaths().getArray()[0];
        vertices.getArray().forEach(function (xy: any, i: any) {
          let latLng = {
            latitude: xy.lat(),
            longitude: xy.lng(),
          };
          paths.push(latLng);
        });
        return paths;
      }
      return [];
    } else if (newshape.type == 'circle') {
      if (newshape) {
        let path = {
          latitude: newshape.getCenter().lat(),
          longitude: newshape.getCenter().lng(),
          radius: newshape.getRadius(),
        };
        return path;
      } else {
        return {};
      }
    }
  }

  displayCoordinates(pnt: any) {
    this.clickLat = pnt.lat();
    this.clickLng = pnt.lng();
    console.log('Latitude: ' + this.clickLat + '  Longitude: ' + this.clickLng);
  }

  findCurrentLocation() {
    var infoWindow = new google.maps.InfoWindow({ map: this.map });
    // Try HTML5 geolocation.
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          var pos = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          infoWindow.setPosition(pos);
          infoWindow.setContent('Location found.');
          this.map.setCenter(pos);
        },
        () => {
          // this.handleLocationError(true, infoWindow, this.map.getCenter());
        }
      );
    } else {
      // Browser doesn't support Geolocation
      // this.handleLocationError(false, infoWindow, this.map.getCenter());
    }
  }

  handleLocationError(browserHasGeolocation: any, infoWindow: any, pos: any) {
    infoWindow.setPosition(pos);
    infoWindow.setContent(
      browserHasGeolocation
        ? 'Error: The Geolocation service failed.'
        : "Error: Your browser doesn't support geolocation."
    );
  }

  placeMarkerForRestaurant() {
    var latlng = new google.maps.LatLng(37.3945646, -122.0787532);
    this.addressRestMarker = new google.maps.Marker({
      map: this.map,
      position: latlng,
      draggable: false,
      anchorPoint: new google.maps.Point(0, 0),
    });
  }

  initialize() {
    var map = new google.maps.Map(this.document.getElementById('map'), {
      zoom: 16,
      center: new google.maps.LatLng(37.3945646, -122.0787532),
      mapTypeId: google.maps.MapTypeId.HYBRID,
      disableDefaultUI: true,
      zoomControl: true,
    });
    this.map = map;
    var polyOptions = {
      strokeWeight: 0,
      fillOpacity: 0.45,
      clickable: true,
      editable: true,
      draggable: true,
    };
    this.findCurrentLocation();
    this.placeMarkerForRestaurant();

    // Creates a drawing manager attached to the map that allows the user to draw
    // markers, lines, and shapes.
    this.drawingManager = new google.maps.drawing.DrawingManager({
      drawingMode: google.maps.drawing.OverlayType.POLYGON,
      markerOptions: {
        draggable: true,
      },
      // polylineOptions: {
      //   editable: true,
      //   draggable: true
      // },
      // rectangleOptions: polyOptions,
      circleOptions: polyOptions,
      polygonOptions: polyOptions,
      map: map,
    });
    google.maps.event.addListener(map, 'click', (event: any) => {
      this.displayCoordinates(event.latLng);
    });
    google.maps.event.addListener(
      this.drawingManager,
      'drawingmode_changed',
      () => {
        // when the icons in drawing tools are clicked
        this.hideAllShapes();
      }
    );
    google.maps.event.addListener(
      this.drawingManager,
      'overlaycomplete',
      (e: any) => {
        this.hideDrawingTools();
        this.currentShapeLatLng = {};
        var newShape = e.overlay;
        newShape.type = e.type;
        this.currentShape = newShape;
        if (newShape.type == 'polygon') {
          this.currentShapes.polygon.push(this.getPaths(newShape));
          this.currentShapeLatLng['polygon'] = this.getPaths(newShape);
          var paths = this.getPaths(newShape);
          google.maps.event.addListener(newShape.getPath(), 'insert_at', () => {
            this.currentShape = newShape;
            this.updateShapesCoords(newShape);
          });
          google.maps.event.addListener(newShape.getPath(), 'set_at', () => {
            if (!this.isbeingDragged) {
              this.currentShape = newShape;
              this.updateShapesCoords(newShape);
            }
          });
          google.maps.event.addListener(newShape.getPath(), 'remove_at', () => {
            this.currentShape = newShape;
            this.getPaths(newShape);
          });
        }
        if (newShape.type == 'circle') {
          this.currentShapes.circle.push(this.getPaths(newShape));
          this.currentShapeLatLng['circle'] = this.getPaths(newShape);
          google.maps.event.addListener(newShape, 'radius_changed', () => {
            this.currentShape = newShape;
            this.updateShapesCoords(newShape);
          });
          google.maps.event.addListener(newShape, 'click', (e: any) => {});
        }
        google.maps.event.addListener(newShape, 'dragstart', () => {
          this.isbeingDragged = true;
          console.log('dragStart', newShape.type);
          console.log('path before change(drag)::', newShape.type);
          console.log(this.getPaths(newShape));
        });
        google.maps.event.addListener(newShape, 'dragend', () => {
          console.log('dragEnd', newShape.type);
          console.log('path after change(drag)::', newShape.type);
          console.log(this.getPaths(newShape));
          this.updateShapesCoords(newShape);
          this.isbeingDragged = false;
        });
        if (e.type !== google.maps.drawing.OverlayType.MARKER) {
          // Switch back to non-drawing mode after drawing a shape.
          this.drawingManager.setDrawingMode(null);
          google.maps.event.addListener(newShape, 'click', (e: any) => {
            console.log('clicked');
            this.setSelection(newShape); // it should select the shape when clicked on the shape
          });
          this.setSelection(newShape);
        } else {
          this.setSelection(newShape);
        }
      }
    );
    // Clear the current selection when the drawing mode is changed, or when the
    // map is clicked.
    google.maps.event.addListener(
      this.drawingManager,
      'drawingmode_changed',
      this.clearSelection.bind(this)
    );
    google.maps.event.addListener(map, 'click', this.clearSelection.bind(this));
    google.maps.event.addDomListener(
      this.document.getElementById('delete-button'),
      'click',
      this.deleteSelectedShape.bind(this)
    );
    this.buildColorPalette();
  }

  addZone() {
    if (!this.selectedShape) {
      alert('Please draw the shape');
      return;
    }
    let obj: any = {};
    obj['name'] = this.name;
    obj['shape'] = this.currentShapeLatLng;
    obj['deliveryCharge'] = this.delCharge;
    this.zoneObjectArray.push(obj);
    this.zoneObject[this.name] = this.currentShapeLatLng;
    console.log(this.currentShape);
    this.currentShape.editable = false;
    this.currentShape.draggable = false;
    // this.currentShape.clickable = false;

    this.listOfZoneShapes.push({ name: this.name, shape: this.currentShape });
    this.hideAllShapes();
    this.showDrawingTools();
    this.name = '';
    this.delCharge = 0;
    console.log('zoneObjectARR', this.zoneObjectArray);
    console.log('listofZoneShapes', this.listOfZoneShapes);
  }

  editEnable(name: any) {
    this.hideAllShapes();
    this.showShape(name);
    console.log('name of zone', name);
    console.log('listofZoneShapes', this.listOfZoneShapes);
    this.listOfZoneShapes.forEach((element) => {
      if (element.name == name) {
        element.shape.setEditable(true);
        element.shape.draggable = true;
        console.log(this.getPaths(element.shape));
      }
    });
  }
  isBeingEdited(name: any) {
    let flag = false;
    this.listOfZoneShapes.forEach((element) => {
      if (element.name == name && element.shape.editable == true) {
        flag = true;
      }
    });
    return flag;
  }

  deleteZone(name: any) {
    let delIndex1 = 0;
    let delIndex2 = 0;
    this.listOfZoneShapes.forEach((element, i) => {
      if (element.name == name) {
        delIndex1 = i;
      }
    });
    this.zoneObjectArray.forEach((element: any, i: any) => {
      if (element.name == name) {
        delIndex2 = i;
      }
    });
    this.listOfZoneShapes.splice(delIndex1, 1);
    this.zoneObjectArray.splice(delIndex2, 1);
  }

  saveShape(name: any) {
    this.listOfZoneShapes.forEach((element, i) => {
      if (element.name == name) {
        this.listOfZoneShapes[i] = {
          name: name,
          shape: this.currentShape,
        };
        element.shape.setEditable(false);
        element.shape.draggable = false;
        this.hideAllShapes();
        console.log(this.getPaths(this.currentShape));
      }
    });
  }

  showShape(name: any) {
    this.listOfZoneShapes.forEach((element, i) => {
      if (element.name == name) {
        this.currentShape = element.shape;
        element.shape.setMap(this.map);
      }
    });
  }

  showAllShapes() {
    this.listOfZoneShapes.forEach((element) => {
      element.shape.setMap(this.map);
    });
  }

  hideAllShapes() {
    this.listOfZoneShapes.forEach((element) => {
      element.shape.setMap(null);
    });
  }

  showDrawingTools() {
    this.drawingManager.setMap(this.map);
  }

  hideDrawingTools() {
    this.drawingManager.setMap(null);
  }

  getDilveryCharge(coordObj: any) {
    let delCharge = 0;
    console.log('zoneobjectarr', this.zoneObjectArray);
    this.zoneObjectArray.forEach((item: any) => {
      if (item.shape.polygon) {
        if (geolib.isPointInside(coordObj, item.shape.polygon)) {
          if (delCharge == 0 || item.deliveryCharge < delCharge) {
            delCharge = item.deliveryCharge;
          }
        }
      } else if (item.shape.circle) {
        console.log('is inside circle');
        let check = {
          latitude: item.shape.circle.latitude,
          longitude: item.shape.circle.longitude,
        };
        console.log(coordObj);
        console.log(check);
        console.log(item.shape.circle.radius);
        console.log('is inside circle');
        if (geolib.isPointInCircle(coordObj, check, item.shape.circle.radius)) {
          console.log('is inside circle');
          if (delCharge == 0 || item.deliveryCharge < delCharge) {
            delCharge = item.deliveryCharge;
          }
        }
      }
    });
    return delCharge;
  }

  checkDelivery(addresFlag: any) {
    let checkObj = { latitude: 0, longitude: 0 };
    if (addresFlag) {
      this.http
        .get(
          `${this.geocodeURL}?address=${this.address}&key=AIzaSyC9PnuRk42kbCPMOvsfHpn40r5SoyN38zI`
        )
        .subscribe((data: any) => {
          if (data.results[0]) {
            if (this.addressMarker) {
              this.addressMarker.setMap(null);
            }
            checkObj.latitude = data.results[0].geometry.location.lat;
            checkObj.longitude = data.results[0].geometry.location.lng;
            this.clickLat = checkObj.latitude;
            this.clickLng = checkObj.longitude;
            var latlng = new google.maps.LatLng(
              checkObj.latitude,
              checkObj.longitude
            );
            this.addressMarker = new google.maps.Marker({
              map: this.map,
              position: latlng,
              draggable: false,
              anchorPoint: new google.maps.Point(0, 0),
            });
            this.checkDeliveryCharge = this.getDilveryCharge(checkObj);
            console.log(data);
          }
        });
    } else {
      checkObj.latitude = this.clickLat;
      checkObj.longitude = this.clickLng;
      this.checkDeliveryCharge = this.getDilveryCharge(checkObj);
    }
  }

  ngOnInit() {
    this.initialize();
  }
}
