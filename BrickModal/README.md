# BrickModal

BrickModal is a web component for a modal pop up.

+ customizable close button
+ customizable modal title
+ ajax support for modal content

## Installation

`$ npm install @prograp/brick-slider`

## Usage
#### Element
``` html
<brick-modal>

  <slot name="close-toggle">
    <!---OPTIONAL add own close button--->
  </slot>

  <slot name="title">
    <!---Add the modal title here--->
  </slot>

  <!---Add the modal content here--->
</brick-modal>
```
#### Attributes
+ `source="http://www.example.org"` ***Url to an HTML source***
