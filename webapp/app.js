app = angular.module('pandemicDuplicateApp', []);/*, ['ui.router']*/
/*app.config(
  function($stateProvider) {
    var defStateEnter = function($state) {
      console.log('entering state');
      console.log($state);
    };

    console.log('configuring stateProvider');
    $stateProvider
      .state('create_game', {
        onEnter: defStateEnter
      });
  });*/

app.controller('TopController',
  function($scope) {
    this.currentPage = null;

    this.setPageWithApply = function(newPage) {
      $scope.$apply(function() {
        this.currentPage = newPage;
      }.bind(this));
    }.bind(this);

    $(function() {
      window.addEventListener('popstate', on_state_init);
      on_state_init();
    });
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
