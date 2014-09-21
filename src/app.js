/**
 * MisterHouse controller for Pebble
 */

Array.prototype.sortByProp = function(p) {
 return this.sort(function(a,b){
  return (a[p] > b[p]) ? 1 : (a[p] < b[p]) ? -1 : 0;
 });
};

String.prototype.toCapitalize = function() { 
   return this.toLowerCase().replace(/^.|\s\S/g, function(a) { return a.toUpperCase(); });
};

var UI = require('ui');
var ajax = require('ajax');
var Settings = require('settings');

var sectionCount = 0;
var splashWindow = new UI.Card({title:"MisterHouse"});
var menu = new UI.Menu();

var parseState = function(title, data) {
    var items = [];
    
    for(var name in data) {
      var o = data[name];
      
      items.push({
        title:name.replace(/_/g, ' ').toCapitalize(),
        subtitle:o.state.toCapitalize(),
        name:name,
        state:o.state
      });
    }

    if(items.length > 0) {
      items.sortByProp('title');
      
      menu.section(sectionCount++, {
        title:title,
        items:items
      });
    }
};

var reloadObjects = function() {
  ajax({
    url: "http://" + Settings.option("host") + "/sub?json(types,fields=state)",
    type: 'json',
    },
    function(data) {
      console.log('Successfully fetched objects!');
      sectionCount = 0;
      if(data.types.Generic_Item.mode_security) {
        menu.section(sectionCount++, {
          title:"Security",
          items:[{title:"Status", subtitle:data.types.Generic_Item.mode_security.state.toCapitalize(), name:"mode_security", state:data.types.Generic_Item.mode_security.state}]
        });
        
      }
  
      parseState("Lights", data.types.Light_Item);
      parseState("Appliances", data.types.X10_Appliance);
      
      splashWindow.hide();
      menu.show();
    },
    function(error) {
      // Failure!
      console.log('Failed fetching objects: ' + error);
      splashWindow.body("Unable to connect to MisterHouse: " + error);
      menu.hide();
      splashWindow.show();
    }
  );
};

var setObjectState = function(name, state) {
  ajax({
      url: "http://" + Settings.option("host") + "/SET?" + name + "=" + state,
    },
    function(data) {
      console.log('Successfully set ' + name + " to " + state);
      reloadObjects();
    },
    function(error) {
      // Failure!
      console.log('Failed setting state: ' + error);
    }
  );
};

Settings.config(
  { url: 'http://c99.org/mh-pebble-config.html' },
  function(e) {
    console.log('opening configurable');
  },
  function(e) {
    console.log('closed configurable');
    if(Settings.option("host")) {
      splashWindow.body("Connecting");
      console.log("Connecting to host: " + Settings.option("host"));
      reloadObjects();
    }
  }
);

if(Settings.option("host")) {
  splashWindow.body("Connecting");
  console.log("Connecting to host: " + Settings.option("host"));
  reloadObjects();
} else {
  splashWindow.body("Hostname not configured");
}

splashWindow.show();

menu.on('select', function(e) {
  if(e.item.state == "armed") {
    setObjectState(e.item.name, "unarmed");
  } else if(e.item.state == "unarmed") {
    setObjectState(e.item.name, "armed");
  } else if(e.item.state == "off") {
    setObjectState(e.item.name, "on");
  } else {
    setObjectState(e.item.name, "off");
  }
});
