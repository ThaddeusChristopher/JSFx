# JSF Component Event Monitor
Simple Java Server Faces component event controller. Reduces server load and AJAX calls to only what you deem necessary.

# Introduction
Welcome! Have you ever looked at your network logs while working with JSF (Primefaces, etc.) and seen functionally useless activity? AJAX calls that didn't need to happen, events that were redundant or even duplicates? Then the JSF Component Event Monitor is here to make you much happier!

The Java Component Event Monitor (aka JSFx; "x" as in "cancel") is a server load-protecting JavaScript utility. It intelligently detects and eliminates unnecessary client/server chatter commonly seen with JSF components.

This software uses low-impact all-client-side techniques (such as monkey patching and JS's version of AOP) to track the behavior of any JSF component (PrimeFaces, MyFaces, etc.).

Protects servers against: 
- Users click-spamming processor intensive calls
- Duplicate event calls to the server (such as re-selecting an already selected child element inside a component)
- Undesired or excessive AJAX requests

Often times when developing an AJAX-driven Java web app, multiple expensive server operations (e.g., JPA database transactions) can be triggered from a single mouse click on the client's end. While this does certainly improve user experience by making pages more responsive, this also necessitates some type of server load protection.

Enter JSFx.

# Dependencies
Requires jQuery. Tested mostly on v1.11.0, and only minimal effort has been made to attain backwards compatibility.

WARNING: Due to the required use of jQuery's internal event methods, this software may not be fully compatible with older versions. It does currently include fallback plans if it is unable to use jQuery ideally, but such scenarios are comparatively less tested.

# Installation & How to Use
Simply drop JsfComponentEventMonitor.js into your project and follow this init procedure:
```javascript
      // Create an array of config objects to register with the even monitor
      // Here for simplicity we are only passing in a single object
      var componentsToMonitor = [
         // Each object you choose to put in this array represents *one* web component 
         // (a button, a tagcloud, an interactive table, you name it)
         {
            jsfComponent: "#analyze",
            onPrevent: disableAnalyzeButton, 
            onFirstTime: disableAnalyzeButton,
            onReenable: enableAnalyzeButton,
            disabledPeriod: 10000
         }
      ];
      jsfX.registerComponents(componentsToMonitor);
```
...That's it! 

Now in the background the system has locked onto its target component (a jQuery selector for a button in this case called "#analyze") and will begin automatically subduing and controlling click events based on these descriptive config parameters you gave it.

Let's take a closer look at those configurations.

- ***jsfComponent***       **←** A jQuery selector pointing to a simple component like a button.

            Note: As most JSF components are complex, we often also pass in 
                   a 2nd jQuery selector called "children" which points to 
                   this JSF component's interactive sub-elements. 
                   E.g.  -->  jsfComponent: "#fileForm\\:tagCloud1", children: "li a"
                              ^^^^^^^^^^^^                           ^^^^^^^^
                              These two together say we want to monitor events occurring
                                from clicking on a Tag Cloud's "li a" hyperlinks.
                                             
- ***onFirstTime***,
- ***onPrevent***,  
- ***onReenable***,        **←** Here are three events we can optionally attach our own function handlers to.
                       In this way you can run the JS of your choice whenever JSFx cancels an event.
                       
            onFirstTime: For the 1st cancellation, 
            onPrevent:   For all future cancellations that are within a window of time (default 2000ms)
                             after onFirstTime occurs
            onReenable:  AFter "disabledPeriod" is up and the temporarily disabled component gets re-enabled.
                       
- ***disabledPeriod***     **←** In milliseconds, this is how long you want JSFx to temporarily disable the component.

In the above config we are basically saying "Hey JSFx, whenever you notice the user click on my #analyze button, then please prevent that button from being clickable for the next 10 seconds." This use-case is for when the event in question is processor-intensive and you would like to limit how frequently the user can click the button.

There are plenty more ways you can customize JSFx, but this is its most basic usage.

If you would like a better a idea of what JSFx is doing for you, enable the logs by calling this method:

      jsfX.showLogs();

# Status
At this point in development it can in theory work on any web component model, no longer just JSF (e.g., Spring ThymeLeaf, or even your own custom vanilla JS component).

# Optimizations

JSF can be cruel sometimes during its lifecycle activity and overwrite JavaScript-enacted changes you yourself have made to components (such as altering function handles, adding data values, classes, etc.). This is more frequently true for children within JSF components (such as link anchors), and less frequently true for the parent component you usually assign widget variables or style classes to. To get around this, JSFx has to utilize a trivial polling function that periodically renews its connection to each JSF component it is monitoring for events.

You can customize the frequency (in milliseconds) that this poll function operates like so:

      jsfX.setPollingRate(1000);

The above code simply changes the polling from 333ms (the default) to 1000ms. The would give your web app a slight performance gain.

If you know for sure that your particular JSF setup will not in fact overwrite the data attributes and classes you assign to them, then you may completely disable the poll function like so:

      jsfX.disablePollingMonitor();

# Examples

This convenient API requires only two lines of JavaScript to get started: (1) creating the configurations per component, and (2) passing in that config array to "jsfX.registerComponents()". Further configuration such as callbacks and types of component-disabling strategies are exposed to the programmer for finely grained arbitration during its event-monitoring lifecycle.

Here is a copy/paste directly from a working project that heavily uses JSFx:
```javascript
var componentsToMonitor = [
  {jsfComponent: "#fileForm\\:collapseAll", 
	onPrevent: disableCollapseButton, onReenable: enableCollapseButton, 
	onFirstTime: disableCollapseButton,
	disabledPeriod: 10000, preventSelectingIfAlreadySelected: false},
  {jsfComponent: "#fileForm\\:tagCloud1", children: "li a",
  	disabledPeriod: 4000, preventSelectingIfAlreadySelected: false},
  {jsfComponent: "#fileForm\\:tagCloud1", funcHandle: "@Dummy",
  	onDisableEntireComponent: displayServerOverloadMessage_cloud,
  	onReenableEntireComponent: reenableTagCloud,
  	preventionBehavior: "@DisableEntireComponentOnPrevent", 
  	componentDisabledWaitingPeriod: 12000,
  	numTransgressionsBeforeWaitPeriod: 3,
  	disabledPeriod: 1200, preventSelectingIfAlreadySelected: false},
  {jsfComponent: "#fileForm\\:treeTable", funcHandle: "@Dummy",
  	onDisableEntireComponent: displayServerOverloadMessage_tree,
  	onReenableEntireComponent: reenableTreeTable,
  	preventionBehavior: "@DisableEntireComponentOnPrevent", 
  	componentDisabledWaitingPeriod: 12000,
  	numTransgressionsBeforeWaitPeriod: 2,
  	disabledPeriod: 2000, preventSelectingIfAlreadySelected: false},
  {jsfComponent: "#fileForm\\:treeTable", children: ".ui-treetable-selectable-node",
  	disabledPeriod: 1000},
  {jsfComponent: "#fileForm\\:treeTable", children: ".ui-treetable-toggler",
  	disabledPeriod: 30, selectedClass: "", preventSelectingIfAlreadySelected: false},
  {jsfComponent: "#searchForm\\:fileTable", children: ".ui-datatable-selectable",
  	disabledPeriod: 1000}
];
jsfX.registerComponents(componentsToMonitor);
```

The above examples demonstrate what are currently the most reliable and successful different types of configuration combinations for JSFx as of v1.00.

As you can see it uses 7 config objects, although technically there are only 4 actual JSF/Primefaces components (discernable by the "jsfComponent" values). This shows how sometimes it is useful to maintain multiple "views" into a single component. 

For example, the tree table ("#fileForm\\:treeTable") has one config object that has no "children" parameter. This configuration "view" specifically observes the *entire* component for user click-abuse on its various parts (table rows, node-expanding triangles, etc.). These events may entail AJAX calls and/or expensive server operations that serve no functional purpose when overused at such frequency. If the user continues to spam these events, a "transgression" is noted (numTransgressionsBeforeWaitPeriod: 2) for each event the user fires while the component has already naturally been disabled (via "disabledPeriod: 1000"). Each time the user clicks an already disabled component (any number of times) within a window of time equal to the disabledPeriod, the disabledPeriod is reset and a "transgression" is noted internally. If the user continues to spam events on the component after (in this case) 2 transgressions, the entire component becomes disabled for 12 seconds (via "componentDisabledWaitingPeriod: 12000"). 

**In this way, a user who decides to click mindlessly all over the treetable for a period of 3000ms will earn themselves a thorough *BANNING* from all use of that component until the 12 second wait has completed**. 

The `funcHandle: "@Dummy"` parameter tells JSFx *not* to search for events for this configuration object. In this case since 2 other config objects for the treetable are binding to their own specific events (node clicks and triangle toggles) there is no logical reason why the treetable component itself would also need to search for events to monitor. Hence the "@Dummy" notation (which converts to a blank function internally: function() {}).

This same tree table also has 2 more "views" (config objects), each with a different "children" target: ".ui-treetable-selectable-node", and ".ui-treetable-toggler". The first one (selectable node) observes event abuse for each row of the treetable. It has a disabledPeriod of "1000" and therefore ALWAYS immediately disables the clicked-on selectable node for 1 second upon each click. The second one (treetable toggler) observes event abuse of the little triangle at the far left of every node that expands or contracts that node's children. (like opening and closing a folder in a file explorer). As this operation is less expensive than actually clicking on the node, the little triangle gets disabled for only 30 milliseconds immediately after each collapse/expand toggle (via disabledPeriod: 30). This simply keeps the user from being able to spam-click the toggler at an obnoxiously fast rate.

### Event function handler examples
These examples are boiler plate that has served jsfX projects in the past. Tailor them at your leisure.
#### JavaScript
```javascript
function disableAnalyzeButton() {
	$("#analyze").prop('disabled', true)
	             .animate({"opacity":"0.5"}, 1000);
}
function enableAnalyzeButton() {
	$("#analyze").prop('disabled', false)
	             .animate({"opacity":"1.0"}, 1000);
}

function displayServerOverloadMessage_cloud() {
      // uses PF remote command to display a message to the errant user
	sendUserInfoMessage( [ 
	                       {name:'severity', value:"warn"},
	                       {name:'clientForDisplayKey', value: "growl"},
	                       {name:'message', value: "Please calm down ^_^"}
	                     ]
	                   );
	// tageting all child <a> elements for a more dramatic box shadow effect
	$("#fileForm\\:tagCloud1 a").addClass("disabledComponent");
}
function reenableTagCloud() {
	$("#fileForm\\:tagCloud1 a").removeClass("disabledComponent");
}
```
#### CSS
```css
.disabledComponent {
	box-shadow: 0 0 10px 1px rgba(208,25,25, 0.5);
	color: #bb3a3a !important;
}
```

# Configuration
The key to getting the most out of JSFx is in understanding its configuration parameters.

The following is a complete list of options that are supported in each config object:

- ***jsfComponent***       **←** A jQuery selector pointing to a simple component like a button.
```
            Note: As most JSF components are complex, we often also pass in 
                   a 2nd jQuery selector called "children" which points to 
                   this JSF component's interactive sub-elements. 
                   E.g.  -->  jsfComponent: "#fileForm\\:tagCloud1", children: "li a"
                              ^ These two together say we want to monitor events occurring
                                from clicking on a Tag Cloud's "li a" hyperlinks.
```
- ***children***           **←** This gets appended to the jsfComponent jQuery selector when working with complicated components.
                       
We ask that you use this attribute rather than simply passing the entire selector into jsfComponent
alone because internally JSFx needs a *range* to search within to find potential event delegates.

Sometimes you'll find the event in the child element, other times it can be in perhaps a delegated 
\<tbody\> element farther up the chain, or it could even have been added inline, or to the document
object itself. Often there's no telling what those JSF developers were thinking when they chose to
bind events for their components. And that can make interacting with them from JavaScript a challenge.

Hence we *require* two points of ingress: an upper-bound ("jsfComponent" -- this could even just be
the #myForm that houses the component) and a lower-bound ("children" -- this should be the most
specific you can get, such as the \<a\> tags that are inside \<li\> tags which are inside \<div\> tags).

Within these two points JSFx can discover the real event handler by traversing *from* the parent 
jsfComponent (such as "#fileForm\\:treeTable") *to* the children (".ui-treetable-selectable-node").

The bottom line: Pick a *range* between "jsfComponent" and "children" where you think the component's
real events are hidden. If you guess this part wrong, JSFx will not be able to find any component
event handlers. Simply pick different selectors (farther up/down the DOM) for the upper and lower
bounds and hope you'll find the sweet spot on your next try.
                                             
- ***onFirstTime***,
- ***onPrevent***,  
- ***onReenable***,        **←** Here are three events we can optionally attach our own function handlers to.
                       In this way you can run the JS of your choice whenever JSFx cancels an event.
```
onFirstTime: For the 1st cancellation, 
onPrevent:   For all future cancellations that are within a window of time (default 2000ms)
             after onFirstTime occurs
onReenable:  AFter "disabledPeriod" is up and the temporarily disabled component gets re-enabled.
```
- ***onDisableEntireComponent***,
- ***onReenableEntireComponent*** 
                   **←** These two events only go into effect when also used with:
                       `preventionBehavior: "@DisableEntireComponentOnPrevent"`
                       
- ***preventionBehavior*** **←** For now this parameter merely serves as the way to disable the entire component using
                         JSFx's transgression-fuse system (described in the Examples section of this document).
```
Possible values are:
     @DisableEntireComponentOnPrevent"
```                              

- ***disabledPeriod***     **←** In milliseconds, this is how long you want JSFx to temporarily disable the component.
                       During the disabled period the component will still appear normal to the user. But any
                       click events sent to it will be no-ops. In order to make the component appear disabled
                       one would have to make use of "onFirstTime", "onPrevent", and "onReenable".

- ***preventSelectingIfAlreadySelected***
                   **←** This option looks at `selectedClass` and asks, "is the element the user just clicked on
                         presently selected (such as the presently selected data list element among its peers)?"
                         If so the click event will be a no-op. 
```              
                         Use case: Components like tables that do nothing useful when the same row is 
                                   clicked more than once.
Possible values are:
    "@AlwaysStopLatestSelection" 
          Stops re-selecting the previously selected element regardless of whether it 
          has `selectedClass` or not. Experimental.
    true
          Stops re-selecting the previously selected element only if it has `selectedClass` 
          as a class.
    false 
          Disables any checking of `selectedClass` 
```
- ***selectedClass***      **←** This is the class JSFx uses to determine if an element presently click on is in a selected state.
                         For example, when the user clicks on a selectable PrimeFaces table row it receives the class
                         "ui-state-highlight". When the user clicks on a different row, the other rows lose 
                         "ui-state-highlight" and the newly select row gains "ui-state-highlight".
                         Default value: "ui-state-highlight"

- ***funcHandle***         **←** This is the function handle that JSFx will call in place of the one it finds given the 
                              `jsfComponent` and `children` values you gave it.
```             
Possible values are:
    "@Dummy"
          - Use this to tell JSFx *not* to even bother searching for event handlers. A use case is
            when you want to monitor an entire component for transgressions (with `transgressionFuse`)
            and make use of JSFx's events `onDisableEntireComponent` and `onEnableEntireComponent`.
    [any function handler you wish to pass in that will be used in place of the one JSFx finds for
     each specific component]
          - Only pass in your own function handler if you know what you are doing.
```
