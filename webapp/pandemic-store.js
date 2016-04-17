var app = angular.module('pandemicStore', []);

app.service('Storage',
  function($window) {
    this.clear_all_data_and_reload_page = function() {
      $window.localStorage.clear();
      $window.location.href = BASE_URL;
    };
    this.get = function(key) {
      return $window.localStorage.getItem(PACKAGE + key);
    };
    this.set = function(key, value) {
      $window.localStorage.setItem(PACKAGE + key, value);
    };
    this.remove = function(key) {
      $window.localStorage.removeItem(PACKAGE + key);
    };
  });

app.service('Channel',
  function($rootScope) {
    this.channel = null;
    this.connected = false;
    this.sock = null;

    this.setup_channel = function(token, message_handler) {
      this.channel = new goog.appengine.Channel(token);
      this.sock = this.channel.open();
      this.sock.onopen = function() {
        this.connected = true;
        console.log("channel: opened");
      }.bind(this);
      this.sock.onmessage = function(msg) {
        console.log("channel: message received");
        console.log(msg.data);
        $rootScope.$apply(function() { message_handler(msg.data); });
      };
      this.sock.onerror = function(errObj) {
        console.log("channel: error "+errObj);
      };
      this.sock.onclose = function() {
        this.connected = false;
        console.log("channel: closed");
      }.bind(this);
    }.bind(this);
  });

app.service('GameStore',
  function($http, Channel, Storage) {
    this.do_watch_game = function(game_id) {
      var onSuccess = function(httpResponse) {
        var data = httpResponse.data;
        Storage.set('.current_game', game_id);
        Storage.set('.current_game.subscriber', data.subscriber_id);

        console.log("subscribe: got id "+data.subscriber_id);
        console.log("subscribe: channel token is "+data.channel);
        Channel.setup_channel(data.channel, handle_channel_message);

        return data.game;
      };

      return $http
        .post('s/games?subscribe=' + escape(game_id), '', {})
        .then(onSuccess, handle_ajax_error);
    };

    // TODO- more
  });

app.service('ResultStore',
  function() {
    // TODO
  });

app.service('ScenarioStore',
  function() {
    // TODO
  });
