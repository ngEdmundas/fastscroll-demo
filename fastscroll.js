(function (sandbox) {
    'use strict';

    var RESIZE_DEBOUNCE_TIMEOUT = 300;

    sandbox.angular.module('fastscroll', ['ng']).directive('fastscroll', fastscroll);

    sandbox.requestAnimationFrame = sandbox.requestAnimationFrame ||
    								sandbox.webkitRequestAnimationFrame ||
    								sandbox.mozRequestAnimationFrame ||
    								function (fn) {
    									return setTimeout(fn, 10);
    								};

    sandbox.cancelAnimationFrame = sandbox.cancelAnimationFrame ||
    								sandbox.webkitCancelAnimationFrame ||
    								sandbox.mozCancelAnimationFrame ||
    								function (id) {
    									clearTimeout(id);
    								};

    function fastscroll($compile, $rootScope) {
    	return {
    		terminal: true,
    		link: function (scope, el, attrs) {
    			var ownScope = scope.$new();
    			var collectionName = getCollectionName(attrs.collection);
    			var itemName = getItemName(attrs.collection);
    			var collection = scope[collectionName];
    			var linkFn = $compile(el.html().trim());
    			var scrollContainer = sandbox.angular.element('<div></div>')
    				.css('position', 'relative').css('overflow', 'hidden');
    			el.html('').css('position', 'relative').css('overflow-x', 'hidden')
    				.css('overflow-y', 'auto').append(scrollContainer);
    			el.on('scroll', update);
    			el.on('touchmove', update);
    			var IScroll = sandbox.iScroll;
    			var iscroll = new IScroll(el[0], {
    				useNativeScroll: true,
    				momentum: true,
    				vScrollbar: true
    			});
    			var lastFrame;
    			var scrollTimeout;
    			var previousElementOffset = 0;
    			var itemScopes = {};
    			var visibleElements;
    			var currentContainerHeight;
    			var numberOfVisibleElements;
    			var resizeTimeout;

    			ownScope.$on('$destroy', function () {
    				iscroll.destroy();
    				// sandbox.$(sandbox.window).off('resize', resize);
    			});

    			// sandbox.$(sandbox.window).on('resize', resize);

    			ownScope.$watchCollection(collectionName, function (newVal) {
    				collection = newVal;
    				initElements();
    			}, true);

    			function resize() {
    				// recalculate styles if scroll height gets larger

    				if (resizeTimeout) {
    					clearTimeout(resizeTimeout);
    					resizeTimeout = null;
    				}

    				resizeTimeout = setTimeout(function () {
    					if (currentContainerHeight < el[0].clientHeight) {
    						initElements();
    					}
    				}, RESIZE_DEBOUNCE_TIMEOUT);
    			}

    			function initElements() {
    				if (visibleElements) {
    					visibleElements.forEach(function (el) {
    						el.remove();
    					});
    				}
    				previousElementOffset = 0;
    				update();

    				for (var scope in itemScopes) {
    					if (itemScopes.hasOwnProperty(scope)) {
    						itemScopes[scope].$destroy();
    					}
    				}

    				itemScopes = {};

    				// keep this to check element resize
    				currentContainerHeight = el[0].clientHeight;
    				numberOfVisibleElements = Math.min(
    					Math.ceil(el[0].clientHeight / parseInt(attrs.itemHeight, 10)) + 1,
    					collection.length
    				);

    				visibleElements = setupElement(
    					numberOfVisibleElements,
    					parseInt(attrs.itemHeight, 10),
    					collection.length,
    					scrollContainer
    				);

    				updateVisibleDivs(numberOfVisibleElements, 0);

    				iscroll.refresh();
    			}

    			function update() {
    				if (visibleElements) {
    					visibleElements.forEach(function (i) {
    						i.css('pointer-events', 'none');
    					});
    				}
    				if (scrollTimeout) {
    					clearTimeout(scrollTimeout);
    				}
    				scrollTimeout = setTimeout(function () {
    					if (visibleElements) {
    						visibleElements.forEach(function (i) {
    							i.css('pointer-events', 'auto');
    						});
    					}
    				}, 100);
    				sandbox.cancelAnimationFrame(lastFrame);
    				lastFrame = sandbox.requestAnimationFrame(render);
    			}

    			function render() {
    				// get scroll position only ONCE
    				var scrollTop = el[0].scrollTop;

    				var currentElementOffset = Math.floor(scrollTop / parseInt(attrs.itemHeight, 10));

    				if (currentElementOffset !== previousElementOffset) {

    					updateVisibleDivs(
    						currentElementOffset - previousElementOffset,
    						currentElementOffset
    					);

    				}

    				previousElementOffset = currentElementOffset;
    			}

    			function updateVisibleDivs(elementDelta, elementOffset) {
    				var invalidatedDivs;

    				if (elementDelta > 0) {
    					// scroll direction: down
    					invalidatedDivs = visibleElements.splice(0, elementDelta);
    					updateDivs(invalidatedDivs, elementDelta, elementOffset);
    					invalidatedDivs.forEach(function (div) {
    						visibleElements.push(div);
    					});
    				} else {
    					// scroll direction: up
    					invalidatedDivs = visibleElements.splice(elementDelta);
    					updateDivs(invalidatedDivs, elementDelta, elementOffset);
    					invalidatedDivs.reverse().forEach(function (div) {
    						visibleElements.unshift(div);
    					});
    				}


    			}

    			function updateDivs(invalidatedDivs, elementDelta, elementOffset) {
    				// hide all for smaller render footprint
    				invalidatedDivs.forEach(function (div) { div.css('visibility', 'hidden'); });

    				// set new top property
    				// and fill in content
    				invalidatedDivs.forEach(function (div, index) {
    					var newTop;

    					var elementDeltaFix = Math.min(numberOfVisibleElements, elementDelta);

    					if (elementDelta > 0) {
    						newTop = elementOffset + numberOfVisibleElements - elementDeltaFix + index;
    					} else {
    						newTop = elementOffset + index;
    					}


    					doCompile(div, newTop);

    					div.css('top', newTop * parseInt(attrs.itemHeight, 10) + 'px');
    				});

    				// CLEAR TEH OLD SCOPEZ
    				var i;
    				if (elementDelta > 0) {
    					for (i = elementOffset - elementDelta; i < elementOffset; i++) {
    						if (itemScopes[i]) {
    							itemScopes[i].$destroy();
    							delete itemScopes[i];
    						}
    					}
    				} else {
    					for (i = elementOffset + numberOfVisibleElements - elementDelta;
    						i >= elementOffset + numberOfVisibleElements; i--) {
    						if (itemScopes[i]) {
    							itemScopes[i].$destroy();
    							delete itemScopes[i];
    						}
    					}
    				}

    				if (!$rootScope.$$phase) { ownScope.$digest(); }

    				// show again
    				invalidatedDivs.forEach(function (div) { div.css('visibility', 'visible'); });
    			}

    			function doCompile(div, pos) {
    				var itemScope = itemScopes[pos] || ownScope.$new();
    				itemScope.$index = pos;
    				itemScope[itemName] = collection[pos];

    				itemScopes[pos] = itemScope;

    				linkFn(itemScope, function (el, scope) { div.html('').append(el); });
    			}
    		}
    	};
    }

    function getCollectionName(str) {
    	return str.split(' in ')[1];
    }

    function getItemName(str) {
    	return str.split(' in ')[0];
    }

    function setupElement(numberOfVisibleElements, itemHeight, itemNumber, scrollContainer) {
    	var visibleElements = createVisibleElements(numberOfVisibleElements, itemHeight);

    	scrollContainer.css('height', itemHeight * itemNumber + 'px');

    	visibleElements.forEach(function (currentEl) { scrollContainer.append(currentEl); });

    	return visibleElements;
    }

    function createVisibleElements(number, height) {
    	var visibleElements = [];
    	for (; number; number--) {
    		visibleElements.push(
    			sandbox.angular.element('<div></div>').css('height', height + 'px').css('position', 'absolute')
    				.css('width', '100%')
    				.addClass('scrollz-item-direct')
    		);
    	}
    	return visibleElements;
    }

}(this));
