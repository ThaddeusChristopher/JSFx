
var jsfX = new JSFx();

$(document).ready(function() {
	jsfX.enablePollingMonitor();
});

function JSFx() {
	
	this.config = [];
	
	this.prevClickJQ = [];
	this.prevClickJQhandler = [];
	
	this.prevSelectedChild = [];
	this.timeClicked = [];
	this.executing = [];
	
	this.log = false;
	
	this.jsfComponents = [];
	this.childrenToDisable = [];
	
	this.alreadyCreatedAspect = [];
	this.elemHasDelegator = [];
	this.elemIsDelegator = [];
	this.me = this; // for closures
	
}

JSFx.prototype.findEvents = function(element, strategy) {
	var allEvents = findEventHandlers("click", element, strategy);
	return allEvents;
};

JSFx.prototype.convertElemBackToQueryString = function($jsf, $jsfComponent_parent, jsfComponent_children, compId) {
	if($jsf.attr("id") || jsfX.config[compId].isAlone) {
		return $("#"+$jsf.attr("id").replace(/:/g,"\\:"));
	}
    var $children = $jsfComponent_parent.find(jsfComponent_children);
    // now find the child idx that matches childId     asdf    get$selector
    var i = $children.index($jsf);
    if(i == -1) {
    	return null;
    }
    // ex: '#fileForm\\:tagCloud1 li a:eq(3)'
    return get$selector($jsf).replace(/:/g,"\\:");
};

JSFx.prototype.$jsfToCompId = function($jsf) {
	if($jsf == undefined) {
		return "";
	}
	for(var compId in jsfX.config) {
		var jsfComponent = jsfX.config[compId].jsfComponent;
		if($(compId)[0] == $jsf[0]) { // also true when:  jsfX.config[compId].isAlone
			return compId; // $jsf is the main jsf component itself
		}
		var children = jsfX.config[compId].children;
		var parentJsfComp = $jsf.closest(jsfComponent);
		if(parentJsfComp.length > 0) {
			if($(jsfComponent).find(children).index($jsf) !== -1) {
				return compId; // $jsf is a child of this jsf component
			}
		}
		
		/** DEBUG 9
		 * Possible future bug: if main/parent $jsf is passed in, this outputs the
		 * FIRST matching compId it finds. So when initializing with multiple config jsf 
		 * components that have SAME main/parent jsfComponent, but DIFFERENT children,
		 * this function outputs either one of those 2+ compId's arbitrarily. 
		 * Usually this is fine since when we wish to convert a *parent* $jsf to a 
		 * compId we aren't desiring any ONE of its many potential registrations (each
		 * with their own children). just a random one of the bunch.
		 */
	}
};

JSFx.prototype.resetAspectState = function() {
	for(var key in jsfX.alreadyCreatedAspect) {
		jsfX.alreadyCreatedAspect[key] = false;
	};
};

JSFx.prototype.interceptFunc = function($jsf, staticId, compId, overrideFunc) {
		$jsf.addClass("interceptor").addClass('monitorEvents');
		$jsf.off("click", jsfX.interceptAspect).bindFirst("click",jsfX.interceptAspect);
		jsfX.alreadyCreatedAspect[staticId] = true;
		if(!jsfX.prevClickJQhandler[staticId]) {
			jsfX.prevClickJQhandler[staticId] = [];
		}
		if(overrideFunc.toString().indexOf("@Dummy") !== -1) {
			jsfX.prevClickJQhandler[staticId].push(function() {});
		} else if($.inArray(overrideFunc, jsfX.prevClickJQhandler[staticId]) === -1) {
			jsfX.prevClickJQhandler[staticId].push(overrideFunc);
		}
};



JSFx.prototype.cancelNonJSFxclickAndApplyAspect = function(allEvents, $jsf, staticId) {
	var compId = jsfX.$jsfToCompId($jsf);
	if(jsfX.config[compId].funcHandle) {
		jsfX.interceptFunc($jsf, staticId, compId, jsfX.config[compId].funcHandle);
		return $jsf;
	}
	var appliedAspectElem = null;
	if(!allEvents) {
		return appliedAspectElem;
	}
	if(allEvents[0] && allEvents[0].events) {
		for(var i = 0; i < allEvents.length; i++) {
			var ln1 = allEvents[i].events.length;
			for(var j = 0; j < ln1; j++) {
				var handler = allEvents[i].events[j].handler;
				if(handler.toString().indexOf("@jsfX") === -1 && handler.toString().indexOf("@Before") === -1) {
					var element = allEvents[i].element;
					var $element = $(element);
					appliedAspectElem = $element;
					/**
					 * DEBUG:  tbody staticId is used in this prevClickJQhandler, but it's the 
					 *         TR row elements that we apply jsfXhover to
					 */ 
					var currChildId = jsfX.getStaticId($element); 
					var clonedClick = handler; 
					if($jsf.closest($element).length !== 0) {
						// curr element (like TBODY) is a parent of @jsf (like TR)
						var delegator = $element;
						/**
						 * DEBUG:  only save events of delegatorId/currChildId that match with
						 *         current $jsf clicked
						 *         
						 *    jsfX.findEvents(delegator, "allDescendants")
						 *    ^ this has "target" with current $jsf TR
						 */
						var allEventsOfDelegator = jsfX.findEvents(delegator, "allDescendants");
						if(!allEventsOfDelegator) {
							return appliedAspectElem;
						}
						/**
						 * DEBUG:  Below is useful ONLY because we are in this conditional: 
						 *           if(jsfX.elemHasDelegator[selfStaticId]) { ... }
						 */
						if(allEventsOfDelegator[0] && allEventsOfDelegator[0].events) {
							for(var i2 = 0; i2 < allEventsOfDelegator.length; i2++) {
								var ln2 = allEventsOfDelegator[i2].events.length;
								for(var j2 = 0; j2 < ln2; j2++) {
									var handler2 = allEventsOfDelegator[i2].events[j2].handler;
									if(handler2.toString().indexOf("@jsfX") === -1 && handler2.toString().indexOf("@Before") === -1) {
										var targets = allEventsOfDelegator[i2].events[j2].targets;
										var indexOfMe = $.inArray($jsf[0],targets);
										if(indexOfMe !== -1) {
											// then THIS HANDLER is the CORRECT ONE 
											//      for THIS EVENT/$jsf combo
											jsfX.interceptFunc($jsf, staticId, compId, handler2);
										}
									}
								}
							}
						}
					} else if(get$selector($element) == get$selector($jsf)) {
						// ORDER MATTERS: above "parent" checker should GO FIRST
						jsfX.interceptFunc($element, currChildId, compId, clonedClick);
					}
				}
			}
		}
	}
	/**
	 * DEBUG:  This is NECESSARY so that children will be able to rewire their clicks to
	 *         any possible event-delegating parents. e.g., in PrimeFaces, "onRowClick" being
	 *         hidden in TBODY instead of directly on a TR.
	 */
	return appliedAspectElem;
};


JSFx.prototype.tempDisableComponent = function($jsf, funcHandle, args) {
	if( !jsfX.hasAspect($jsf) ) {
		var events = jsfX.findEvents($jsf, "allDescendants");
		var compId = jsfX.$jsfToCompId($jsf);
		var parentJsf = jsfX.config[compId].jsfComponent;
		if(!events|| events.length == 0) {
			events = jsfX.findEvents($(parentJsf), "allDescendants");
			if(!events|| events.length == 0) {
				return;
			}
		}
		if(jsfX.log) console.log($jsf.attr('id'));
		var id = jsfX.getStaticId($jsf);
		var mustRunAspectOnMe = null;
		var appliedAspectElem = jsfX.cancelNonJSFxclickAndApplyAspect(events, $jsf, id);
		if(!appliedAspectElem || !jsfX.prevClickJQhandler[id] || jsfX.prevClickJQhandler[id].length == 0) {
			/**
			 * IMPORTANT! this means that our current $jsf IS NOT the holder of the real
			 *            function handle. e.g., a TR element whose click handler is 
			 *            really inside TBODY.
			 */ 
			var $parent = $(parentJsf);
			var parentEvents = jsfX.findEvents($parent, "allDescendants");
			appliedAspectElem = jsfX.cancelNonJSFxclickAndApplyAspect(parentEvents, $jsf, id);
		}
		// last shot, using inline events...
		// help:  http://www.htmlgoodies.com/html5/javascript/working-with-inline-event-handlers.html#fbid=YbYZSRaWB8e
		if(!appliedAspectElem || !jsfX.prevClickJQhandler[id] || jsfX.prevClickJQhandler[id].length == 0) {
			var inlineEvents = getInlineEventHandlers($jsf); 
			var staticId = id;
			for(var i = 0; i < inlineEvents.length; i++) {
				if(inlineEvents[i].name.indexOf("click") !== -1 &&
				   inlineEvents[i].ownerElement == $jsf[0]) {
					// then THIS HANDLER is the CORRECT ONE 
					//      for THIS EVENT/$jsf combo
					var handler2 = inlineEvents[i].ownerElement.onclick;
					/**
					 * UNIQUE TO Inline Event Handlers...
					 *    Must remove the "onclick" attribute, as its priority will 
					 *    otherwise supercede our Aspect call (happen before it)
					 */
					$jsf.off("click", handler2);
					$jsf.removeAttr("onclick"); 
					
					if(!jsfX.handlersToPeriodicallyRemove) {
						jsfX.handlersToPeriodicallyRemove = [];
					}
					jsfX.handlersToPeriodicallyRemove[compId] = handler2;
					appliedAspectElem = $jsf;
					jsfX.interceptFunc($jsf, staticId, compId, handler2);
				}
			}
			if(appliedAspectElem) {
				$jsf.off("click", jsfX.interceptAspect).bindFirst("click",jsfX.interceptAspect);
			}
		}
		if(!appliedAspectElem) {
			// this means there was a problem finding a viable event handler... 
			var b = 0; //breakpoint
		} else {
			mustRunAspectOnMe = $jsf;
		}
		jsfX.alreadyCreatedAspect[id] = true;
		if(mustRunAspectOnMe) {
			jsfX.interceptAspect.apply($jsf, args);  
		}
	};
};

JSFx.prototype.hasAspect = function($jsf) {
	
	var staticId = jsfX.getStaticId($jsf);
	if(!jsfX.prevClickJQhandler[staticId]) {
		// this protects against odd scenarios like when a toggler has 2 static id's
		// wherein each one needs its own aspect
		return false;
	}
	var compId = jsfX.$jsfToCompId($jsf);
	if(!compId) {
		return false;
	}
	
	var hasAspect = true;
	
	var events = jsfX.findEvents($jsf, "elem");
	if(!events || events.length == 0) {
		return true;
	}
	for(var i = 0; i < events.length; i++) {
		for(var j = 0; j < events[i].events.length; j++) {
			hasAspect = (events[i].events[j].handler + "").indexOf('@Before') !== -1;
			if(hasAspect) {
				return true;
			}
		}
	}
	return hasAspect;
};

JSFx.prototype.interceptAspect = function(event) {
/**@jsfX@Before*/
	
	var $jsf = $(this);
	var selfStaticId = jsfX.getStaticId($jsf);
	var timestamp = new Date().getTime();
	
	var activateOtherRegistrants = false;
	
	var componentId = jsfX.$jsfToCompId($jsf);
	if(!componentId) {
		return;
	}
	var parentJsf = jsfX.config[componentId].jsfComponent;
	var $parentJsf = $(parentJsf);
	var parentStaticId = jsfX.getStaticId($parentJsf);
	var parentCompId = jsfX.$jsfToCompId($parentJsf);
	
	if(jsfX.prevClickJQhandler[selfStaticId]) {
		if(jsfX[parentJsf].numOverlappingRegistrants >= 2 && $.inArray(componentId, jsfX[parentJsf].overlappingRegistrants) !== -1 ) {  //  && (!jsfX[parentJsf].latestTimestamp || jsfX[parentJsf].latestTimestamp == event.timeStamp)
			if(jsfX[parentJsf].bubbleFuse == jsfX[parentJsf].bubbleFuseStart) {
				jsfX[parentJsf].bubbleFuse--;
				// countdown starts now
				activateOtherRegistrants = true;
			} else {
				jsfX[parentJsf].bubbleFuse--;
				if(jsfX[parentJsf].bubbleFuse <= 0) {
					// only stop bubbling once the fuse reaches 0
					activateOtherRegistrants = false;
					jsfX[parentJsf].bubbleFuse = jsfX[parentJsf].bubbleFuseStart; // reset for next time
				}
			}
		} else {
			activateOtherRegistrants = false;
		}
		
		/**
		 * Below now stops even yet-unfinalized children if entire component is disabled
		 */
		var componentDisabledWaitingPeriod = jsfX[parentJsf].componentDisabledWaitingPeriod || 2000;
		if(jsfX[parentJsf].isDisabled && timestamp - jsfX[parentJsf].latestTimestamp < componentDisabledWaitingPeriod) {
			if(jsfX.log) console.log("entire component is currently disabled  :-D");
			
			// also cancel potential parent/other-registrant even fires queued up
			jsfX[parentJsf].parentElemToRunAspectOn = null; // reset
			jsfX[parentJsf].childRan = false; // RESETING
			activateOtherRegistrants = false;
			
			event.stopPropagation();
			event.preventDefault();
			event.stopImmediatePropagation();
			
			return false;
		} else {
			jsfX[parentJsf].isDisabled = false;
		}
		
	}
	
	
	
	if(jsfX[parentJsf].numOverlappingRegistrants >= 2 && $.inArray(componentId, jsfX[parentJsf].overlappingRegistrants) !== -1 ) { 
		/**
		 * This is a bit odd. If we encounter a parent aspect before the 
		 * one member of its children that it overlaps with, we then must QUEUE the parent's
		 * aspect to occur AFTER that child's. It will bubble consistently down to the child.
		 * At the moment, there can be only either 1 or 2
		 * overlappingRegistrants; one a parent, the other a member of its children. 
		 * If somehow that contract breaks, so does this approach. 
		 */
		if(selfStaticId.indexOf("__isParent") !== -1 && !jsfX[parentJsf].childRan) {
			// is parent, is running BEFORE child
			jsfX[parentJsf].parentElemToRunAspectOn = $(parentJsf);
			return;
		} else if(selfStaticId.indexOf("__isParent") !== -1 && jsfX[parentJsf].childRan) {
			// is parent, is running AFTER child
			jsfX[parentJsf].parentElemToRunAspectOn = null; // reset, fall through so parent can check if it should temp disable component 
			jsfX[parentJsf].childRan = false; // RESETING
			activateOtherRegistrants = false;
			
			event.stopPropagation();
			event.preventDefault();
			event.stopImmediatePropagation();
			
		} else if(selfStaticId.indexOf("__isParent") === -1 && !jsfX[parentJsf].parentElemToRunAspectOn) {
			// is child, is running BEFORE parent
			jsfX[parentJsf].childRan = true;
			activateOtherRegistrants = true;
			jsfX[parentJsf].parentElemToRunAspectOn = $(parentJsf);
			
			// it's OK to stop the bubbling here, due to above "parentElemToRunAspectOn" (so it can still run)
			event.stopPropagation();
			event.preventDefault();
			event.stopImmediatePropagation();
			
		} else if(selfStaticId.indexOf("__isParent") === -1 && jsfX[parentJsf].parentElemToRunAspectOn) {
			// is child, is running AFTER parent
			jsfX[parentJsf].parentElemToRunAspectOn = null; // reset
			jsfX[parentJsf].childRan = false; // RESETING
			activateOtherRegistrants = false;
			
			event.stopPropagation();
			event.preventDefault();
			event.stopImmediatePropagation();
			
		}
	} else {
		/**
		 * With no internal event/aspect overlap concern, we ALWAYS stop bubbling. This is because even with .bindFirst() plugin to JQuery 
		 * jsf still (rarely) finds ways to make the other events run after stopping their propagation.
		 * Hence, we are now creating our own restricted sandbox for "bubbling". 
		 * Activation of other registrants (at the moment, only the parent of an event overlap/collision) is handled below (VERY LAST item of this func)
		 */
		event.stopPropagation();
		event.preventDefault();
		event.stopImmediatePropagation();
	}
	jsfX[parentJsf].latestTimestamp = timestamp; // always runs (when entire component is not disabled)
	
	var preventSelectingIfAlreadySelected = jsfX.config[componentId].preventSelectingIfAlreadySelected;
	var sc = jsfX.config[componentId].selectedClass;
	
	var prevSelectedChild = jsfX.prevSelectedChild[parentStaticId];
	var isSelectedChild = null;
	var isHoveredChild = null;
	
	if(preventSelectingIfAlreadySelected == "@AlwaysStopLatestSelection") {
		isSelectedChild = selfStaticId;
		preventSelectingIfAlreadySelected = true;
	} else {
		if($jsf.hasClass(sc ? sc : "ui-state-highlight")) {
			isSelectedChild = selfStaticId;
		} 
		if(preventSelectingIfAlreadySelected == undefined || preventSelectingIfAlreadySelected == "true") {
			preventSelectingIfAlreadySelected = true;
		} else {
			preventSelectingIfAlreadySelected = false;
		}
	}
	
	if($jsf.hasClass("jsfXhover")) {
		isHoveredChild = selfStaticId;
	}
	
	// cancel this aspect call if curr elem (like TR) has event-delegating parent (like TBODY)
	if(jsfX.elemHasDelegator[selfStaticId]) {
		var delegatorId = jsfX.elemHasDelegator[selfStaticId];
		var delegator = jsfX.staticIdTo$jsf(delegatorId);
		
		// do the usual aspect checks here, just for the delegate now
		if( preventSelectingIfAlreadySelected && 
			(isHoveredChild && prevSelectedChild == selfStaticId && isSelectedChild)
		  ) {
			if(jsfX.log) console.log("prevented server call!  :-D");
			if(parentCompId) {
				// only need to update Tfuse if a parent jsf component exists
				jsfX.updateTfuse(jsfX.$jsfToCompId($parentJsf));
			}
			if(jsfX.config[componentId].onPrevent) jsfX.config[componentId].onPrevent();
			jsfX.updateEventsMonitor(); // always update before leaving!
		} else {
			
			var prevTimeClicked = jsfX.timeClicked[ selfStaticId ] || 0;
			var currTime = timestamp;
			
			// this only affects the children passed in, not the whole 
			var disabledPeriod = jsfX.config[componentId].disabledPeriod || 2000;
			if(jsfX.log) console.log(currTime - prevTimeClicked);
			if(currTime - prevTimeClicked > disabledPeriod) {
				if(jsfX.config[componentId].onReenable) { // first time
					setTimeout(jsfX.config[componentId].onReenable, disabledPeriod);
				}
				jsfX.executing[selfStaticId] = false;
			} else {
				jsfX.executing[selfStaticId] = true;
			}
			
			if(!jsfX.executing[selfStaticId]) {
				if(jsfX.log) console.log("inside:"+selfStaticId);
			    if(jsfX.config[componentId].onFirstTime) { // first time
					jsfX.config[componentId].onFirstTime();
				}
				if(jsfX.prevClickJQhandler[delegatorId]) {   // delegatorId !!!!!!
					jsfX.timeClicked[ selfStaticId ] = currTime;
					
					/**
					 * DEBUG:  only firing events of delegatorId that match with
					 *         current $jsf clicked
					 *         
					 *    jsfX.findEvents(delegator, "allDescendants")
					 *    ^ this has "target" with current $jsf TR
					 */
					var allEvents = jsfX.findEvents(delegator, "allDescendants");
					if(!allEvents) {
						return appliedAspectElem;
					}
					
					/**
					 * DEBUG:  Below is useful ONLY because we are in this conditional: 
					 *         if(jsfX.elemHasDelegator[selfStaticId]) { ... }
					 */
					if(allEvents[0] && allEvents[0].events) {
						for(var i = 0; i < allEvents.length; i++) {
							var ln = allEvents[i].events.length;
							for(var j = 0; j < ln; j++) {
								var handler = allEvents[i].events[j].handler;
								if(handler.toString().indexOf("@jsfX") === -1 && handler.toString().indexOf("@Before") === -1) {
									var targets = allEvents[i].events[j].targets;
									var indexOfMe = $.inArray($jsf[0],targets);
									if(indexOfMe !== -1) {
										// then THIS HANDLER is the CORRECT ONE 
										//      for THIS EVENT/$jsf combo
										try {
											handler.apply(this, arguments);
										} catch(err) {
											$.proxy(handler, null, arguments);
										}
									}
								}
							}
						}
					}
					
				}
			}
			
		}
		
		// @After            ~~~~ IMPORTANT ~~~~
		if(parentJsf !== componentId) { 
			jsfX.prevSelectedChild[parentStaticId] = selfStaticId;
		} // else is handler-less parent, so it shouldn't overwrite the other overlapping registrant's prevSelectedChild
		
		jsfX.updateEventsMonitor(); // always update before leaving!
		
		if(activateOtherRegistrants) {
			jsfX.activateOtherRegistrants(this, arguments, parentJsf, componentId, jsfX[parentJsf].overlappingRegistrants);
		}
		
		return;
	}
	// END --> elemHasDelegator
	// If we reach here it means the currently fired event does NOT have a delegator
	
	var tryAgainKey = null;
	
	if( preventSelectingIfAlreadySelected && 
		(isHoveredChild && prevSelectedChild == selfStaticId && isSelectedChild)
	  ) {
		if(jsfX.log) console.log("prevented server call!  :-D");
		if(parentCompId) {
			// only need to update Tfuse if a parent jsf component exists
			jsfX.updateTfuse(jsfX.$jsfToCompId($parentJsf));
		}
		if(jsfX.config[componentId].onPrevent) jsfX.config[componentId].onPrevent();
		jsfX.updateEventsMonitor(); // always update before leaving!
	} else {
		// ELSE do not return yet; mark prev selected as this static id
		
		var prevTimeClicked = jsfX.timeClicked[ selfStaticId ] || 0;
		var currTime = timestamp;
		
		// this only affects the children passed in, not the whole 
		var disabledPeriod = jsfX.config[componentId].disabledPeriod || 2000;
		if(jsfX.log) console.log(currTime - prevTimeClicked);
		if(currTime - prevTimeClicked > disabledPeriod) {
			if(jsfX.config[componentId].onReenable) { // first time
				setTimeout(jsfX.config[componentId].onReenable, disabledPeriod);
			}
			jsfX.executing[selfStaticId] = false;
			
			if(selfStaticId.indexOf("__isParent") !== -1 
					&& jsfX.config[componentId].preventionBehavior 
					&& jsfX.config[componentId].preventionBehavior.indexOf("@DisableEntireComponentOnPrevent") !== -1
					&& jsfX.config[componentId].numTransgressionsBeforeWaitPeriod) {
				// reset fuse for good behavior
				if(jsfX.log) console.log("transgression fuse reset");
				jsfX.config[componentId].currTransgressionsFuse = jsfX.config[componentId].numTransgressionsBeforeWaitPeriod;
			}
			
		} else {
			if(selfStaticId.indexOf("__isParent") !== -1 
					&& jsfX.config[componentId].preventionBehavior 
					&& jsfX.config[componentId].preventionBehavior.indexOf("@DisableEntireComponentOnPrevent") !== -1
					&& jsfX.config[componentId].numTransgressionsBeforeWaitPeriod) {
				if(jsfX.config[componentId].currTransgressionsFuse === undefined || jsfX.config[componentId].currTransgressionsFuse < 0) {
					jsfX.config[componentId].currTransgressionsFuse = jsfX.config[componentId].numTransgressionsBeforeWaitPeriod;
				}
				if(jsfX.log) console.log("transgression: "+jsfX.config[componentId].currTransgressionsFuse);
				if(jsfX.config[componentId].currTransgressionsFuse == 0) {
					jsfX.executing[selfStaticId] = true;
				} else {
					jsfX.executing[selfStaticId] = false;
				}
				--jsfX.config[componentId].currTransgressionsFuse;
			} else {
				jsfX.executing[selfStaticId] = true;
			}
		}
		
		if(!jsfX.executing[selfStaticId]) {
			// call the Join Point's .proceed()
			if(jsfX.prevClickJQhandler[selfStaticId]) {
				jsfX.timeClicked[ selfStaticId ] = currTime;
				var funcsSoFar = [];
				for(var i = 0; i < jsfX.prevClickJQhandler[selfStaticId].length; i++) {
					if($.inArray(jsfX.prevClickJQhandler[selfStaticId][i].toString(), funcsSoFar) !== -1) {
						continue;
					}
					try {
						jsfX.prevClickJQhandler[selfStaticId][i].apply(this, arguments);
					} catch(err) {
						$.proxy(jsfX.prevClickJQhandler[selfStaticId][i], null, arguments);
					}
					funcsSoFar.push(jsfX.prevClickJQhandler[selfStaticId][i].toString());
				}
			} else {
				
				/**
				 * IMPORTANT:  First try closest parents who are ALSO in 
				 *             the jsfX.prevClickJQhandler array...
				 */
				if(jsfX.config[componentId].handlerSearchFuse <= 0) {
					if(jsfX.log) console.log("flagging component as handler-less");
					jsfX.prevClickJQhandler[selfStaticId] = [];
					jsfX.prevClickJQhandler[selfStaticId].push(function(){});
				} else {
					--jsfX.config[componentId].handlerSearchFuse;
					jsfX.mayFireEvent($jsf, arguments);
				}
				return; // <-- IMPORTANT
			}
			jsfX.executing[selfStaticId] = true;
			if(jsfX.log) console.log("inside:"+selfStaticId);
			if(jsfX.config[componentId].onFirstTime) { // first time
				jsfX.config[componentId].onFirstTime();
			}
		} else {
			if(jsfX.log) console.log("prevented server call!  :-D");
			if(jsfX.config[componentId].onPrevent) jsfX.config[componentId].onPrevent();
			if(selfStaticId.indexOf("__isParent") !== -1) {
				if(jsfX.config[componentId].preventionBehavior && jsfX.config[componentId].preventionBehavior.indexOf("@DisableEntireComponentOnPrevent") !== -1) {
					jsfX[parentJsf].isDisabled = true;
					if(jsfX.log) console.log("entire component is now disabled  :-D");
					if(jsfX[parentJsf].onDisableEntireComponent) jsfX[parentJsf].onDisableEntireComponent();
					if(jsfX.config[componentId].onReenableEntireComponent) { // first time
						var componentDisabledWaitingPeriod = jsfX[parentJsf].componentDisabledWaitingPeriod || 2000;
						setTimeout(jsfX.config[componentId].onReenableEntireComponent, componentDisabledWaitingPeriod);
					}
				}
			}
		}
	}
	if(parentJsf !== componentId) { 
		jsfX.prevSelectedChild[parentStaticId] = selfStaticId;
	} // else is handle-less parent, so it shouldn't overwrite the other overlapping registrant's prevSelectedChild
	
	// @After
	
	jsfX.updateEventsMonitor(); // always update before leaving!
	
	if(tryAgainKey) { // same as selfStaticId at this point
		jsfX.fireClickHandlers(tryAgainKey);
	}
	
	if(activateOtherRegistrants) {
		jsfX.activateOtherRegistrants(this, arguments, parentJsf, componentId, jsfX[parentJsf].overlappingRegistrants);
	}
};
JSFx.prototype.updateTfuse = function(componentId) {
	if(jsfX.config[componentId].currTransgressionsFuse !== undefined && !jsfX.config[componentId].disabledChildrenCanInfluenceParentTransgressionFuse) {
		++jsfX.config[componentId].currTransgressionsFuse;
	}
};

JSFx.prototype.fireClickHandlers = function(staticId) {
	if(jsfX.prevClickJQhandler[staticId]) {
		var funcsSoFar = [];
		for(var i = 0; i < jsfX.prevClickJQhandler[staticId].length; i++) {
			if($.inArray(jsfX.prevClickJQhandler[staticId][i].toString(), funcsSoFar) !== -1) {
				continue;
			}
			try {
				jsfX.prevClickJQhandler[staticId][i].apply(this, arguments);
			} catch(err) {
				$.proxy(jsfX.prevClickJQhandler[staticId][i], null, arguments);
			}
			funcsSoFar.push(jsfX.prevClickJQhandler[staticId][i].toString());
		}
	}
};

JSFx.prototype.activateOtherRegistrants = function(myElem, arguments, parentJsf, componentId, overlappingRegistrants) {
	jsfX.interceptAspect.apply(jsfX[parentJsf].parentElemToRunAspectOn, arguments);
};

JSFx.prototype.staticIdTo$jsf = function(staticId) {
	if(staticId == undefined) return "none";
	var jsfComponent_parent = staticId.replace(/__[\d]+/g,'');
	
	if(jsfComponent_parent == staticId) {
		return $(jsfComponent_parent);
	}
	var matches = staticId.match(/__([\d]+)/);
	if(!matches || matches.length == 0) {
		return null; // DEBUG:  fail fast 
	}
	var index = parseInt(matches[1]);
	var allDescendents = getElementNodesIn($(jsfComponent_parent)[0]);
	var $jsf = $(allDescendents).eq(index);
	return $jsf;
};

JSFx.prototype.getStaticId = function($jsf) {
	if($jsf == undefined) return "none";
	var componentId = jsfX.$jsfToCompId($jsf);
	if(componentId == undefined) return "none";
	var parentJsf = jsfX.config[componentId].jsfComponent;
	var $parentJsf = $(parentJsf);
	var jsfComponent_children = jsfX.config[componentId].children;
	if($parentJsf.attr("id") == $jsf.attr("id")) { // also try if "isAlone" would return true
		return parentJsf + "__isParent";
	} else {
		return parentJsf + "__" + $(getElementNodesIn($parentJsf[0]))
		       .index(  
				 $(jsfX.convertElemBackToQueryString($jsf, $parentJsf, jsfComponent_children, componentId))  
				);
		
	}
};

/**
 * Entry points
 */ 
JSFx.prototype.applyMonitorClasses = function() {
	for(var compId in jsfX.config) {
		var $jsfComponent = $(jsfX.config[compId].jsfComponent);
		var $c = null;
		if(jsfX.config[compId].isAlone) {
			$c = $($jsfComponent[0]);
		} else {
			var children = jsfX.config[compId].children;
			$c = $jsfComponent.find(children);
		}
		for(var i = 0; i < $c.length; i++) {
			var $v = $($c[i]);
			$v.off("click", jsfX.onClick).bindFirst("click", jsfX.onClick);
			$v.addClass('monitorEvents')
		      .off("mouseover", jsfX.onHover).on("mouseover", jsfX.onHover)
		      .off("mouseout", jsfX.offHover).on("mouseout", jsfX.offHover);
			  
		}
	}
};

JSFx.prototype.registerComponents = function(configs) {
	
	var multiConfig = $.isArray(configs);
	if(multiConfig) {
		for(var i = 0; i < configs.length; i++) {
			var configObj = configs[i];
			var componentId = configObj.jsfComponent + (configObj.children == undefined ? "" : configObj.children);
			for(var key in configObj) {
				jsfX.processConfig(configObj, key, componentId);
			}
			var jsfComponent = jsfX.config[componentId].jsfComponent;
			var $jsfComponent = $(jsfComponent);
			jsfX.config[componentId].$jsfComponent = $jsfComponent;
			if(!jsfX.config[componentId].children) { // alone, like a button
				jsfX.config[componentId].children = "";
				jsfX.config[componentId].isAlone = true;
				var inlineEvents = getInlineEventHandlers($jsfComponent); 
				var staticId = jsfX.getStaticId($jsfComponent);
				for(var j = 0; j < inlineEvents.length; j++) {
					if(inlineEvents[j].name.indexOf("click") !== -1 &&
					   inlineEvents[j].ownerElement == $jsfComponent[0]) {
						// then THIS HANDLER is the CORRECT ONE 
						//      for THIS EVENT/$jsf combo
						var handler2 = inlineEvents[j].ownerElement.onclick;
						/**
						 * UNIQUE TO Inline Event Handlers...
						 *    Must remove the "onclick" attribute, as its priority will 
						 *    otherwise supercede our Aspect call (happen before it)
						 */
						$jsfComponent.off("click", handler2);
						$jsfComponent.removeAttr("onclick"); 
						
						if(!jsfX.handlersToPeriodicallyRemove) {
							jsfX.handlersToPeriodicallyRemove = [];
						}
						jsfX.handlersToPeriodicallyRemove[componentId] = handler2;
						jsfX.interceptFunc($jsfComponent, staticId, componentId, handler2);
					}
				}
			}
			jsfX.config[componentId].handlerSearchFuse = 2;
			
			if(!jsfX[jsfComponent]) {
				jsfX[jsfComponent] = {};
				if(!jsfX.config[componentId].children) {
					jsfX[jsfComponent].withoutChildren = true;
				} else {
					jsfX[jsfComponent].withChildren = true;
				}
				jsfX[jsfComponent].overlappingRegistrants = [];
				jsfX[jsfComponent].overlappingRegistrants.push(componentId);
				jsfX[jsfComponent].numOverlappingRegistrants = 1;
				jsfX[jsfComponent].bubbleFuseStart = 1;
				jsfX[jsfComponent].bubbleFuse = 1;
			} else {
				if(!jsfX.config[componentId].children && !jsfX[jsfComponent].withoutChildren) {
					jsfX[jsfComponent].withoutChildren = true;
					if(jsfX[jsfComponent].bubbleFuseStart <= 2) { // capping at 2 (one for "with" children, one for "without")
						jsfX[jsfComponent].overlappingRegistrants.push(componentId);
						jsfX[jsfComponent].numOverlappingRegistrants++;
						jsfX[jsfComponent].bubbleFuseStart++;
						jsfX[jsfComponent].bubbleFuse++;
					}
				} else if(jsfX.config[componentId].children && !jsfX[jsfComponent].withChildren) {
					jsfX[jsfComponent].withChildren = true;
					if(jsfX[jsfComponent].bubbleFuseStart <= 2) { // capping at 2 (one for "with" children, one for "without")
						jsfX[jsfComponent].overlappingRegistrants.push(componentId);
						jsfX[jsfComponent].numOverlappingRegistrants++;
						jsfX[jsfComponent].bubbleFuseStart++;
						jsfX[jsfComponent].bubbleFuse++;
					}
				}
			}
			
			if(!jsfX.config[componentId].children) { 
				jsfX[jsfComponent].componentDisabledWaitingPeriod = jsfX.config[componentId].componentDisabledWaitingPeriod;
			}
			
			if(jsfX.config[componentId].onDisableEntireComponent) {
				jsfX[jsfComponent].onDisableEntireComponent = jsfX.config[componentId].onDisableEntireComponent;
			}
			
		}
	}
};
JSFx.prototype.showLogs = function() {
	jsfX.me.log = true;
};
JSFx.prototype.hideLogs = function() {
	jsfX.me.log = false;
};
JSFx.prototype.enablePollingMonitor = function() {
	jsfX.me.pollFunc();
};
JSFx.prototype.disablePollingMonitor = function() {
	clearTimeout(jsfX.pollFuncTimeout);
};
JSFx.prototype.pollFunc = function() {
	jsfX.updateEventsMonitor();
	var r = jsfX.config.pollingRate ? jsfX.config.pollingRate : 333;
	jsfX.pollFuncTimeout = setTimeout(jsfX.me.pollFunc, r);
};
JSFx.prototype.setPollingRate = function(r) {
	jsfX.config.pollingRate  = r;
};

JSFx.prototype.processConfig = function(config, key, componentId) {
	if(!jsfX.config[componentId]) {
		jsfX.config[componentId] = [];
	}
	jsfX.config[componentId][key] = config[key];
};

JSFx.prototype.mayFireEvent = function($jsf, args) {
	var compId = jsfX.$jsfToCompId($jsf);
	var funcHandle = jsfX.config[compId].funcHandle;
	
	var childId = jsfX.getStaticId($jsf);
	
	if(!$jsf.hasClass("monitorEvents")) {
		// this is a workaround in case JSF components changed state and we lost our function-wrapping aspects...
		jsfX.alreadyCreatedAspect[childId] = false;
		jsfX.tempDisableComponent($jsf, funcHandle, args);
	} else {
		// THIS IS WHAT NORMALLY RUNS...
		jsfX.tempDisableComponent($jsf, funcHandle, args);
	}
};

JSFx.prototype.updateEventsMonitor = function() {
	// MUST retraverse the DOM anew each time this is called (to get newest references to JSF components- since they are (stupidly) prone to overwriting outside changes...)
	jsfX.applyMonitorClasses();
	if(jsfX.handlersToPeriodicallyRemove) {
		for(var compId in jsfX.handlersToPeriodicallyRemove) {
			var jsfComponent = jsfX.config[compId].jsfComponent;
			var children = jsfX.config[compId].children;
			var handler = jsfX.handlersToPeriodicallyRemove[compId];
			
			var $jsfs = jsfX.config[compId].isAlone ? $(jsfComponent) : $(jsfComponent).find(children);
			for(var i = 0; i < $jsfs.length; i++) {
				$($jsfs[i]).off("click", handler);
				$($jsfs[i]).removeAttr("onclick"); 
			}
			
		}
	}
};

JSFx.prototype.onClick = function(event) {
	//@jsfX
	var $this = $(this);
	if(jsfX.log) console.log($this.attr("id")+" :: mayFireEvent");
    jsfX.mayFireEvent($this, arguments);
    jsfX.updateEventsMonitor();
};
JSFx.prototype.onHover = function() {
	//@jsfX
	var $this = $(this);
	$this.addClass("jsfXhover");
};
JSFx.prototype.offHover = function() {
	//@jsfX
	var $this = $(this);
	$this.removeClass("jsfXhover");
};




/**
 * Utils
 */ 

var get$selector = function(elem) {
	 var selector = elem.parents()
     	.map(function() { return this.tagName; })
		.get().reverse().join(" ");
		
	if (selector) { 
		selector += " "+ elem[0].nodeName;
	}
	var id = elem.attr("id");
	if (id) { 
		selector += "#"+ id;
	}
	var classNames = elem.attr("class");
	if (classNames) {
		selector += "." + $.trim(classNames).replace(/\s/gi, ".");
	}
	return selector;
};

Function.prototype.clone = function() {
    var cloneObj = this;
    if(this.__isClone) {
      cloneObj = this.__clonedFrom;
    }

    var temp = function() { 
    	//@jsfX @Before
    	return cloneObj.apply(this, arguments); 
    };
    for(var key in this) {
        temp[key] = this[key];
    }

    temp.__isClone = true;
    temp.__clonedFrom = cloneObj;

    return temp;
};

var getElementNodesIn = function(el) {
	return $(el).find(":not(iframe)").addBack().contents().filter(function() {
        return this.nodeType == 1;
    });
};

$.events = function(expression) {
	var a = [], b;
	$(expression).each(function () {
		if(b = jQuery._data(this, "events")) {
			a.push({element: this, events: b});
		}
	});
	return a.length > 0 ? a : null;
};
$.fn.bindFirst = function(name, fn) {
  var elem, handlers, i, _len;
  this.bind(name, fn);
  for (i = 0, _len = this.length; i < _len; i++) {
    elem = this[i];
    handlers = jQuery._data(elem).events[name.split('.')[0]];
    handlers.unshift(handlers.pop());
  }
};

// EVENT FINDER ______________________________________________________________________________

var findEventHandlers = function (eventType, $elem, strategy) {
    var results = [];
    var $ = jQuery;
    var $elementsToWatch;
    switch(strategy) {
    case "elem":
    	$elementsToWatch = $elem;
    	break;
    case "allDescendants":
    	$elementsToWatch = $elem.add($elem.find("*"));
    	break;
    }
    var $allElements = $elementsToWatch.add(document);
    $.each($allElements, function (elementIndex, element) {
        var allElementEvents = $._data(element, "events");
        if (allElementEvents !== void 0 && allElementEvents[eventType] !== void 0) {
            var eventContainer = allElementEvents[eventType];
            $.each(eventContainer, function(eventIndex, event){
                var isDelegateEvent = event.selector !== void 0 && event.selector !== null;
                var $elementsCovered;
                if (isDelegateEvent) {
                    $elementsCovered = $(event.selector, element); //only look at children of the element, since those are the only ones the handler covers
                } else {
                    $elementsCovered = $(element); //just itself
                }
                if (haveCommonElements($elementsCovered, $elementsToWatch)) {
                    addEventHandlerInfo(element, event, $elementsCovered, results);
                }
            });
        }
    });
    return results;
};

var arrayIntersection = function (array1, array2) {
    return $(array1).filter(function (index, element) {
        return $.inArray(element, $(array2)) !== -1;
    });
};

var haveCommonElements = function (array1, array2) {
    return arrayIntersection(array1, array2).length !== 0;
};


var addEventHandlerInfo = function (element, event, $elementsCovered, results) {
    var extendedEvent = event;
    if ($elementsCovered !== void 0 && $elementsCovered !== null) {
        $.extend(extendedEvent, { targets: $elementsCovered.toArray() });
    }
    var eventInfo;
    var eventsInfo = $.grep(results, function (evInfo, index) {
        return element === evInfo.element;
    });

    if (eventsInfo.length === 0) {
        eventInfo = {
            element: element,
            events: [extendedEvent]
        };
        results.push(eventInfo);
    } else {
        eventInfo = eventsInfo[0];
        eventInfo.events.push(extendedEvent);
    }
};

var getInlineEventHandlers = function($elt) {
  return $.grep($elt.get(0).attributes, function(attrib) {
    return /^on/i.test(attrib.name) && attrib.value.length; 
  });
};
