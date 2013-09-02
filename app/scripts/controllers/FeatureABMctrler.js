define( [ 
    'jquery'
    ,'underscore'
    ,'backbone'
    ,'models/qpr/Collection'
    ,'models/ft/FT'
    ,'views/FeatureABMview'
    ,'d3'
    ], 

function( $, _, Backbone, 
  Collection, FT, FeatureABMview, d3 ) 
{

'use strict';

var FeatureABMctrler = function( opt )
{
  _.extend( this, Backbone.Events );

  var self = this;

  self.close = function() {}

  var layers = opt.layers;
  var feature = opt.feature;

  FeatureABMctrler
  .factory.model[ opt.config.type ]
  .make( opt, function( collection )
  {

    var view = new FeatureABMview({
      collection: collection
      ,feature: feature
      ,layers: layers
    }); 

    collection.on( 'sync destroy', 
      view.update_btns, view );

    view.on( 'close', function()
    {
      this.trigger('close');
      view.off();
    }
    , this );

    view.on( 'upload', function( e )
    {
      var props = e.feature.get('properties');
      var format = d3.time.format("%Y-%m-%d");

      collection.create( new HistoriaModel({ 
        // no seteamos id al crear uno nuevo
        // para q sea isNew
        hid: e.hid
        ,tipo: props.type
        ,link_id: props.id 
        ,fecha: format( new Date() ) 
      })
      ,{
        wait: true
        ,success: function( model, res, opt )
        {
          // ahora si seteamos el id 
          // para q no sea isNew
          model.set( 'id', model.get('hid') );
          view.spin( false );
        }
      });

      view.spin( true );

    });

    view.on( 'remove', function( data )
    {
      var hmodel = collection.find( function( h )
      {
        return h.get('hid') === data.hid;
      });

      if ( hmodel ) 
      {
        hmodel.destroy({
          wait: true
          ,success: function( model, res, opt )
          {
            view.spin( false );
          }
        });

        view.spin( true );
      }
    });

    $('body').append( view.render().el );

    collection.fetch();

    self.close = function()
    {
      //va a triggerear evento close de view
      view.close();
      collection.off();
    }

  }); 

};

FeatureABMctrler
.factory = {
  model: {
    fusiontables: {
      make: function(opt){}
    }
  }
};

FeatureABMctrler
.factory.model.fusiontables.make = 
function( opt, callback )
{
  var layers = opt.layers;
  var fid = opt.feature.get('properties').id;
  var ftid = opt.config.ftid;

  var parser = new FT.Parsers.Historia({
    name: 'links_historias'
  });

  var api = new FT.API({
    ftid: ftid
    ,read: {
      cols: parser.db()
      ,filters: [
        ' WHERE '
        ,'link_id'
        ,' = '
        ,'\''+ fid +'\''
      ]
      .join('') 
    }
  }); 

  api.access( function( success )
  { 

    if ( ! success ) return;

    var collection = new Collection([], {
      model: HistoriaModel
      ,name: 'links_historias'
      ,api: api
      ,parser: parser
    });

    collection.listenTo( 
      parser, 
      'add:historia', 
      function( data )
      {
        collection.add( new HistoriaModel(
          // hay q pasar id al crear uno 
          // que viene del parser (fetch)
          // i.e. ya existe en la DB 
          _.extend( data, { id: data.hid } ) 
        ));
      });

    callback( collection );

  });
};

var HistoriaModel = Backbone.Model.extend({

  defaults: {
    ROWID: 'x ROWID'
    ,hid: 'x id'
    ,tipo: 'x tipo'
    ,link_id: 'x link id'
    ,fecha: 'x fecha'
  }

  ,sync: function( method, model, sync_opt )
  {
    //console.log('h model sync',arguments)

    var opt = model.collection.opt;
    var api = opt.api;

    function success( res ) 
    {
      if ( sync_opt.success ) 
        sync_opt.success( res );

      model.trigger('sync',model,res,sync_opt);
    }

    function error( res ) 
    {
      if ( sync_opt.error ) 
        sync_opt.error( res );
    }  

    switch ( method ) 
    {
      case 'read':
      return api.read(model, success, error);

      case 'create':
      return api.create(model,success,error);

      case 'update':
      return api.update(model,success,error);

      case 'patch':
      return api.patch(model,success,error);

      case 'delete':
      return api.destroy(model,success,error); 
    }
  }

});

return FeatureABMctrler;

});

