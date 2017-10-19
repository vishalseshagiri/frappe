frappe.ui.form.ControlMap = frappe.ui.form.ControlData.extend({
	loading: false,
	saving: false,
	make_wrapper() {
		// Create the elements for barcode area
		this._super();

		let $input_wrapper = this.$wrapper.find('.control-input-wrapper');
		this.map_area = $(
			`<div class="map-wrapper border">
				<div id="` + this.df.fieldname + `" style="min-height: 400px; z-index: 1"></div>
			</div>`
		);
		this.map_area.prependTo($input_wrapper);
		this.$wrapper.find('.control-input').addClass("hidden");
		this.bind_leaflet_map();
		this.bind_leaflet_edit_control();
	},

	format_for_input(value) {
		// render raw value from db into map
		this.map.removeLayer(this.editableLayers);
		if(value){
			this.editableLayers = L.geoJson(JSON.parse(value));
			// this.add_non_group_layers(L.geoJson(JSON.parse(value)),this.editableLayers);
			this.map.addLayer(this.editableLayers);
		}
	},

	set_formatted_input(value){
		this._super(value);
		if (value !== this.get_input_value()) {
			this.map.eachLayer((layer) => {
				if(layer instanceof L.Path || layer instanceof L.Marker){
					this.map.removeLayer(layer);
				}
			});
		}
	},

	get_input_value(){
		return JSON.stringify(this.editableLayers.toGeoJSON());
	},

	bind_leaflet_map() {
		L.Icon.Default.imagePath = '/assets/frappe/images/leaflet/';
		this.map = L.map(this.df.fieldname, {editable: true}).setView([19.0800, 72.8961], 13);

		L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png', {
			attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
		}).addTo(this.map);

		// Manually set location on click of locate button
		L.control.locate().addTo(this.map);
		// To request location update and set location, sets current geolocation on load
		// var lc = L.control.locate().addTo(this.map);
		// lc.start();
	},

	bind_leaflet_edit_control() {
		var me = this;
		this.editableLayers = new L.FeatureGroup();
		L.EditControl = L.Control.extend({

			options: {
				position: 'topleft',
				callback: null,
				kind: '',
				html: ''
			},

			onAdd: function (map) {
				var container = L.DomUtil.create('div', 'leaflet-control leaflet-bar'),
					link = L.DomUtil.create('a', '', container);

				link.href = '#';
				link.title = 'Create a new ' + this.options.kind;
				link.innerHTML = this.options.html;
				L.DomEvent.on(link, 'click', L.DomEvent.stop)
						  .on(link, 'click', () => {
							window.LAYER = this.options.callback.call(map.editTools);
						  }, this);

				return container;
			}
		});

		L.NewLineControl = L.EditControl.extend({

			options: {
				position: 'topleft',
				callback: this.map.editTools.startPolyline,
				kind: 'line',
				html: '\\/\\'
			}

		});

		L.NewPolygonControl = L.EditControl.extend({

			options: {
				position: 'topleft',
				callback: this.map.editTools.startPolygon,
				kind: 'polygon',
				html: '▰'
			}

		});

		L.NewMarkerControl = L.EditControl.extend({

			options: {
				position: 'topleft',
				callback: this.map.editTools.startMarker,
				kind: 'marker',
				html: '🖈'
			}

		});

		L.NewRectangleControl = L.EditControl.extend({

			options: {
				position: 'topleft',
				callback: this.map.editTools.startRectangle,
				kind: 'rectangle',
				html: '⬛'
			}

		});

		L.NewCircleControl = L.EditControl.extend({

			options: {
				position: 'topleft',
				callback: this.map.editTools.startCircle,
				kind: 'circle',
				html: '⬤'
			}

		});

		this.map.addControl(new L.NewMarkerControl());
		this.map.addControl(new L.NewLineControl());
		this.map.addControl(new L.NewPolygonControl());
		this.map.addControl(new L.NewRectangleControl());
		this.map.addControl(new L.NewCircleControl());

		var deleteShape = function(e) {
			if ((e.originalEvent.ctrlKey || e.originalEvent.metaKey) && this.editEnabled()) {
				me.map.removeLayer(this);
				me.editableLayers.removeLayer(this);
				me.set_value(JSON.stringify(me.editableLayers.toGeoJSON()));
			}
		}

		this.map.on('layeradd', (e) => {
			if(e.layer instanceof L.Marker) {
				e.layer.on('click', function(e){
					if ((e.originalEvent.ctrlKey || e.originalEvent.metaKey)) {
						me.map.removeLayer(this);
						me.editableLayers.removeLayer(this);
						me.set_value(JSON.stringify(me.editableLayers.toGeoJSON()));

					}
				});
			}
			if (e.layer instanceof L.Path) {
				e.layer.on('click', L.DomEvent.stop).on('click', deleteShape, e.layer);
				e.layer.on('dblclick', L.DomEvent.stop).on('dblclick', e.layer.toggleEdit);
			}
		});

		this.map.on('editable:drawing:commit', (e) => {
			this.editableLayers.addLayer(e.layer);
			this.set_value(JSON.stringify(this.editableLayers.toGeoJSON()));
		});

		this.map.on('editable:disable', (e) => {
			this.editableLayers.addLayer(e.layer);
			this.set_value(JSON.stringify(this.editableLayers.toGeoJSON()));
		});
	},

	add_non_group_layers(source_layer, target_group) {
		if (source_layer instanceof L.LayerGroup) {
			source_layer.eachLayer((layer) => {
				this.add_non_group_layers(layer, target_group);
			});
		} else {
			target_group.addLayer(source_layer);
		}
	}
});
