app = angular.module('pandemicDuplicateApp', []);

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
        on_state_init();
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

      do_move(m);
      g.navigate_to_current_turn();
    };
    return g;
  });

app.controller('TopController',
  function($scope, StateService, Options, GameService) {
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
    window.addEventListener('popstate', function() {
      $scope.$apply(on_state_init);
    });
    on_state_init();
  });

app.controller('WelcomePageController',
  function(StateService) {
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
        StateService.go(game_id + '/player_state');
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
  function(StateService, $window) {
    var f = document.options_form;
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
  function() {
  });

app.controller('GenerateGamePageController',
  function() {
  });

app.controller('JoinGamePageController',
  function() {
    var n = localStorage.getItem(PACKAGE+'.my_player_name');
    if (n) {
      document.join_game_form.name.value = n;
    }
  });

app.controller('JoinGamePickPageController',
  function() {
  });

app.controller('PickScenarioPageController',
  function(StateService) {
    this.generate_game_clicked = function() {
      var pcount = document.pick_scenario_form.player_count.value;
      StateService.go('generate_game/' + pcount + 'p');
    }.bind(this);
  });

app.controller('ReviewResultsPageController',
  function() {
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
  function(StateService) {
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
        on_state_init();
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
  function(GameService) {
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
  function() {
  });

app.controller('SpecialEventPageController',
  function() {
  });

app.controller('NewAssignmentPageController',
  function() {
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
  function() {
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
  function() {
  });

app.controller('ShowDiscardsPageController',
  function($window) {
    this.back_clicked = function() {
      $window.history.back();
    };
  });
