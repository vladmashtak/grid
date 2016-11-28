export interface IResizable {
  // Initial w/h
  width:number;
  height:number;
  /**
   * `handle` specifies a selector to be used as the handle that initiates drag.
   *
   *  handle=".handle">
   */
  handle:string;
  // If you change this, be sure to update your css
  handleSize:Array<number>;
  // If true, will only allow width/height to move in lockstep
  aspectRatio:boolean;
  // Min/max size
  minConstraints:Array<number>;
  maxConstraints:Array<number>;
}

export interface IResizeState {
  resizing: boolean;
  lastX: number; lastY: number;
  width: number; height: number;
  slackW: number; slackH: number;
}

interface ISize {
  width: number;
  height: number;
}

export interface IResizeCallback {
  event: Event;
  node: HTMLElement;
  size: ISize;
}
