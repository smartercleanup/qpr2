define( [ 
    'jquery'
    ,'underscore'
    ,'backbone'
    //models
    ,'models/qpr/Collection'
    ,'models/qpr/Feature'
    ,'models/ft/FT'
    ,'models/crowdmap/crowdmap'
    //overlays
    ,'views/gmaps/gmarkers_view'
    ,'views/gmaps/gpolygons_view'
    ,'views/gmaps/ginfowins_view'
    ,'views/gmaps/gclusterer_view'
    ,'views/gmaps/gcanvaslayer_view'
    //views
    ,'views/ui/LayerControlView'
    ], 

function( $, _, Backbone

  ,Collection
  ,Feature
  ,FT
  ,Crowdmap

  ,MarkersView
  ,PolygonsView 
  ,InfowinsView 
  ,ClustererView 
  ,GCanvasLayerView 

  ,LayerControlView 

  )
{

'use strict';

var LayerCtrler = function( opt, mapview )
{
  _.extend( this, Backbone.Events );

  var self = this;
  var name = opt.name;
  var _parsed = false;

  // copy ref [icon/marker].url 
  // from view to model
  ( opt.model.icon || (opt.model.icon = opt.view.icon ) );
  ( opt.model.marker || (opt.model.marker = opt.view.marker ) );


  var collection = layer_factory.collection
    [opt.model.type]
      .make( name, opt.model );
 
  var overlays = layer_factory.overlays
    .make(name, opt.view, collection, mapview); 

  collection.on(
    'parse:complete'
    ,function()
    {
      _parsed = true;
      self.trigger('parse:complete');
    });

  collection.on(
    'add'
    ,function( feature )
    {
      self.trigger('add:feature', feature);
    });

  if ( overlays.infowins ) 
    overlays.infowins.on(
      'select:feature'
      ,function( feature )
      {
        self.trigger('select:feature', feature);
      });


  // ui control

  var ctrl_view = new LayerControlView({
    name: name
    ,el: '.layer.'+name
    ,visible: opt.view.visible
  });

  ctrl_view.on(
    'change:visibility',
    function( v )
    {
      _visible( v );
    });

  function _visible( v )
  {
    _.each( overlays, function( ol )
    {
      ol.visible( v );
    });

    self.trigger( 'change:visibility', v );
  }

  // TODO hacer getters
  // model == collection ?? ;)
  this.model = collection;
  this.view = { overlays: overlays };

  this.name = function() { return name; }
  this.parsed = function() { return _parsed; } 

  this.visible = function( v )
  {
    ctrl_view.visible( v );
    _visible( v );
  }

  this.dispose = function()
  {
    // TODO dispose overlays
    collection.dispose();
    ctrl_view.off();
    ctrl_view.remove();
    this.off();
  }

};

var layer_factory = 
{
  collection: {
    fusiontables: {}
    ,crowdmap: {}
  }
  ,overlays: {}
};

layer_factory.collection.fusiontables.make = 
function( name, opt )
{
  //capitalize name
  var parserclass = name.charAt(0).toUpperCase() + name.slice(1);

  var parser = new FT.Parsers
    [parserclass]({
      name: name
      ,icon: opt.icon
    });

  var api = new FT.API({
    ftid: opt.ftid
    ,read: { 
      cols: parser.db()
      ,filters: parser.filters()
    }
  });

  var collection = new Collection([], {
    model: Feature
    ,name: name
    ,api: api
    ,parser: parser
  }); 

  collection.listenTo( 
    parser
    ,'add:feature'
    ,collection.add
    ,collection );

  return collection;
}

layer_factory.collection.crowdmap.make = 
function( name, opt )
{
  //capitalize name
  var parserclass = name.charAt(0).toUpperCase() + name.slice(1);

  var parser = new Crowdmap.Parsers
    [parserclass]({
      name: name
      ,url: opt.url 
      ,icon: opt.icon
    });

  var api = new Crowdmap.API({
    url: opt.url 
    ,read: {
      params: parser.db()
    }
  });

  var collection = new Collection([], {
    model: Feature
    ,name: name
    ,api: api
    ,parser: parser
  }); 

  collection.listenTo( 
    parser
    ,'add:feature'
    ,collection.add
    ,collection );

  return collection;
} 

layer_factory.overlays.make = 
function( name, opt, model, mapview )
{ 

  var ol = {

  // default overlays

  markers: new MarkersView({
    name: name
    ,model: model
    ,map: mapview.map()
    ,color: opt.color
    ,visible: opt.visible
    //,icon: opt.icon
    ,marker: opt.marker
  })

  ,polygons: new PolygonsView({
    name: name
    ,model: model
    ,map: mapview.map()
    ,color: opt.color
    ,visible: opt.visible
  })

  ,infowins: new InfowinsView({
    name: name
    ,model: model
    ,map: mapview.map()
  })

  ,clusterer: new ClustererView({
    name: name
    ,model: model
    ,map: mapview.map()
    ,visible: opt.visible
    //,icon: opt.icon
    ,marker: opt.marker
  })

  //,canvas_icons: new GCanvasLayerView({
    //name: name
    //,model: model
    //,map: mapview.map()
    //,color: opt.color
    //,visible: opt.visible
    //,scale: false
    //,size: opt.icon.background_size || 26

    ////feed canvas with list of latlng points
    //,points: function()
    //{
      //return _.map(
        //ol.clusterer.clusters()
        //,function( cluster )
        //{
          //return cluster.getCenter();
        //});
    //}
  //}) 

  }; //end of default overlays


  // wire default overlays

  ol.clusterer.listenTo( 
      ol.markers,  
      'added:marker',
      ol.clusterer.marker_added, 
      ol.clusterer );

  ol.infowins.listenTo( 
      ol.markers,  
      'select:feature',
      ol.infowins.infowin, 
      ol.infowins );

  ol.infowins.listenTo( 
      ol.polygons,  
      'select:feature',
      ol.infowins.infowin, 
      ol.infowins );

  //ol.canvas_icons.listenTo( 
    //ol.clusterer,
    //'update', 
    //ol.canvas_icons.render,
    //ol.canvas_icons );


  // optional overlays

  if ( opt.overlays && opt.overlays
      .indexOf( 'canvas_points' ) > -1 )
  {

    ol.canvas_points =
      new GCanvasLayerView({
        name: name
        ,model: model
        ,map: mapview.map()
        ,color: opt.color
        ,visible: opt.visible
        //,points: function()
        //{
          //var latlngs = [];
          //_.each( 
            //ol.markers.markers()
            //,function( m )
            //{
              //latlngs.push(m.getPosition());
            //});
          //return latlngs;
        //}
      });

    ol.canvas_points.listenTo( 
      model, 'add', 
      ol.canvas_points.feature_added,
      ol.canvas_points );

  } 

  return ol;

}

//darktheme
//layer_factory.overlays.make = 
//function( name, opt, model )
//{ 

  //var ol = {

  //// default overlays

  //polygons: new PolygonsView({
    //name: name
    //,model: model
    //,map: mapview.map()
    //,color: opt.color
    //,visible: opt.visible
  //})

  //,infowins: new InfowinsView({
    //name: name
    //,model: model
    //,map: mapview.map()
  //})

  //,canvas_points: new GCanvasLayerView({
    //name: name
    //,model: model
    //,map: mapview.map()
    //,color: opt.color
    //,visible: opt.visible
    //,size: opt.canvas_size
  //})

  //}; //end of default overlays


  //// wire default overlays

  //ol.canvas_points.listenTo( 
    //model, 'add', 
    //ol.canvas_points.feature_added,
    //ol.canvas_points );

  //return ol;

//}

return LayerCtrler;

});

