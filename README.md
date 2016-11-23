# grid
```HTML
  <div [draggable]="draggableProp" [resizable]="resizableProp" class="grid-item">
    <span class="text draggable-handle">Test1</span>
    <span class="resizable-handle"></span>
  </div>
  <div [draggable]="draggableProp" [resizable]="resizableProp" class="grid-item">
    <span class="text draggable-handle">Test2</span>
    <span class="resizable-handle"></span>
  </div>
  <div [draggable]="draggableProp" [resizable]="resizableProp" class="grid-item">
    <span class="text draggable-handle">Test3</span>
    <span class="resizable-handle"></span>
  </div>
  <div [draggable]="draggableProp" [resizable]="resizableProp" class="grid-item">
    <span class="text draggable-handle">Test4</span>
    <span class="resizable-handle"></span>
  </div>
```

```javascript
  draggableProp = {
    'useCSSTransforms': true,
    'zIndex': 100,
    'handle': '.draggable-handle',
    'cancel': '.resizable-handle'
  };

  resizableProp = {
    'width': 200,
    'height': 200,
    'handle': '.resizable-handle'
  };
}
```
