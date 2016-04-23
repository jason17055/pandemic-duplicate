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
  function($http, Channel, ScenarioStore, Storage) {
    /** @return {Promise<string>} */
    this.create_tournament_game = function(tournament_id, event_id, scenario_id) {
      return ScenarioStore.get(scenario_id).then(
        function(scenario) {
          var game_id = generate_new_game_id(scenario_id);

          Storage.set('.game.' + game_id + '.scenario', scenario_id);
          Storage.set('.game.' + game_id + '.tournament', tournament_id + '/' + event_id);
          Storage.set('.scenario.' + scenario_id + '.current_game', game_id);

          G = load_game(game_id);
          start_publishing_game(game_id);

          return game_id;
        });
    };

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
  function(Storage) {
    this.create = function(V) {
      var VV = JSON.stringify(V);
      var result_id = (""+CryptoJS.SHA1(VV)).substring(0,18);
      Storage.set('.result.' + result_id, VV);
      Storage.set('.my_result.' + V.scenario_id, result_id);
      return result_id;
    };
  });

app.service('ScenarioStore',
  function($http, $q, Storage) {
    this.parse_scenario = function(scenario_id, raw) {
      var s = Pandemic.GameState.deserialize(scenario_id, raw);
      s.get_caption = function() {
        return scenario_name(scenario_id);
      };
      s.get_seats = function() {
        var list = [];
        for (var i = 1; i <= s.rules.player_count; i++) {
          list.push(i);
        }
        return list;
      };
      s.get_role = function(pid) {
        return s.roles[pid];
      };
      s.get_role_icon = function(pid) {
        return get_role_icon(s.roles[pid]);
      };
      return s;
    };

    /** @return {Promise<Scenario>} */
    this.get = function(scenario_id) {
      var raw = Storage.get('.scenario.' + scenario_id);
      if (raw) {
        var s = this.parse_scenario(scenario_id, raw);
        var deferred = $q.defer();
        deferred.resolve(s);
        return deferred.promise;
      }

      return $http.get('/s/scenarios', {params: {'id': scenario_id}}).then(
          function(httpResponse) {
            save_downloaded_scenario(scenario_id, httpResponse.data);
            return this.parse_scenario(scenario_id, Storage.get('.scenario.' + scenario_id));
          }.bind(this));
    };
  });

app.service('TournamentStore',
  function($http, $q) {
    this.get = function(tournament_id) {
      return $http
        .get('/s/tournaments', {params: {'id': tournament_id}})
        .then(function(httpResponse) {
          return httpResponse.data;
        });
    };
    this.getAsAdmin = function(tournament_id) {
      return $http
        .get('/s/tournaments', {params: {'id': tournament_id, 'admin': '1'}})
        .then(function(httpResponse) {
          return httpResponse.data;
        });
    };
    this.list = function() {
      return $http
        .get('/s/tournaments')
        .then(function(httpResponse) {
          return httpResponse.data;
        });
    };
    this.update = function(tournament_id, data) {
      var formData = {
        'tournament': tournament_id
      };
      for (var k in data) {
        formData[k] = data[k];
      }
      return $http
        .post('/s/tournaments/update', formData);
    };
  });
