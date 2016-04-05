app = angular.module('pandemicDuplicateApp', []);

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

app.controller('TopController',
  function($scope, StateService) {
    this.goto_state_async = function(rel_url) {
      $scope.$apply(function() {
        StateService.go(rel_url);
      });
    };
    window.addEventListener('popstate', function() {
      $scope.$apply(on_state_init);
    });
    on_state_init();
  });

app.controller('WelcomePageController',
  function() {
  });

app.controller('OptionsPageController',
  function() {
  });

app.controller('SubscriptionPageController',
  function() {
  });

app.controller('CreateGamePageController',
  function() {
  });

app.controller('GenerateGamePageController',
  function() {
  });

app.controller('JoinGamePageController',
  function() {
  });

app.controller('JoinGamePickPageController',
  function() {
  });

app.controller('PickScenarioPageController',
  function() {
  });

app.controller('ReviewResultsPageController',
  function() {
  });

app.controller('FoundCompletedGamesPageController',
  function() {
  });

app.controller('PlayerNamesPageController',
  function() {
  });

app.controller('DeckSetupPageController',
  function() {
  });

app.controller('BoardSetupPageController',
  function() {
  });

app.controller('PlayerSetupPageController',
  function() {
  });

app.controller('PlayerTurnPageController',
  function() {
  });

app.controller('DiscoverCurePageController',
  function() {
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
  function() {
  });

app.controller('ResourcePlanningPageController',
  function() {
  });

app.controller('GameCompletedPageController',
  function() {
  });

app.controller('ResultsPageController',
  function() {
  });

app.controller('ShowDiscardsPageController',
  function() {
  });
