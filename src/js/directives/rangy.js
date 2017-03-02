angular.module('miller')
  .directive('rangy', function($log, $rootScope, angularLoad, RUNTIME, EVENTS) {
    return {
      restrict: 'AE',
      templateUrl: RUNTIME.static + 'templates/partials/directives/rangy.html',// ',// template: '<div style="background:gold;height:150px; width:300px;"><div ng-click="highlightSelectedText($event)">add comment</div></div>',
      
      scope: {
        actor: '=',
        target: '=',
        highlights: '=',
        forwardCommented: '&commented',
        // forwardCommentsSelected: '&onCommentsSelected'
      },
      link: function(scope, element, attrs) {
        if(!attrs.container){
          $log.error('💾 rangy directive needs a container scope babe.');
          return;
        }

        var idnum  = 0,
            container = angular.element('#' + attrs.container);
        
        scope.isEnabled = false;
        // keys are comment identifier. Values are related rangy CharacterRange dict.
        scope.serializedHighlights = {};
        scope.commentsSelected = [];

        scope.commented = function(err, comment){
          if(err){
            $log.log('💾 rangy > commented() received an error:', err);
            return
          }
          $log.log('💾 rangy > commented() success:', comment);
          // scope.discarded();
          scope.forwardCommented({error: err, comment: comment});
        }

        scope.discarded = function(){
          $log.log('💾 rangy > discarded()');
          if(scope.highlight)
            scope.highlight = null;
          $rootScope.rangy.highlighters.highlight.removeAllHighlights();
          scope.hide();
        }

        scope.show = function(event) {
          var offset = container.offset(),
              left   = window.innerWidth  - 510 - offset.left;//Math.max(Math.min(event.pageX , window.innerWidth - 500) - offset.left, 0);

          element.css({'z-index':10,position: 'absolute', top: event.pageY - offset.top, left:left});
          
          scope.isEnabled = true;
        }
        scope.hide = function() {
          scope.isEnabled = false;
          if(previousSelectedHighlight)
            previousSelectedHighlight.removeClass('active')
          // element.css({position: 'relative', top:'auto', left:'auto'});
        }
        var previousSelectedHighlight;

        $log.log('💾 rangy lazy loading rangy lib ... on: #'+ attrs.container)
        angularLoad.loadScript(RUNTIME.static + 'js/scripts.rangy.min.js').then(function() {
          $log.log('💾 rangy lib loading done; rangy.initialized:', rangy.initialized);
          if(!rangy.initialized)
            rangy.init();

          if(!$rootScope.rangy)
            $rootScope.rangy = {}
          
          if(!$rootScope.rangy.highlighters){
            $rootScope.rangy.highlighters = {};
            $rootScope.rangy.highlighters.highlight = rangy.createHighlighter();
            $rootScope.rangy.highlighters.highlight.addClassApplier(rangy.createClassApplier('highlight', {
              ignoreWhiteSpace: true,
              tagNames: ["span", "a"],
            }));
          }
          // $rootScope.rangy.highlighter.deserialize('type:textContent|5782$5919$1$highlight crazy${"data-id":"123456"}$')
          // prepare class applier, one for each comment ... no comment
          scope.prepareSelectedText = function(event) {
            
            if(rangy.getSelection().isCollapsed){
              $log.log('💾 rangy > prepareSelectedText() nothing selected...')
              if(scope.highlight){
                scope.discarded();
              }
              scope.hide();
              return;
            }

            // if scope.highlight, discard previous selection
            if(scope.highlight){
              $rootScope.rangy.highlighters.highlight.removeAllHighlights();
              
            }
            
            // clean previous selection
            scope.commentsSelected = [];

            // get top
            scope.show(event);
            var h = $rootScope.rangy.highlighters.highlight.highlightSelection("highlight", {
              containerElementId: attrs.container
            });
            
            rangy.getSelection().removeAllRanges();
            h[0].attrs = {'hl':''}
            scope.highlight = {
              h: h[0],
              s: $rootScope.rangy.highlighters.highlight.serializeHighlight(h[0])
            }

            $log.log('💾 rangy > prepareSelectedText() serialized:', scope.highlight.s);
          };
          
          // create one class applier per comment id 
          // (rangy lib does not handle overlappings very well.)
          function createHighlighter(classname){
            if($rootScope.rangy.highlighters[classname])
              return $rootScope.rangy.highlighters[classname];
            var h = rangy.createHighlighter();
            h.addClassApplier(rangy.createClassApplier(classname, {
              ignoreWhiteSpace: true,
              tagNames: ["span", "a"],
              // normalize: true,
              exclusive: true
            }));
            $rootScope.rangy.highlighters[classname] = h
            return h;
          }

          // deserialize rangy highlights according to the
          // class applier
          scope.renderHighlights = function(serializeds) {  
            serializeds.forEach(function(d) {
              // get clannema
              // var comments = ['type:textContent|4063$4150$1$s.120.c.1$${"hl":""}','type:textContent|4063$4159$5$s.120.c.2$${"hl":""}','type:textContent|6145$6291$2$highlight$${"data-id":"123456","data-highlight-id":"123456"}', 'type:textContent|5782$5919$1$highlight$${"data-highlight-id":"123456"}', ]
              var id = d.split('$')[3], // e.g: 'type:textContent|4063$4150$1$s.120.c.1$${"hl":""}' -> s.120.c.1
                  h;
              // scope.serializedHighlights
              // handle removed highlights...
              if(id.length && !scope.serializedHighlights[id]) {
                $log.log('rangy create highlighter');
                h = createHighlighter(id);
                h.deserialize(d);
                scope.serializedHighlights[id] = h.highlights[0].characterRange;
              }
            });
            $log.log('💾 rangy -> renderHighlights() serializedHighlights:', scope.serializedHighlights);
          };

          function toggleFocus(el) {
            if(previousSelectedHighlight)
              previousSelectedHighlight.removeClass('active')
            previousSelectedHighlight = el;
            previousSelectedHighlight.addClass('active');
          };
          
          function onEscapeKey(e) {
            if(e.keyCode === 27){
              if(scope.highlight){
                scope.discarded();
              }
              scope.hide();
              scope.$apply();
            }
          };

          function onQuoteClick(event) {
            var focus = event.currentTarget.getAttribute('rangy-highlight'),
                // span focusable
                el    = container.find('.' + focus),
                // its offset().top
                top   = el.offset().top;

            $log.log('💾 rangy div[rangy-highlight]@click, focus:', focus);

            // scroll the window to reach the highlighted quote
            $('body').stop().animate({scrollTop:top - window.innerHeight/3}, '360', 'swing', function() { 
              
            })
            // highlight
            toggleFocus(el);
            scope.commentsSelected = _.uniq(el[0].className.split(' ').concat([focus]));
            scope.show({
              pageY: top
            });
            scope.$apply();
          };


          function onHighlightClick(event) {
            toggleFocus($(event.currentTarget));

            // if there is no selection; we want to view the comment.
            if(rangy.getSelection().isCollapsed) {
              $log.log('💾 rangy span[hl]@click, no selection, view comment:', event.currentTarget.className)
              event.stopImmediatePropagation(); // we do not stop, we want to see the commenter as well.
              // save the uids in the current scope
              scope.commentsSelected = event.currentTarget.className.split(' ');
            } else { // let the event pass by
              $log.log('💾 rangy span[hl]@click with selection')
            }
            scope.show(event);
            // var offset = angular.element('#' + attrs.container).offset();
            // element.css({'z-index':10,position: 'absolute', top: event.pageY - offset.top, left:event.pageX - offset.left});
            
            scope.$apply()
          }

          // on click on rendered highlights, we use the related comment shorturl as classnames 
          // the classApplier adds a hl html attributes on the html tag used as highlighter.
          container.on('click', '[hl]', onHighlightClick);

          // otherwise, a click on everything just toggle the window.
          container.on('click', scope.prepareSelectedText);

          // click on a DOM element having a rangy-highlight attribute makes the window scroll to the desired position in the text.
          $(document).on('click', 'div[rangy-highlight]', onQuoteClick);

          // listen to ESC press: discard the rangy modal.
          $(document).keyup(onEscapeKey);
          
          //Listen to comment socket. This way, we can have a pseudo realtime chat...
          $rootScope.$on(EVENTS.SOCKET_USER_COMMENTED_STORY, function(event, data){
            // check if we are selecting the same overlapping stuff.
            // note that highlights have not been updatescope.commentsSelectedd yet.
            // moreover, if there are no scope.commentsSelected, we should tak into account
            // scope.highlight (the current highlight withot any comments yet)
            if(data.target.id == scope.target.id && data.info.comment.highlights && (scope.commentsSelected.length || scope.highlight)){
              $log.log('💾 rangy @EVENTS.SOCKET_USER_COMMENTED_STORY')  
              // highights via socket should match the rangy format.
              var commentRange = data.info.comment.highlights.match(/\|(\d+)\$(\d+)\$/),
                  sample = scope.commentsSelected.length? scope.serializedHighlights[scope.commentsSelected[0]]: scope.highlight.h.characterRange;
              
              if(commentRange[1] >= sample.start && commentRange[2] <= sample.end){
                scope.commentsSelected.push(data.info.comment.short_url);
              }
            }
          });

          $rootScope.$on(EVENTS.SOCKET_USER_UNCOMMENTED_STORY, function(event, data) {
            
          })

          // listen to target.highlights. Call renderHighlights() if necessary.
          scope.$watchCollection('highlights', function(highlights) {
            if(highlights && highlights.length)
              scope.renderHighlights(highlights)
            else
              $log.log('💾 rangy @highlights no highlights found.');
          });

          // destroy jquery listeners
          scope.$on('$destroy', function() {
            $log.log('💾 rangy @$destroy...');
          });
        }).catch(function() {
          // There was some error loading the script. Meh
          $log.warn('💾 rangy lib error', 'ooooo');
        });
      }
    }
  })