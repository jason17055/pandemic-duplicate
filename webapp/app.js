app = angular.module('pandemicDuplicateApp', ['pandemicStore', 'ui.router']);

app.config(
  function($stateProvider, $urlRouterProvider) {
    $stateProvider
      .state('home', {
        url: '/',
        onEnter: function() {
          show_page('welcome_page');
        }})
      .state('clear', {
        url: '/clear',
        onEnter: function(Storage) {
          Storage.clear_all_data_and_reload_page();
        }})
      .state('create_game', {
        url: '/params',
        onEnter: function() {
          show_page('create_game_page');
        }})
      .state('review_results', {
        url: '/review_results',
        onEnter: function() {
          var $pg = show_page('review_results_page');
          init_review_results_page($pg);
        }})
      .state('join_game', {
        url: '/join_network_game',
        onEnter: function() {
          show_page('join_game_page');
        }})
      .state('options', {
        url: '/options',
        onEnter: function() {
          show_page('options_page');
        }})
      .state('subscription', {
        url: '/subscription',
        onEnter: function() {
          show_page('subscription_page');
        }})
      .state('join_network_game', {
        url: '/join_network_game/:q',
        onEnter: function($stateParams) {
          show_blank_page();
          do_search_network_game($stateParams['q']);
        }})
      .state('search_results', {
        url: '/search_results/:q',
        onEnter: function($stateParams) {
          show_blank_page();
          do_search_results($stateParams['q']);
        }})
      .state('watch_game', {
        url: '/:game_id/watch/:xtra',
        onEnter: function($stateParams) {
          show_blank_page();
          do_watch_game($stateParams['game_id'], $stateParams['xtra']);
        }})
      .state('player_names', {
        url: '/names/:rulespec',
        onEnter: function($stateParams) {
          var $pg = show_page('player_names_page');
          init_player_names_page($pg, $stateParams['rulespec']);
        }})
      .state('pick_scenario', {
        url: '/pick_scenario/:rulespec',
        onEnter: function($stateParams) {
          var $pg = show_page('pick_scenario_page');
          init_pick_scenario_page($pg, $stateParams['rulespec']);
        }})
      .state('generate_game', {
        url: '/generate_game/:rulespec',
        onEnter: function($stateParams) {
          var $pg = show_page('generate_game_page');
          init_generate_game_page($pg, $stateParams['rulespec']);
        }})
      .state('deck_setup', {
        url: '/:game_id/deck_setup',
        onEnter: function($stateParams) {
          var $pg = show_page('deck_setup_page');
          init_deck_setup_page($pg, $stateParams['game_id']);
        }})
      .state('board_setup', {
        url: '/:game_id/board_setup',
        onEnter: function($stateParams) {
          var $pg = show_page('board_setup_page');
          init_board_setup_page($pg, $stateParams['game_id']);
        }})
      .state('player_setup', {
        url: '/:game_id/player_setup',
        onEnter: function($stateParams) {
          var $pg = show_page('player_setup_page');
          init_player_setup_page($pg, $stateParams['game_id']);
        }})
      .state('results', {
        url: '/:scenario_id/results',
        onEnter: function($stateParams) {
          var $pg = show_page('results_page');
          init_results_page($pg, $stateParams['scenario_id']);
        }})
      .state('active_game', {
        url: '/:game_id/T{turn:[0-9]+}{xtra:/?.*}',
        onEnter: function($stateParams) {
          load_game_at($stateParams['game_id'], $stateParams['turn']);
          show_current_game($stateParams['xtra']);
        }})
      .state('404', {
        onEnter: function() {
          show_blank_page();
        }});
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
  function(StateService) {
    var g = {};
    g.navigate_to_current_turn = function() {
      StateService.go(G.game_id + '/T' + G.time);
    };
    g.goto_current_game_state = function(url_suffix) {
      if (G.has_control) {
        StateService.go(G.game_id + '/T' + G.time + url_suffix);
      } else {
        StateService.go(G.game_id + '/watch' + url_suffix);
      }
    };
    g.set_move = function(m) {
      var timestr = new Date().toISOString();
      localStorage.setItem(PACKAGE + '.scenario.' + G.scenario_id + '.last_played', timestr);
      if (!scenario_started(G.scenario_id)) {
        localStorage.setItem(PACKAGE + '.scenario.' + G.scenario_id + '.first_played', timestr);
      }

      localStorage.setItem(PACKAGE + '.game.' + G.game_id + '.T' + G.time, m);

      G.do_move(m);
      g.navigate_to_current_turn();
    };
    return g;
  });

app.controller('TopController',
  function($rootScope, $scope, $state, StateService, Options, GameService) {
    $rootScope.$on('$stateChangeSuccess',
      function(evt) {
        check_screen_size();
      });
    this.goto_state_async = function(rel_url) {
      $scope.$apply(function() {
        StateService.go(rel_url);
      });
    };
    this.set_move_x = function(m) {
      $scope.$apply(function() {
        GameService.set_move(m);
      });
    };
    this.$state = $state;
  });

app.controller('WelcomePageController',
  function(StateService) {
    this.has_current_game = function() {
      var scenario_id = localStorage.getItem(PACKAGE + '.current_game.scenario');
      return Boolean(scenario_id);
    };

    this.start_game_clicked = function() {
      StateService.go('params');
    };

    this.resume_game_clicked = function() {
      var game_id = localStorage.getItem(PACKAGE + '.current_game');
      if (game_id == null) {
        return false;
      }

      var time_str = localStorage.getItem(PACKAGE + '.game.' + game_id + '.time');
      if (time_str != null) {
        StateService.go(game_id + '/T' + time_str);
      }
      else {
        StateService.go(game_id + '/player_setup');
      }

      return;
    };

    this.review_results_clicked = function() {
      StateService.go('review_results');
    };

    this.join_network_game_clicked = function() {
      StateService.go('join_network_game');
    };

    this.options_clicked = function() {
      StateService.go('options');
    };

  });

app.controller('OptionsPageController',
  function(StateService, Storage, $window) {
    var f = document.options_form;

    var save_options_form = function() {
      Storage.set('.base_game_version', f.base_game_version.value);
      Storage.set('.has_on_the_brink', f.has_on_the_brink.checked ? 'true' : 'false');
      Storage.set('.has_in_the_lab', f.has_in_the_lab.checked ? 'true' : 'false');
      Storage.set('.has_state_of_emergency', f.has_state_of_emergency.checked ? 'true' : 'false');
      Storage.set('.game_detail_level', f.game_detail_level.value);
      load_options();
    };

    // Populate form based on values in Storage.
    f.base_game_version.value = Storage.get('.base_game_version') || '2007';
    f.has_on_the_brink.checked = Storage.get('.has_on_the_brink')=='true';
    f.has_in_the_lab.checked = Storage.get('.has_in_the_lab')=='true';
    f.has_state_of_emergency.checked = Storage.get('.has_state_of_emergency')=='true';
    f.game_detail_level.value = Storage.get('.game_detail_level') || '0';

    // Watch the form for changes.
    f.base_game_version.onchange = save_options_form;
    f.has_on_the_brink.onchange = save_options_form;
    f.has_in_the_lab.onchange = save_options_form;
    f.has_state_of_emergency.onchange = save_options_form;
    f.game_detail_level.onchange = save_options_form;

    this.subscription_clicked = function() {
      StateService.go('subscription');
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
  function(StateService) {
    this.submit_create_game_form = function() {
      var f = document.create_game_form;
      var pcount = f.player_count.value;
      StateService.go('names/' + pcount + 'p');
    };
  });

app.controller('GenerateGamePageController',
  function() {
  });

app.controller('JoinGamePageController',
  function(Storage, StateService) {
    /** @export */
    this.name = Storage.get('.my_player_name');

    /** @export */
    this.submit_join_game_form = function() {
      var name = this.name;
      Storage.set('.my_player_name', name);

      StateService.go('join_network_game/' + escape(name));
    }.bind(this);
  });

app.controller('JoinGamePickPageController',
  function($window) {
    this.cancel = function() {
      $window.history.back();
    };
  });

app.controller('PickScenarioPageController',
  function(StateService) {
    this.generate_game_clicked = function() {
      var pcount = document.pick_scenario_form.player_count.value;
      StateService.go('generate_game/' + pcount + 'p');
    }.bind(this);
  });

app.controller('ReviewResultsPageController',
  function(StateService) {
    this.submit_search_results_form = function() {
      var f = document.search_results_form;
      var q = f.q.value;
      StateService.go('search_results/' + escape(q));
    };
  });

app.controller('FoundCompletedGamesPageController',
  function($window) {
    this.back = function() {
      $window.history.back();
    };
  });

app.controller('PlayerNamesPageController',
  function() {
  });

app.controller('DeckSetupPageController',
  function(StateService) {
    this.continue = function() {
      StateService.go(G.scenario_id+'/board_setup');
      return false;
    };
  });

app.controller('BoardSetupPageController',
  function(GameService) {
    this.continue = function() {
      GameService.navigate_to_current_turn();
    };
  });

app.controller('PlayerSetupPageController',
  function(GameService, StateService) {
    var seats_by_player_count = {
      2: [1,2],
      3: [1,2,3],
      4: [1,2,3,4],
      5: [1,2,3,4,5]
    };
    var empty = [];
    this.get_seats = function() {
      return (G && G.rules && seats_by_player_count[G.rules.player_count]) || empty;
    };
    this.get_scenario_name = function() {
      return G && G.scenario_id && scenario_name(G.scenario_id);
    };
    this.get_rules = function() {
      return G && G.rules && stringify_rules(G.rules);
    };
    this.get_player_name = function(pid) {
      return G && G.player_names && G.player_names[pid];
    };
    this.get_player_role = function(pid) {
      return G && G.roles && G.roles[pid];
    };
    this.get_player_role_icon = function(pid) {
      return G && G.roles && get_role_icon(G.roles[pid]);
    };
    this.get_player_cards = function(pid) {
      return G && G.initial_hands && G.initial_hands[pid];
    };
    this.continue = function() {
      StateService.go(G.game_id+'/board_setup');
      return false;
    };
  });

app.controller('PlayerTurnPageController',
  function(GameService) {
    this.rename_player = function() {
      var p_name = G.player_names[G.active_player];
      var p_role = G.roles[G.active_player];
      p_name = window.prompt('Enter name of '+p_role, p_name);
      if (p_name) {
        G.player_names[G.active_player] = p_name;
        save_player_names();
        $('.page_header .player_name').text(p_name);
        show_current_game('');
      }
    };
    this.show_discards_clicked = function() {
      GameService.goto_current_game_state('/discards');
    };
    this.draw_sequence_card_clicked = function() {
      GameService.set_move('draw_sequence_card');
    };
    this.play_special_event_clicked = function() {
      GameService.goto_current_game_state('/play_special');
    };
    this.retrieve_special_event_clicked = function() {
      GameService.goto_current_game_state('/retrieve_special');
    };
    this.discover_cure_clicked = function() {
      GameService.goto_current_game_state('/discover_cure');
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
      GameService.set_move('pass');
    };
    this.on_determine_virulent_strain_clicked = function() {
      GameService.goto_current_game_state('/virulent_strain');
    };
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

  });

app.controller('VirulentStrainPageController',
  function(GameService) {
    this.on_virulent_strain_clicked = function(disease_color) {
      GameService.set_move('virulent ' + disease_color);
    }
  });

app.controller('SpecialEventPageController',
  function($window) {
    this.cancel = function() {
      $window.history.back();
    };
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

  });

app.controller('ResilientPopulationPageController',
  function() {
  });

app.controller('InfectionRumorPageController',
  function() {
  });

app.controller('ForecastPageController',
  function(GameService) {
    this.on_forecast_confirm_clicked = function() {
      var sel = [];
      $('#forecast_page .forecast_cards_list li').each(function(idx,el) {
        var c = el.getAttribute('data-city-name');
        sel.push(c);
      });

      var m = "forecast";
      for (var i = 0; i < sel.length; i++) {
        m += ' "' + sel[i] + '"';
      }

      GameService.set_move(m);
    };
    this.on_forecast_reset_clicked = function() {
      init_forecast_page($('#forecast_page'));
    };
  });

app.controller('ResourcePlanningPageController',
  function(GameService) {
    this.reset = function() {
      init_resource_planning_page($('#resource_planning_page'));
    };

    this.confirm = function() {
      var sel = [];
      $('#resource_planning_page .resource_planning_cards_list li').each(function(idx,el) {
        var c = el.getAttribute('data-card-name');
        sel.push(c);
      });

      var m = "resource_planning";
      for (var i = 0; i < sel.length; i++) {
        m += ' "' + sel[i] + '"';
      }

      GameService.set_move(m);
    };
  });

app.controller('GameCompletedPageController',
  function(StateService) {
    $('.cure_count').change(update_game_score);

    this.submit_result_clicked = function() {
      var result_id = save_current_result(true);

      stor_add_to_set(PACKAGE + '.game_results.' + G.scenario_id, result_id);
      stor_add_to_set(PACKAGE + '.pending_results', result_id);
      stor_add_to_set(PACKAGE + '.my_results', result_id);

      trigger_sync_process();

      StateService.go(G.scenario_id + '/results');
    };

    this.dont_submit_clicked = function()
    {
      var result_id = save_current_result(false);

      // this makes this game show up in the "Review Results" page
      stor_add_to_set(PACKAGE + '.my_results', result_id);

      StateService.go(G.scenario_id + '/results');
    };
  });

app.controller('ResultsPageController',
  function(StateService) {
    this.go_home_page = function() {
      localStorage.removeItem(PACKAGE + '.current_game');
      localStorage.removeItem(PACKAGE + '.current_game.scenario');

      StateService.go(null);
    };
  });

app.controller('ShowDiscardsPageController',
  function($window) {
    this.back_clicked = function() {
      $window.history.back();
    };
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
