define( [ 
    'jquery' 
    ,'underscore'
    ,'backbone'
    ,'models/qpr/Feature'
    ,'utils'
    ],  

function( $, _, Backbone, Feature, utils ) 
{

'use strict';

function Basurales( opt ) 
{
  _.extend( this, Backbone.Events );

  this.opt = opt;

  this.db = function()
  {
    return _.values( _db );
  }

  var _db = {
    name: 'name'
    //description tiene el nombre del basural
    //en los poligonos (name en polis es Área)
    ,description: 'description'
    ,geom: 'geometry'
  };

  this.dbi = {};
  var i = 0;
  for ( var k in _db )
    this.dbi[k] = i++;

}

Basurales.prototype.parse =
function( data, sync_opt )
{
  //console.log( 'basurales.parse', arguments )

  var opt = this.opt;

  var name
    ,description
    ,geom
    ,coordarr
    ,polyarr;
    //,descripcion; 

  var rows = data.rows;
  //var row, i = rows.length;

  //while( i-- )
  function parse( row )
  {
    //row = rows[i];

    name = row[ this.dbi.name ];
    description = row[ this.dbi.description ];
    geom = row[ this.dbi.geom ].geometry;

    //descripcion = 'basural ' + name;

    switch ( geom.type )
    {
      case 'Point':

        coordarr = utils
          .reverse_point(
              geom.coordinates) 

        this.trigger('add:feature',new Feature({ 
          id: name
          ,properties: {
            id: name
            ,type: opt.name
            ,titulo: name
            //,resumen: descripcion
            //,descripcion: descripcion
            ,icon: opt.icon
          }
          ,geometry: {
            type: 'Point'
            ,coordinates: coordarr 
          }
        }) );

        break;

      case 'Polygon':

        polyarr = utils
          .reverse_polygon(
              geom.coordinates[0] );

        var id = description + _.uniqueId(' polygon ');
        this.trigger('add:feature',new Feature({ 
          id: id
          ,properties: {
            id: id
            ,type: opt.name
            ,titulo: description
            //,resumen: descripcion
            //,descripcion: descripcion
            ,icon: opt.icon
          }
          ,geometry: {
            type: 'Polygon'
            ,coordinates: polyarr
          }
        }) );

        break;

    }
  }

  utils.process( {
    list: rows
    ,iterator: parse
    ,context: this
  });

};

return Basurales;

});
