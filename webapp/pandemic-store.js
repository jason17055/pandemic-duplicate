var app = angular.module('pandemicStore', []);

app.service('Storage',
  function($window) {
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

app.service('GameStore',
  function() {
    // TODO
  });

app.service('ResultStore',
  function() {
    // TODO
  });

app.service('ScenarioStore',
  function() {
    // TODO
  });
