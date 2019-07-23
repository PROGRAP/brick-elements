# BrickSlider

Brick slider is a web component developed by PROGRAP for sliders.

+ touchmove events
+ next and previous button
+ autoscroll
+ optional carousel

## Installation

`$ npm install @prograp/brick-slider`


## Usage
#### Element:
``` html
<brick-banner-slider arrow-controls no-carousel threshold="5" initial-offset="0">
    <!--Create your elements for navigation  -->
    <button slot="previous">
    </button>
    <button slot="next">
    </button>

    <!--Put your slides as siblings here-->
    <img class="picA" />
    <img class="picB" />
    <a href="" class="interactive-slide">
      <img class="picC" />
    </a>
</brick-banner-slider>
```
#### Attributes:
+ `auto-slide="100"` **Enables auto slide with an interval set in milliseconds**
+ `no-slide` **Disables sliding animation**
+ `threshold="3"` **Amount of slides needed to show**
