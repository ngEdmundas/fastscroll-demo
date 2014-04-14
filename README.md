#  fastscroll-demo

Check `index.html` and play with the filters and orderBy field, scroll a little bit around.

What you will notice is how smoothly everything works, although you repeat over a dataset with 20.000 items w/ angular.

There's serious stuff going around in `fastscroll.js` and its very experimental.

A whole bunch of performance optimizations was done to make this work that smoothly, like:

 - reuse elements
 - absolute positioning
 - only render in requestAnimationFrame

However, there's iScroll-native for iPads to work in it - this should be decoupled.
