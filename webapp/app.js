app = angular.module('pandemicDuplicateApp', ['pandemicStore', 'ui.router']);

app.config(
  function($stateProvider, $urlRouterProvider) {
    $stateProvider
      .state('welcome', {
        url: '/',
        templateUrl: 'pages/welcome.ng',
        controller: 'WelcomePageController',
        controllerAs: 'c'
        })
      .state('clear', {
        url: '/clear',
        onEnter: function(Storage) {
          Storage.clear_all_data_and_reload_page();
        }})
      .state('create_game', {
        url: '/params',
        templateUrl: 'pages/create_game.ng',
        controller: 'CreateGamePageController',
        controllerAs: 'c'
        })
      .state('review_results', {
        url: '/review_results',
        templateUrl: 'pages/review_results.ng',
        controller: 'ReviewResultsPageController',
        controllerAs: 'c'
        })
      .state('join_game', {
        url: '/join_network_game',
        templateUrl: 'pages/join_game.ng',
        controller: 'JoinGamePageController',
        controllerAs: 'c'
        })
      .state('options', {
        url: '/options',
        templateUrl: 'pages/options.ng',
        controller: 'OptionsPageController',
        controllerAs: 'c'
        })
      .state('subscription', {
        url: '/subscription',
        templateUrl: 'pages/subscription.ng',
        controller: 'SubscriptionPageController',
        controllerAs: 'c'
        })
      .state('join_network_game', {
        url: '/join_network_game/:q',
        templateUrl: 'pages/join_game_pick.ng',
        controller: 'JoinGamePickPageController',
        controllerAs: 'c',
        resolve: {
          'data': function($http, $stateParams) {
            return $http
              .get('/s/games', {params: {'search_player': $stateParams['q']}})
              .then(function(httpResponse) { return httpResponse.data; });
          }
        }})
      .state('search_results', {
        url: '/search_results/:q',
        templateUrl: 'pages/found_completed_games.ng',
        controller: 'FoundCompletedGamesPageController',
        controllerAs: 'c',
        resolve: {
          'data': function($http, $stateParams) {
            return $http
              .get('/s/results', {params: {'q': $stateParams['q']}})
              .then(function(httpResponse) { return httpResponse.data; });
          }
        }})
      .state('player_names', {
        url: '/names/:rulespec',
        templateUrl: 'pages/player_names.ng',
        controller: 'PlayerNamesPageController',
        controllerAs: 'c'
        })
      .state('pick_scenario', {
        url: '/pick_scenario/:rulespec',
        templateUrl: 'pages/pick_scenario.ng',
        controller: 'PickScenarioPageController',
        controllerAs: 'c'
        })
      .state('generate_game', {
        url: '/generate_game/:rulespec',
        templateUrl: 'pages/generate_game.ng',
        controller: 'GenerateGamePageController',
        controllerAs: 'c'
        })
      .state('generate', {
        url: '/generate_scenario?tournament',
        templateUrl: 'pages/generate_game.ng',
        controller: 'GenerateGamePageController',
        controllerAs: 'c'
        })
      .state('deck_setup', {
        url: '/scenario/:scenario_id/deck_setup',
        templateUrl: 'pages/deck_setup.ng',
        controller: 'DeckSetupPageController',
        controllerAs: 'c',
        resolve: {
          'scenarioData': function($stateParams, ScenarioStore) {
            return ScenarioStore.get($stateParams['scenario_id']);
          }
        }})
      .state('scenario_board_setup', {
        url: '/scenario/:scenario_id/board_setup',
        templateUrl: 'pages/board_setup.ng',
        controller: 'BoardSetupPageController',
        controllerAs: 'c',
        resolve: {
          'data': function($stateParams, ScenarioStore) {
            return ScenarioStore.get($stateParams['scenario_id'])
              .then(function(scenarioData) {
                return {scenario: scenarioData};
              });
          }
        }})
      .state('scenario_player_setup', {
        url: '/scenario/:scenario_id/player_setup',
        templateUrl: 'pages/player_setup.ng',
        controller: 'PlayerSetupPageController',
        controllerAs: 'c',
        resolve: {
          'data': function($stateParams, ScenarioStore) {
            return ScenarioStore.get($stateParams['scenario_id'])
              .then(function(scenarioData) {
                return {scenario: scenarioData};
              });
          }
        }})
      .state('board_setup', {
        url: '/:game_id/board_setup',
        templateUrl: 'pages/board_setup.ng',
        controller: 'BoardSetupPageController',
        controllerAs: 'c',
        resolve: {
          'data': function($stateParams, GameStore, ScenarioStore) {
            var game_id = $stateParams['game_id'];
            var gameData = GameStore.load_game(game_id);
            return ScenarioStore.get(gameData.scenario_id)
              .then(function(scenarioData) {
                return {
                  'scenario': scenarioData,
                  'game': gameData
                };
              });
          }
        }})
      .state('player_setup', {
        url: '/:game_id/player_setup',
        templateUrl: 'pages/player_setup.ng',
        controller: 'PlayerSetupPageController',
        controllerAs: 'c',
        resolve: {
          'data': function($stateParams, GameStore, ScenarioStore) {
            var game_id = $stateParams['game_id'];
            var gameData = GameStore.load_game(game_id);
            return ScenarioStore.get(gameData.scenario_id)
              .then(function(scenarioData) {
                return {
                  'scenario': scenarioData,
                  'game': gameData
                };
              });
          }
        }})
      .state('results', {
        url: '/:scenario_id/results',
        templateUrl: 'pages/results.ng',
        controller: 'ResultsPageController',
        controllerAs: 'c'
        })
      .state('active_game', {
        url: '/:game_id/{turn:T[0-9]+|watch}',
        templateUrl: 'pages/game.ng',
        controller: 'CurrentGameController',
        controllerAs: 'game',
        resolve: {
          'isPlaying': function($stateParams) {
            return $stateParams['turn'] != 'watch';
          },
          'gameData': function($stateParams, GameStore) {
            var m = $stateParams['turn'].match(/^T([0-9]+)$/);
            if (m) {
              return GameStore.load_game_at($stateParams['game_id'], m[1]);
            } else if ($stateParams['turn'] == 'watch') {
              return GameStore.do_watch_game($stateParams['game_id']);
            } else {
              // TODO- return an error
              alert('invalid url');
            }
          }
        },
        abstract: true
        })
      .state('active_game.main', {
        url: '',
        templateUrl: 'pages/game/main.ng'
        })
      .state('active_game.discards', {
        url: '/discards',
        templateUrl: 'pages/game/discards.ng',
        controller: 'ShowDiscardsPageController',
        controllerAs: 'c'
        })
      .state('active_game.discover_cure', {
        url: '/discover_cure',
        templateUrl: 'pages/game/discover_cure.ng',
        controller: 'DiscoverCurePageController',
        controllerAs: 'c'
        })
      .state('active_game.virulent_strain', {
        url: '/virulent_strain',
        templateUrl: 'pages/game/virulent_strain.ng',
        controller: 'VirulentStrainPageController',
        controllerAs: 'c'
        })
      .state('active_game.new_assignment', {
        url: '/new_assignment',
        templateUrl: 'pages/game/new_assignment.ng',
        controller: 'NewAssignmentPageController',
        controllerAs: 'c'
        })
      .state('active_game.resilient_population', {
        url: '/resilient_population',
        templateUrl: 'pages/game/resilient_population.ng',
        controller: 'ResilientPopulationPageController',
        controllerAs: 'c'
        })
      .state('active_game.infection_rumor', {
        url: '/infection_rumor',
        templateUrl: 'pages/game/infection_rumor.ng',
        controller: 'InfectionRumorPageController',
        controllerAs: 'c'
        })
      .state('active_game.play_special', {
        url: '/play_special',
        templateUrl: 'pages/game/special_event.ng',
        controller: 'SpecialEventPageController',
        controllerAs: 'c'
        })
      .state('active_game.retrieve_special', {
        url: '/retrieve_special',
        templateUrl: 'pages/game/special_event.ng',
        controller: 'SpecialEventPageController',
        controllerAs: 'c'
        })
      .state('tournaments', {
        url: '/tournament',
        templateUrl: 'pages/tournaments.ng',
        controller: 'TournamentsPageController',
        controllerAs: 'c',
        resolve: {
          'tournamentList':
            function(TournamentStore) {
              return TournamentStore.list();
            }
        }})
      .state('tournament_pick_scenario', {
        url: '/tournament/:tournament',
        templateUrl: 'pages/tournament_pick_scenario.ng',
        controller: 'TournamentPickScenarioPageController',
        controllerAs: 'c',
        resolve: {
          'tournament':
            function(TournamentStore, $stateParams) {
              return TournamentStore.get($stateParams['tournament']);
            }
        }})
      .state('manage_tournament', {
        url: '/manage_tournament/:tournament',
        templateUrl: 'pages/tournament_manage.ng',
        controller: 'TournamentManagePageController',
        controllerAs: 'c',
        resolve: {
          'tournament':
            function(TournamentStore, $stateParams) {
              return TournamentStore.getAsAdmin($stateParams['tournament']);
            }
        }})
      .state('tournament_manage_event', {
        url: '/manage_tournament/:tournament/event?scenario&event',
        templateUrl: 'pages/tournament_manage_event.ng',
        controller: 'TournamentManageEventPageController',
        controllerAs: 'c',
        resolve: {
          'eventData':
            function(ScenarioStore, TournamentStore, $stateParams) {
              return TournamentStore
                .getAsAdmin($stateParams['tournament'])
                .then(function(tournament) {
                  var eventData = null;
                  var scenarioId = null;
                  var eventId = $stateParams['event'];
                  if (eventId) {
                    for (var i = 0; i < tournament.all_events.length; i++) {
                      if (tournament.all_events[i].id == eventId) {
                        eventData = tournament.all_events[i];
                        scenarioId = eventData.scenario;
                      }
                    }
                  }
                  if ($stateParams['scenario']) {
                    scenarioId = $stateParams['scenario'];
                  }
                  if (scenarioId) {
                    return ScenarioStore.get(scenarioId)
                      .then(function(scenarioData) {
                        return {
                          tournament: tournament,
                          event: eventData,
                          scenario: scenarioData
                        };
                      });
                  }
                });
            }
        }})
      .state('404', {});
    $urlRouterProvider.when('', '/');
    $urlRouterProvider.otherwise(
      function($injector, $location) {
        $injector.invoke(function($state) {
          $state.go('404');
        });
      });
  });

app.factory('Options',
  function() {
    load_options();
    return CFG;
  });

app.factory('StateService',
  function() {
    return {
      go: function(rel_url) {
        if (rel_url != null) {
          history.pushState(null, null, BASE_URL + '#/' + rel_url);
        } else {
          history.pushState(null, null, BASE_URL);
        }
      }
    };
  });

app.factory('GameService',
  function($state, Storage) {
    var g = {};
    g.navigate_to_current_turn = function() {
      $state.go('active_game.main', {game_id: G.game_id, turn: 'T' + G.time});
    };
    g.set_move = function(m) {
      var timestr = new Date().toISOString();
      Storage.set('.scenario.' + G.scenario_id + '.last_played', timestr);
      if (!scenario_started(G.scenario_id)) {
        Storage.set('.scenario.' + G.scenario_id + '.first_played', timestr);
      }

      var lastTime = +Storage.get('.game.' + G.game_id + '.last_time') || 0;
      if (G.time > lastTime) {
        Storage.set('.game.' + G.game_id + '.last_time', G.time);
        Storage.set('.game.' + G.game_id + '.last_played', timestr);
      }

      Storage.set('.game.' + G.game_id + '.T' + G.time, m);

      G.do_move(m);
      g.navigate_to_current_turn();
    };
    g.should_confirm = function() {
      var lastTime = +Storage.get('.game.' + G.game_id + '.last_time');
      if (G.time <= lastTime) {
        return false;
      }
      var today = new Date();
      var d = new Date();
      d.setTime(Date.parse(Storage.get('.game.' + G.game_id + '.last_played')));
      var secondsAgo = Math.ceil((today.getTime() - d.getTime()) / 1000);
      return secondsAgo < 6;
    };
    return g;
  });

app.controller('TopController',
  function($rootScope, $scope, $state, StateService, Options, GameService) {
    $rootScope.$on('$stateChangeSuccess',
      function(evt) {
        // Nothing for now...
      });
    this.$state = $state;
    $scope.$watch(
      function() { return Options.game_detail_level; },
      function(newValue, oldValue) {
        this.game_detail_level = newValue;
      }.bind(this));
    this.game_detail_level = Options.game_detail_level;
  });

app.controller('WelcomePageController',
  function($state, Storage) {
    this.has_current_game = function() {
      var scenario_id = Storage.get('.current_game.scenario');
      return Boolean(scenario_id);
    };

    this.resume_game_clicked = function() {
      var game_id = Storage.get('.current_game');
      if (game_id == null) {
        return false;
      }

      var time_str = Storage.get('.game.' + game_id + '.time');
      if (time_str != null) {
        $state.go('active_game.main', {game_id: game_id, turn: 'T' + time_str});
      }
      else {
        $state.go('player_setup', {game_id: game_id});
      }

      return;
    };
  });

app.controller('OptionsPageController',
  function($state, $window, Options, Storage) {
    var f = document.options_form;

    var save_options_form = function() {
      Options.base_game_version = f.base_game_version.value;
      Options.has_on_the_brink = f.has_on_the_brink.checked;
      Options.has_in_the_lab = f.has_in_the_lab.checked;
      Options.has_state_of_emergency = f.has_state_of_emergency.checked;
      Options.game_detail_level = +f.game_detail_level.value;

      Storage.set('.base_game_version', Options.base_game_version);
      Storage.set('.has_on_the_brink', Options.has_on_the_brink ? 'true' : 'false');
      Storage.set('.has_in_the_lab', Options.has_in_the_lab ? 'true' : 'false');
      Storage.set('.has_state_of_emergency', Options.has_state_of_emergency ? 'true' : 'false');
      Storage.set('.game_detail_level', Options.game_detail_level);
      load_options();
    };

    // Populate form based on values in Storage.
    f.base_game_version.value = Options.base_game_version;
    f.has_on_the_brink.checked = Options.has_on_the_brink;
    f.has_in_the_lab.checked = Options.has_in_the_lab;
    f.has_state_of_emergency.checked = Options.has_state_of_emergency;
    f.game_detail_level.value = Options.game_detail_level;

    // Watch the form for changes.
    f.base_game_version.onchange = save_options_form;
    f.has_on_the_brink.onchange = save_options_form;
    f.has_in_the_lab.onchange = save_options_form;
    f.has_state_of_emergency.onchange = save_options_form;
    f.game_detail_level.onchange = save_options_form;

    this.subscription_clicked = function() {
      $state.go('subscription');
    };
    this.clear_storage_clicked = function() {
      var r = confirm("Clear localStorage? This will erase all settings saved on this device.");
      if (r) {
        localStorage.clear();
      }
      location.reload();
    };
    this.back_clicked = function() {
      $window.history.back();
    };
  });

app.controller('SubscriptionPageController',
  function($window) {
    this.get_username = function() {
      return S.userName;
    };
    this.is_logged_in = function() {
      return Boolean(S.userName);
    };
    this.login_clicked = function() {
      if (S.loginUrl) {
        $window.location.href = S.loginUrl;
      } else {
        console.log("no login url");
        console.log(JSON.stringify(S));
      }
    };
    this.logout_clicked = function() {
      if (S.logoutUrl) {
        $window.location.href = S.logoutUrl;
      }
    };
    this.back = function() {
      $window.history.back();
    };
  });

app.controller('CreateGamePageController',
  function($state) {
    this.submit_create_game_form = function() {
      var f = document.create_game_form;
      var pcount = f.player_count.value;
      $state.go('player_names', {rulespec: pcount + 'p'});
    };
  });

app.controller('GenerateGamePageController',
  function($state, GameStore, Storage) {
    init_generate_game_page($('#generate_game_page'), $state.params['rulespec']);
    if ($state.params['tournament']) {
      this.for_tournament = $state.params['tournament'];
    } else {
      this.for_tournament = null;
    }
    if ($state.params['rulespec']) {
      var m = $state.params['rulespec'].match(/^(\d+)p$/);
      if (m) {
        this.player_count = m[1];
      } else {
        this.player_count = '2';
      }
      this.player_count_fixed = true;
    } else {
      this.player_count = '2';
      this.player_count_fixed = false;
    }
    this.submit = function() {
      var f = document.generate_game_form;
      var rules = {
          'player_count': +this.player_count,
          'level': +f.level.value,
          'on_the_brink': f.on_the_brink.checked,
          'in_the_lab': f.in_the_lab.checked,
          'state_of_emergency': f.state_of_emergency.checked,
          'virulent_strain': f.virulent_strain.checked,
          'lab_challenge': f.lab_challenge.checked,
          'mutation_challenge': f.mutation_challenge.checked,
          'worldwide_panic': f.worldwide_panic.checked,
          'quarantines': f.quarantines.checked,
          'hinterlands_challenge': f.hinterlands_challenge.checked,
          'emergency_event_challenge': f.emergency_event_challenge.checked,
          'superbug_challenge': f.superbug_challenge.checked
          };
      var gen_options = {
          'nobase2013': f.nobase2013.checked
          };
      var scenario = generate_scenario(rules, gen_options);
      var scenario_id = scenario.scenario_id;
      trigger_upload_scenario(scenario_id);

      if (this.for_tournament) {
        $state.go('tournament_manage_event',
            {'tournament': this.for_tournament,
             'scenario': scenario_id});
      } else {
        // create game
        var game_id = generate_new_game_id(scenario_id);

        Storage.set('.game.' + game_id + '.scenario', scenario_id);
        Storage.set('.scenario.' + scenario_id + '.current_game', game_id);

        G = GameStore.load_game(game_id);

        GameStore.start_publishing_game(game_id);
        $state.go('player_setup', {game_id: game_id});
      }
    };
  });

app.controller('JoinGamePageController',
  function($state, Storage) {
    /** @export */
    this.name = Storage.get('.my_player_name');

    /** @export */
    this.submit_join_game_form = function() {
      var name = this.name;
      Storage.set('.my_player_name', name);

      $state.go('join_network_game', {'q': name});
    }.bind(this);
  });

app.controller('JoinGamePickPageController',
  function($state, $window, data) {
    this.cancel = function() {
      console.log('cancel clicked');
      $window.history.back();
    };
    this.select = function(gameInfo) {
      $state.go('active_game.main', {game_id: gameInfo.id, turn: 'watch'});
    };
    this.search_results = data['results'];
    this.game_list = data['results'];
    this.game_list.forEach(
      function(gameInfo) {
        gameInfo.scenario = load_scenario(gameInfo.scenario_id);
      });
    this.game_list = this.game_list.filter(
      function(gameInfo) {
        return gameInfo.scenario;
      });
  });

app.controller('PickScenarioPageController',
  function($state, GameStore, ResultStore, Storage) {
    var pcount = 2;
    var m = $state.params['rulespec'].match(/^(\d+)p$/);
    if (m) {
      pcount = m[1];
    }

    this.generate_game_clicked = function() {
      $state.go('generate_game', {rulespec: pcount + 'p'});
    };

    this.select = function(scenario) {
      // create game
      var scenario_id = scenario.scenario_id;
      var game_id = generate_new_game_id(scenario_id);

      Storage.set('.game.' + game_id + '.scenario', scenario_id);
      Storage.set('.scenario.' + scenario_id + '.current_game', game_id);

      G = GameStore.load_game(game_id);

      GameStore.start_publishing_game(game_id);
      $state.go('player_setup', {game_id: game_id});
    };

    this.get_scenario_description = function(scenario_id) {
      var results_info = ResultStore.summarize_results_for_scenario(scenario_id);
      var description = 'Played '+(
          results_info.play_count == 1 ? '1 time' :
          (results_info.play_count+' times')
          );
      var played_by = results_info.played_by;
      if (played_by.length) {
        description += ' (by';
        for (var j = 0; j < played_by.length; j++) {
          description += ' ' + played_by[j];
        }
        description += ')';
      }

      description +=
          scenario_finished(scenario_id) ? ('; Completed ' + format_time(scenario_finish_time(scenario_id))) :
          scenario_started(scenario_id) ? ('; Started ' + format_time(scenario_first_played_time(scenario_id))) :
          '';
      if (results_info.maximum_score > 0 && scenario_finished(scenario_id)) {
        description += '; best score: '+results_info.maximum_score;
      }
      return description;
    };

    this.load_scenarios = function() {
      this.scenarios = [];
      this.not_shown = 0;

      var a = stor_get_list(PACKAGE + '.scenarios_by_player_count.' + pcount);
      for (var i = 0; i < a.length; i++) {
        var scenario = load_scenario(a[i]);
        if (!scenario_compatible(scenario)) {
          this.not_shown++;
          continue;
        }
        this.scenarios.push(scenario);
      }
    };
    this.load_scenarios();

    init_pick_scenario_page($('#pick_scenario_page'), pcount, this.scenarios, this);
  });

app.controller('ReviewResultsPageController',
  function($state, Storage) {
    this.submit_search_results_form = function() {
      var f = document.search_results_form;
      var q = f.q.value;
      $state.go('search_results', {q: q});
    };
    this.game_list = stor_get_list(PACKAGE + '.my_results')
        .map(function(result_id) {
          var gameInfo = {result_id: result_id};
          gameInfo.result = load_result(result_id);
          if (!gameInfo.result) {
            return gameInfo;
          }
          gameInfo.scenario_id = gameInfo.result.scenario_id;
          gameInfo.scenario = load_scenario(gameInfo.result.scenario_id);
          gameInfo.submitted_time_formatted = format_time(gameInfo.result.time);
          gameInfo.seats = [];
          for (var i = 1; i <= gameInfo.scenario.rules.player_count; i++) {
            gameInfo.seats.push(i);
          }
          return gameInfo;
        })
        .filter(function(gameInfo) {
          return gameInfo.result && gameInfo.scenario;
        });
    this.get_role = function(gameInfo, seat) {
      return gameInfo.scenario.roles[seat];
    };
    this.get_role_icon = function(gameInfo, seat) {
      return get_role_icon(gameInfo.scenario.roles[seat]);
    };
    this.get_player_name = function(gameInfo, seat) {
      return gameInfo.result['player' + seat];
    };
    this.select = function(gameInfo) {
      // so that the correct row is highlighted
      Storage.set('.my_result.' + gameInfo.scenario_id, gameInfo.result_id);

      $state.go('results', {scenario_id: gameInfo.scenario_id});
    };
  });

app.controller('TournamentsPageController',
  function($state, $window, tournamentList) {
    this.tournaments = tournamentList;
    this.selected = function(tourney) {
      $state.go('tournament_pick_scenario', {'tournament': tourney.id});
    };
    this.cancel = function() {
      $window.history.back();
    };
  });

app.controller('TournamentPickScenarioPageController',
  function($scope, $state, tournament, GameStore) {
    $scope['tournament'] = tournament;
    this.get_scenario_name = function(scenario_id) {
      return scenario_name(scenario_id);
    };
    this.selected = function(evt) {
      GameStore
          .create_tournament_game(tournament.id, evt.id, evt.scenario)
          .then(
            function(gameId) {
              $state.go('player_setup', {'game_id': gameId});
            });
    };
  });

app.controller('TournamentManagePageController',
  function($scope, TournamentStore, tournament) {
    $scope['tournament'] = tournament;
    this.get_event_name = function(eventId) {
      for (var i = 0, evt; evt = tournament['all_events'][i]; i++) {
        if (evt['id'] == eventId) {
          return evt['name'];
        }
      }
      return eventId;
    };
    this.save_changes = function(newValue, oldValue) {
      if (this.saveStarted) {
        this.dirty = true;
        return;
      }
      this.saveStarted = true;
      this.dirty = false;
      TournamentStore
        .update(tournament.id, {'title': tournament.title, 'visible': tournament.visible})
        .finally(
          function() {
            this.saveStarted = false;
            if (this.dirty) {
              this.save_changes();
            }
          }.bind(this));
    };
    var check_for_changes = function(newValue, oldValue) {
      if (newValue !== oldValue) {
        this.save_changes();
      }
    }.bind(this);
    $scope.$watch('tournament.title', check_for_changes);
    $scope.$watch('tournament.visible', check_for_changes);
  });

app.controller('TournamentManageEventPageController',
  function($http, $scope, $state, $window, eventData) {
    var scenario = eventData.scenario;
    $scope['scenario'] = scenario;
    $scope['event'] = eventData.event;
    this.scenario = scenario;
    this.name = eventData.event ? eventData.event.name : 'Unnamed Event';
    this.visible = eventData.event ? eventData.event.visible : true;
    this.submit = eventData.event ?
      function() {
        var tournamentId = $state.params['tournament'];
        var data = {
          'tournament': tournamentId,
          'event': eventData.event.id,
          'name': this.name,
          'visible': this.visible
        };
        return $http
          .post('/s/tournaments/update_event', data)
          .then(function(httpResponse) {
            $state.go('manage_tournament', {tournament: tournamentId});
          });
      } :
      function() {
        var tournamentId = $state.params['tournament'];
        var data = {
          'scenario': scenario.scenario_id,
          'tournament': tournamentId,
          'name': this.name,
          'visible': this.visible
          };
        return $http
          .post('/s/tournaments/add_scenario', data)
          .then(function(httpResponse) {
            $state.go('manage_tournament', {tournament: tournamentId});
          });
      };
    this.go_back = function() {
      $window.history.back();
    };
  });

app.controller('FoundCompletedGamesPageController',
  function($state, $window, Storage, data) {
    this.back = function() {
      $window.history.back();
    };
    this.game_list = data.results
      .map(function(resultInfo) {
        var gameInfo = {
          result_id: resultInfo.id,
          result: load_result(resultInfo.id)
        };
        if (!gameInfo.result) {
          return gameInfo;
        }
        gameInfo.scenario_id = gameInfo.result.scenario_id;
        gameInfo.scenario = load_scenario(gameInfo.result.scenario_id);
        gameInfo.submitted_time_formatted = format_time(gameInfo.result.time);
        gameInfo.seats = [];
        for (var i = 1; i <= gameInfo.scenario.rules.player_count; i++) {
          gameInfo.seats.push(i);
        }
        return gameInfo;
      })
      .filter(function(gameInfo) {
        return gameInfo.result && gameInfo.scenario;
      });
    this.get_role = function(gameInfo, seat) {
      return gameInfo.scenario.roles[seat];
    };
    this.get_role_icon = function(gameInfo, seat) {
      return get_role_icon(gameInfo.scenario.roles[seat]);
    };
    this.get_player_name = function(gameInfo, seat) {
      return gameInfo.result['player' + seat];
    };
    this.select = function(gameInfo) {
      // so that the correct row is highlighted
      Storage.set('.my_result.' + gameInfo.scenario_id, gameInfo.result_id);

      $state.go('results', {scenario_id: gameInfo.scenario_id});
    };
  });

app.controller('PlayerNamesPageController',
  function($state, Storage) {
    var pcount = 2;
    var m = $state.params['rulespec'].match(/^(\d+)p$/);
    if (m) {
      pcount = +m[1];
    }

    G = new Pandemic.GameState();
    var s = Storage.get('.player_names');
    if (s) {
      G.player_names = JSON.parse(s);
    } else {
      G.player_names = {};
    }

    this.names = G.player_names;

    this.seats = [];
    for (var i = 1; i <= pcount; i++) {
      this.seats.push(i);
      this.names[i] = this.names[i] || 'Player '+i;
    }

    this.location = Storage.get('.game_location');
    this.randomize_order = 'start_player';

    this.submit = function() {
      G = new Pandemic.GameState();
      G.rules = { 'player_count': pcount };
      G.player_names = this.names;

      this.names = submit_player_names_form(pcount, this.names, this.randomize_order);

      Storage.set('.game_location', this.location);
      Storage.set('.player_names', JSON.stringify(this.names));

      $state.go('pick_scenario', {rulespec: $state.params['rulespec']});
    };
  });

app.controller('DeckSetupPageController',
  function($state, $window, scenarioData) {
    this.continue = function() {
      $window.history.go(-3);
    };
    this.scenario = scenarioData;
    this.scenario_id = scenarioData.scenario_id;
    this.player_deck = this.scenario.player_deck.slice().reverse();
    this.infection_deck = this.scenario.infection_deck.slice().reverse();

    var game = load_scenario(this.scenario_id);
    game.initialize();
    this.initial_infection_discards = game.infection_discards.slice();
    this.is_initial_infection = function(card) {
      return this.initial_infection_discards.indexOf(card) != -1;
    };
    this.epidemics = [];
    for (var k = 1; k <= this.scenario.rules.level; k++) {
      while (game.epidemic_count < k && game.step != 'end') {
        game.do_move('pass');
      }
      var epidemicInfo = {
        id: k,
        deck: this.scenario['epidemic.' + k].slice(),
        discards: game.infection_discards.slice()
      };
      epidemicInfo.is_likely_in_reshuffle = function(card) {
        return this.discards.indexOf(card) != -1;
      };
      this.epidemics.push(epidemicInfo);
    }
  });

app.controller('BoardSetupPageController',
  function($state, GameService, data) {
    this.continue = function() {
      if (data.game) {
        G = data.game;
        GameService.navigate_to_current_turn();
      } else {
        $state.go('deck_setup', {scenario_id: $state.params['scenario_id']});
      }
    };

    var scenario = data.scenario;
    this.rules = scenario.rules;
    this.infections = scenario.infection_deck.slice(-9).reverse();
    this.game = data.game;

    if (scenario.sequence_deck) {
      this.sequence_cards = scenario.sequence_deck.slice(0, 1);
    }
  });

app.controller('PlayerSetupPageController',
  function($state, GameService, data) {
    var seats_by_player_count = {
      2: [1,2],
      3: [1,2,3],
      4: [1,2,3,4],
      5: [1,2,3,4,5]
    };
    var scenario = data.scenario;
    this.get_seats = function() {
      return seats_by_player_count[scenario.rules.player_count];
    };
    this.get_scenario_name = function() {
      return scenario_name(scenario.scenario_id);
    };
    this.get_rules = function() {
      return stringify_rules(scenario.rules);
    };
    this.get_player_name = function(pid) {
      if (data.game) {
        return data.game.player_names[pid];
      } else {
        return 'Player ' + pid;
      }
    };
    this.get_player_role = function(pid) {
      return scenario.roles[pid];
    };
    this.get_player_role_icon = function(pid) {
      return get_role_icon(scenario.roles[pid]);
    };
    this.get_player_cards = function(pid) {
      return scenario.initial_hands[pid];
    };
    this.continue = function() {
      if (data.game) {
        $state.go('board_setup', {game_id: $state.params['game_id']});
      } else {
        $state.go('scenario_board_setup', {scenario_id: $state.params['scenario_id']});
      }
    };
  });

app.controller('PlayerTurnPageController',
  function(GameService, $scope, $state) {
    this.rename_player = function() {
      var p_name = G.player_names[G.active_player];
      var p_role = G.roles[G.active_player];
      p_name = window.prompt('Enter name of '+p_role, p_name);
      if (p_name) {
        G.player_names[G.active_player] = p_name;
        save_player_names();
        $('.page_header .player_name').text(p_name);
      }
    };
    this.show_discards_clicked = function() {
      $state.go('active_game.discards');
    };
    this.draw_sequence_card_clicked = function() {
      GameService.set_move('draw_sequence_card');
    };
    this.play_special_event_clicked = function() {
      $state.go('active_game.play_special');
    };
    this.retrieve_special_event_clicked = function() {
      $state.go('active_game.retrieve_special');
    };
    this.discover_cure_clicked = function() {
      $state.go('active_game.discover_cure');
    };
    this.declare_victory_clicked = function() {
      record_game_finished();
      GameService.set_move('claim_victory');
    };
    this.admit_defeat_clicked = function() {
      record_game_finished();
      GameService.set_move('give_up');
    };
    this.continue_player_turn = function() {
      if ($scope.game.get_continue_button_type() == 'draw_cards') {
        if (GameService.should_confirm()) {
          if (!confirm('Really draw cards?')) {
            return;
          }
        }
      }
      GameService.set_move('pass');
    };
    this.on_determine_virulent_strain_clicked = function() {
      $state.go('active_game.virulent_strain');
    };
    this.get_history = function() {
      var history = [];

      var last = G.history.length;
      var first = last-1;
      while (first > 0 && G.history[first].type != 'next_turn') {
        first--;
      }

      for (var i = first; i < last; i++) {
        var evt = G.history[i];
        history.push(evt);
      }
      return history;
    };
    var initFunc = function() {
      var $pg = $('#player_turn_page');
      if (G.step == 'actions') {
        init_player_turn_page($pg);
      } else if (G.step == 'draw_cards') {
        init_draw_cards_page($pg);
      } else if (G.step == 'mutation') {
        init_epidemic_page($pg);
      } else if (G.step == 'epidemic') {
        init_epidemic_page($pg);
      } else if (G.step == 'infection') {
        init_infection_page($pg);
      } else {
        console.log('unrecognized game state ' + G.step);
      }
    };
    initFunc();
    $scope.$watch(function() { return G; }, initFunc);
  });

app.controller('DiscoverCurePageController',
  function($window, GameService) {
    this.on_discover_cure_clicked = function(disease_color) {
      GameService.set_move('discover '+disease_color);
    };
    this.on_eradicate_clicked = function(disease_color) {
      GameService.set_move('eradicate '+disease_color);
    };
    this.declare_victory_clicked = function() {
      record_game_finished();
      GameService.set_move('claim_victory');
    };
    this.cancel = function() {
      $window.history.back();
    };
    init_discover_cure_page($('#discover_cure_page'));
  });

app.controller('VirulentStrainPageController',
  function(GameService) {
    this.on_virulent_strain_clicked = function(disease_color) {
      GameService.set_move('virulent ' + disease_color);
    }
    init_virulent_strain_page($('#virulent_strain_page'));
  });

app.controller('SpecialEventPageController',
  function($window, $scope, $state, GameService) {
    this.cancel = function() {
      $window.history.back();
    };
    if ($state.includes('active_game.play_special')) {
      this.action_name = 'Play';
      this.choices = get_deck('Specials', G.rules).filter(
          function(s) {
            return G.has_special_event(s);
          });
      this.select = function(choice) {
        on_special_event_clicked(GameService, choice, $scope.game, $state);
      };
    } else if ($state.includes('active_game.retrieve_special')) {
      this.action_name = 'Retrieve';
      this.choices = get_deck('Specials', G.rules).filter(
          function(s) {
            return G.discarded_special_event(s);
          });
      this.select = function(choice) {
        GameService.set_move('retrieve ' + choice);
      };
    } else {
      console.log('unknown state: ' + $state.current.name);
    }
  });

app.controller('NewAssignmentPageController',
  function($window, GameService) {
    this.confirm = function() {
      var f = document.new_assignment_form;
      var old_role = f.old_role.value;
      var new_role = f.new_role.value;
      GameService.set_move('special "New Assignment" "'+old_role+'" "'+new_role+'"');
    }
    this.cancel = function() {
      $window.history.back();
    };
    init_new_assignment_page($('#new_assignment_page'));
  });

app.controller('ResilientPopulationPageController',
  function(GameService) {
    this.cards = order_infection_discards()
        .filter(function(card) {
            return !is_mutation(card);
          });
    this.select = function(card) {
      GameService.set_move('special "Resilient Population" "'+card+'"');
    };
  });

app.controller('InfectionRumorPageController',
  function(GameService) {
    var eff_infection_rate = G.travel_ban ? 1 : G.infection_rate;
    this.cards = [];
    for (var i = 0; i < eff_infection_rate; i++) {
      var c = G.infection_deck[G.infection_deck.length - 1 - i];
      if (c) {
        this.cards.push(c);
      }
    }
    this.select = function(card) {
      GameService.set_move('special "Infection Rumor" "' + card + '"');
    };
  });

app.controller('ForecastPageController',
  function(GameService) {
    this.reset = function() {
      this.forecast = [];
      for (var i = 0; i < 6; i++) {
        var c = G.infection_deck[G.infection_deck.length-1-i];
        if (!c) { continue; }
        this.forecast.push(c);
      }
      this.returned = [];
    };
    this.city_clicked = function(card) {
      this.returned.unshift(card);
      for (var i = this.forecast.length-1; i >= 0; i--) {
        if (this.forecast[i] == card) {
          this.forecast.splice(i, 1);
        }
      }
      if (this.forecast.length == 1) {
        this.returned.unshift(this.forecast[0]);
        this.forecast = [];
      }
    }.bind(this);
    this.on_forecast_confirm_clicked = function() {
      var m = "forecast";
      for (var i = 0; i < this.returned.length; i++) {
        m += ' "' + this.returned[i] + '"';
      }

      GameService.set_move(m);
    }.bind(this);
    this.reset();
  });

app.controller('ResourcePlanningPageController',
  function(GameService) {
    this.reset = function() {
      this.forecast = [];
      for (var i = 0; i < 4; i++) {
        var c = G.player_deck[G.player_deck.length-1-i];
        if (c) {
          this.forecast.push(c);
        }
      }
      this.returned = [];
    };
    this.reset();
    this.card_clicked = function(card) {
      this.returned.unshift(card);
      for (var i = this.forecast.length-1; i >= 0; i--) {
        if (this.forecast[i] == card) {
          this.forecast.splice(i, 1);
        }
      }
      if (this.forecast.length == 1) {
        this.returned.unshift(this.forecast[0]);
        this.forecast = [];
      }
    };
    this.confirm = function() {
      var m = "resource_planning";
      for (var i = 0; i < this.returned.length; i++) {
        m += ' "' + this.returned[i] + '"';
      }

      GameService.set_move(m);
    };
  });

app.controller('GameCompletedPageController',
  function($state, Storage, ResultStore) {
    $('.cure_count').change(update_game_score);

    var f = document.game_completed_form;
    this.save = function(for_submission) {

      Storage.set('.game_location', f.location.value);

      var V = {};
      V.version = Version;
      V.rules = f.rules.value;
      V.shuffle_id = f.scenario_id.value;
      V.scenario_id = f.scenario_id.value;
      V.game_id = f.game_id.value;
      V.score = f.score.value;
      V.cures = f.cures.value;
      V.turns = f.turns.value;
      V.location = f.location.value;
      V.comments = f.comments.value;
      for (var i = 1; i <= G.rules.player_count; i++) {
        V['player'+i] = this.player_names[i];
      }
      V.time = new Date().toISOString();
      if (!for_submission) {
        V.localOnly = true;
      }
      var tournamentInfo = Storage.get('.game.' + V.game_id + '.tournament');
      if (tournamentInfo) {
        V['tournament_event'] = tournamentInfo;
      }
      return ResultStore.create(V);
    };

    this.submit_result_clicked = function() {
      var result_id = this.save(true);

      stor_add_to_set(PACKAGE + '.game_results.' + G.scenario_id, result_id);
      stor_add_to_set(PACKAGE + '.pending_results', result_id);
      stor_add_to_set(PACKAGE + '.my_results', result_id);

      trigger_sync_process();

      $state.go('results', {scenario_id: G.scenario_id});
    };

    this.dont_submit_clicked = function()
    {
      var result_id = this.save(false);

      // this makes this game show up in the "Review Results" page
      stor_add_to_set(PACKAGE + '.my_results', result_id);

      $state.go('results', {scenario_id: G.scenario_id});
    };
    this.player_count = G.rules.player_count;
    this.turns = G.turns;
    this.turns_left = Math.floor(G.player_deck.length / 2);
    this.level = G.rules.level;
    this.result = G.result;
    if (G.result == 'victory') {
      this.victory_type = G.is_unnecessary('purple') ? 'cured all four diseases' :
          G.is_cured('purple') ? 'cured all five diseases' :
          'cured all four normal diseases and wiped purple off the board';
    }
    this.player_names = {};
    for (var i = 1; i <= G.rules.player_count; i++) {
      this.player_names[i] = G.player_names[i];
    }

    init_game_completed_page($('#game_completed_page'));
  });

app.controller('ResultsPageController',
  function($state, Storage) {
    var scenario_id = $state.params['scenario_id'];
    this.scenario_name = scenario_name(scenario_id);

    this.go_home_page = function() {
      Storage.remove('.current_game');
      Storage.remove('.current_game.scenario');

      $state.go('welcome');
    };
    this.get_results = function() {
      var all_result_ids = stor_get_list(PACKAGE + '.game_results.' + scenario_id);
      var my_result_id = Storage.get('.my_result.' + scenario_id);
      if (my_result_id) {
        all_result_ids.push(my_result_id);
      }

      var seen = {};
      var all_results = [];
      for (var i = 0; i < all_result_ids.length; i++) {
        if (seen[all_result_ids[i]]) { continue; }
        seen[all_result_ids[i]] = true;

        var result_id = all_result_ids[i];
        var r = load_result(result_id);
        if (!r) { continue; }
        if (r.scenario_id != scenario_id) { continue; }

        if (all_result_ids[i] == my_result_id) {
          r.mine = true;
        }
        all_results.push(r);
      }

      all_results.sort(function(a,b) {
          return +a.score < +b.score ? 1 :
                 +a.score > +b.score ? -1 :
                 a.time < b.time ? -1 :
                 a.time > b.time ? 1 : 0;
        });
      var place = 0;
      for (var i = 0; i < all_results.length; i++) {
        var r = all_results[i];
        var is_a_tie = (i > 0 && all_results[i-1].score == r.score) ||
            (i+1 < all_results.length && all_results[i+1].score == r.score);
        place = (i > 0 && all_results[i-1].score == r.score) ? place : i+1;
        r.place = place;
        r.is_a_tie = is_a_tie;
        r.timeFormatted = r.localOnly ? 'no' : format_time(r.time);
      }
      return all_results;
    };
    this.results = this.get_results();
    this.scenario = load_scenario(scenario_id);
    this.get_role = function(seat) {
      return this.scenario.roles[seat];
    };
    this.get_role_icon = function(seat) {
      return get_role_icon(this.get_role(seat));
    };
    this.get_player_name = function(r, seat) {
      return r['player' + seat];
    };
    this.seats = [];
    for (var i = 1; i <= this.scenario.rules.player_count; i++) {
      this.seats.push(i);
    }
  });

app.controller('ShowDiscardsPageController',
  function($window) {
    this.back_clicked = function() {
      $window.history.back();
    };
  });

app.controller('CurrentGameController',
  function($scope, $state, isPlaying, gameData) {
    this.can_declare_victory = function() {
      return G.has_control && G.step == 'actions';
    };
    this.can_draw_sequence_card = function() {
      return G.has_control && G.rules.lab_challenge && G.step == 'actions';
    };
    this.can_play_special_event = function() {
      return G.has_control && G.has_any_special_event();
    };
    this.can_retrieve_special_event = function() {
      return G.has_control && !G.contingency_event && G.roles[G.active_player] == 'Contingency Planner' && G.step == 'actions';
    };
    this.can_admit_defeat = function() {
      var at_end_of_game = (
          G.step == 'actions' &&
          G.turns >= G.game_length_in_turns);
      var getting_infected = (
          G.step == 'infection' || G.step == 'epidemic');

      return G.has_control && (at_end_of_game || getting_infected);
    };
    this.can_continue = function() {
      var at_end_of_game = (
          G.step == 'actions' &&
          G.turns >= G.game_length_in_turns);
      return G.has_control && !at_end_of_game;
    };

    this.get_continue_button_type = function() {
      if (G.step == 'actions') {
        return 'draw_cards';
      }
      else if (G.pending_mutations.length > 0) {
        return 'mutation';
      }
      else if (G.pending_epidemics > 0) {
        return 'epidemic';
      }
      else if (G.step == "epidemic" && G.rules.virulent_strain && !G.virulent_strain) {
        return 'virulent_strain';
      }
      else if (G.pending_infection > 0) {
        return 'infection';
      }
      else if ((G.step == 'draw_cards' || G.step == 'epidemic' || G.step == 'mutation') && !G.one_quiet_night) {
        if (G.rules.hinterlands_challenge) {
          return 'hinterlands';
        }
        else {
          return 'infection';
        }
      }
      else {
        return 'player_turn';
      }
    };
    this.get_infection_discards = function() {
      return G.infection_discards;
    };
    this.get_epidemic_discards = function() {
      // FIXME- I don't think epidemic cards are in the player_discards array.
      return G.player_discards.filter(function(card) {
          return is_epidemic(card);
        });
    };
    this.get_next_player_name = function() {
      return G.player_names[1+(G.active_player%G.rules.player_count)];
    };
    this.get_active_player_name = function() {
      return G.player_names[G.active_player];
    };
    this.get_active_player_role = function() {
      return G.roles[G.active_player];
    };
    this.get_active_player_role_icon = function() {
      return get_role_icon(G.roles[G.active_player]);
    };
    this.get_player_role = function(seat) {
      return G.roles[seat];
    };
    this.get_player_role_icon = function(seat) {
      return get_role_icon(G.roles[seat]);
    };
    this.get_troubleshooter_preview = function() {
      var list = [];
      var eff_infection_rate = G.travel_ban ? 1 : G.infection_rate;
      for (var i = 0; i < eff_infection_rate; i++) {
        var c = G.infection_deck[G.infection_deck.length-1-i];
        if (c) {
          list.push(c);
        }
      }
      return list;
    };
    this.get_turn_ind = function() {
      return G.turns + '/' + G.game_length_in_turns;
    };
    if (isPlaying) {
      G = gameData;
    } else {
      console.log("got game data "+JSON.stringify(gameData));
      show_watched_game($state.params['game_id'], gameData);
    }

    this.seats = [];
    for (var i = 1; i <= G.rules.player_count; i++) {
      this.seats.push(i);
    }

    var initFunc = function() {
      if (G.step == 'forecast') {
        this.page = 'forecast';
      } else if (G.step == 'resource_planning') {
        this.page = 'resource_planning';
      } else if (G.step == 'end') {
        this.page = 'game_completed';
      } else {
        this.page = 'player_turn';
      }
    }.bind(this);
    initFunc();
    $scope.$watch(function() { return G; }, initFunc);

    console.log('current state is ' + $state.current.name);
  });

app.controller('PlayerCardController',
  function($scope) {
    this.reload = function() {
      var c = $scope.card;
      var ci = Pandemic.Cities[c];
      if (ci) {
        this.card_name = ci.name;
        this.card_icon_src = ci.color + '_icon.png';
        this.html_class = ci.color + '_card';
      } else if (c == 'Epidemic') {
        this.card_name = 'Epidemic!';
        this.card_icon_src = 'epidemic_icon.png';
        this.html_class = 'epidemic_card';
      } else if (is_epidemic(c)) {
        this.card_name = c + '!';
        this.card_icon_src = 'virulent_epidemic_icon.png';
        this.html_class = 'epidemic_card';
      } else if (is_mutation(c)) {
        this.card_name = is_mutation(c) + '!';
        this.card_icon_src = 'purple_icon.png';
        this.html_class = 'mutation_card';
      } else if (is_emergency(c)) {
        this.card_name = is_emergency(c) + '!';
        this.card_icon_src = 'emergency_event_icon.png';
        this.html_class = 'emergency_card';
      } else {
        this.card_name = c;
        this.card_icon_src = 'special_event_icon.png';
        this.html_class = 'special_card';
      }
    };
    this.reload();
    $scope.$watch('card',
      function(newValue, oldValue) {
        this.reload();
      }.bind(this));
  });

app.directive('pdPlayerCard',
  function() {
    return {
      restrict: 'E',
      templateUrl: 'fragments/player-card.ng',
      scope: {
        card: '='
      },
      controller: 'PlayerCardController',
      controllerAs: 'pcc'
    };
  });

app.controller('InfectionCardController',
  function($scope) {
    this.reload = function() {
      var c = $scope.card;
      var text = is_mutation(c);
      if (text) {
        this.card_name = text + '!';
        this.card_icon_src = 'purple_icon.png';
        this.html_class = 'mutation_card';
      } else {
        var ci = Pandemic.Cities[c];
        this.card_name = ci.name;
        this.card_icon_src = ci.color + '_icon.png';
        this.html_class = ci.color + '_card';
      }
    };
    this.reload();
    $scope.$watch('card',
      function(newValue, oldValue) {
        this.reload();
      }.bind(this));
  });

app.directive('pdInfectionCard',
  function() {
    return {
      restrict: 'E',
      templateUrl: 'fragments/infection-card.ng',
      scope: {
        card: '='
      },
      controller: 'InfectionCardController',
      controllerAs: 'cc'
    };
  });

app.controller('SequenceCardController',
  function($scope) {
    this.reload = function() {
      this.card_name = $scope.card;
      this.card_icon_src = 'sequence_card_icon.png';
    };
    this.reload();
    $scope.$watch('card',
      function(newValue, oldValue) {
        this.reload();
      }.bind(this));
  });

app.directive('pdSequenceCard',
  function() {
    return {
      restrict: 'E',
      templateUrl: 'fragments/sequence-card.ng',
      scope: {
        card: '='
      },
      controller: 'SequenceCardController',
      controllerAs: 'cc'
    };
  });

app.controller('ScenarioNameController',
  function($scope) {
    this.reload = function() {
      var scenario_id = $scope.scenarioId;

      var m;
      if (m = scenario_id.match(/^(\d\d\d\d)-(\d\d-\d\d)(?:\.(.*))?$/)) {
        this.new_scenario_name = true;
        this.month_day = m[2];
        this.year = m[1];
        this.suffix = m[3];
      }
      else {
        this.new_scenario_name = false;
        this.parts = scenario_name(scenario_id).split(/ /);
      }
    };
    this.reload();
    $scope.$watch('scenarioId',
      function(newValue, oldValue) {
        this.reload();
      }.bind(this));
  });

app.directive('pdScenarioName',
  function() {
    return {
      restrict: 'E',
      templateUrl: 'fragments/scenario-name.ng',
      scope: {
        scenarioId: '='
      },
      controller: 'ScenarioNameController',
      controllerAs: 'snc'
    };
  });

app.controller('ScenarioDescriptionController',
  function($scope) {
    this.reload = function() {
      this.scenario = $scope.scenario;
      var rules = this.scenario.rules;

      this.expansions = [];
      for (var i = 0; i < Pandemic.Expansions.length; i++) {
        var expansion_name = Pandemic.Expansions[i];
        if (rules[expansion_name]) {
          this.expansions.push({
            icon: 'images/' + expansion_name + '.png',
            name: expansion_name});
        }
      }
      this.modules = [];
      for (var i = 0; i < Pandemic.Module_Names.length; i++) {
        var module_name = Pandemic.Module_Names[i];
        if (rules[module_name]) {
          this.modules.push({
            icon: 'images/module_icons/' + module_name + '.png',
            name: module_name});
        }
      }
      this.level = rules.level;
      this.level_icon = 'images/epidemic_count_icons/' + rules.level + '.png';
      this.seats = [];
      for (var i = 1; i <= rules.player_count; i++) {
        this.seats.push(i);
      }
      this.location = $scope.location;
      this.get_player_name = function(pid) {
        return $scope.players[pid-1];
      };
    };
    this.reload();
    $scope.$watch('scenario',
      function(newValue, oldValue) {
        this.reload();
      }.bind(this));

    this.get_role = function(pid) {
      return this.scenario.roles[pid];
    };
    this.get_role_icon = function(pid) {
      return get_role_icon(this.scenario.roles[pid]);
    };
  });

app.directive('pdScenarioDescription',
  function() {
    return {
      restrict: 'E',
      templateUrl: 'fragments/scenario-description.ng',
      scope: {
        scenario: '=',
        players: '=',
        location: '=',
        hideRoles: '='
      },
      controller: 'ScenarioDescriptionController',
      controllerAs: 'sdc'
    };
  });

app.controller('HistoryItemController',
  function($scope) {
    var evt = $scope['event'];
    if (evt.type == 'infection') {
      var ci = Pandemic.Cities[evt.infection];
      this.eradicated_infection = G.is_eradicated(ci.color);
      this.virulent_strain_infection = G.chronic_effect && G.virulent_strain == ci.color;
    } else if (evt.type == 'epidemic') {
      var ci = Pandemic.Cities[evt.epidemic];
      this.eradicated_infection = G.is_eradicated(ci.color);
    } else if (evt.type == 'hinterlands_infection') {
      this.eradicated_infection = G.is_eradicated(evt.color);
      this.virulent_strain_infection = G.chronic_effect && G.virulent_strain == evt.color;
    }
    this.get_player_name = function(seat) {
      return G.player_names[seat];
    };
    this.get_role = function(seat) {
      return G.roles[seat];
    };
    this.get_role_icon = function(seat) {
      return get_role_icon(this.get_role(seat));
    };
    this.get_disease_name = function(disease) {
      return Pandemic.Diseases[disease];
    };
    this.get_disease_icon = function(disease) {
      return disease + '_icon.png';
    };
  });

app.directive('pdHistoryItem',
  function() {
    return {
      restrict: 'E',
      templateUrl: 'fragments/history-item.ng',
      scope: {
        event: '='
      },
      controller: 'HistoryItemController',
      controllerAs: 'h'
    };
  });
