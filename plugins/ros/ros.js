(function()
{
  freeboard.loadDatasourcePlugin({
      "type_name"   : "ros",
      "display_name": "ROS",
      "description" : "Robot Operating System (rosbridge)",
      // **external_scripts** : Any external scripts that should be loaded before the plugin instance is created.
      "external_scripts" : [
        "http://cdn.robotwebtools.org/EventEmitter2/current/eventemitter2.min.js",
        "http://cdn.robotwebtools.org/roslibjs/current/roslib.min.js"
      ],
      "settings"    : [
        {
          "name"         : "server",
          "display_name" : "rosbridge Server",
          "type"         : "text",
          "default_value": "localhost",
          "description"  : "rosbridge Server",
                  "required" : true
        },        
        {
          "name"         : "topic",
          "display_name" : "topic",
          "type"         : "text",
          "default_value": "",
          "description"  : "ROS topic",
                  "required" : true
        },        
        {
          "name"         : "port",
          "display_name" : "Port",
          "type"         : "number",
          "default_value": 9090,
          "description"  : "server port",
                  "required" : true
        },
        {
          "name": "refresh",
          "display_name": "Refresh Every",
          "type": "number",
          "suffix": "seconds",
          "default_value": 5
        }      
      ],
      // **newInstance(settings, newInstanceCallback, updateCallback)** (required) : A function that will be called when a new instance of this plugin is requested.
      // * **settings** : A javascript object with the initial settings set by the user. The names of the properties in the object will correspond to the setting names defined above.
      // * **newInstanceCallback** : A callback function that you'll call when the new instance of the plugin is ready. This function expects a single argument, which is the new instance of your plugin object.
      // * **updateCallback** : A callback function that you'll call if and when your datasource has an update for freeboard to recalculate. This function expects a single parameter which is a javascript object with the new, updated data. You should hold on to this reference and call it when needed.
      newInstance   : function(settings, newInstanceCallback, updateCallback)
      {
        // myDatasourcePlugin is defined below.
        newInstanceCallback(new rossrc(settings, updateCallback));
      }
    });


    // ### Datasource Implementation
    //
    // -------------------
    // Here we implement the actual datasource plugin. We pass in the settings and updateCallback.
    var rossrc = function(settings, updateCallback)
    {
      var self = this;

      // Good idea to create a variable to hold on to our settings, because they might change in the future. See below.
      var currentSettings = settings;
      var updateTimer = null;

      var rosbridge_url = 'ws://' + currentSettings.server + ':' + currentSettings.port;
      var connected = false;
      var data;

      function updateRefresh(refreshTime) {
        if (updateTimer) {
          clearInterval(updateTimer);
        }

        updateTimer = setInterval(function () {
          self.updateNow();
          }, refreshTime);
      }

      updateRefresh(currentSettings.refresh * 1000);

      console.log('[ros] Attempting to connect to ', rosbridge_url);

      var ros = new ROSLIB.Ros({
        url : rosbridge_url
      });

      ros.on('connection', function() {
        connected = true;
        console.log('Connected to websocket server.');
      });

      ros.on('error', function(error) {
        console.log('Error connecting to websocket server: ', error);
      });

      ros.on('close', function() {
        console.log('Connection to websocket server closed.');
      });
      
      var listener = new ROSLIB.Topic({
        ros : ros,
        name : currentSettings.topic//,
        //messageType : 'std_msgs/String'
      });

      listener.subscribe(function(message) {
        console.log('Received message on ' + listener.name + ': ' + JSON.stringify(message));
        //listener.unsubscribe();
        data = message;
      });
      
      function getData()
      {
        console.log("getData");
        if (connected)
        {
          console.log("Sending");
          updateCallback(data);
        }
       // var conn = skynet.createConnection({
       //    "uuid": currentSettings.uuid,
       //    "token": currentSettings.token,
       //    "server": currentSettings.server, 
       //    "port": currentSettings.port
       //      }); 
         
       //   conn.on('ready', function(data){ 

       //    conn.on('message', function(message){

       //        var newData = message;
       //        updateCallback(newData);

       //         });

       //   });
        }

    

      // **onSettingsChanged(newSettings)** (required) : A public function we must implement that will be called when a user makes a change to the settings.
      self.onSettingsChanged = function(newSettings)
      {
        // Here we update our current settings with the variable that is passed in.
        currentSettings = newSettings;
        updateRefresh(currentSettings.refresh * 1000);
      }

      // **updateNow()** (required) : A public function we must implement that will be called when the user wants to manually refresh the datasource
      self.updateNow = function()
      {
        // Most likely I'll just call getData() here.
        getData();
      }

      // **onDispose()** (required) : A public function we must implement that will be called when this instance of this plugin is no longer needed. Do anything you need to cleanup after yourself here.
      self.onDispose = function()
      {
        clearInterval(updateTimer);
        updateTimer = null;
        //conn.close();
      }

      // Here we call createRefreshTimer with our current settings, to kick things off, initially. Notice how we make use of one of the user defined settings that we setup earlier.
    //  createRefreshTimer(currentSettings.refresh_time);
    }

}());