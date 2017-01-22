angular.module('miller').controller('EnrichModalCtrl', function ($timeout, $scope, $log, QueryParamsService, DocumentFactory, StoryFactory, OembedSearchFactory, embedService, localStorageService, Upload) {
  
  $log.info('EnrichModalCtrl ready with crazy scope, language:', $scope.language);

  // initialize tabs here
  $scope.tabs = {
    favourite: {
      name: 'favourite',
      items: [],
      count: 0,
      next: undefined,
      isLoadingNextItems: false,
      suggest: function(query, keep){
        var $s = this;
        $log.log('tab.favourite > suggest', $s);
        $s.isLoadingNextItems = true;
        if(!keep){
          $s.next = undefined;
        }

        DocumentFactory.get($s.next || {
          filters: JSON.stringify(query.length > 2? {contents__icontains: query}: {})
        }, function(res){
          $log.log('tab.favourite > suggest loaded n.docs:', res.results.length, QueryParamsService(res.next || ''));
          
          $s.items   = $s.next? ($s.items || []).concat(res.results): res.results;
          $s.count   = res.count;
          $s.missing = res.count - $s.items.length;
          $s.next    = QueryParamsService(res.next || '');

          $s.isLoadingNextItems = false;
        });
      },
      init: function(){
        $log.log('init', this);
        localStorageService.set('lasttabname', this.name)
        this.suggest($scope.query || '');
      }
    },
    glossary: {
      name: 'glossary',
      items: [],
      count: 0,
      next: undefined,
      suggest: function(query, keep){
        var $s = this;
        $log.log('tab.glossary > suggest', $s);
        
        $s.isLoadingNextItems = true;
        if(!keep){
          $s.next = undefined;
        }

        StoryFactory.get($s.next || {
          filters: JSON.stringify(query.length > 2? {
            contents__icontains: query,
            tags__category__in: ['writing', 'blog'],
            status: 'public'
          } : {
            tags__category__in: ['writing', 'blog'],
            status: 'public'
          })
        },function(res){
          $log.log('tab.glossary > suggest loaded n.docs:', res.results.length, QueryParamsService(res.next || ''));
          
          $s.items   = $s.next? ($s.items || []).concat(res.results): res.results;
          $s.count   = res.count;
          $s.missing = res.count - $s.items.length;
          $s.next    = QueryParamsService(res.next || '');
          $s.isLoadingNextItems = false;
        });
      },
      init: function(){
        $log.log('init', this);
        localStorageService.set('lasttabname', this.name)
        this.suggest($scope.query || '');
      }
    },
    url: {
      name: 'url',
      items: [],
      suggest: function(url, keep){
      
      },
      onEmbedChange: function(){
        // change type if there is an embed with type link! We put rich.
        $log.log('EMC @embed embed.type:', $scope.embed.type);
        if($scope.embed.html && $scope.embed.type == 'link')
          $scope.embed.type = 'rich'
      },
      
      init: function(){
        $log.log('init', this);
        localStorageService.set('lasttabname', this.name)
        this.suggest($scope.url || '');
      }
    },
    CVCE: {
      name: 'CVCE',
      items: [],
      count: 0,
      next: undefined,
      suggest: function(query, keep){
        var $s = this;
        $log.log('tab.CVCE > suggest - query:', query);
        $s.isLoadingNextItems = true;
        
        if(!OembedSearchFactory.CVCE){
          $log.error('OembedSearchFactory.CVCE does not exist');
          return;
        }

        if(!query || query.length < 3){
          return;
        }

        

        if(!keep){
          $s.next = undefined;
        }

        
        OembedSearchFactory.CVCE($s.next || {
          q: query
        }).then(function(res){
          $log.log('tab.CVCE > suggest loaded n.docs:', res.data.count);
          $s.items   = $s.next? ($s.items || []).concat(res.data.results): res.data.results;
          $s.count   = res.data.count;
          $s.missing = res.data.count - $s.items.length;
          $s.next    = QueryParamsService(res.data.next || '');
          $s.query   = query;

          $s.isLoadingNextItems = false;
          // scope.suggestMessage = '(<b>' + res.data.count + '</b> results)';
        }, function(){
          debugger
        });
      },
      init: function(){
        $log.log('init', this);
        localStorageService.set('lasttabname', this.name)
        this.suggest($scope.query || '');
      }
    },
    upload: {
      name: 'upload', 
      items: [],
      undo: function(){
        $scope.uploadable = null;
        $scope.uploadablefile = {};
      },
      // stands for upload, suggest is a placeholder here.
      upload: function(){
        var $s = this;
        if(!$scope.uploadablefile){
          // error
          $log.warn('no file is selected');
          return
        }
        
        var types = {
          'image/jpg': 'image',
          'image/png': 'image',   
          'application/pdf': 'pdf'
        };
        debugger
        // uploadable has value, name and size.
        Upload.upload({
          url: '/api/document/',
          data: {
            title: $scope.uploadablefile.title || $scope.uploadablefile.name,
            type: types[$scope.uploadablefile.type] || $scope.uploadablefile.type.split('/').shift(),
            mimetype: $scope.uploadablefile.type,
            metadata: JSON.stringify({
              bibtex: $scope.reference,
              copyright: $scope.uploadablefile.copyright
            }),
            attachment: $scope.uploadablefile.f
          }
        }).then(function (res) {
          $log.debug('UploadCtrl -> upload() status:', res.status)
          if(res.status == 201){
            $log.debug('UploadCtrl -> upload() status:', 'success!', res.data)
            // add document
            $scope.uploadablefile.progressPercentage = 0;
            $scope.uploadablefile.document = res.data;
            $scope.selectDocument($scope.uploadablefile.document);
          } else {
            $log.error(res);
            // error handling?
          }

        }, null, function (evt) {
          $scope.uploadablefile.progressPercentage = parseInt(10000.0 *
            evt.loaded / evt.total)/100;
          $log.log('progress: ' + $scope.uploadablefile.progressPercentage + 
              '% ' + evt.config.data, $scope.uploadablefile.name, evt);
        });

      },
      init: function(){
        $log.log('init', this);
        // forget previous upload
        $scope.uploadable = null;
        $scope.uploadablefile = {};
        localStorageService.set('lasttabname', this.name)
      }
    }
  };
  
  $scope.uploadablefile = {}

  $scope.$watch('uploadable', function (v) {
    if(v){
      $log.debug('::mde @uploadable', v)
      $scope.uploadablefile.f = v;
      $scope.uploadablefile.name = v.name;
      $scope.uploadablefile.size = v.size;
      $scope.uploadablefile.type = v.type;
    }
  });

  var timer_preview;
  $scope.previewUrl = function(url){
    if(timer_preview)
      $timeout.cancel(timer_preview);
    // check url
    var regexp = /^(ftp|http|https):\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&&#37;@!\-\/]))?/;
    if(!regexp.test(url)){
      $log.error('::mde -> previewUrl() url provided:', url, 'is not valid');
      $scope.suggestMessage = '(url is not valid)';
      $scope.isUrlValid = false;
      $scope.embed = null;

      return false;
    }
    $scope.isUrlValid = true;
    url = url.replace('#', '.hash.');
    timer_preview = $timeout(function(){
      $log.debug('::mde -> previewUrl() url:', url);
      $scope.suggestMessage = '(loading...)';
      embedService.get(url).then(function(data){
        $log.debug(':: mde -> previewUrl() received:', data)
        $scope.embed = data;
        $scope.suggestMessage = '(<b>done</b>)';
      });
    }, 20);
  };

  

  $scope.setTab = function(tabname){
    $log.log('EnrichModalCtrl -> setTab() tab.name:', tabname);

    $scope.tab = $scope.tabs[tabname];
    $scope.tab.init()
  }


  $scope.suggest = function(query){
    $log.log('EnrichModalCtrl -> suggest() q:', query);
    $scope.tab.suggest(query);
  }

  $scope.upload = function(query){
    $log.log('EnrichModalCtrl -> upload()');
    $scope.tab.upload();
  }

  $scope.undo = function(){
    $log.log('EnrichModalCtrl -> undo()');
    $scope.tab.undo();
  }


  $scope.more = function(query, tab){
    $log.log('EnrichModalCtrl -> more()');
    $scope.tab.suggest(query, true);
  }


  
  $scope.setTab(localStorageService.get('lasttabname') || 'favourite');


});