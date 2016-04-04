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
