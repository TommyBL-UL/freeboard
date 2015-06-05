(function()
{
  freeboard.loadDatasourcePlugin({
      "type_name"   : "ros_sub",
      "display_name": "ROS Subscriber",
      "description" : "Subscribe to ROS topics through rosbridge",
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
          "description"  : "Hostname of rosbridge Server",
                  "required" : true
        },        
        {
          "name"         : "topic",
          "display_name" : "Topic",
          "type"         : "text",
          "default_value": "",
          "description"  : "ROS Topic to Subscribe",
                  "required" : true
        },        
        {
          "name"         : "port",
          "display_name" : "rosbridge Port",
          "type"         : "number",
          "default_value": 9090,
          "description"  : "Port number of rosbridge server",
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
        newInstanceCallback(new rossubInstance(settings, updateCallback));
      }
    });


    // ### Datasource Implementation
    //
    // -------------------
    // Here we implement the actual datasource plugin. We pass in the settings and updateCallback.
    var rossubInstance = function(settings, updateCallback)
    {
      var self = this;

      var currentSettings = settings;
      var updateTimer = null;

      var rosbridge_url;
      var connected = false;
      var subscribed = false;
      var ros;
      var listener;
      var data;

      function connectRos()
      {
        if (connected) return;
        rosbridge_url = 'ws://' + currentSettings.server + ':' + currentSettings.port;
        console.log('[ros] Attempting to connect to ', rosbridge_url);

        
        ros = new ROSLIB.Ros({
          url : rosbridge_url
        });


        ros.on('connection', function() {
          connected = true;
          console.log('[ros] Connected to rosbridge server.');
        });

        ros.on('error', function(error) {
          // TODO: Communicate error to the UI
          connected = false;
          console.error('[ros] Error connecting to rosbridge server: ', error);
        });

        ros.on('close', function() {
          connected = false;
          console.log('[ros] Connection to rosbridge server closed.');
        });
        
        console.log('[ros] Exiting connect()')
      }

      function disconnectRos()
      {
        if (connected)
        {
          console.log('[ros] Closing connection to ', rosbridge_url);
          ros.close();
          connected = false;
        }
      }

      function subscribeRos()
      {
        console.log('[ros] Subscribing to ', currentSettings.topic);
        listener = new ROSLIB.Topic({
          ros : ros,
          name : currentSettings.topic
          // No message type is intentional
        });

        listener.subscribe(function(message) {
          if (!subscribed)
          {
            console.log('[ros] Message received on ', listener.name);
            subscribed = true;  
          }
          data = message;
        });
      }

      function unsubscribeRos()
      {
        if (subscribed)
        {
          console.log('[ros] Unsubscribing from', listener.name);
          listener.unsubscribe();
        }
      }

      function updateRefresh(refreshTime) {
        if (updateTimer) {
          clearInterval(updateTimer);
        }

        updateTimer = setInterval(function () {
          self.updateNow();
          }, refreshTime);
      }      
    
      function getData()
      {
        if (connected)
        {
          updateCallback(data);
        }
      }

      // **onSettingsChanged(newSettings)** (required) : A public function we must implement that will be called when a user makes a change to the settings.
      self.onSettingsChanged = function(newSettings)
      {
        console.log("New settings.");
        // Here we update our current settings with the variable that is passed in.
        oldSettings = currentSettings;
        currentSettings = newSettings;
        
        if (
          connected && 
          (
            newSettings.server !== oldSettings.server || 
            newSettings.port !== oldSettings.port))
        {
          unsubscribeRos
          disconnectRos();
          connectRos();
          subscribeRos();
        }
        else if (subscribed && newSettings.topic !== oldSettings.topic) 
        {
          unsubscribeRos();
          subscribeRos();
        };

        // if (subscribed)
        // {
        //   unsubscribe();
        // }

        
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
        unsubscribeRos();
        disconnectRos();
        //conn.close();
      }

      connectRos();
      updateRefresh(currentSettings.refresh * 1000);
      subscribeRos();
    }

}());
