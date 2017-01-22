/**
 * @ngdoc function
 * @name miller.controller:coreCtrl
 * @description
 * # CoreCtrl
 * common functions go here.
 */
angular.module('miller')
  .controller('ItemsCtrl', function ($scope, $log, $filter, items, model, factory, QueryParamsService) {
    $log.log('ItemsCtrl ready, n.:', items.count, '- items:',items);

    // model is used to get the correct item template
    $scope.model = model;
    /*
      Get the firs n sentence until the number of words are covered.
      return an array
    */
    function tokenize(text, words){
      var sentences = text.split(/[\.!\?]/);
      // console.log(text, sentences);
      return sentences;
    }

    function normalizeItems(items) {
      return items
        .map(function(d){
          if(!d.metadata || !d.metadata.abstract)
            return d
          if(d.tags && d.tags.length && _.filter(d.tags, {slug: 'collection', category:'writing'}).length){
            d.isCollection = true
          }
          // console.log(d)
          if(!d.metadata.abstract[$scope.language]){
            return d;
          }

          d.excerpt = $filter('tokenize')(d.metadata.abstract[$scope.language], 32);
          return d;
        })
    };
    
    // update scope vars related to count, missing, and render the items
    $scope.sync = function(res){
      $scope.isLoadingNextItems = false;
      // update next
      next = QueryParamsService(res.next || '');
      console.log('ItemsCtrl > sync()', next);
      // update count
      $scope.count = res.count;
      // push items
      $scope.items = ($scope.items || []).concat(normalizeItems(res.results));
      // update missing
      $scope.missing = res.count - $scope.items.length;
    }

    $scope.more = function(){
      if($scope.isLoadingNextItems){
        $log.warn('is still loading');
        return;
      }
      $scope.isLoadingNextItems = true;
      factory(next, $scope.sync);
    }

    $scope.sync(items);
    
    // $scope.$watch('language', function(v){
    //   if(v){
    //     $scope.items =normalizeItems($scope.items);
    //   }
    // })
  });
  