# JSF Component Event Monitor
Simple Java Server Faces component event controller. Reduces server load and AJAX calls to only what you deem necessary.

# Introduction
Welcome! Have you ever looked at your network logs while working with JSF (Primefaces, etc.) and seen functionally useless activity? AJAX calls that didn't need to happen, events that were redundant or even duplicates? Then the JSF Component Event Monitor is here to make you much happier!

The Java Component Event Monitor (aka JSFx; "x" as in "cancel") is a server load-protecting JavaScript utility. It intelligently detects and eliminates unnecessary client/server chatter commonly seen with JSF components.

This software uses low-impact all-client-side techniques (such as monkey patching and JS's version of AOP) to track the behavior of any JSF component (PrimeFaces, MyFaces, etc.).

Protects servers against: 
•	Users click-spamming processor intensive calls
•	Duplicate event calls to the server (such as re-selecting an already selected child element inside a component)
•	Undesired or excessive AJAX requests

# Dependencies
Requires jQuery. Tested mostly on v1.11.0, and only minimal effort has been made to attain backwards compatibility.

WARNING: Due to the required use of jQuery's internal event methods, this software may not be fully compatible with older versions. It does currently include fallback plans if it is unable to use jQuery ideally, but such scenarios are comparatively less tested.

# Installation & How to Use
Simply drop JsfComponentEventMonitor.js into your project and follow this init procedure:

      // Create an array of config objects to register with the even monitor
      // Here for simplicity we are only passing in a single object
      var componentsToMonitor = [
         // Each object you choose to put in this array represents *one* web component 
         // (a button, a tagcloud, an interactive table, you name it)
         {
             jsfComponent: "#analyze",
       	      onPrevent: disableAnalyzeButton, 
      	      onReenable: enableAnalyzeButton, 
       	      onFirstTime: disableAnalyzeButton,
       	      disabledPeriod: 10000
       	  }
      ];
      jsfX.registerComponents(componentsToMonitor);

...That's it! 

Now in the background the system has locked onto its target component (a jQuery selector for a button in this case called "#analyze") and will begin automatically subduing and controlling click events based on these descriptive config parameters you gave it.

Let's take a closer look at those configurations.

- jsfComponent       ⬅ A jQuery selector pointing to a simple component like a button.

            Note: As most JSF components are complex, we often also pass in 
                   a 2nd jQuery selector called "children" which points to 
                   this JSF component's interactive sub-components. 
                   E.g.  -->  jsfComponent: "#fileForm\\:tagCloud1", children: "li a"
                              ^ These two together say we want to monitor events occurring
                                from clicking on a Tag Cloud's "li a" hyperlinks.
                                             
- onFirstTime,
- onPrevent,  
- onReenable,        ⬅ Here are three events we can optionally attach our own function handlers to.
                       In this way you can run the JS of your choice whenever JSFx cancels an event.
                       
            onFirstTime: For the 1st cancellation, 
            onPrevent:   For all future cancellations that are within a window of time (default 2000ms)
                             after onFirstTime occurs
            onReenable:  AFter "disabledPeriod" is up and the temporarily disabled component gets re-enabled.
                       
- disabledPeriod     ⬅ In milliseconds, this is how long you want JSFx to temporarily disable the component.

In the above config we are basically saying "Hey JSFx, whenever you notice the user click on my #analyze button, then please prevent that button from being clickable for the next 10 seconds." This use-case is for when the event in question is processor-intensive and you would like to limit how frequently the user can click the button.

There are plenty more ways you can customize JSFx, but this is its most basic usage.

If you would like a better a idea of what JSFx is doing for you, enable the logs by calling this method:

jsfX.showLogs();

# Status
At this point in development it can in theory work on any web component model, no longer just JSF (e.g., Spring ThymeLeaf, or even your own custom vanilla JS component).

# Examples

This convenient API requires only two lines of JavaScript to get started: (1) creating the configurations per component, and (2) passing in that config array to "jsfX.registerComponents()". Further configuration such as callbacks and types of component-disabling strategies are exposed to the programmer for finely grained arbitration during its event-monitoring lifecycle.

# Configuration
The key to getting the most out of JSFx is in understanding its configuration parameters.

The following is a complete list of options that are supported in each config object:

jsfComponent       ⬅ A jQuery selector pointing to a simple component like a button.

            Note: As most JSF components are complex, we often also pass in 
                   a 2nd jQuery selector called "children" which points to 
                   this JSF component's interactive sub-components. 
                   E.g.  -->  jsfComponent: "#fileForm\\:tagCloud1", children: "li a"
                              ^ These two together say we want to monitor events occurring
                                from clicking on a Tag Cloud's "li a" hyperlinks.
                                                
children           ⬅ This gets appended to the jsfComponent jQuery selector when working with complicated components.
                       
           We ask that you use this attribute rather than simply passing the entire selector into jsfComponent
           alone because internally JSFx needs a *range* to search within to find potential event delegates.
           
           Sometimes you'll find the event in the child element, other times it can be in perhaps a delegated 
           <tbody> element farther up the chain, or it could even have been added inline, or to the document
           object itself. Often there's no telling what those JSF developers were thinking when they chose to
           bind events for their components. And that can make interacting with them from JavaScript a challenge.
           
           Hence we *require* two points of ingress: an upper-bound ("jsfComponent" -- this could even just be
           the #myForm that houses the component) and a lower-bound ("children" -- this should be the most
           specific you can get, such as the <a> tags that are inside <li> tags which are inside <div> tags).
           
           Within these two points JSFx can discover the real event handler by traversing *from* the parent 
           jsfComponent (such as "#fileForm\\:treeTable") *to* the children (".ui-treetable-selectable-node").
           
           The bottom line: Pick a *range* between "jsfComponent" and "children" where you think the component's
           real events are hidden. If you guess this part wrong, JSFx will not be able to find any component
           event handlers. Simply pick different selectors (farther up/down the DOM) for the upper and lower
           bounds and hope you'll find the sweet spot on your next try.
                                             
onFirstTime,
onPrevent,  
onReenable,        ⬅ Here are three events we can optionally attach our own function handlers to.
                       In this way you can run the JS of your choice whenever JSFx cancels an event.
                       
          onFirstTime: For the 1st cancellation, 
          onPrevent:   For all future cancellations that are within a window of time (default 2000ms)
                           after onFirstTime occurs
          onReenable:  AFter "disabledPeriod" is up and the temporarily disabled component gets re-enabled.
                       
disabledPeriod     ⬅ In milliseconds, this is how long you want JSFx to temporarily disable the component.
                       During the disabled period the component will still appear normal to the user. But any
                       click events sent to it will be no-ops. In order to make the component appear disabled
                       one would have to make use of "onFirstTime", "onPrevent", and "onReenable".


